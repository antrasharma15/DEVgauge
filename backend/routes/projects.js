const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const auth = require('../middleware/auth');
const { runESLint, runPylint } = require('../utils/analyzer');

// Language-to-file-extension mapping
const getExtension = (language) => {
  if (!language) return '.txt';
  const lang = language.toLowerCase().trim();
  switch (lang) {
    case 'javascript':
    case 'js':
      return '.js';
    case 'typescript':
    case 'ts':
      return '.ts';
    case 'python':
    case 'py':
      return '.py';
    case 'java':
      return '.java';
    case 'c++':
    case 'cpp':
      return '.cpp';
    case 'c':
      return '.c';
    case 'html':
      return '.html';
    case 'css':
      return '.css';
    case 'json':
      return '.json';
    default:
      return '.txt';
  }
};

// Map file extension to language name
const getLanguageFromExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.js':
      return 'javascript';
    case '.ts':
      return 'typescript';
    case '.py':
      return 'python';
    case '.java':
      return 'java';
    case '.cpp':
    case '.cc':
      return 'c++';
    case '.c':
      return 'c';
    case '.html':
      return 'html';
    case '.css':
      return 'css';
    case '.json':
      return 'json';
    default:
      return 'plaintext';
  }
};

// Sanitize project name
const sanitizeProjectName = (name) => {
  if (!name) return '';
  let sanitized = name.replace(/<\/?[^>]+(>|$)/g, "");
  return sanitized.trim().slice(0, 100);
};

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const uploadDir = path.join(__dirname, '..', 'uploads', String(userId));
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${Date.now()}${ext}`);
  }
});

// File type filter
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.js', '.py', '.java', '.cpp', '.cc', '.ts'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Only JavaScript, TypeScript, Python, Java, and C++ files are allowed.'));
  }
  cb(null, true);
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB file size limit
});

// @route   POST api/projects
// @desc    Create project and save pasted code snippet
// @access  Private
router.post('/', auth, async (req, res) => {
  const { project_name, code, language } = req.body;

  // Edge Case: Empty code rejected with 400
  if (!code || !code.trim()) {
    return res.status(400).json({ message: 'Code snippet cannot be empty' });
  }

  try {
    const userId = req.user.id;
    
    // Edge Case: Sanitize project_name and auto-generate if empty
    const sanitizedName = sanitizeProjectName(project_name);
    const finalProjectName = sanitizedName || `Untitled-${Date.now()}`;

    const extension = getExtension(language);
    const fileName = `snippet-${Date.now()}${extension}`;
    
    const uploadDir = path.join(__dirname, '..', 'uploads', String(userId));
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save code to file on disk
    fs.writeFileSync(filePath, code, 'utf8');

    const relativePath = path.join('uploads', String(userId), fileName).replace(/\\/g, '/');

    // Insert project record
    const result = await db.query(
      'INSERT INTO projects (user_id, project_name, file_path, language) VALUES ($1, $2, $3, $4) RETURNING id, user_id, project_name, file_path, language, created_at, updated_at',
      [userId, finalProjectName, relativePath, language || 'plaintext']
    );

    const newProject = result.rows[0];
    res.status(201).json(newProject);

  } catch (err) {
    console.error('Create Project Error:', err.message);
    res.status(500).json({ message: 'Server error during project creation' });
  }
});

// @route   POST api/projects/upload
// @desc    Create project and store uploaded file
// @access  Private
router.post('/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum size allowed is 2MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a file' });
  }

  // Edge Case: Empty file (0 bytes) rejected with 400
  if (req.file.size === 0) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Error unlinking empty file:', e.message);
    }
    return res.status(400).json({ message: 'Uploaded file cannot be empty' });
  }

  try {
    const userId = req.user.id;
    const originalName = req.file.originalname;
    const savedFileName = req.file.filename;

    const sanitizedName = sanitizeProjectName(req.body.project_name);
    const finalProjectName = sanitizedName || `Untitled-${Date.now()}`;
    const language = getLanguageFromExtension(originalName);

    const relativePath = path.join('uploads', String(userId), savedFileName).replace(/\\/g, '/');

    // Insert project record
    const result = await db.query(
      'INSERT INTO projects (user_id, project_name, file_path, language) VALUES ($1, $2, $3, $4) RETURNING id, user_id, project_name, file_path, language, created_at, updated_at',
      [userId, finalProjectName, relativePath, language]
    );

    const newProject = result.rows[0];
    res.status(201).json(newProject);

  } catch (err) {
    console.error('Upload Project Error:', err.message);
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// @route   GET api/projects
// @desc    List all projects for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT p.id, p.project_name, p.language, p.file_path, p.created_at,
         (SELECT overall_score FROM reviews r WHERE r.project_id = p.id AND r.review_type = 'static' ORDER BY r.created_at DESC LIMIT 1) as quality_score,
         (SELECT id FROM reviews r WHERE r.project_id = p.id AND r.review_type = 'static' ORDER BY r.created_at DESC LIMIT 1) as latest_review_id
       FROM projects p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List Projects Error:', err.message);
    res.status(500).json({ message: 'Server error listing projects' });
  }
});

// @route   GET api/projects/:id
// @desc    Fetch project details and code content
// @access  Private (Owner only)
router.get('/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const projectResult = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found or authorization denied' });
    }

    const project = projectResult.rows[0];
    const absoluteFilePath = path.join(__dirname, '..', project.file_path);
    
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ message: 'Project source code file is missing on disk' });
    }

    const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');

    res.json({
      ...project,
      code: codeContent
    });

  } catch (err) {
    console.error('Get Project Error:', err.message);
    res.status(500).json({ message: 'Server error retrieving project details' });
  }
});

// @route   POST api/projects/:id/analyze
// @desc    Trigger static code analysis on a project file
// @access  Private (Owner only)
router.post('/:id/analyze', auth, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Fetch the project and verify ownership
    const projectResult = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found or authorization denied' });
    }

    const project = projectResult.rows[0];
    const absoluteFilePath = path.join(__dirname, '..', project.file_path);

    // 2. Validate file existence on disk
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ message: 'Project source code file is missing on disk' });
    }

    // Enforce 1MB size limit for static analysis
    const fileSize = fs.statSync(absoluteFilePath).size;
    if (fileSize > 1024 * 1024) {
      return res.status(400).json({ message: 'File size exceeds static analysis limit of 1MB.' });
    }

    // 3. Detect language from stored file extension
    const ext = path.extname(project.file_path).toLowerCase();
    let findings = [];

    try {
      if (ext === '.js' || ext === '.ts') {
        findings = await runESLint(absoluteFilePath);
      } else if (ext === '.py') {
        findings = await runPylint(absoluteFilePath);
      } else {
        return res.status(400).json({
          message: `Static analysis is not supported for file extension ${ext}. Only .js, .ts, and .py files are supported.`
        });
      }
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return res.status(504).json({ message: 'Static analysis timed out after 10 seconds.' });
      }
      
      // Fallback for execution/parsing failures
      console.error('Linter execution failure:', err.message);
      findings = [{
        severity: 'error',
        issue: 'parser-error',
        explanation: `Linter execution failed: ${err.message}`,
        line_number: 1
      }];
    }

    // 4. Compute metrics and scoring
    let errors = 0;
    let warnings = 0;
    let info = 0;

    findings.forEach(f => {
      if (f.severity === 'error') {
        errors++;
      } else if (f.severity === 'warning') {
        warnings++;
      } else {
        info++;
      }
    });

    const overallScore = Math.max(0, 100 - (errors * 10 + warnings * 3 + info * 1));
    const summary = `${errors} errors, ${warnings} warnings, ${info} convention issues found.`;

    // 5. Save results using a transaction to maintain consistency
    const client = await db.pool.connect();
    let newReview = null;

    try {
      await client.query('BEGIN');

      // Insert Review record
      const reviewResult = await client.query(
        'INSERT INTO reviews (project_id, review_type, overall_score, summary) VALUES ($1, $2, $3, $4) RETURNING id, project_id, review_type, overall_score, summary, created_at',
        [projectId, 'static', overallScore, summary]
      );
      newReview = reviewResult.rows[0];

      // Insert Review Findings
      const fileName = path.basename(project.file_path);
      for (const finding of findings) {
        await client.query(
          'INSERT INTO review_findings (review_id, severity, issue, explanation, file_name, line_number) VALUES ($1, $2, $3, $4, $5, $6)',
          [newReview.id, finding.severity, finding.issue, finding.explanation, fileName, finding.line_number]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 6. Return response
    res.json({
      ...newReview,
      findings
    });

  } catch (err) {
    console.error('Project Analysis Error:', err.stack || err.message);
    res.status(500).json({ message: 'Server error during static code analysis execution' });
  }
});

module.exports = router;
