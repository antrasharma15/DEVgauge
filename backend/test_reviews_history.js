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
  console.log("      DEVGAUGE REVIEWS HISTORY LIST TEST     ");
  console.log("=============================================");

  const timestamp = Date.now();
  const user1Email = `history1_${timestamp}@example.com`;
  const user2Email = `history2_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Register test users
  const res1 = await request('POST', '/api/auth/register', { name: "Audit User One", email: user1Email, password });
  const user1Token = res1.data.token;

  const res2 = await request('POST', '/api/auth/register', { name: "Audit User Two", email: user2Email, password });
  const user2Token = res2.data.token;

  // 2. Submit a JS project for User 1
  console.log("[Test] Submitting code snippet for User 1...");
  const project = await request('POST', '/api/projects', {
    project_name: "Audit History Test Snippet",
    code: "let x = 1;\nconsole.log(x);",
    language: "javascript"
  }, { 'Authorization': `Bearer ${user1Token}` });
  
  const projectId = project.data.id;
  console.log(` -> Created project ID: ${projectId}`);

  // 3. Trigger 2 static linter analysis scans
  console.log("[Test] Running first linter analysis scan...");
  const run1 = await request('POST', `/api/projects/${projectId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> First audit score: ${run1.data.overall_score} (Review ID: ${run1.data.id})`);

  console.log("[Test] Running second linter analysis scan...");
  const run2 = await request('POST', `/api/projects/${projectId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Second audit score: ${run2.data.overall_score} (Review ID: ${run2.data.id})`);

  // 4. Fetch history list from GET /api/projects/:id/reviews
  console.log("[Test] Fetching reviews history list as the owner...");
  const historyRes = await request('GET', `/api/projects/${projectId}/reviews`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Response Status: ${historyRes.status} (Expected: 200)`);
  console.log(` -> Audit runs returned: ${historyRes.data.length} (Expected: 2)`);
  
  if (historyRes.status === 200 && historyRes.data.length === 2) {
    console.log(" -> PASS (History list query succeeded)");
  } else {
    console.error(" -> FAIL:", historyRes.data);
  }

  // 5. Test privacy access from User 2 (non-owner)
  console.log("[Test] Fetching reviews history list as a different user...");
  const privacyRes = await request('GET', `/api/projects/${projectId}/reviews`, null, {
    'Authorization': `Bearer ${user2Token}`
  });
  console.log(` -> Response Status: ${privacyRes.status} (Expected: 404)`);
  
  if (privacyRes.status === 404) {
    console.log(" -> PASS (Access correctly rejected)");
  } else {
    console.error(" -> FAIL:", privacyRes.data);
  }

  console.log("\n=============================================");
  console.log("           REVIEWS HISTORY LOG COMPLETE      ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
