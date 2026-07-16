const http = require('http');
const fs = require('fs');
const path = require('path');

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
  console.log("     DEVGAUGE COMPLEXITY EDGE CASES TEST     ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `comp_edge_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up user
  const registerRes = await request('POST', '/api/auth/register', { name: "Edge User", email, password });
  const token = registerRes.data.token;

  // --- EDGE CASE 1: Zero Functions ---
  console.log("\n[Edge Case 1] File with zero functions...");
  const projectZero = await request('POST', '/api/projects', {
    project_name: "Zero Functions",
    code: "const x = 1;\nconsole.log(x);",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const zeroProjId = projectZero.data.id;
  const analysisZero = await request('POST', `/api/projects/${zeroProjId}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Response Status: ${analysisZero.status} (Expected: 200)`);
  console.log(` -> num_functions: ${analysisZero.data.metrics.num_functions} (Expected: 0)`);
  console.log(` -> avg_function_complexity: ${analysisZero.data.metrics.avg_function_complexity} (Expected: 0)`);
  if (analysisZero.status === 200 && analysisZero.data.metrics.num_functions === 0) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 2: Empty File (via disk truncation) ---
  console.log("\n[Edge Case 2] Empty file (via disk truncation)...");
  // First, create a valid project
  const projectToTruncate = await request('POST', '/api/projects', {
    project_name: "Truncate Me",
    code: "const validCode = 100;",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const targetProj = projectToTruncate.data;
  const absoluteFilePath = path.join(__dirname, targetProj.file_path);

  // Manually truncate the file content on disk to make it empty
  fs.writeFileSync(absoluteFilePath, "   ", "utf8");

  // Trigger complexity analysis
  const analysisEmpty = await request('POST', `/api/projects/${targetProj.id}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Response Status: ${analysisEmpty.status} (Expected: 400)`);
  console.log(` -> Message: "${analysisEmpty.data.message}"`);
  if (analysisEmpty.status === 400 && analysisEmpty.data.message.includes("empty")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 3: Syntax Errors ---
  console.log("\n[Edge Case 3] File with syntax errors...");
  const projectBroken = await request('POST', '/api/projects', {
    project_name: "Syntax Error Code",
    code: "const x = ;", // broken syntax
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const brokenProjId = projectBroken.data.id;
  const analysisBroken = await request('POST', `/api/projects/${brokenProjId}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Response Status: ${analysisBroken.status} (Expected: 502)`);
  console.log(` -> Message: "${analysisBroken.data.message}"`);
  if (analysisBroken.status === 502 && analysisBroken.data.message.includes("failed")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 4: Unsupported Language ---
  console.log("\n[Edge Case 4] Unsupported language...");
  const projectJava = await request('POST', '/api/projects', {
    project_name: "Java Code",
    code: "public class Main { }",
    language: "java"
  }, { 'Authorization': `Bearer ${token}` });

  const javaProjId = projectJava.data.id;
  const analysisJava = await request('POST', `/api/projects/${javaProjId}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Response Status: ${analysisJava.status} (Expected: 400)`);
  console.log(` -> Message: "${analysisJava.data.message}"`);
  if (analysisJava.status === 400 && analysisJava.data.message.includes("supported")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("         COMPLEXITY EDGE CASES COMPLETE      ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
