// tests/test_app.js
const { requestListener } = require('../src/app');
const httpMocks = require('node-mocks-http');

test('requestListener returns JSON message', () => {
  const req = httpMocks.createRequest({ method: 'GET', url: '/' });
  const res = httpMocks.createResponse();
  requestListener(req, res);
  const data = res._getData();
  expect(typeof data).toBe('string');
  const parsed = JSON.parse(data);
  expect(parsed.message).toBe('Hello from CI app');
});

