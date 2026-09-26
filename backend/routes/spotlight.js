// routes/spotlight.js
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/spotlight — list all career stories
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM career_stories ORDER BY created_at DESC').all();
  res.json({ stories: rows });
});

// GET /api/spotlight/:id — full story
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM career_stories WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Story not found' });
  res.json({ story: row });
});

// POST /api/spotlight — a logged-in "expert" user can submit their own story.
// (In a full product this would require role==='expert' + moderation; kept
// open to any authenticated user here so it's easy to demo.)
router.post('/', requireAuth, (req, res) => {
  const { role, company, yearsExperience, salaryRange, shortQuote, fullStory, startedFrom, pathTaken } = req.body || {};
  if (!role || !fullStory) return res.status(400).json({ error: 'role and fullStory are required' });

  const info = db
    .prepare(
      `INSERT INTO career_stories
       (user_id, name, role, company, years_experience, salary_range, short_quote, full_story, started_from, path_taken)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, req.user.name, role, company || null, yearsExperience || null, salaryRange || null, shortQuote || null, fullStory, startedFrom || null, pathTaken || null);

  const story = db.prepare('SELECT * FROM career_stories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ story });
});

module.exports = router;
