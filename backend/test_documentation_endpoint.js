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

const sampleCode = `
/**
 * Helper class for mathematical coordinates.
 */
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Calculates the distance from the origin.
   * @returns {number} Distance value.
   */
  distanceFromOrigin() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

/**
 * Doubles the value of a number.
 * @param {number} num - Input number.
 * @returns {number} Doubled result.
 */
function doubleVal(num) {
  return num * 2;
}
`;

async function runTests() {
  console.log("=============================================");
  console.log("      DEVGAUGE DOCUMENTATION ENDPOINT TEST   ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `docs_test_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up user
  const registerRes = await request('POST', '/api/auth/register', { name: "Docs Tester", email, password });
  const token = registerRes.data.token;

  // 2. Create a project
  console.log("[Test] Creating a project with JS functions/classes...");
  const projectRes = await request('POST', '/api/projects', {
    project_name: "Docs Test Project",
    code: sampleCode,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });

  const projectId = projectRes.data.id;
  console.log(` -> Created project ID: ${projectId}`);

  // 3. Trigger documentation generation
  console.log("\n[Test] Triggering documentation generation...");
  const triggerRes = await request('POST', `/api/projects/${projectId}/documentation`, null, {
    'Authorization': `Bearer ${token}`
  });

  console.log(` -> Response Status: ${triggerRes.status} (Expected: 201)`);
  if (triggerRes.status !== 201) {
    console.error(" -> FAIL: Trigger status was not 201");
    console.error(triggerRes.data || triggerRes.raw);
    process.exit(1);
  }

  const review = triggerRes.data.review;
  const entries = triggerRes.data.entries;

  console.log(` -> Review Type: "${review.review_type}" (Expected: documentation)`);
  console.log(` -> File Summary length: ${review.summary.length} characters`);
  console.log(` -> Total documentation entries: ${entries.length}`);

  // Find entries by type
  const fileEntries = entries.filter(e => e.entry_type === 'file');
  const classEntries = entries.filter(e => e.entry_type === 'class');
  const functionEntries = entries.filter(e => e.entry_type === 'function');

  console.log(`    - File entries count: ${fileEntries.length} (Expected: 1)`);
  console.log(`    - Class entries count: ${classEntries.length} (Expected: >= 1)`);
  console.log(`    - Function/method entries count: ${functionEntries.length} (Expected: >= 2)`);

  if (review.review_type === 'documentation' && fileEntries.length === 1 && classEntries.length >= 1 && functionEntries.length >= 2) {
    console.log(" -> PASS (Documentation triggered and stored successfully)");
  } else {
    console.error(" -> FAIL: Inconsistent entries breakdown");
  }

  // 4. Retrieve documentation entries
  console.log("\n[Test] Querying GET /api/reviews/:id/documentation...");
  const getRes = await request('GET', `/api/reviews/${review.id}/documentation`, null, {
    'Authorization': `Bearer ${token}`
  });

  console.log(` -> Response Status: ${getRes.status} (Expected: 200)`);
  console.log(` -> Total fetched entries count: ${getRes.data.entries.length}`);
  
  if (getRes.status === 200 && getRes.data.entries.length === entries.length) {
    console.log(" -> PASS (GET review documentation fetches all entries correctly)");
  } else {
    console.error(" -> FAIL: GET returned unexpected entries count");
  }

  console.log("\n=============================================");
  console.log("     DOCUMENTATION ENDPOINT TESTS COMPLETE   ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
