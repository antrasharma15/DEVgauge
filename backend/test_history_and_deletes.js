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

const sampleCode = `
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}
`;

async function runTests() {
  console.log("=============================================");
  console.log("     DEVGAUGE HISTORY & DELETES TEST         ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `history_test_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up user
  const registerRes = await request('POST', '/api/auth/register', { name: "History Tester", email, password });
  const token = registerRes.data.token;

  // 2. Create projects
  console.log("[Test] Creating test projects...");
  const proj1 = await request('POST', '/api/projects', {
    project_name: "Alpha Project",
    code: sampleCode,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const proj2 = await request('POST', '/api/projects', {
    project_name: "Beta Project",
    code: "const x = 5000;\nconsole.log(x);",
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  console.log(` -> Created Alpha Proj ID: ${proj1.data.id}, Beta Proj ID: ${proj2.data.id}`);

  // 3. Test SEARCH by Name
  console.log("\n[Test] Searching projects by name...");
  const searchName = await request('GET', '/api/projects?search=Alpha', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Search 'Alpha' count: ${searchName.data.length} (Expected: 1)`);
  if (searchName.status === 200 && searchName.data.length === 1 && searchName.data[0].project_name === "Alpha Project") {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", searchName.data);
  }

  // 4. Test SEARCH by Name 'Beta'
  console.log("\n[Test] Searching projects by name 'Beta'...");
  const searchBeta = await request('GET', '/api/projects?search=Beta', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Search 'Beta' count: ${searchBeta.data.length} (Expected: 1)`);
  if (searchBeta.status === 200 && searchBeta.data.length === 1 && searchBeta.data[0].project_name === "Beta Project") {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", searchBeta.data);
  }

  // 5. Test SORTING
  console.log("\n[Test] Sorting projects (alphabetical)...");
  const sortAlpha = await request('GET', '/api/projects?sort=alphabetical', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Sorted alphabetical order: [${sortAlpha.data.map(p => p.project_name).join(', ')}]`);
  if (sortAlpha.data[0].project_name === "Alpha Project" && sortAlpha.data[1].project_name === "Beta Project") {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL");
  }

  // 6. Trigger reviews and test filtered history queries
  console.log("\n[Test] Triggering static analysis runs on Alpha Project...");
  const analyze1 = await request('POST', `/api/projects/${proj1.data.id}/analyze`, null, {
    'Authorization': `Bearer ${token}`
  });
  const review1Id = analyze1.data.id;

  console.log("[Test] Triggering complexity scan runs on Alpha Project...");
  const analyze2 = await request('POST', `/api/projects/${proj1.data.id}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });
  const review2Id = analyze2.data.review.id;

  console.log(` -> Created Review 1 (static): ${review1Id}, Review 2 (complexity): ${review2Id}`);

  // Fetch only static reviews
  console.log("\n[Test] Querying GET /api/projects/:id/reviews?type=static...");
  const getStatic = await request('GET', `/api/projects/${proj1.data.id}/reviews?type=static`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Filter type=static count: ${getStatic.data.length} (Expected: 1)`);
  if (getStatic.status === 200 && getStatic.data.length === 1 && getStatic.data[0].review_type === "static") {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", getStatic.data);
  }

  // 7. Delete specific review and assert count
  console.log(`\n[Test] Deleting Review ID: ${review1Id}...`);
  const delReview = await request('DELETE', `/api/reviews/${review1Id}`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> DELETE status: ${delReview.status} (Expected: 200)`);
  
  const getHistoryAfterDel = await request('GET', `/api/projects/${proj1.data.id}/reviews`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Review list count after delete: ${getHistoryAfterDel.data.length} (Expected: 1)`);
  if (delReview.status === 200 && getHistoryAfterDel.data.length === 1 && getHistoryAfterDel.data[0].id === review2Id) {
    console.log(" -> PASS");
  } else {
    console.error(" -> FAIL", getHistoryAfterDel.data);
  }

  // 8. Delete project and assert disk cleanup
  console.log(`\n[Test] Deleting Alpha Project ID: ${proj1.data.id}...`);
  const filePathOnDisk = path.join(__dirname, proj1.data.file_path);
  console.log(` -> Verifying source code exists on disk: ${fs.existsSync(filePathOnDisk)}`);

  const delProj = await request('DELETE', `/api/projects/${proj1.data.id}`, null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> DELETE status: ${delProj.status} (Expected: 200)`);
  console.log(` -> Verifying source code deleted from disk: ${!fs.existsSync(filePathOnDisk)}`);

  const checkProjList = await request('GET', '/api/projects', null, {
    'Authorization': `Bearer ${token}`
  });
  console.log(` -> Project list count after delete: ${checkProjList.data.length} (Expected: 1)`);

  if (delProj.status === 200 && !fs.existsSync(filePathOnDisk) && checkProjList.data.length === 1) {
    console.log(" -> PASS (Project deleted and file removed successfully)");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("     HISTORY & DELETES TESTS COMPLETE        ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
