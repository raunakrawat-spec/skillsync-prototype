// routes/internships.js
const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/internships?sector=IT — list internship-taking companies
router.get('/', (req, res) => {
  const { sector } = req.query;
  let rows = db.prepare('SELECT * FROM companies').all();
  if (sector && sector !== 'All sectors') {
    rows = rows.filter((c) => c.sector.toLowerCase() === String(sector).toLowerCase());
  }
  res.json({
    internships: rows.map((c) => ({
      id: c.id,
      company: c.name,
      sector: c.sector,
      status: c.intern_status,
      avgInterns: c.avg_interns,
      internsPlaced: c.interns_placed,
      colleges: JSON.parse(c.colleges_json || '[]'),
      requiredSkills: JSON.parse(c.skills_json || '[]')
    }))
  });
});

// GET /api/internships/standing — "where does a student with my current
// skills stand" — requires auth, uses the trainee's saved skills, and
// ranks companies by how many required skills they already have.
router.get('/standing', optionalAuth, (req, res) => {
  let mySkills = [];
  if (req.user) {
    mySkills = db
      .prepare('SELECT name FROM profile_skills WHERE user_id = ?')
      .all(req.user.id)
      .map((s) => s.name.toLowerCase());
  }
  // Also accept ad-hoc skills via query string for users who aren't logged in yet:
  // GET /api/internships/standing?skills=Excel,SQL
  if (req.query.skills) {
    mySkills = mySkills.concat(String(req.query.skills).toLowerCase().split(',').map((s) => s.trim()));
  }

  const companies = db.prepare('SELECT * FROM companies').all();
  const ranked = companies.map((c) => {
    const required = JSON.parse(c.skills_json || '[]');
    const have = required.filter((r) => mySkills.includes(r.toLowerCase()));
    const missing = required.filter((r) => !mySkills.includes(r.toLowerCase()));
    const readiness = required.length ? Math.round((have.length / required.length) * 100) : 0;
    return {
      company: c.name,
      sector: c.sector,
      status: c.intern_status,
      requiredSkills: required,
      matchedSkills: have,
      missingSkills: missing,
      readinessPct: readiness
    };
  }).sort((a, b) => b.readinessPct - a.readinessPct);

  res.json({ mySkills, standing: ranked });
});

module.exports = router;
