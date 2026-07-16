const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const auth = require('../middleware/auth');
const { runESLint, runPylint } = require('../utils/analyzer');
const { getAIReview, getAIDocumentation } = require('../utils/ai');
const { getJSComplexity, getPythonComplexity } = require('../utils/complexity');

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
         (SELECT overall_score FROM reviews r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1) as quality_score,
         (SELECT id FROM reviews r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1) as latest_review_id,
         (SELECT summary FROM reviews r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1) as latest_review_summary
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

// @route   POST api/projects/:id/ai-review
// @desc    Trigger AI code review on a project file
// @access  Private (Owner only)
router.post('/:id/ai-review', auth, async (req, res) => {
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

    // Enforce 50KB size limit for AI review requests
    const fileSize = fs.statSync(absoluteFilePath).size;
    if (fileSize > 50 * 1024) {
      return res.status(400).json({ message: 'File size exceeds AI review limit of 50KB.' });
    }

    const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');

    // Fetch latest static review findings for context
    let staticFindings = [];
    try {
      const staticReviewResult = await db.query(
        `SELECT severity, issue, explanation, line_number 
         FROM review_findings 
         WHERE review_id = (
           SELECT id FROM reviews 
           WHERE project_id = $1 AND review_type = 'static' 
           ORDER BY created_at DESC LIMIT 1
         )`,
        [projectId]
      );
      staticFindings = staticReviewResult.rows;
    } catch (dbErr) {
      console.warn("Could not retrieve static linter context for AI review:", dbErr.message);
    }

    // 3. Call AI Review utility
    let findings = [];
    try {
      findings = await getAIReview(codeContent, project.language || 'javascript', staticFindings);
    } catch (aiErr) {
      console.error('Gemini API review execution failed:', aiErr.message);
      
      // Handle timeout specifically
      if (aiErr.message === 'TIMEOUT') {
        return res.status(504).json({
          message: 'AI review request timed out after 30 seconds.'
        });
      }

      // Handle rate limits (429 status code) specifically
      if (aiErr.message.includes('429') || aiErr.status === 429) {
        return res.status(429).json({
          message: 'AI review rate limit reached. Please try again shortly.'
        });
      }

      return res.status(502).json({
        message: `AI review service failed: ${aiErr.message}`
      });
    }

    // 4. Compute scoring and counts
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
    const summary = `AI Review: ${errors} errors, ${warnings} warnings, ${info} suggestions found.`;

    // 5. Store AI Review using database transaction
    const client = await db.pool.connect();
    let newReview = null;

    try {
      await client.query('BEGIN');

      // Insert AI Review record
      const reviewResult = await client.query(
        'INSERT INTO reviews (project_id, review_type, overall_score, summary) VALUES ($1, $2, $3, $4) RETURNING id, project_id, review_type, overall_score, summary, created_at',
        [projectId, 'ai', overallScore, summary]
      );
      newReview = reviewResult.rows[0];

      // Insert findings
      const fileName = path.basename(project.file_path);
      for (const finding of findings) {
        await client.query(
          'INSERT INTO review_findings (review_id, severity, issue, explanation, suggested_fix, file_name, line_number) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            newReview.id, 
            finding.severity || 'info', 
            finding.issue || 'ai-suggestion', 
            finding.explanation || 'AI review finding', 
            finding.suggested_fix || null, 
            fileName, 
            finding.line_number || 1
          ]
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
    console.error('AI Review Route Error:', err.message);
    res.status(500).json({ message: 'Server error triggering AI code review' });
  }
});

// @route   POST api/projects/:id/complexity
// @desc    Trigger complexity analysis on a project file
// @access  Private (Owner only)
router.post('/:id/complexity', auth, async (req, res) => {
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

    // Enforce empty file validation
    const fileSize = fs.statSync(absoluteFilePath).size;
    if (fileSize === 0) {
      return res.status(400).json({ message: 'Source file is empty. Cannot perform complexity analysis.' });
    }

    const language = (project.language || 'javascript').toLowerCase();
    let metrics;

    // 3. Execute appropriate complexity wrapper
    try {
      if (language === 'javascript' || language === 'js') {
        const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');
        if (!codeContent.trim()) {
          return res.status(400).json({ message: 'Source file is empty. Cannot perform complexity analysis.' });
        }
        metrics = getJSComplexity(codeContent);
      } else if (language === 'python' || language === 'py') {
        const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');
        if (!codeContent.trim()) {
          return res.status(400).json({ message: 'Source file is empty. Cannot perform complexity analysis.' });
        }
        metrics = await getPythonComplexity(absoluteFilePath);
      } else {
        return res.status(400).json({
          message: 'Complexity analysis is only supported for JavaScript and Python projects.'
        });
      }
    } catch (analysisErr) {
      console.error('Complexity analysis failed:', analysisErr.message);
      return res.status(502).json({
        message: `Complexity analysis runner failed: ${analysisErr.message}`
      });
    }

    // 4. Save to Database inside a transaction
    const client = await db.pool.connect();
    let newReview;

    try {
      await client.query('BEGIN');

      const avgCompText = metrics.avgFunctionComplexity.toFixed(1);
      const summaryText = `Avg complexity: ${avgCompText}, ${metrics.numFunctions} functions, ${metrics.linesOfCode} LOC`;
      
      // Calculate quality score: starts at 100, deducts based on avg function complexity
      const calculatedScore = Math.max(0, Math.min(100, Math.round(100 - (metrics.avgFunctionComplexity * 8))));

      // Insert parent review row
      const reviewInsert = await client.query(
        `INSERT INTO reviews (project_id, review_type, overall_score, summary)
         VALUES ($1, 'complexity', $2, $3)
         RETURNING id, project_id, review_type, overall_score, summary, created_at`,
        [projectId, calculatedScore, summaryText]
      );
      newReview = reviewInsert.rows[0];

      // Insert child complexity metrics row
      await client.query(
        `INSERT INTO complexity_metrics (
           review_id, cyclomatic_complexity, avg_function_complexity, 
           file_complexity, num_functions, num_classes, lines_of_code
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newReview.id,
          metrics.fileComplexity,
          metrics.avgFunctionComplexity,
          metrics.fileComplexity,
          metrics.numFunctions,
          metrics.numClasses,
          metrics.linesOfCode
        ]
      );

      // Insert individual functions into review_findings as info findings
      const fileName = path.basename(project.file_path);
      for (const fn of metrics.functions) {
        await client.query(
          `INSERT INTO review_findings (review_id, severity, issue, explanation, suggested_fix, file_name, line_number)
           VALUES ($1, 'info', 'function-complexity', $2, $3, $4, $5)`,
          [
            newReview.id,
            `Function '${fn.name}' has cyclomatic complexity of ${fn.complexity}.`,
            `Line ${fn.lineStart} to ${fn.lineEnd}`,
            fileName,
            fn.lineStart
          ]
        );
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // 5. Return JSON payload
    res.json({
      review: newReview,
      metrics: {
        id: newReview.id,
        review_id: newReview.id,
        cyclomatic_complexity: metrics.fileComplexity,
        avg_function_complexity: metrics.avgFunctionComplexity,
        file_complexity: metrics.fileComplexity,
        num_functions: metrics.numFunctions,
        num_classes: metrics.numClasses,
        lines_of_code: metrics.linesOfCode,
        functions: metrics.functions
      }
    });

  } catch (err) {
    console.error('Complexity endpoint error:', err.message);
    res.status(500).json({ message: 'Server error during complexity analysis execution' });
  }
});

// @route   GET api/projects/:id/reviews
// @desc    List all reviews associated with a specific project
// @access  Private (Owner only)
router.get('/:id/reviews', auth, async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Fetch the project and verify ownership
    const projectResult = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found or authorization denied' });
    }

    // 2. Fetch all reviews associated with this project
    const reviewsResult = await db.query(
      'SELECT id, review_type, overall_score, summary, created_at FROM reviews WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );

    res.json(reviewsResult.rows);

  } catch (err) {
    console.error('List Project Reviews Error:', err.message);
    res.status(500).json({ message: 'Server error retrieving project reviews' });
  }
});

// @route   POST api/projects/:id/documentation
// @desc    Generate documentation for a project via AI and store in documentation_entries table
// @access  Private
router.post('/:id/documentation', auth, async (req, res) => {
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

    // 3. Enforce size limit and empty check
    const stats = fs.statSync(absoluteFilePath);
    if (stats.size === 0) {
      return res.status(400).json({ message: 'Source file is empty. Cannot generate documentation.' });
    }
    if (stats.size > 50 * 1024) {
      return res.status(400).json({ message: 'Source code exceeds size limit (50KB) for AI analysis.' });
    }

    const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');
    if (!codeContent.trim()) {
      return res.status(400).json({ message: 'Source file is empty. Cannot generate documentation.' });
    }

    // 4. Generate AI Documentation
    let docResult;
    try {
      docResult = await getAIDocumentation(codeContent, project.language || 'javascript');
    } catch (aiErr) {
      console.error('AI Documentation engine failed:', aiErr.message);
      
      // Handle timeout specifically
      if (aiErr.message === 'TIMEOUT') {
        return res.status(504).json({
          message: 'AI documentation request timed out after 60 seconds.'
        });
      }
      
      // Handle rate limits (429 status code)
      if (aiErr.message.includes('429') || aiErr.status === 429) {
        return res.status(429).json({
          message: 'AI review rate limit reached. Please try again shortly.'
        });
      }

      return res.status(502).json({
        message: `AI documentation generator failed: ${aiErr.message}`
      });
    }

    // 5. Database transaction to save review and documentation entries
    const client = await db.pool.connect();
    let newReview;
    const insertedEntries = [];

    try {
      await client.query('BEGIN');

      // Insert parent review row
      const reviewInsert = await client.query(
        `INSERT INTO reviews (project_id, review_type, overall_score, summary)
         VALUES ($1, 'documentation', 100, $2)
         RETURNING id, project_id, review_type, overall_score, summary, created_at`,
        [projectId, docResult.fileSummary || 'Auto-generated documentation.']
      );
      newReview = reviewInsert.rows[0];

      // Save file summary as an entry
      const fileEntry = await client.query(
        `INSERT INTO documentation_entries (review_id, entry_type, name, description, parameters, returns, docstring)
         VALUES ($1, 'file', $2, $3, $4, $5, $6)
         RETURNING id, review_id, entry_type, name, description, parameters, returns, docstring, created_at`,
        [newReview.id, path.basename(project.file_path), docResult.fileSummary || '', null, null, null]
      );
      insertedEntries.push(fileEntry.rows[0]);

      // Save classes
      if (docResult.classes && Array.isArray(docResult.classes)) {
        for (const cls of docResult.classes) {
          // Light validation: check if class name exists in code
          if (cls.name && !codeContent.includes(cls.name)) {
            console.warn(`Filtering out hallucinated class documentation for: ${cls.name}`);
            continue;
          }

          const classEntry = await client.query(
            `INSERT INTO documentation_entries (review_id, entry_type, name, description, parameters, returns, docstring)
             VALUES ($1, 'class', $2, $3, $4, $5, $6)
             RETURNING id, review_id, entry_type, name, description, parameters, returns, docstring, created_at`,
            [
              newReview.id,
              cls.name || 'AnonymousClass',
              cls.purpose || '',
              cls.properties ? JSON.stringify(cls.properties) : null,
              null,
              cls.docstring || null
            ]
          );
          insertedEntries.push(classEntry.rows[0]);

          // Save class methods if any
          if (cls.methods && Array.isArray(cls.methods)) {
            for (const method of cls.methods) {
              // Light validation: check if method name exists in code
              if (method.name && !codeContent.includes(method.name)) {
                console.warn(`Filtering out hallucinated class method documentation for: ${cls.name}.${method.name}`);
                continue;
              }

              const methodEntry = await client.query(
                `INSERT INTO documentation_entries (review_id, entry_type, name, description, parameters, returns, docstring)
                 VALUES ($1, 'function', $2, $3, $4, $5, $6)
                 RETURNING id, review_id, entry_type, name, description, parameters, returns, docstring, created_at`,
                [
                  newReview.id,
                  `${cls.name}.${method.name || 'anonymous'}`,
                  method.purpose || '',
                  method.params ? JSON.stringify(method.params) : null,
                  method.returns || null,
                  method.docstring || null
                ]
              );
              insertedEntries.push(methodEntry.rows[0]);
            }
          }
        }
      }

      // Save standalone functions
      if (docResult.functions && Array.isArray(docResult.functions)) {
        for (const fn of docResult.functions) {
          // Light validation: check if function name exists in code
          if (fn.name && !codeContent.includes(fn.name)) {
            console.warn(`Filtering out hallucinated function documentation for: ${fn.name}`);
            continue;
          }

          const fnEntry = await client.query(
            `INSERT INTO documentation_entries (review_id, entry_type, name, description, parameters, returns, docstring)
             VALUES ($1, 'function', $2, $3, $4, $5, $6)
             RETURNING id, review_id, entry_type, name, description, parameters, returns, docstring, created_at`,
            [
              newReview.id,
              fn.name || 'anonymous',
              fn.purpose || '',
              fn.params ? JSON.stringify(fn.params) : null,
              fn.returns || null,
              fn.docstring || null
            ]
          );
          insertedEntries.push(fnEntry.rows[0]);
        }
      }

      await client.query('COMMIT');

      // Update project updated_at timestamp
      await db.query(
        'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [projectId]
      );

      res.status(201).json({
        review: newReview,
        entries: insertedEntries
      });

    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('AI Documentation endpoint error:', err.message);
    res.status(500).json({ message: 'Server error during documentation generation' });
  }
});

module.exports = router;
