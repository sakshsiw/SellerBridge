#!/usr/bin/env node

// Test script for execute-external-api tool
import { ExecuteExternalApiTool } from './build/tools/execute-external-api-tool.js';

const tool = new ExecuteExternalApiTool();

console.log('='.repeat(80));
console.log('Testing External API Tool with JSONPlaceholder');
console.log('='.repeat(80));

// Test 1: GET request
console.log('\n📝 Test 1: GET request to /posts/1\n');
const test1 = await tool.execute({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET'
});
console.log(test1);

console.log('\n' + '='.repeat(80) + '\n');

// Test 2: POST request
console.log('📝 Test 2: POST request to /posts\n');
const test2 = await tool.execute({
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  body: {
    title: 'Test Post from SP-API MCP Server',
    body: 'This is a test post to verify external API functionality',
    userId: 1
  }
});
console.log(test2);

console.log('\n' + '='.repeat(80) + '\n');

// Test 3: PATCH request
console.log('📝 Test 3: PATCH request to /posts/1\n');
const test3 = await tool.execute({
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'PATCH',
  body: {
    title: 'Updated Title'
  }
});
console.log(test3);

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!');
console.log('='.repeat(80));
