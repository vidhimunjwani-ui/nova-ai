const http = require('http');
const data = JSON.stringify({ prompt: 'test image generation' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/image',
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
    console.log('body:', body);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
