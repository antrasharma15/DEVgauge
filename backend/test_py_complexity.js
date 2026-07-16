const fs = require('fs');
const path = require('path');
const { getPythonComplexity } = require('./utils/complexity');

const pyCode = `
class Calc:
    def __init__(self, name):
        self.name = name

    def compute(self, val):
        if val > 5:
            if val < 10:
                return val * 2
            return val * 3
        return val
`;

const tempFilePath = path.join(__dirname, 'test_comp.py');

// Setup file
fs.writeFileSync(tempFilePath, pyCode);

async function runTest() {
  console.log("=============================================");
  console.log("     DEVGAUGE PYTHON COMPLEXITY TEST         ");
  console.log("=============================================");
  
  try {
    const metrics = await getPythonComplexity(tempFilePath);
    console.log("Normalized Metrics Result:", JSON.stringify(metrics, null, 2));

    if (metrics.numFunctions === 2 && metrics.numClasses === 1 && metrics.fileComplexity === 3) {
      console.log("\n -> PASS (Python complexity analysis working and normalized correctly)");
    } else {
      console.error("\n -> FAIL: Unexpected metrics aggregation values");
    }
  } catch (err) {
    console.error("\n -> FAIL (Exception caught):", err.message);
  } finally {
    // Clean up
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
  console.log("=============================================");
  process.exit(0);
}

runTest();
