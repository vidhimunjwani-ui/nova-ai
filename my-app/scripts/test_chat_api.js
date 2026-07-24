const http = require('http');
const data = JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('body length:', body.length);
    console.log('body (first 1000 chars):', body.slice(0, 1000));
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
