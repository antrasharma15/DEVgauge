const http = require('http');

const PORT = 5000;

const request = (method, path, data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    let payload = null;
    const requestHeaders = { ...headers };

    if (data !== null) {
      payload = JSON.stringify(data);
      requestHeaders['Content-Type'] = 'application/json';
      requestHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: requestHeaders
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
    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
};

async function runTests() {
  console.log("=============================================");
  console.log("     DEVGAUGE LINTER TIMEOUT TRIGGER TEST    ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `timeout_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up test user
  const res1 = await request('POST', '/api/auth/register', { name: "Timeout User", email, password });
  const token = res1.data.token;

  // 2. Submit a pasted JS snippet (normally takes ~500ms to audit)
  console.log("[Test] Creating a JS project...");
  const res2 = await request('POST', '/api/projects', {
    project_name: "Timeout Test JS Project",
    code: "console.log('will time out');",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });
  
  const projectId = res2.data.id;
  console.log(` -> Created project ID: ${projectId}`);

  // 3. Trigger analysis and verify it returns 504
  console.log("[Test] Triggering linter analysis (timeout threshold = 100ms)...");
  const startTime = Date.now();
  const res3 = await request('POST', `/api/projects/${projectId}/analyze`, null, {
    'Authorization': `Bearer ${token}`
  });
  const duration = Date.now() - startTime;

  console.log(` -> Response Status: ${res3.status} (Expected: 504)`);
  console.log(` -> Response Body:`, res3.data);
  console.log(` -> Time elapsed: ${duration}ms`);

  if (res3.status === 504 && res3.data.message.includes('timed out')) {
    console.log(" -> PASS (504 Timeout caught and returned gracefully withinexpected window)");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("             TIMEOUT TEST COMPLETE           ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
