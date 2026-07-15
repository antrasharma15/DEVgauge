const { callAI } = require('./utils/ai');

async function testConnection() {
  console.log("=============================================");
  console.log("        DEVGAUGE AI CONNECTION TEST          ");
  console.log("=============================================");
  
  try {
    console.log("[Test] Sending completion request...");
    const response = await callAI("Return only the single word 'SUCCESS'. Do not add any punctuation or additional text.");
    console.log(" -> Raw Response:", JSON.stringify(response.trim()));
    
    if (response.toUpperCase().includes("SUCCESS")) {
      console.log(" -> PASS (AI connection working correctly)");
    } else {
      console.error(" -> FAIL: Unexpected response content");
    }
  } catch (err) {
    console.error(" -> FAIL (Exception caught):", err.message);
  }
  
  console.log("=============================================");
  process.exit(0);
}

testConnection();
