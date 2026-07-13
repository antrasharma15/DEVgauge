// Simple auth verification script for DEVgauge backend
// Runs registration, login, and retrieval of user profiles

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const postData = (path, data) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const getData = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

async function runTests() {
  console.log("=== DEVgauge Auth API Integration Test ===");
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "securepassword123";

  // Test 1: Register User
  console.log("\n[Test 1] Registering a new user...");
  try {
    const regResult = await postData('/api/auth/register', {
      name: "Test User",
      email: testEmail,
      password: testPassword
    });

    console.log(`Status: ${regResult.status}`);
    console.log("Response:", JSON.stringify(regResult.data, null, 2));

    if (regResult.status !== 201) {
      console.error("FAIL: Registration failed. Ensure your database is running and connected.");
      return;
    }

    const token = regResult.data.token;

    // Test 2: Login User
    console.log("\n[Test 2] Logging in user...");
    const loginResult = await postData('/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    console.log(`Status: ${loginResult.status}`);
    console.log("Response Token exists:", !!loginResult.data.token);

    if (loginResult.status !== 200) {
      console.error("FAIL: Login failed.");
      return;
    }

    // Test 3: Fetch Profile (Me)
    console.log("\n[Test 3] Fetching user profile...");
    const meResult = await getData('/api/auth/me', token);
    console.log(`Status: ${meResult.status}`);
    console.log("Profile Data:", JSON.stringify(meResult.data, null, 2));

    if (meResult.status === 200 && meResult.data.email === testEmail) {
      console.log("\n=== SUCCESS: All authentication tests passed! ===");
    } else {
      console.error("FAIL: Profile retrieval mismatch.");
    }

  } catch (err) {
    console.error("FAIL: Request failed with error:", err.message);
  }
}

// Check if server is running before executing tests
const checkServer = http.get(`http://localhost:${PORT}/api/health`, (res) => {
  runTests();
}).on('error', (err) => {
  console.error(`ERROR: Server is not running on port ${PORT}. Please run 'npm run dev' first.`);
});
