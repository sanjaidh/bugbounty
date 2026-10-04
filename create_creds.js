const http = require('http');

let adminCookie = '';

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
  // Login as admin
  console.log('Logging in as admin...');
  const login = await post('/api/auth/login', {
    username: 'admin',
    password: 'adminpass123'
  });
  console.log('Admin login:', login.status);
  
  if (login.cookie) {
    adminCookie = login.cookie[0].split(';')[0];
  }

  // Get teams
  console.log('Getting teams...');
  const teams = await get('/api/admin/teams', adminCookie);
  console.log('Teams:', teams.body);
  const teamList = JSON.parse(teams.body).teams;
  const teamId = teamList[0]?.id;
  console.log('Team ID:', teamId);

  // Create participant
  console.log('Creating participant...');
  const participant = await post('/api/admin/users', {
    username: 'player1',
    email: 'player1@test.com',
    password: 'playerpass123',
    teamId: teamId
  }, adminCookie);
  console.log('Participant:', participant.status, participant.body);

  // Login as participant
  console.log('Logging in as participant...');
  const playerLogin = await post('/api/auth/login', {
    username: 'player1',
    password: 'playerpass123'
  });
  console.log('Player login:', playerLogin.status, playerLogin.body);
  
  if (playerLogin.cookie) {
    const playerCookie = playerLogin.cookie[0].split(';')[0];
    console.log('Player cookie:', playerCookie);
  }
  
  console.log('\n=== CREDENTIALS ===');
  console.log('Admin: admin / adminpass123');
  console.log('Player: player1 / playerpass123');
  console.log('Team: TeamAlpha (ID: ' + teamId + ')');
}

main().catch(console.error);