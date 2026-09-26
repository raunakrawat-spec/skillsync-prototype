// routes/profile.js
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function loadFullProfile(userId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) || {};
  const interests = db
    .prepare('SELECT interest_key FROM profile_interests WHERE user_id = ?')
    .all(userId)
    .map((r) => r.interest_key);
  const skills = db
    .prepare('SELECT id, name, level FROM profile_skills WHERE user_id = ?')
    .all(userId);
  const experience = db
    .prepare('SELECT id, company_role, duration, created_at FROM profile_experience WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);
  const achievements = db
    .prepare('SELECT id, title, created_at FROM profile_achievements WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);
  const savedCourses = db
    .prepare('SELECT id, course_title, created_at FROM saved_courses WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);

  return {
    level: profile.level || null,
    field: profile.field || null,
    time: profile.time_available || null,
    hours: profile.hours_per_week || null,
    mode: profile.mode || null,
    interests,
    skills,
    experience,
    achievements,
    savedCourses
  };
}

// GET /api/profile — the logged-in user's full profile
router.get('/', (req, res) => {
  res.json({ profile: loadFullProfile(req.user.id) });
});

// PUT /api/profile — upsert the wizard answers (level, field, interests, skills, time, hours, mode)
router.put('/', (req, res) => {
  const { level, field, interests, skills, time, hours, mode } = req.body || {};
  const userId = req.user.id;

  const upsert = db.transaction(() => {
    db.prepare(
      `INSERT INTO profiles (user_id, level, field, time_available, hours_per_week, mode, updated_at)
       VALUES (@userId, @level, @field, @time, @hours, @mode, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         level=excluded.level, field=excluded.field, time_available=excluded.time_available,
         hours_per_week=excluded.hours_per_week, mode=excluded.mode, updated_at=datetime('now')`
    ).run({ userId, level: level || null, field: field || null, time: time || null, hours: hours || null, mode: mode || null });

    if (Array.isArray(interests)) {
      db.prepare('DELETE FROM profile_interests WHERE user_id = ?').run(userId);
      const insertInterest = db.prepare('INSERT INTO profile_interests (user_id, interest_key) VALUES (?, ?)');
      interests.forEach((k) => insertInterest.run(userId, k));
    }

    if (Array.isArray(skills)) {
      db.prepare('DELETE FROM profile_skills WHERE user_id = ?').run(userId);
      const insertSkill = db.prepare('INSERT INTO profile_skills (user_id, name, level) VALUES (?, ?, ?)');
      skills.forEach((s) => insertSkill.run(userId, s.name, s.level || 'Beginner'));
    }
  });

  upsert();
  res.json({ profile: loadFullProfile(userId) });
});

// POST /api/profile/experience
router.post('/experience', (req, res) => {
  const { companyRole, duration } = req.body || {};
  if (!companyRole) return res.status(400).json({ error: 'companyRole is required' });
  db.prepare('INSERT INTO profile_experience (user_id, company_role, duration) VALUES (?, ?, ?)').run(
    req.user.id, companyRole, duration || null
  );
  res.status(201).json({ profile: loadFullProfile(req.user.id) });
});

// POST /api/profile/achievement
router.post('/achievement', (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  db.prepare('INSERT INTO profile_achievements (user_id, title) VALUES (?, ?)').run(req.user.id, title);
  res.status(201).json({ profile: loadFullProfile(req.user.id) });
});

// POST /api/profile/saved-courses
router.post('/saved-courses', (req, res) => {
  const { courseTitle } = req.body || {};
  if (!courseTitle) return res.status(400).json({ error: 'courseTitle is required' });
  db.prepare('INSERT INTO saved_courses (user_id, course_title) VALUES (?, ?)').run(req.user.id, courseTitle);
  res.status(201).json({ profile: loadFullProfile(req.user.id) });
});

module.exports = router;
