const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('Bootstrapping admin...');
  const bootstrap = await post('/api/auth/bootstrap', {
    setupKey: 'cybercarnival-admin-setup-key-2026',
    username: 'admin',
    email: 'admin@test.com',
    password: 'adminpass123'
  });
  console.log('Bootstrap:', bootstrap.status, bootstrap.body);

  console.log('Logging in as admin...');
  const login = await post('/api/auth/login', {
    username: 'admin',
    password: 'adminpass123'
  });
  console.log('Login:', login.status, login.body);

  // Extract cookie
  const cookie = login.body ? login.body : '';
  console.log('Done!');
}

main().catch(console.error);