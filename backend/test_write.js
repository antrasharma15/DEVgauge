const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, 'uploads', '6');
console.log("Testing write to directory:", uploadDir);
try {
  if (!fs.existsSync(uploadDir)) {
    console.log("Directory does not exist, creating...");
    fs.mkdirSync(uploadDir, { recursive: true });
  } else {
    console.log("Directory already exists according to existsSync.");
  }
  const filePath = path.join(uploadDir, 'test.js');
  fs.writeFileSync(filePath, 'console.log(1)', 'utf8');
  console.log("Written successfully. File exists:", fs.existsSync(filePath));
} catch (err) {
  console.error("Error encountered:", err.stack);
}
