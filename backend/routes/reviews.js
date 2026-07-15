const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// @route   GET api/reviews/:id
// @desc    Fetch a specific static review with its findings
// @access  Private (Owner only)
router.get('/:id', auth, async (req, res) => {
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
      return res.status(404).json({ message: 'Review not found or authorization denied' });
    }

    const review = reviewResult.rows[0];

    // Fetch findings sorted by line number
    const findingsResult = await db.query(
      'SELECT id, severity, issue, explanation, file_name, line_number FROM review_findings WHERE review_id = $1 ORDER BY line_number ASC',
      [reviewId]
    );

    res.json({
      ...review,
      findings: findingsResult.rows
    });

  } catch (err) {
    console.error('Get Review Error:', err.message);
    res.status(500).json({ message: 'Server error retrieving review findings' });
  }
});

module.exports = router;
