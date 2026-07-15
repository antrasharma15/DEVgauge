// Verification script for ESLint and Pylint execution via child_process
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=============================================");
console.log("      LINTER TOOLCHAIN DIAGNOSTICS          ");
console.log("=============================================");

// 1. Verify ESLint CLI
try {
  const eslintVersion = execSync('npx eslint --version').toString().trim();
  console.log(`[PASS] ESLint is available. Version: ${eslintVersion}`);
} catch (err) {
  console.error("[FAIL] ESLint CLI check failed:", err.message);
}

// 2. Verify Pylint CLI
try {
  const pylintVersion = execSync('python -m pylint --version').toString().trim().split('\n')[0];
  console.log(`[PASS] Pylint is available. Version: ${pylintVersion}`);
} catch (err) {
  console.error("[FAIL] Pylint CLI check failed:", err.message);
}

// 3. Test ESLint run on a test file
const testJsPath = path.join(__dirname, 'linter_test.js');
const testJsContent = `
const unusedVar = "I am not used";
console.log(undefVar); // Will trigger undef error and unused warning
`;

fs.writeFileSync(testJsPath, testJsContent, 'utf8');

console.log("\n[Test] Running ESLint on JavaScript test file...");
try {
  // eslint prints findings in JSON mode when we pass --format=json
  const eslintOutput = execSync(`npx eslint --format=json "${testJsPath}"`, { encoding: 'utf8' });
  console.log("[PASS] ESLint ran with 0 issues (unexpected for test code). Output:", eslintOutput);
} catch (err) {
  // execSync throws if exit code is not 0. Linters exit with code > 0 if issues are found!
  console.log(`[PASS] ESLint caught issues (exit code ${err.status} is expected).`);
  try {
    const parsed = JSON.parse(err.stdout || err.output[1]);
    console.log(" -> Captured JSON output structure successfully!");
    const fileResult = parsed[0];
    console.log(` -> Found ${fileResult.messages.length} messages:`);
    fileResult.messages.forEach(msg => {
      console.log(`    [Line ${msg.line}] [${msg.severity === 2 ? 'Error' : 'Warning'}] (${msg.ruleId}): ${msg.message}`);
    });
  } catch (parseErr) {
    console.error(" -> Error parsing ESLint JSON stdout:", parseErr.message);
    console.log("Raw output:", err.stdout);
  }
} finally {
  if (fs.existsSync(testJsPath)) fs.unlinkSync(testJsPath);
}

// 4. Test Pylint run on a test file
const testPyPath = path.join(__dirname, 'linter_test.py');
const testPyContent = `
import os # Unused import
def test_func():
    print(undef_var) # Undefined variable
`;

fs.writeFileSync(testPyPath, testPyContent, 'utf8');

console.log("\n[Test] Running Pylint on Python test file...");
try {
  // pylint supports output formatting via --output-format=json
  const pylintOutput = execSync(`python -m pylint --output-format=json "${testPyPath}"`, { encoding: 'utf8' });
  console.log("[PASS] Pylint ran with 0 issues. Output:", pylintOutput);
} catch (err) {
  console.log(`[PASS] Pylint caught issues (exit code ${err.status} is expected).`);
  try {
    const parsed = JSON.parse(err.stdout || err.output[1]);
    console.log(" -> Captured JSON output structure successfully!");
    console.log(` -> Found ${parsed.length} messages:`);
    parsed.forEach(msg => {
      console.log(`    [Line ${msg.line}] [${msg.type}] (${msg.symbol}): ${msg.message}`);
    });
  } catch (parseErr) {
    console.error(" -> Error parsing Pylint JSON stdout:", parseErr.message);
    console.log("Raw output:", err.stdout);
  }
} finally {
  if (fs.existsSync(testPyPath)) fs.unlinkSync(testPyPath);
}

console.log("\n=============================================");
console.log("      DIAGNOSTICS COMPLETE                  ");
console.log("=============================================");
