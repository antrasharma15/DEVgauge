const request = require('supertest');
const app = require('../index');
const db = require('../db');
const fs = require('fs');
const path = require('path');

// Mock AI module to prevent external API calls & token consumption
jest.mock('../utils/ai', () => ({
  getAIReview: jest.fn().mockResolvedValue([
    {
      severity: 'warning',
      issue: 'code-smell-long-function',
      explanation: 'Function is longer than 50 lines.',
      suggested_fix: 'Split it into helper functions.',
      line_number: 10
    }
  ]),
  getAIDocumentation: jest.fn().mockResolvedValue({
    fileSummary: 'Standalone module helper for processing totals.',
    classes: [],
    functions: [
      {
        name: 'calculateTotal',
        purpose: 'Calculates price totals from items list.',
        params: [{ name: 'items', type: 'Array' }],
        returns: 'number',
        docstring: '/** Calculates price totals */'
      }
    ]
  })
}));

describe('DEVgauge End-to-End Integration Flow', () => {
  const timestamp = Date.now();
  const testEmail = `qa_test_${timestamp}@example.com`;
  const testPassword = 'Password123';
  const testName = 'QA Tester';

  let token = null;
  let projectId = null;
  let reviewId = null;
  let codeFilePath = null;

  // Cleanup testing data
  afterAll(async () => {
    // Delete test user (cascades database foreign keys automatically)
    await db.query('DELETE FROM users WHERE email = $1', [testEmail]);
    
    // Cleanup generated file on disk if any
    if (codeFilePath && fs.existsSync(codeFilePath)) {
      try {
        fs.unlinkSync(codeFilePath);
      } catch (err) {
        console.error('Error deleting test file:', err.message);
      }
    }
    
    // Close database connection pool
    await db.pool.end();
  });

  // 1. Signup Flow
  test('1. User Signup - Success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: testName,
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testEmail.toLowerCase().trim());
  });

  // Validation Check: Signup with missing fields
  test('1b. User Signup - Missing fields validation (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid@example.com'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toContain('Validation failed');
  });

  // 2. Login Flow
  test('2. User Login - Success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  // 3. Create Project (Pasted code)
  test('3. Create Project (Pasted JS code) - Success', async () => {
    const sampleCode = `
      function calculateTotal(items) {
        let total = 0;
        for (const item of items) {
          total += item.price;
        }
        return total;
      }
    `;

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        project_name: 'E2E Testing Project',
        code: sampleCode,
        language: 'javascript'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.project_name).toBe('E2E Testing Project');
    projectId = res.body.id;
    codeFilePath = path.join(__dirname, '..', res.body.file_path);
  });

  // 4. Static analysis
  test('4. Run Static Code Analysis - Success', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/analyze`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('review_type', 'static');
    expect(res.body).toHaveProperty('overall_score');
  });

  // 5. AI review
  test('5. Run AI Code Review - Success', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/ai-review`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('review_type', 'ai');
  });

  // 6. Complexity analysis
  test('6. Run Complexity Analysis - Success', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/complexity`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('review');
    expect(res.body.review).toHaveProperty('review_type', 'complexity');
    expect(res.body).toHaveProperty('metrics');
    
    reviewId = res.body.review.id;
  });

  // 7. Documentation generation
  test('7. Run Documentation Generation - Success', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/documentation`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('review');
    expect(res.body.review).toHaveProperty('review_type', 'documentation');
    expect(res.body).toHaveProperty('entries');
  });

  // 8. Search projects
  test('8. Search projects list - Success', async () => {
    const res = await request(app)
      .get('/api/projects?search=E2E&sort=newest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].project_name).toBe('E2E Testing Project');
  });

  // 9. Delete review run
  test('9. Delete complexity review run - Success', async () => {
    const res = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    
    // Assert deletion in database
    const dbCheck = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    expect(dbCheck.rows.length).toBe(0);
  });

  // 10. Delete project
  test('10. Delete project - Success', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    
    // Assert project file deleted from filesystem
    expect(fs.existsSync(codeFilePath)).toBe(false);
  });
});
