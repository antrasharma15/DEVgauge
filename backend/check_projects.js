const db = require('./db');

async function checkProjects() {
  try {
    const res = await db.query('SELECT id, project_name, language, file_path FROM projects');
    console.log("================ PROJECTS LIST ================");
    res.rows.forEach(p => {
      const fs = require('fs');
      const path = require('path');
      const absoluteFilePath = path.join(__dirname, p.file_path);
      const exists = fs.existsSync(absoluteFilePath);
      let size = -1;
      if (exists) {
        size = fs.statSync(absoluteFilePath).size;
      }
      console.log(`- Project ID: ${p.id}`);
      console.log(`  Name: ${p.project_name}`);
      console.log(`  Language: ${p.language}`);
      console.log(`  FilePath: ${p.file_path}`);
      console.log(`  FileExists: ${exists}`);
      console.log(`  FileSize: ${size} bytes`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await db.pool.end();
  }
}

checkProjects();
