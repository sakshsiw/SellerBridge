/**
 * HTTP Bridge for SP-API MCP Server
 * 
 * This bridge exposes the MCP server over HTTP so web applications can
 * communicate with it via REST API calls.
 */

import { spawn } from 'child_process';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.MCP_HTTP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MCP Server Process
let mcpProcess = null;
let requestId = 0;
const pendingRequests = new Map();

/**
 * Start the MCP server as a child process
 */
function startMCPServer() {
    console.log('Starting MCP server...');
    
    const mcpServerPath = join(__dirname, 'build', 'index.js');
    
    mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            ...process.env,
            SP_API_CLIENT_ID: process.env.SP_API_CLIENT_ID,
            SP_API_CLIENT_SECRET: process.env.SP_API_CLIENT_SECRET,
            SP_API_REFRESH_TOKEN: process.env.SP_API_REFRESH_TOKEN,
            SP_API_BASE_URL: process.env.SP_API_BASE_URL || 'https://sellingpartnerapi-na.amazon.com',
            CATALOG_PATH: process.env.CATALOG_PATH,
            LOG_LEVEL: process.env.LOG_LEVEL || 'info'
        }
    });

    let buffer = '';

    mcpProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        
        // Process complete JSON messages
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line) {
                try {
                    const response = JSON.parse(line);
                    handleMCPResponse(response);
                } catch (err) {
                    console.error('Failed to parse MCP response:', line, err);
                }
            }
        }
    });

    mcpProcess.stderr.on('data', (data) => {
        console.error('MCP Server Error:', data.toString());
    });

    mcpProcess.on('close', (code) => {
        console.log(`MCP server process exited with code ${code}`);
        mcpProcess = null;
        // Restart after a delay
        setTimeout(startMCPServer, 2000);
    });

    console.log('MCP server started successfully');
}

/**
 * Handle responses from MCP server
 */
function handleMCPResponse(response) {
    if (response.id && pendingRequests.has(response.id)) {
        const { resolve, reject } = pendingRequests.get(response.id);
        pendingRequests.delete(response.id);
        
        if (response.error) {
            reject(new Error(response.error.message || 'MCP Server Error'));
        } else {
            resolve(response.result);
        }
    }
}

/**
 * Send a request to the MCP server
 */
function sendMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        if (!mcpProcess) {
            return reject(new Error('MCP server is not running'));
        }

        const id = ++requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };

        pendingRequests.set(id, { resolve, reject });

        // Set timeout
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }
        }, 60000); // 60 second timeout

        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
}

// ============================================================================
// HTTP API ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mcpServerRunning: mcpProcess !== null,
        uptime: process.uptime()
    });
});

/**
 * List available tools
 */
app.get('/tools', async (req, res) => {
    try {
        const result = await sendMCPRequest('tools/list');
        res.json({
            success: true,
            tools: result.tools
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Execute SP-API call
 * POST /api/execute
 * Body: {
 *   endpoint: "getOrders",
 *   parameters: { ... }
 * }
 */
app.post('/api/execute', async (req, res) => {
    try {
        const { endpoint, parameters, region, generateCode, rawMode } = req.body;

        if (!endpoint || !parameters) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: endpoint and parameters'
            });
        }

        const result = await sendMCPRequest('tools/call', {
            name: 'execute-sp-api',
            arguments: {
                endpoint,
                parameters,
                region: region || 'us-east-1',
                generateCode: generateCode || false,
                rawMode: rawMode || false
            }
        });

        res.json({
            success: true,
            result: result.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Explore API catalog
 * POST /api/explore
 * Body: {
 *   endpoint?: "getOrders",
 *   category?: "orders",
 *   listCategories?: true,
 *   listEndpoints?: true
 * }
 */
app.post('/api/explore', async (req, res) => {
    try {
        const { endpoint, category, listCategories, listEndpoints, depth, ref } = req.body;

        const result = await sendMCPRequest('tools/call', {
            name: 'explore-sp-api-catalog',
            arguments: {
                endpoint,
                category,
                listCategories,
                listEndpoints,
                depth,
                ref
            }
        });

        res.json({
            success: true,
            result: result.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Execute external API call
 * POST /api/external
 * Body: {
 *   url: "https://api.example.com/data",
 *   method: "GET",
 *   headers: {},
 *   queryParams: {},
 *   body: ""
 * }
 */
app.post('/api/external', async (req, res) => {
    try {
        const { url, method, headers, queryParams, body, timeout } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: url'
            });
        }

        const result = await sendMCPRequest('tools/call', {
            name: 'execute-external-api',
            arguments: {
                url,
                method: method || 'GET',
                headers,
                queryParams,
                body,
                timeout
            }
        });

        res.json({
            success: true,
            result: result.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Generic MCP tool call endpoint
 * POST /mcp/call
 * Body: {
 *   tool: "execute-sp-api",
 *   arguments: { ... }
 * }
 */
app.post('/mcp/call', async (req, res) => {
    try {
        const { tool, arguments: toolArgs } = req.body;

        if (!tool) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: tool'
            });
        }

        const result = await sendMCPRequest('tools/call', {
            name: tool,
            arguments: toolArgs || {}
        });

        res.json({
            success: true,
            result: result.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// ============================================================================
// Start Server
// ============================================================================

function validateEnvironment() {
    const required = [
        'SP_API_CLIENT_ID',
        'SP_API_CLIENT_SECRET',
        'SP_API_REFRESH_TOKEN',
        'CATALOG_PATH'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nPlease set these in your .env file or environment.\n');
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    if (mcpProcess) {
        mcpProcess.kill();
    }
    process.exit(0);
});

// Start everything
console.log('🚀 Starting SP-API MCP HTTP Bridge...\n');
validateEnvironment();
startMCPServer();

app.listen(PORT, () => {
    console.log(`\n✅ HTTP Bridge running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health          - Health check`);
    console.log(`  GET  /tools           - List available tools`);
    console.log(`  POST /api/execute     - Execute SP-API call`);
    console.log(`  POST /api/explore     - Explore API catalog`);
    console.log(`  POST /api/external    - Execute external API call`);
    console.log(`  POST /mcp/call        - Generic MCP tool call\n`);
});
