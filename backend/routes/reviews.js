const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const { validateRules } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');

// Validation rules
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

// @route   GET api/reviews/:id
// @desc    Fetch a specific static review with its findings
// @access  Private (Owner only)
router.get('/:id', auth, validateRules(idParamValidation), async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // Fetch review and verify owner permission on the project
    const reviewResult = await db.query(
      `SELECT r.id, r.project_id, r.review_type, r.overall_score, r.summary, r.created_at
       FROM reviews r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1 AND p.user_id = $2`,
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found or authorization denied', 404);
    }

    const review = reviewResult.rows[0];

    // Fetch findings sorted by line number
    const findingsResult = await db.query(
      'SELECT id, severity, issue, explanation, file_name, line_number, suggested_fix FROM review_findings WHERE review_id = $1 ORDER BY line_number ASC',
      [reviewId]
    );

    // If complexity review, load metrics as well
    if (review.review_type === 'complexity') {
      const metricsResult = await db.query(
        'SELECT id, review_id, cyclomatic_complexity, avg_function_complexity, file_complexity, num_functions, num_classes, lines_of_code, created_at FROM complexity_metrics WHERE review_id = $1',
        [reviewId]
      );
      if (metricsResult.rows.length > 0) {
        review.complexity_metrics = metricsResult.rows[0];
      }
    }

    // If documentation review, load entries as well
    if (review.review_type === 'documentation') {
      const entriesResult = await db.query(
        'SELECT id, review_id, entry_type, name, description, parameters, returns, docstring, created_at FROM documentation_entries WHERE review_id = $1 ORDER BY id ASC',
        [reviewId]
      );
      review.documentation_entries = entriesResult.rows;
    }

    res.json({
      ...review,
      findings: findingsResult.rows
    });

  } catch (err) {
    next(err);
  }
});

// @route   GET api/reviews/:id/complexity
// @desc    Fetch complexity metrics specifically for a review ID
// @access  Private (Owner only)
router.get('/:id/complexity', auth, validateRules(idParamValidation), async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // Verify owner permission via reviews and projects join
    const reviewResult = await db.query(
      `SELECT r.id, r.project_id, r.review_type, r.overall_score, r.summary, r.created_at
       FROM reviews r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1 AND p.user_id = $2`,
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found or authorization denied', 404);
    }

    const review = reviewResult.rows[0];

    const metricsResult = await db.query(
      'SELECT id, review_id, cyclomatic_complexity, avg_function_complexity, file_complexity, num_functions, num_classes, lines_of_code, created_at FROM complexity_metrics WHERE review_id = $1',
      [reviewId]
    );

    if (metricsResult.rows.length === 0) {
      throw new AppError('Complexity metrics not found for this review', 404);
    }

    // Load individual functions list as findings
    const findingsResult = await db.query(
      'SELECT id, severity, issue, explanation, file_name, line_number, suggested_fix FROM review_findings WHERE review_id = $1 ORDER BY line_number ASC',
      [reviewId]
    );

    res.json({
      review,
      metrics: {
        ...metricsResult.rows[0],
        functions: findingsResult.rows.map(f => {
          const nameMatch = f.explanation.match(/Function '([^']+)'/);
          const compMatch = f.explanation.match(/complexity of (\d+)/);
          const rangeMatch = f.suggested_fix ? f.suggested_fix.match(/Line (\d+) to (\d+)/) : null;
          
          return {
            name: nameMatch ? nameMatch[1] : 'anonymous',
            complexity: compMatch ? parseInt(compMatch[1]) : 1,
            lineStart: rangeMatch ? parseInt(rangeMatch[1]) : f.line_number,
            lineEnd: rangeMatch ? parseInt(rangeMatch[2]) : f.line_number
          };
        })
      }
    });

  } catch (err) {
    next(err);
  }
});

// @route   GET api/reviews/:id/documentation
// @desc    Fetch documentation entries specifically for a review ID
// @access  Private (Owner only)
router.get('/:id/documentation', auth, validateRules(idParamValidation), async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // Verify owner permission
    const reviewResult = await db.query(
      `SELECT r.id, r.project_id, r.review_type, r.overall_score, r.summary, r.created_at
       FROM reviews r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1 AND p.user_id = $2`,
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found or authorization denied', 404);
    }

    const review = reviewResult.rows[0];

    // Query entries
    const entriesResult = await db.query(
      'SELECT id, review_id, entry_type, name, description, parameters, returns, docstring, created_at FROM documentation_entries WHERE review_id = $1 ORDER BY id ASC',
      [reviewId]
    );

    res.json({
      review,
      entries: entriesResult.rows
    });

  } catch (err) {
    next(err);
  }
});

// @route   DELETE api/reviews/:id
// @desc    Delete a specific review run and its findings/metrics
// @access  Private (Owner only)
router.delete('/:id', auth, validateRules(idParamValidation), async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify existence
    const reviewResult = await db.query(
      `SELECT r.id, p.user_id
       FROM reviews r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    const review = reviewResult.rows[0];

    // Verify ownership (Prompt 3: return 403)
    if (review.user_id !== userId) {
      throw new AppError('Unauthorized to delete this review', 403);
    }

    // 2. Delete review from DB (cascades database foreign key rows)
    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({ message: 'Review audit log deleted successfully' });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
