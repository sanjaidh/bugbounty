const http = require('http');

function post(path, data, cookie = '') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (cookie) headers['Cookie'] = cookie;

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        resolve({ status: res.statusCode, body, cookie: setCookie });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Login as player
  console.log('Logging in as player...');
  const login = await post('/api/auth/login', {
    username: 'player1',
    password: 'playerpass123'
  });
  console.log('Login status:', login.status);
  
  if (login.cookie) {
    const playerCookie = login.cookie[0].split(';')[0];
    console.log('Cookie:', playerCookie);
    
    console.log('\nTesting challenges endpoint...');
    const challenges = await get('/api/challenges', playerCookie);
    console.log('Status:', challenges.status);
    console.log('Body:', challenges.body);
  }
}

main().catch(console.error);