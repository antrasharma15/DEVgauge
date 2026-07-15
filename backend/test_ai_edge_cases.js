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
  console.log("       DEVGAUGE AI EDGE CASES TESTS          ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `ai_edge_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up test user
  const registerRes = await request('POST', '/api/auth/register', { name: "AI Edge User", email, password });
  const token = registerRes.data.token;

  // --- EDGE CASE 1: Size limits (Over 50KB) ---
  console.log("\n[Edge Case 1] Submit code exceeding 50KB size threshold...");
  // Create a code string representing ~55KB of data
  const longCode = "console.log('padding');\n".repeat(2500);
  
  const projectLarge = await request('POST', '/api/projects', {
    project_name: "Over-50KB-Snippet",
    code: longCode,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const largeProjId = projectLarge.data.id;
  const analysisLarge = await request('POST', `/api/projects/${largeProjId}/ai-review`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Response Status: ${analysisLarge.status} (Expected: 400)`);
  console.log(` -> Error Message: "${analysisLarge.data.message}"`);
  if (analysisLarge.status === 400 && analysisLarge.data.message.includes('exceeds AI review limit')) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 2: Duplicate AI Scans (Preserve history) ---
  console.log("\n[Edge Case 2] Trigger duplicate AI reviews on same project...");
  const projectNormal = await request('POST', '/api/projects', {
    project_name: "AI History Project",
    code: "const x = 1;\nconsole.log(x);",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });
  
  const normProjId = projectNormal.data.id;
  
  console.log(" -> Running first AI scan...");
  const run1 = await request('POST', `/api/projects/${normProjId}/ai-review`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(`    -> Review ID 1: ${run1.data.id}`);

  console.log(" -> Running second AI scan...");
  const run2 = await request('POST', `/api/projects/${normProjId}/ai-review`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(`    -> Review ID 2: ${run2.data.id}`);

  if (run1.status === 200 && run2.status === 200 && run1.data.id !== run2.data.id) {
    console.log(" -> PASS (Review history preserved correctly for AI runs)");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("         AI EDGE CASES COMPLETE              ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
