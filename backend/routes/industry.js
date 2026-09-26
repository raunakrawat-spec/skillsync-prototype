// routes/industry.js
const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/industry/courses — trending courses by demand
router.get('/courses', (req, res) => {
  const rows = db.prepare('SELECT * FROM courses ORDER BY demand_pct DESC').all();
  res.json({ courses: rows });
});

// GET /api/industry/companies?search=&sector= — browse companies
router.get('/companies', (req, res) => {
  const { search, sector } = req.query;
  let rows = db.prepare('SELECT * FROM companies').all();
  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (sector && sector !== 'All sectors') {
    rows = rows.filter((c) => c.sector.toLowerCase() === String(sector).toLowerCase());
  }
  res.json({
    companies: rows.map((c) => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      topCourses: JSON.parse(c.courses_json || '[]'),
      topSkills: JSON.parse(c.skills_json || '[]'),
      avgInterns: c.avg_interns,
      internsPlaced: c.interns_placed,
      colleges: JSON.parse(c.colleges_json || '[]'),
      internStatus: c.intern_status
    }))
  });
});

// GET /api/industry/companies/:name/course-demand
router.get('/companies/:name/course-demand', (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE lower(name) = lower(?)').get(req.params.name);
  if (!row) return res.status(404).json({ error: 'Company not found' });
  res.json({ company: row.name, sector: row.sector, topCourses: JSON.parse(row.courses_json || '[]') });
});

// GET /api/industry/companies/:name/skill-demand
router.get('/companies/:name/skill-demand', (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE lower(name) = lower(?)').get(req.params.name);
  if (!row) return res.status(404).json({ error: 'Company not found' });
  res.json({ company: row.name, sector: row.sector, topSkills: JSON.parse(row.skills_json || '[]') });
});

module.exports = router;
