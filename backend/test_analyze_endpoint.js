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
  console.log("  DEVGAUGE STATIC ANALYSIS ENDPOINT TEST    ");
  console.log("=============================================");

  const timestamp = Date.now();
  const user1Email = `user1_${timestamp}@example.com`;
  const user2Email = `user2_${timestamp}@example.com`;
  const password = "SecurePassword123";

  let user1Token = null;
  let user2Token = null;
  let user1ProjectId = null;
  let reviewId = null;

  // 1. Sign up users
  const res1 = await request('POST', '/api/auth/register', { name: "Owner", email: user1Email, password });
  user1Token = res1.data.token;

  const res2 = await request('POST', '/api/auth/register', { name: "Non-Owner", email: user2Email, password });
  user2Token = res2.data.token;

  // 2. Submit a pasted JS snippet for User 1 (with some linter issues: unused vars and undeclared vars)
  console.log("[Test 1] Creating a JS project with syntax issues for User 1...");
  const res3 = await request('POST', '/api/projects', {
    project_name: "Test Linter Project",
    code: "const x = 5;\nconsole.log(y);",
    language: "javascript"
  }, {
    'Authorization': `Bearer ${user1Token}`
  });
  user1ProjectId = res3.data.id;
  console.log(` -> Created project ID: ${user1ProjectId}`);

  // 3. Reject analysis call if requested by non-owner (User 2)
  console.log("[Test 2] Rejecting analysis request from non-owner...");
  const res4 = await request('POST', `/api/projects/${user1ProjectId}/analyze`, null, {
    'Authorization': `Bearer ${user2Token}`
  });
  console.log(` -> Status: ${res4.status} (Expected: 404)`);
  if (res4.status === 404) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", res4.data);
  }

  // 4. Trigger analysis for Owner (User 1)
  console.log("[Test 3] Triggering analysis as the owner...");
  const res5 = await request('POST', `/api/projects/${user1ProjectId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res5.status} (Expected: 200)`);
  if (res5.status === 200) {
    reviewId = res5.data.id;
    console.log(" -> PASS");
    console.log(` -> Score: ${res5.data.overall_score}`);
    console.log(` -> Summary: "${res5.data.summary}"`);
    console.log(` -> Review ID created: ${reviewId}`);
  } else {
    console.error(" -> FAIL:", res5.data);
    process.exit(1);
  }

  // 5. Retrieve review details as Owner (User 1)
  console.log("[Test 4] Retrieving review details as Owner...");
  const res6 = await request('GET', `/api/reviews/${reviewId}`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res6.status} (Expected: 200)`);
  if (res6.status === 200 && res6.data.findings.length > 0) {
    console.log(" -> PASS");
    console.log(` -> Overall Score: ${res6.data.overall_score}`);
    console.log(` -> Findings count: ${res6.data.findings.length}`);
  } else {
    console.error(" -> FAIL:", res6.data);
  }

  // 6. Reject review details retrieval for Non-Owner (User 2)
  console.log("[Test 5] Rejecting review details query by non-owner...");
  const res7 = await request('GET', `/api/reviews/${reviewId}`, null, {
    'Authorization': `Bearer ${user2Token}`
  });
  console.log(` -> Status: ${res7.status} (Expected: 404)`);
  if (res7.status === 404) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", res7.data);
  }

  console.log("\n=============================================");
  console.log("           INTEGRATION TEST COMPLETE         ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
