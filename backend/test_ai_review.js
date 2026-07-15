const { getAIReview } = require('./utils/ai');

async function testAIReview() {
  console.log("=============================================");
  console.log("          DEVGAUGE AI REVIEW TEST            ");
  console.log("=============================================");

  const code = `
const db = require('./db');
const secretKey = 'super-secret-hardcoded-key-12345';

function fetchUser(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.query(query);
}
  `;

  try {
    console.log("[Test] Submitting code snippet for AI review...");
    const findings = await getAIReview(code, 'javascript');
    
    console.log(` -> Response Status: PASS`);
    console.log(` -> Findings count: ${findings.length}`);
    console.log(` -> Findings Details:`);
    
    findings.forEach((f, idx) => {
      console.log(`\n  [Finding ${idx + 1}]`);
      console.log(`   -> Severity: "${f.severity}"`);
      console.log(`   -> Issue: "${f.issue}"`);
      console.log(`   -> Explanation: "${f.explanation}"`);
      console.log(`   -> Suggested Fix: "${f.suggested_fix}"`);
      console.log(`   -> Line Number: ${f.line_number}`);
      
      // Asserts
      if (!['error', 'warning', 'info'].includes(f.severity)) {
        console.error("    ! WARNING: Invalid severity value");
      }
      if (!f.issue || !f.explanation || !f.suggested_fix || !f.line_number) {
        console.error("    ! WARNING: Missing key field(s)");
      }
    });

  } catch (err) {
    console.error(" -> FAIL (Exception caught):", err.message);
  }

  console.log("=============================================");
  process.exit(0);
}

testAIReview();
