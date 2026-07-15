// Integration test suite validating Day 1 to Day 4 components of DEVgauge
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

const request = (method, path, data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    let payload = null;
    const requestHeaders = { ...headers };

    if (data !== null) {
      if (headers['Content-Type'] && headers['Content-Type'].startsWith('multipart/form-data')) {
        payload = data; // raw data buffer/string
      } else {
        payload = JSON.stringify(data);
        requestHeaders['Content-Type'] = 'application/json';
        requestHeaders['Content-Length'] = Buffer.byteLength(payload);
      }
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
  console.log("   DEVGAUGE INTEGRATED TEST SUITE: DAYS 1-4  ");
  console.log("=============================================");

  const timestamp = Date.now();
  const user1Email = `user1_${timestamp}@example.com`;
  const user2Email = `user2_${timestamp}@example.com`;
  const userPassword = "SecurePassword123"; // Meets strength requirement
  
  let user1Token = null;
  let user2Token = null;
  let user1ProjectId = null;

  // --- SECTION 1: AUTHENTICATION FLOWS ---
  console.log("\n--- SECTION 1: AUTHENTICATION & SECURITY ---");

  // 1.1 Sign up user 1
  console.log("[Test 1.1] Sign up with valid credentials...");
  const res1 = await request('POST', '/api/auth/register', {
    name: "User One",
    email: user1Email,
    password: userPassword
  });
  console.log(` -> Status: ${res1.status} (Expected: 201)`);
  if (res1.status === 201) {
    user1Token = res1.data.token;
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", res1.data);
  }

  // 1.2 Reject duplicate signup
  console.log("[Test 1.2] Reject duplicate email registration...");
  const res2 = await request('POST', '/api/auth/register', {
    name: "User One Dup",
    email: user1Email,
    password: userPassword
  });
  console.log(` -> Status: ${res2.status} (Expected: 400)`);
  console.log(` -> Response message: "${res2.data.message}"`);
  if (res2.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 1.3 Reject weak password
  console.log("[Test 1.3] Reject weak password (under 6 characters or lacking numbers/letters)...");
  const res3 = await request('POST', '/api/auth/register', {
    name: "Weak Pass User",
    email: `weak_${timestamp}@example.com`,
    password: "weak"
  });
  console.log(` -> Status: ${res3.status} (Expected: 400)`);
  console.log(` -> Response message: "${res3.data.message}"`);
  if (res3.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 1.4 Login succeeds with correct credentials
  console.log("[Test 1.4] Login with correct credentials...");
  const res4 = await request('POST', '/api/auth/login', {
    email: user1Email,
    password: userPassword
  });
  console.log(` -> Status: ${res4.status} (Expected: 200)`);
  if (res4.status === 200 && res4.data.token) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 1.5 Login fails with incorrect password
  console.log("[Test 1.5] Login fails with incorrect password...");
  const res5 = await request('POST', '/api/auth/login', {
    email: user1Email,
    password: "WrongPassword999"
  });
  console.log(` -> Status: ${res5.status} (Expected: 400)`);
  console.log(` -> Response message: "${res5.data.message}"`);
  if (res5.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 1.6 Login fails for non-existent users
  console.log("[Test 1.6] Login fails for non-existent email...");
  const res6 = await request('POST', '/api/auth/login', {
    email: `notfound_${timestamp}@example.com`,
    password: userPassword
  });
  console.log(` -> Status: ${res6.status} (Expected: 400)`);
  console.log(` -> Response message: "${res6.data.message}"`);
  if (res6.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 1.7 Protected route requires token
  console.log("[Test 1.7] Reject protected route (/api/auth/me) access with missing token...");
  const res7 = await request('GET', '/api/auth/me');
  console.log(` -> Status: ${res7.status} (Expected: 401)`);
  if (res7.status === 401) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // Register User 2 for later cross-access checks
  const resUser2 = await request('POST', '/api/auth/register', {
    name: "User Two",
    email: user2Email,
    password: userPassword
  });
  user2Token = resUser2.data.token;

  // --- SECTION 2: CODE SUBMISSION (PASTED CODE) ---
  console.log("\n--- SECTION 2: CODE SUBMISSION (PASTED CODE) ---");

  // 2.1 Paste code snippet with valid parameters
  console.log("[Test 2.1] Submit pasted code snippet...");
  const jsCode = `function test() {\n  console.log("Hello integrated test!");\n}`;
  const res8 = await request('POST', '/api/projects', {
    project_name: "JavaScript Paste Project",
    code: jsCode,
    language: "javascript"
  }, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res8.status} (Expected: 201)`);
  if (res8.status === 201) {
    user1ProjectId = res8.data.id;
    console.log(` -> Saved file path: "${res8.data.file_path}"`);
    console.log(` -> Language mapped: "${res8.data.language}"`);
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", res8.data);
  }

  // 2.2 Reject empty code snippet
  console.log("[Test 2.2] Reject submission with empty code...");
  const res9 = await request('POST', '/api/projects', {
    project_name: "Empty Code Project",
    code: "   ",
    language: "javascript"
  }, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res9.status} (Expected: 400)`);
  console.log(` -> Response message: "${res9.data.message}"`);
  if (res9.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 2.3 Fallback to Untitled-{timestamp} if no project name given
  console.log("[Test 2.3] Auto-generate project name if empty...");
  const res10 = await request('POST', '/api/projects', {
    project_name: "  ",
    code: "print('python')",
    language: "python"
  }, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res10.status} (Expected: 201)`);
  console.log(` -> Generated Name: "${res10.data.project_name}"`);
  if (res10.status === 201 && res10.data.project_name.startsWith("Untitled-")) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- SECTION 3: CODE SUBMISSION (FILE UPLOAD) ---
  console.log("\n--- SECTION 3: CODE SUBMISSION (FILE UPLOAD) ---");

  // 3.1 Upload valid file using multipart boundary
  console.log("[Test 3.1] Upload a valid code file (.py)...");
  const boundary = '----WebKitFormBoundaryTest77777';
  const fileContent = 'def hello():\n    print("file upload test")\n';
  const multipartBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="project_name"',
    '',
    'Uploaded Python Project',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="hello.py"',
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const res11 = await request('POST', '/api/projects/upload', multipartBody, {
    'Authorization': `Bearer ${user1Token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  });
  console.log(` -> Status: ${res11.status} (Expected: 201)`);
  if (res11.status === 201) {
    console.log(` -> Saved file path: "${res11.data.file_path}"`);
    console.log(` -> Language mapped: "${res11.data.language}"`);
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL:", res11.data);
  }

  // 3.2 Reject invalid file extension (e.g. .png)
  console.log("[Test 3.2] Reject files with invalid extensions (.png)...");
  const invalidMultipartBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="image.png"',
    'Content-Type: image/png',
    '',
    'fake png data stream',
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const res12 = await request('POST', '/api/projects/upload', invalidMultipartBody, {
    'Authorization': `Bearer ${user1Token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  });
  console.log(` -> Status: ${res12.status} (Expected: 400)`);
  console.log(` -> Response message: "${res12.data.message}"`);
  if (res12.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 3.3 Reject empty file upload (0 bytes)
  console.log("[Test 3.3] Reject empty file upload (0 bytes)...");
  const emptyMultipartBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="empty.js"',
    'Content-Type: text/plain',
    '',
    '', // 0 bytes content
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const res13 = await request('POST', '/api/projects/upload', emptyMultipartBody, {
    'Authorization': `Bearer ${user1Token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  });
  console.log(` -> Status: ${res13.status} (Expected: 400)`);
  console.log(` -> Response message: "${res13.data.message}"`);
  if (res13.status === 400) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // --- SECTION 4: SCOPE & DATA PRIVACY ---
  console.log("\n--- SECTION 4: SCOPE & DATA PRIVACY ---");

  // 4.1 Retrieve project details and content (GET /api/projects/:id)
  console.log("[Test 4.1] Fetch project details & content for authenticated owner...");
  const res14 = await request('GET', `/api/projects/${user1ProjectId}`, null, {
    'Authorization': `Bearer ${user1Token}`
  });
  console.log(` -> Status: ${res14.status} (Expected: 200)`);
  if (res14.status === 200 && res14.data.code === jsCode) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 4.2 Enforce privacy: reject retrieval by another user
  console.log("[Test 4.2] Reject project content retrieval by non-owner user...");
  const res15 = await request('GET', `/api/projects/${user1ProjectId}`, null, {
    'Authorization': `Bearer ${user2Token}`
  });
  console.log(` -> Status: ${res15.status} (Expected: 404)`);
  console.log(` -> Response message: "${res15.data.message}"`);
  if (res15.status === 404) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("      DAYS 1-4 INTEGRATED TESTING COMPLETED   ");
  console.log("=============================================");
}

// Confirm server is running before executing test run
const checkServer = http.get(`http://localhost:${PORT}/api/health`, (res) => {
  runTests();
}).on('error', (err) => {
  console.error(`ERROR: Server is not running on port ${PORT}. Run 'npm run dev' inside backend first.`);
});
