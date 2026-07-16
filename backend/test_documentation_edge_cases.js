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
  console.log("     DEVGAUGE DOCUMENTATION EDGE CASES TEST  ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email1 = `docs_edge_1_${timestamp}@example.com`;
  const email2 = `docs_edge_2_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up users
  const user1 = await request('POST', '/api/auth/register', { name: "User One", email: email1, password });
  const token1 = user1.data.token;

  const user2 = await request('POST', '/api/auth/register', { name: "User Two", email: email2, password });
  const token2 = user2.data.token;

  // --- EDGE CASE 1: Zero Functions / Script only ---
  console.log("\n[Edge Case 1] File with zero functions/classes...");
  const projectScript = await request('POST', '/api/projects', {
    project_name: "Script Project",
    code: "console.log('Hello world');\nconst x = 100;",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token1}` });

  const scriptProjId = projectScript.data.id;
  const analysisScript = await request('POST', `/api/projects/${scriptProjId}/documentation`, null, {
    'Authorization': `Bearer ${token1}`
  });
  console.log(` -> Response Status: ${analysisScript.status} (Expected: 201)`);
  console.log(` -> Summary: "${analysisScript.data.review.summary}"`);
  console.log(` -> Total documentation entries: ${analysisScript.data.entries.length} (Expected: 1)`);
  if (analysisScript.status === 201 && analysisScript.data.entries.length === 1) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 2: Project Privacy (404/403) ---
  console.log("\n[Edge Case 2] Project privacy check...");
  const analysisPrivacy = await request('POST', `/api/projects/${scriptProjId}/documentation`, null, {
    'Authorization': `Bearer ${token2}` // User 2 trying to read User 1's project docs
  });
  console.log(` -> Response Status: ${analysisPrivacy.status} (Expected: 404)`);
  console.log(` -> Message: "${analysisPrivacy.data.message}"`);
  if (analysisPrivacy.status === 404 && analysisPrivacy.data.message.includes("not found")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 3: Empty file ---
  console.log("\n[Edge Case 3] Empty file check...");
  // Note: project creation rejects empty code, so we test trigger of project creation returning 400
  const analysisEmpty = await request('POST', '/api/projects', {
    project_name: "Empty Project",
    code: "   ", // whitespace only
    language: "javascript"
  }, { 'Authorization': `Bearer ${token1}` });
  console.log(` -> Response Status: ${analysisEmpty.status} (Expected: 400)`);
  console.log(` -> Message: "${analysisEmpty.data.message}"`);
  if (analysisEmpty.status === 400 && analysisEmpty.data.message.includes("empty")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 4: Async/Await Syntax ---
  console.log("\n[Edge Case 4] Async/Await Syntax...");
  const projectAsync = await request('POST', '/api/projects', {
    project_name: "Async Project",
    code: `
      async function fetchData(url) {
        const response = await fetch(url);
        return await response.json();
      }
    `,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token1}` });

  const asyncProjId = projectAsync.data.id;
  const analysisAsync = await request('POST', `/api/projects/${asyncProjId}/documentation`, null, {
    'Authorization': `Bearer ${token1}`
  });
  console.log(` -> Response Status: ${analysisAsync.status} (Expected: 201)`);
  console.log(` -> Total entries: ${analysisAsync.data.entries.length} (Expected: >= 2)`);
  if (analysisAsync.status === 201 && analysisAsync.data.entries.length >= 2) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("     DOCUMENTATION EDGE CASES COMPLETE       ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
