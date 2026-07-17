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

async function runEdgeCaseTests() {
  console.log("=============================================");
  console.log("       DEVGAUGE EDGE CASES TESTING           ");
  console.log("=============================================");

  const timestamp = Date.now();
  const emailA = `user_a_${timestamp}@example.com`;
  const emailB = `user_b_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Setup two distinct users
  console.log("[Test] Creating two distinct users...");
  const registerA = await request('POST', '/api/auth/register', { name: "User A", email: emailA, password });
  const registerB = await request('POST', '/api/auth/register', { name: "User B", email: emailB, password });

  const tokenA = registerA.data.token;
  const tokenB = registerB.data.token;

  // 2. Create projects for User A and User B
  console.log("[Test] Submitting projects for both users...");
  const projA = await request('POST', '/api/projects', {
    project_name: "Super Secret Proj A",
    code: "console.log('User A Code');",
    language: "javascript"
  }, { 'Authorization': `Bearer ${tokenA}` });

  const projB = await request('POST', '/api/projects', {
    project_name: "Super Secret Proj B",
    code: "console.log('User B Code');",
    language: "javascript"
  }, { 'Authorization': `Bearer ${tokenB}` });

  console.log(` -> User A Proj ID: ${projA.data.id}, User B Proj ID: ${projB.data.id}`);

  // 3. Search with no matches
  console.log("\n[Test] Asserting search with no matches returns empty list...");
  const searchNone = await request('GET', '/api/projects?search=NonExistentProjectString', null, {
    'Authorization': `Bearer ${tokenA}`
  });
  console.log(` -> Status: ${searchNone.status}, Results count: ${searchNone.data.length} (Expected: 0)`);
  if (searchNone.status === 200 && searchNone.data.length === 0) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 4. Case insensitivity check
  console.log("\n[Test] Asserting search is case-insensitive...");
  const searchCase = await request('GET', '/api/projects?search=secret', null, {
    'Authorization': `Bearer ${tokenA}`
  });
  console.log(` -> Status: ${searchCase.status}, Results count: ${searchCase.data.length} (Expected: 1)`);
  if (searchCase.status === 200 && searchCase.data.length === 1 && searchCase.data[0].project_name === "Super Secret Proj A") {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", searchCase.data);
  }

  // 5. Cross-user isolation verification
  console.log("\n[Test] Asserting user A cannot retrieve user B's project list...");
  const listA = await request('GET', '/api/projects', null, {
    'Authorization': `Bearer ${tokenA}`
  });
  const hasUserBProj = listA.data.some(p => p.id === projB.data.id);
  console.log(` -> User A project count: ${listA.data.length}, Contains User B's project: ${hasUserBProj} (Expected: false)`);
  if (!hasUserBProj) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 6. Delete unauthorized project (403 check)
  console.log("\n[Test] Asserting user B cannot delete user A's project (403)...");
  const delForbidden = await request('DELETE', `/api/projects/${projA.data.id}`, null, {
    'Authorization': `Bearer ${tokenB}`
  });
  console.log(` -> Status code returned: ${delForbidden.status} (Expected: 403)`);
  if (delForbidden.status === 403) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", delForbidden.data);
  }

  // 7. Double-click review deletion handling
  console.log("\n[Test] Asserting double-click deletion safety...");
  // Trigger audit review run for User A project
  const analyze = await request('POST', `/api/projects/${projA.data.id}/analyze`, null, {
    'Authorization': `Bearer ${tokenA}`
  });
  const reviewId = analyze.data.id;

  // First delete trigger
  console.log(` -> Triggering first DELETE on review ID: ${reviewId}...`);
  const delOnce = await request('DELETE', `/api/reviews/${reviewId}`, null, {
    'Authorization': `Bearer ${tokenA}`
  });
  console.log(` -> First delete status: ${delOnce.status} (Expected: 200)`);

  // Second delete trigger (Double Click simulation)
  console.log(` -> Triggering second DELETE on review ID: ${reviewId}...`);
  const delTwice = await request('DELETE', `/api/reviews/${reviewId}`, null, {
    'Authorization': `Bearer ${tokenA}`
  });
  console.log(` -> Second delete status: ${delTwice.status} (Expected: 404)`);

  if (delOnce.status === 200 && delTwice.status === 404) {
    console.log(" -> PASS (Double click handles gracefully returning 404 already deleted)");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("       EDGE CASES TESTS COMPLETE             ");
  console.log("=============================================");
  process.exit(0);
}

runEdgeCaseTests().catch(err => {
  console.error(err);
  process.exit(1);
});
