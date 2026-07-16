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
  console.log("      DEVGAUGE COMPLEXITY ENDPOINT TEST      ");
  console.log("=============================================");

  const timestamp = Date.now();
  const email = `complexity_${timestamp}@example.com`;
  const password = "SecurePassword123";

  // 1. Sign up a user
  const registerRes = await request('POST', '/api/auth/register', { name: "Comp User", email, password });
  const token = registerRes.data.token;

  // 2. Create a project
  const jsCode = `
  class MathHelper {
    square(x) {
      return x * x;
    }
  }

  function checkVal(val) {
    if (val > 10) {
      return 'large';
    }
    return 'small';
  }
  `;

  console.log("[Test] Creating a project with JS code...");
  const projectRes = await request('POST', '/api/projects', {
    project_name: "Complexity Test JS",
    code: jsCode,
    language: "javascript"
  }, { 'Authorization': `Bearer ${token}` });
  
  const projectId = projectRes.data.id;
  console.log(` -> Created project ID: ${projectId}`);

  // 3. Trigger Complexity Analysis
  console.log("\n[Test] Triggering complexity analysis on the project...");
  const triggerRes = await request('POST', `/api/projects/${projectId}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });

  console.log(` -> Response Status: ${triggerRes.status} (Expected: 200)`);
  console.log(` -> Review Type: "${triggerRes.data.review.review_type}" (Expected: complexity)`);
  console.log(` -> Overall Quality Score: ${triggerRes.data.review.overall_score}`);
  console.log(` -> Summary: "${triggerRes.data.review.summary}"`);
  console.log(` -> Metrics details:`);
  console.log(`    - file_complexity: ${triggerRes.data.metrics.file_complexity}`);
  console.log(`    - avg_function_complexity: ${triggerRes.data.metrics.avg_function_complexity}`);
  console.log(`    - num_functions: ${triggerRes.data.metrics.num_functions}`);
  console.log(`    - num_classes: ${triggerRes.data.metrics.num_classes}`);
  console.log(`    - lines_of_code: ${triggerRes.data.metrics.lines_of_code}`);
  console.log(`    - functions list count: ${triggerRes.data.metrics.functions.length}`);

  const reviewId = triggerRes.data.review.id;

  if (
    triggerRes.status === 200 &&
    triggerRes.data.review.review_type === 'complexity' &&
    triggerRes.data.metrics.num_functions === 2 &&
    triggerRes.data.metrics.num_classes === 1
  ) {
    console.log(" -> PASS (Complexity triggered and parsed successfully)");
  } else {
    console.error(" -> FAIL");
  }

  // 4. Fetch metrics via GET reviews/:id/complexity
  console.log("\n[Test] Querying GET /api/reviews/:id/complexity...");
  const getRes = await request('GET', `/api/reviews/${reviewId}/complexity`, null, {
    'Authorization': `Bearer ${token}`
  });

  console.log(` -> Response Status: ${getRes.status} (Expected: 200)`);
  console.log(` -> Quality Score: ${getRes.data.review.overall_score}`);
  console.log(` -> Metrics average function complexity: ${getRes.data.metrics.avg_function_complexity}`);
  console.log(` -> Metrics functions count: ${getRes.data.metrics.functions.length}`);
  console.log(` -> Metrics functions:`, JSON.stringify(getRes.data.metrics.functions, null, 2));

  if (
    getRes.status === 200 &&
    getRes.data.review.review_type === 'complexity' &&
    getRes.data.metrics.functions.length === 2 &&
    getRes.data.metrics.functions.some(f => f.name === 'MathHelper.square')
  ) {
    console.log(" -> PASS (GET review details retrieves complexity metrics and nested functions)");
  } else {
    console.error(" -> FAIL");
  }

  console.log("\n=============================================");
  console.log("     COMPLEXITY ENDPOINT TESTS COMPLETE      ");
  console.log("=============================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
