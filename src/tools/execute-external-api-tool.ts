// src/tools/execute-external-api-tool.ts

import { z } from 'zod';
import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger.js';

export const executeExternalApiSchema = z.object({
  url: z.string().url().describe("Full URL of the external API endpoint (required)"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().default("GET").describe("HTTP method"),
  headers: z.record(z.string()).optional().describe("Request headers"),
  body: z.any().optional().describe("Request body (for POST, PUT, PATCH)"),
  queryParams: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Query parameters to append to URL"),
  timeout: z.number().optional().default(30000).describe("Request timeout in milliseconds (default: 30000)")
});

export type ExecuteExternalApiParams = z.infer<typeof executeExternalApiSchema>;

interface ExternalApiResult {
  success: boolean;
  statusCode?: number;
  statusMessage?: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  response: {
    headers: Record<string, string>;
    data: any;
  };
  timing: {
    durationMs: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ExecuteExternalApiTool {
  async execute(params: ExecuteExternalApiParams): Promise<string> {
    logger.debug('Executing execute-external-api tool with params:', JSON.stringify(params, null, 2));
    
    const startTime = Date.now();
    
    try {
      // Build the full URL with query parameters
      const url = this.buildUrl(params.url, params.queryParams);
      
      // Prepare headers with defaults
      const headers = this.prepareHeaders(params.method, params.headers, params.body);
      
      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: params.method,
        url,
        headers,
        timeout: params.timeout,
        validateStatus: () => true // Don't throw on any status code
      };
      
      // Add body for methods that support it
      if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method)) {
        axiosConfig.data = params.body;
      }
      
      logger.info('==== EXTERNAL API REQUEST ====');
      logger.info(`Method: ${params.method}`);
      logger.info(`URL: ${url}`);
      logger.info('Headers:', JSON.stringify(headers, null, 2));
      if (params.body) {
        logger.info('Body:', JSON.stringify(params.body, null, 2));
      }
      logger.info('============================');
      
      // Execute the request
      const response = await axios(axiosConfig);
      
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      logger.info('==== EXTERNAL API RESPONSE ====');
      logger.info(`Status: ${response.status} ${response.statusText}`);
      logger.info(`Duration: ${durationMs}ms`);
      logger.info('Headers:', JSON.stringify(response.headers, null, 2));
      logger.info('Data:', JSON.stringify(response.data, null, 2));
      logger.info('==============================');
      
      // Prepare result
      const success = response.status >= 200 && response.status < 300;
      
      const result: ExternalApiResult = {
        success,
        statusCode: response.status,
        statusMessage: response.statusText,
        request: {
          url,
          method: params.method,
          headers,
          body: params.body
        },
        response: {
          headers: response.headers as Record<string, string>,
          data: response.data
        },
        timing: {
          durationMs
        }
      };
      
      // Add error details if not successful
      if (!success) {
        result.error = {
          code: String(response.status),
          message: response.statusText || 'Request failed',
          details: response.data
        };
      }
      
      return this.formatResult(result);
      
    } catch (error: any) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      logger.error('Error executing external API request:', error);
      
      // Prepare error result
      const result: ExternalApiResult = {
        success: false,
        request: {
          url: params.url,
          method: params.method,
          headers: params.headers || {},
          body: params.body
        },
        response: {
          headers: {},
          data: null
        },
        timing: {
          durationMs
        },
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'An unknown error occurred',
          details: {
            name: error.name,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          }
        }
      };
      
      return this.formatResult(result);
    }
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(baseUrl: string, queryParams?: Record<string, string | number | boolean>): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }
    
    const url = new URL(baseUrl);
    
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.append(key, String(value));
    }
    
    return url.toString();
  }
  
  /**
   * Prepare headers with appropriate defaults
   */
  private prepareHeaders(
    method: string,
    userHeaders?: Record<string, string>,
    body?: any
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'SP-API-MCP-Server-External/1.0.0',
      'Accept': 'application/json'
    };
    
    // Add Content-Type for methods that send a body
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Merge user headers (they override defaults)
    if (userHeaders) {
      Object.assign(headers, userHeaders);
    }
    
    return headers;
  }
  
  /**
   * Format the result for display
   */
  private formatResult(result: ExternalApiResult): string {
    let output = `# External API ${result.success ? 'Response' : 'Error'}\n\n`;
    
    // Status
    output += `${result.success ? '✅' : '❌'} **Status**: ${result.statusCode || 'N/A'} ${result.statusMessage || ''}\n`;
    output += `⏱️  **Duration**: ${result.timing.durationMs}ms\n\n`;
    
    // Request details
    output += `## Request\n`;
    output += `- **Method**: ${result.request.method}\n`;
    output += `- **URL**: ${result.request.url}\n\n`;
    
    // Request headers
    output += `### Request Headers\n`;
    output += `\`\`\`json\n${JSON.stringify(result.request.headers, null, 2)}\n\`\`\`\n\n`;
    
    // Request body (if present)
    if (result.request.body) {
      output += `### Request Body\n`;
      output += `\`\`\`json\n${JSON.stringify(result.request.body, null, 2)}\n\`\`\`\n\n`;
    }
    
    // Response section
    output += `## Response\n\n`;
    
    if (result.success) {
      // Response headers
      output += `### Response Headers\n`;
      output += `\`\`\`json\n${JSON.stringify(result.response.headers, null, 2)}\n\`\`\`\n\n`;
      
      // Response data
      output += `### Response Data\n`;
      output += `\`\`\`json\n${JSON.stringify(result.response.data, null, 2)}\n\`\`\`\n\n`;
      
      // Summary
      output += `## Summary\n`;
      output += `✅ Request completed successfully\n`;
      
      if (result.response.data) {
        const dataType = Array.isArray(result.response.data) ? 'array' : typeof result.response.data;
        output += `- Response type: ${dataType}\n`;
        
        if (Array.isArray(result.response.data)) {
          output += `- Items count: ${result.response.data.length}\n`;
        } else if (typeof result.response.data === 'object' && result.response.data !== null) {
          output += `- Properties: ${Object.keys(result.response.data).length}\n`;
        }
      }
      
    } else if (result.error) {
      // Error details
      output += `### Error Details\n`;
      output += `- **Code**: ${result.error.code}\n`;
      output += `- **Message**: ${result.error.message}\n\n`;
      
      if (result.error.details) {
        output += `#### Additional Details\n`;
        output += `\`\`\`json\n${JSON.stringify(result.error.details, null, 2)}\n\`\`\`\n\n`;
      }
      
      // Recommendations
      output += `### Recommendations\n`;
      output += this.getErrorRecommendations(result.error.code, result.statusCode);
    }
    
    return output;
  }
  
  /**
   * Get error recommendations based on error code and status
   */
  private getErrorRecommendations(errorCode: string, statusCode?: number): string {
    let recommendations = '';
    
    if (statusCode) {
      switch (statusCode) {
        case 400:
          recommendations += `- Check your request parameters and body format\n`;
          recommendations += `- Verify that all required fields are provided\n`;
          break;
        case 401:
          recommendations += `- Add authentication headers if required\n`;
          recommendations += `- Verify your API credentials\n`;
          break;
        case 403:
          recommendations += `- Check if you have permission to access this resource\n`;
          recommendations += `- Verify your API key or authentication token\n`;
          break;
        case 404:
          recommendations += `- Verify the URL is correct\n`;
          recommendations += `- Check if the resource exists\n`;
          break;
        case 429:
          recommendations += `- You've hit a rate limit\n`;
          recommendations += `- Wait before retrying the request\n`;
          recommendations += `- Consider implementing exponential backoff\n`;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          recommendations += `- The server encountered an error\n`;
          recommendations += `- Try again later\n`;
          recommendations += `- Check the API status page if available\n`;
          break;
        default:
          recommendations += `- Review the error details above\n`;
          recommendations += `- Check the API documentation\n`;
      }
    } else {
      // Network/connection errors
      if (errorCode.includes('ECONNREFUSED')) {
        recommendations += `- The server refused the connection\n`;
        recommendations += `- Verify the URL is correct\n`;
        recommendations += `- Check if the server is running\n`;
      } else if (errorCode.includes('ETIMEDOUT') || errorCode.includes('ECONNRESET')) {
        recommendations += `- The request timed out\n`;
        recommendations += `- Check your network connection\n`;
        recommendations += `- Try increasing the timeout value\n`;
      } else if (errorCode.includes('ENOTFOUND')) {
        recommendations += `- The hostname could not be resolved\n`;
        recommendations += `- Verify the URL is correct\n`;
        recommendations += `- Check your DNS settings\n`;
      } else {
        recommendations += `- Check your network connection\n`;
        recommendations += `- Verify the URL is correct and accessible\n`;
        recommendations += `- Review the error details above\n`;
      }
    }
    
    return recommendations;
  }
}
