const { runESLint, runPylint } = require('./utils/analyzer');
const fs = require('fs');
const path = require('path');

async function testAnalyzer() {
  console.log("=============================================");
  console.log("    ANALYZER UTILITY MODULE INTEGRITY TEST   ");
  console.log("=============================================");

  // 1. Test ESLint function
  const testJsPath = path.join(__dirname, 'temp_test.js');
  fs.writeFileSync(testJsPath, `const unused = 42;\nconsole.log(nonExistentVar);`, 'utf8');

  console.log("\n[Test 1] Invoking runESLint(filePath)...");
  try {
    const findings = await runESLint(testJsPath);
    console.log(` -> Success! Normalized findings count: ${findings.length}`);
    console.log(" -> Normalized findings structure:");
    console.log(JSON.stringify(findings, null, 2));
  } catch (err) {
    console.error(" -> [FAIL] runESLint threw an error:", err.message);
  } finally {
    if (fs.existsSync(testJsPath)) fs.unlinkSync(testJsPath);
  }

  // 2. Test Pylint function
  const testPyPath = path.join(__dirname, 'temp_test.py');
  fs.writeFileSync(testPyPath, `import math # unused\ndef test():\n    print(undef_py_var)`, 'utf8');

  console.log("\n[Test 2] Invoking runPylint(filePath)...");
  try {
    const findings = await runPylint(testPyPath);
    console.log(` -> Success! Normalized findings count: ${findings.length}`);
    console.log(" -> Normalized findings structure:");
    console.log(JSON.stringify(findings, null, 2));
  } catch (err) {
    console.error(" -> [FAIL] runPylint threw an error:", err.message);
  } finally {
    if (fs.existsSync(testPyPath)) fs.unlinkSync(testPyPath);
  }

  console.log("\n=============================================");
  console.log("           INTEGRITY TEST COMPLETE           ");
  console.log("=============================================");
}

testAnalyzer();
