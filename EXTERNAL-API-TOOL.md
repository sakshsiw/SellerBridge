# Execute External API Tool

## Overview

The `execute-external-api` tool allows you to make HTTP requests to external REST APIs (non-Amazon APIs) from your SP-API MCP Server. This tool is useful for integrating with third-party services, webhooks, or any external API endpoint.

## Features

- ✅ Support for GET, POST, PUT, PATCH, DELETE methods
- ✅ Full URL support (no catalog lookup required)
- ✅ Custom headers support
- ✅ Request body support for POST/PUT/PATCH
- ✅ Query parameter support
- ✅ Configurable timeout
- ✅ Detailed request/response logging
- ✅ Error handling with recommendations
- ✅ Response timing metrics

## Tool Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | Full URL of the external API endpoint |
| `method` | enum | No | "GET" | HTTP method: GET, POST, PUT, PATCH, DELETE |
| `headers` | object | No | {} | Custom request headers |
| `body` | any | No | - | Request body (for POST, PUT, PATCH) |
| `queryParams` | object | No | {} | Query parameters to append to URL |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |

## Usage Examples

### 1. GET Request

```javascript
{
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "method": "GET"
}
```

**Response:**
```json
{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum..."
}
```

### 2. POST Request

```javascript
{
  "url": "https://jsonplaceholder.typicode.com/posts",
  "method": "POST",
  "body": {
    "title": "My New Post",
    "body": "This is the content of my post",
    "userId": 1
  }
}
```

**Response:**
```json
{
  "title": "My New Post",
  "body": "This is the content of my post",
  "userId": 1,
  "id": 101
}
```

### 3. PATCH Request

```javascript
{
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "method": "PATCH",
  "body": {
    "title": "Updated Title"
  }
}
```

### 4. GET Request with Query Parameters

```javascript
{
  "url": "https://api.example.com/search",
  "method": "GET",
  "queryParams": {
    "q": "search term",
    "limit": 10,
    "page": 1
  }
}
```

This will make a request to: `https://api.example.com/search?q=search%20term&limit=10&page=1`

### 5. Request with Custom Headers

```javascript
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_HERE",
    "X-Custom-Header": "custom-value"
  }
}
```

### 6. Request with Custom Timeout

```javascript
{
  "url": "https://slow-api.example.com/data",
  "method": "GET",
  "timeout": 60000  // 60 seconds
}
```

## Response Format

The tool returns a formatted markdown response with the following sections:

### Success Response (200-299 status codes)

```markdown
# External API Response

✅ **Status**: 200 OK
⏱️  **Duration**: 60ms

## Request
- **Method**: GET
- **URL**: https://example.com/api

### Request Headers
```json
{
  "User-Agent": "SP-API-MCP-Server-External/1.0.0",
  "Accept": "application/json"
}
```

### Request Body (if applicable)
```json
{
  "key": "value"
}
```

## Response

### Response Headers
```json
{
  "content-type": "application/json",
  ...
}
```

### Response Data
```json
{
  "result": "data"
}
```

## Summary
✅ Request completed successfully
- Response type: object
- Properties: 4
```

### Error Response

```markdown
# External API Error

❌ **Status**: 404 Not Found
⏱️  **Duration**: 100ms

## Request
...

## Response

### Error Details
- **Code**: 404
- **Message**: Not Found

#### Additional Details
```json
{
  "error": "Resource not found"
}
```

### Recommendations
- Verify the URL is correct
- Check if the resource exists
```

## Test Script

A test script is included to verify the tool functionality:

```bash
cd selling-partner-api-samples/use-cases/sp-api-mcp-server
node test-external-api.js
```

This script tests:
1. GET request to JSONPlaceholder API
2. POST request to create a new post
3. PATCH request to update a post

## Use Cases

### 1. Third-Party API Integration
Call external services like payment processors, shipping APIs, or data providers.

### 2. Webhooks
Send webhook notifications to external systems when certain events occur.

### 3. Data Synchronization
Sync data between Amazon SP-API and external systems.

### 4. Testing
Test external API endpoints without switching tools.

### 5. Microservices Communication
Communicate with your own microservices or backend APIs.

## Error Handling

The tool provides comprehensive error handling and recommendations:

| Error Type | Status Code | Recommendations |
|------------|-------------|-----------------|
| Bad Request | 400 | Check parameters and body format |
| Unauthorized | 401 | Add authentication headers |
| Forbidden | 403 | Verify API key or token |
| Not Found | 404 | Verify URL and resource existence |
| Rate Limited | 429 | Wait before retrying |
| Server Error | 500-504 | Retry later, check API status |
| Network Error | - | Check network connection |

## Default Headers

The tool automatically adds these headers (can be overridden):

```javascript
{
  "User-Agent": "SP-API-MCP-Server-External/1.0.0",
  "Accept": "application/json",
  "Content-Type": "application/json"  // For POST/PUT/PATCH with body
}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **No Authentication Built-in**: This tool does NOT include authentication. You must provide authentication headers manually.

2. **Credentials in Requests**: Be careful when passing API keys or tokens in headers. They will appear in logs.

3. **HTTPS Recommended**: Always use HTTPS URLs for secure communication.

4. **Rate Limiting**: Respect external API rate limits to avoid being blocked.

5. **Data Privacy**: Be mindful of what data you send to external APIs.

## Future Enhancements

Planned features for future versions:

- [ ] OAuth 2.0 authentication support
- [ ] Request retry with exponential backoff
- [ ] Response caching
- [ ] Request/response transformations
- [ ] Batch requests support
- [ ] File upload/download support

## Differences from execute-sp-api Tool

| Feature | execute-sp-api | execute-external-api |
|---------|----------------|---------------------|
| Target | Amazon SP-API only | Any external REST API |
| URL Format | Endpoint ID from catalog | Full URL required |
| Authentication | AWS Signature V4 + LWA | Manual (via headers) |
| Catalog | Uses SP-API catalog | No catalog needed |
| Parameter Validation | Validates against catalog | Basic validation only |

## Troubleshooting

### Tool Not Found in MCP Server

After adding the tool, you need to restart the MCP server:

1. Rebuild the project: `npm run build`
2. Restart the MCP server connection
3. Verify the tool is registered

### CORS Errors

If calling from a browser context, CORS errors may occur. This is expected for browser-based requests to external APIs. The tool is designed for server-side use.

### Timeout Errors

If requests timeout frequently:
1. Increase the `timeout` parameter
2. Check your network connection
3. Verify the external API is responsive

## Examples Repository

See the test script (`test-external-api.js`) for working examples of all HTTP methods.

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Review the recommendations in error responses
3. Verify your request parameters match the external API requirements

---

**Version**: 1.0.0  
**Last Updated**: February 2026
