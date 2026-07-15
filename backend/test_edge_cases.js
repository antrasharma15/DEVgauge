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
  console.log("       DEVGAUGE LINTER EDGE CASES TESTS      ");
  console.log("=============================================");

  const timestamp = Date.now();
  const user1Email = `user1_${timestamp}@example.com`;
  const user2Email = `user2_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up test users
  const res1 = await request('POST', '/api/auth/register', { name: "User One", email: user1Email, password });
  const user1Token = res1.data.token;

  const res2 = await request('POST', '/api/auth/register', { name: "User Two", email: user2Email, password });
  const user2Token = res2.data.token;

  // --- EDGE CASE 1: Clean file (Zero issues) ---
  console.log("\n[Edge Case 1] Analyze file with zero issues...");
  const projectClean = await request('POST', '/api/projects', {
    project_name: "Clean JS Project",
    code: "console.log('Clean code!');",
    language: "javascript"
  }, { 'Authorization': `Bearer ${user1Token}` });
  
  const cleanProjId = projectClean.data.id;
  const analysisClean = await request('POST', `/api/projects/${cleanProjId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${analysisClean.status} (Expected: 200)`);
  console.log(` -> Findings count: ${analysisClean.data.findings.length} (Expected: 0)`);
  if (analysisClean.status === 200 && analysisClean.data.findings.length === 0) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", analysisClean.data);
  }

  // --- EDGE CASE 2: Syntax Error (Unparseable file) ---
  console.log("\n[Edge Case 2] Analyze file with syntax error (unparseable)...");
  const projectSyntaxErr = await request('POST', '/api/projects', {
    project_name: "Broken Syntax Project",
    code: "const x = ; // Syntax error",
    language: "javascript"
  }, { 'Authorization': `Bearer ${user1Token}` });
  
  const syntaxProjId = projectSyntaxErr.data.id;
  const analysisSyntax = await request('POST', `/api/projects/${syntaxProjId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${analysisSyntax.status} (Expected: 200)`);
  console.log(` -> Findings count: ${analysisSyntax.data.findings.length} (Expected: 1)`);
  if (analysisSyntax.status === 200 && analysisSyntax.data.findings.length === 1) {
    const finding = analysisSyntax.data.findings[0];
    console.log(`    -> Severity: "${finding.severity}"`);
    console.log(`    -> Issue: "${finding.issue}" (Expected: parser-error)`);
    console.log(`    -> Explanation: "${finding.explanation}"`);
    if (finding.issue === 'parser-error') {
      console.log(" -> PASS");
    } else {
      console.error(" -> FAIL: Issue rule wasn't parser-error");
    }
  } else {
    console.error(" -> FAIL:", analysisSyntax.data);
  }

  // --- EDGE CASE 3: Unsupported Language ---
  console.log("\n[Edge Case 3] Analyze file in an unsupported language (.java)...");
  const projectJava = await request('POST', '/api/projects', {
    project_name: "Java Project",
    code: "public class Main {}",
    language: "java"
  }, { 'Authorization': `Bearer ${user1Token}` });
  
  const javaProjId = projectJava.data.id;
  const analysisJava = await request('POST', `/api/projects/${javaProjId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${analysisJava.status} (Expected: 400)`);
  console.log(` -> Message: "${analysisJava.data.message}"`);
  if (analysisJava.status === 400 && analysisJava.data.message.includes('not supported')) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- EDGE CASE 4: Duplicate Analysis (Preserve history) ---
  console.log("\n[Edge Case 4] Analyze same project twice to check history preservation...");
  const projectDup = await request('POST', '/api/projects', {
    project_name: "Double Audit Project",
    code: "let x = 1;\nconsole.log(y);",
    language: "javascript"
  }, { 'Authorization': `Bearer ${user1Token}` });
  
  const dupProjId = projectDup.data.id;
  
  console.log(" -> Triggering analysis 1...");
  const run1 = await request('POST', `/api/projects/${dupProjId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(`    -> Review ID 1: ${run1.data.id}`);

  console.log(" -> Triggering analysis 2...");
  const run2 = await request('POST', `/api/projects/${dupProjId}/analyze`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(`    -> Review ID 2: ${run2.data.id}`);

  if (run1.status === 200 && run2.status === 200 && run1.data.id !== run2.data.id) {
    console.log(" -> PASS (Review history preserved correctly)");
  } else {
    console.error(" -> FAIL: review IDs matched or execution failed");
  }

  // --- EDGE CASE 5: Privacy (Analyze another user's project) ---
  console.log("\n[Edge Case 5] Analyze project that doesn't belong to the logged-in user...");
  const analysisPrivate = await request('POST', `/api/projects/${dupProjId}/analyze`, null, {
    'Authorization': `Bearer ${user2Token}`
  });
  console.log(` -> Status: ${analysisPrivate.status} (Expected: 404)`);
  if (analysisPrivate.status === 404) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", analysisPrivate.data);
  }

  console.log("\n=============================================");
  console.log("         LINTER EDGE CASES COMPLETE          ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
