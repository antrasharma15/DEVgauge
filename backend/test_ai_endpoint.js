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
  console.log("        DEVGAUGE AI ENDPOINT TEST            ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `ai_endpoint_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up test user
  const registerRes = await request('POST', '/api/auth/register', { name: "AI Review User", email, password });
  const token = registerRes.data.token;

  // 2. Submit a JS code snippet with issues
  console.log("[Test] Creating a JS project with vulnerabilities...");
  const projectRes = await request('POST', '/api/projects', {
    project_name: "AI Endpoint Vulnerability Snippet",
    code: `
      const apiKey = "12345-abcde-secret-token";
      function check(req) {
        const query = "SELECT * FROM items WHERE name = '" + req.body.name + "'";
        return db.query(query);
      }
    `,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const projectId = projectRes.data.id;
  console.log(` -> Created project ID: ${projectId}`);

  // 3. Trigger AI review via POST /api/projects/:id/ai-review
  console.log("[Test] Triggering AI review...");
  const aiRes = await request('POST', `/api/projects/${projectId}/ai-review`, null, {
    'Authorization': `Bearer ${token}`
  });

  console.log(` -> Response Status: ${aiRes.status} (Expected: 200)`);
  console.log(` -> Review Type: "${aiRes.data.review_type}" (Expected: ai)`);
  console.log(` -> Overall Quality Score: ${aiRes.data.overall_score}`);
  console.log(` -> Summary One-liner: "${aiRes.data.summary}"`);
  console.log(` -> Findings count: ${aiRes.data.findings.length}`);

  if (aiRes.status === 200 && aiRes.data.review_type === 'ai' && aiRes.data.findings.length > 0) {
    console.log(" -> PASS (AI Review endpoint works and parses JSON results correctly)");
  } else {
    console.error(" -> FAIL:", aiRes.data);
  }

  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
