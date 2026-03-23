# HTTP Bridge Setup Guide

This guide explains how to set up and use the HTTP bridge to expose the SP-API MCP Server over HTTP for your web application.

## 🎯 What This Does

The HTTP bridge allows your **seller-chatbot web application** to communicate with the SP-API MCP server via HTTP REST API calls instead of stdio (standard input/output).

## 📋 Prerequisites

1. ✅ Node.js 16+ installed
2. ✅ Amazon SP-API credentials (Client ID, Client Secret, Refresh Token)
3. ✅ `selling-partner-api-models` repository cloned
4. ✅ Dependencies installed (`npm install` already done)
5. ✅ Express and CORS installed (already done)

## 🔧 Setup Steps

### Step 1: Create .env File

Copy the example environment file and fill in your credentials:

```bash
# In the sp-api-mcp-server directory
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# Your SP-API Credentials
SP_API_CLIENT_ID=amzn1.application-oa2-client.xxxxx
SP_API_CLIENT_SECRET=your_secret_here
SP_API_REFRESH_TOKEN=Atzr|xxxxx

# Your region's base URL
SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com

# Absolute path to models directory
CATALOG_PATH=C:/Users/sakshsiw/Desktop/SellerBridge/selling-partner-api-models/models

# HTTP server port (optional, defaults to 3001)
MCP_HTTP_PORT=3001
```

### Step 2: Verify Models Directory

Make sure you have the `selling-partner-api-models` repository:

```bash
# Check if the directory exists
cd C:\Users\sakshsiw\Desktop\SellerBridge
dir selling-partner-api-models
```

If not, clone it:

```bash
git clone https://github.com/amzn/selling-partner-api-models.git
```

### Step 3: Start the HTTP Bridge

```bash
cd C:\Users\sakshsiw\Desktop\SellerBridge\selling-partner-api-samples\use-cases\sp-api-mcp-server
node http-bridge.js
```

You should see:

```
🚀 Starting SP-API MCP HTTP Bridge...

Starting MCP server...
MCP server started successfully

✅ HTTP Bridge running on http://localhost:3001

Available endpoints:
  GET  /health          - Health check
  GET  /tools           - List available tools
  POST /api/execute     - Execute SP-API call
  POST /api/explore     - Explore API catalog
  POST /api/external    - Execute external API call
  POST /mcp/call        - Generic MCP tool call
```

## 🚀 Using the HTTP Bridge from Your Web App

### Example 1: Get Orders

```javascript
// From your seller-chatbot web application
const response = await fetch('http://localhost:3001/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'getOrders',
    parameters: {
      MarketplaceIds: ['ATVPDKIKX0DER'],
      CreatedAfter: '2024-01-01T00:00:00Z'
    }
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: Explore Available Endpoints

```javascript
// List all SP-API categories
const response = await fetch('http://localhost:3001/api/explore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    listCategories: true
  })
});

const categories = await response.json();
```

### Example 3: Get Endpoint Details

```javascript
// Get details about a specific endpoint
const response = await fetch('http://localhost:3001/api/explore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint: 'getOrders'
  })
});

const details = await response.json();
```

### Example 4: Health Check

```javascript
// Check if the server is running
const response = await fetch('http://localhost:3001/health');
const health = await response.json();
// Returns: { status: 'ok', mcpServerRunning: true, uptime: 123.456 }
```

## 📡 Available API Endpoints

### GET /health
Check server health and status
- **Response**: `{ status: 'ok', mcpServerRunning: true, uptime: 123 }`

### GET /tools
List all available MCP tools
- **Response**: `{ success: true, tools: [...] }`

### POST /api/execute
Execute SP-API calls
- **Body**:
  ```json
  {
    "endpoint": "getOrders",
    "parameters": { ... },
    "region": "us-east-1",
    "generateCode": false,
    "rawMode": false
  }
  ```

### POST /api/explore
Explore API catalog
- **Body**:
  ```json
  {
    "endpoint": "getOrders",       // Optional: specific endpoint
    "category": "orders",           // Optional: category
    "listCategories": true,         // Optional: list all categories
    "listEndpoints": true,          // Optional: list all endpoints
    "depth": "full"                 // Optional: response depth
  }
  ```

### POST /api/external
Call external APIs
- **Body**:
  ```json
  {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {},
    "queryParams": {},
    "body": ""
  }
  ```

### POST /mcp/call
Generic MCP tool call
- **Body**:
  ```json
  {
    "tool": "execute-sp-api",
    "arguments": { ... }
  }
  ```

## 🔗 Integrating with Your Chatbot

Update your `app.py` or `app_bedrock.py` to call the HTTP bridge:

```python
import requests

def call_mcp_server(endpoint, parameters):
    """Call the MCP server via HTTP bridge"""
    try:
        response = requests.post(
            'http://localhost:3001/api/execute',
            json={
                'endpoint': endpoint,
                'parameters': parameters
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error calling MCP server: {e}")
        return None

# Example usage
orders = call_mcp_server('getOrders', {
    'MarketplaceIds': ['ATVPDKIKX0DER'],
    'CreatedAfter': '2024-01-01T00:00:00Z'
})
```

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"
```bash
npm install express cors
```

### Error: "Missing required environment variables"
Make sure you created the `.env` file with all required variables.

### Error: "MCP server is not running"
The bridge automatically restarts the MCP server if it crashes. Wait a few seconds and try again.

### Error: "CATALOG_PATH not found"
Verify the path to `selling-partner-api-models/models` is correct and absolute.

### Port Already in Use
Change the port in your `.env`:
```env
MCP_HTTP_PORT=3002
```

## 📝 Testing

### Test with curl (Command Line)

```bash
# Health check
curl http://localhost:3001/health

# List tools
curl http://localhost:3001/tools

# Explore categories
curl -X POST http://localhost:3001/api/explore \
  -H "Content-Type: application/json" \
  -d "{\"listCategories\": true}"
```

### Test with Python

```python
import requests

# Health check
response = requests.get('http://localhost:3001/health')
print(response.json())

# Explore API
response = requests.post(
    'http://localhost:3001/api/explore',
    json={'listCategories': True}
)
print(response.json())
```

## 🔒 Security Notes

1. **Do NOT expose this to the internet** - it's meant for local development only
2. Keep your `.env` file secure and never commit it to version control
3. The bridge runs on localhost by default (not accessible from other machines)
4. Consider adding authentication if you need to deploy this

## 🎉 Next Steps

1. ✅ Start the HTTP bridge: `node http-bridge.js`
2. ✅ Update your chatbot to call the HTTP endpoints
3. ✅ Test with simple API calls first (health check, explore)
4. ✅ Integrate full SP-API functionality into your chatbot

## 📚 Additional Resources

- [SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [SP-API Models GitHub](https://github.com/amzn/selling-partner-api-models)
- [MCP Protocol](https://modelcontextprotocol.io/)

---

Need help? Check the logs when you run `node http-bridge.js` for detailed error messages.
