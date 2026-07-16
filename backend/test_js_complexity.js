const { getJSComplexity } = require('./utils/complexity');

const code = `
class User {
  constructor(name) {
    this.name = name;
  }
}

function processValue(val) {
  if (val > 10) {
    if (val < 20) {
      return 'medium';
    }
    return 'large';
  }
  return 'small';
}
`;

try {
  console.log("=============================================");
  console.log("       DEVGAUGE JS COMPLEXITY TEST           ");
  console.log("=============================================");
  
  const metrics = getJSComplexity(code);
  console.log("Normalized Metrics Result:", JSON.stringify(metrics, null, 2));
  
  if (metrics.numFunctions === 2 && metrics.numClasses === 1 && metrics.fileComplexity > 1) {
    console.log("\n -> PASS (JS complexity analysis working and normalized correctly)");
  } else {
    console.error("\n -> FAIL: Unexpected metrics aggregation");
  }
} catch (err) {
  console.error("\n -> FAIL (Exception caught):", err.message);
}
console.log("=============================================");
process.exit(0);
