// routes/roadmap.js
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const engine = require('../utils/roadmapEngine');
const ai = require('../utils/aiClient');

const router = express.Router();
router.use(requireAuth);

// POST /api/roadmap/generate
// Body: { name, level, field, interests: [...], skills: [{name, level}],
//         time, hours, mode }
// Saves the wizard answers to the profile, matches tracks, builds a
// week-by-week + day-wise roadmap, optionally enriches it with Claude, and
// stores + returns the result.
router.post('/generate', async (req, res) => {
  const userId = req.user.id;
  const profile = req.body || {};

  if (!profile.level || !profile.field) {
    return res.status(400).json({ error: 'level and field are required' });
  }
  if (!Array.isArray(profile.interests) || profile.interests.length === 0) {
    return res.status(400).json({ error: 'At least one interest is required' });
  }

  // Persist the wizard answers onto the profile so /api/profile stays in sync.
  const saveProfile = db.transaction(() => {
    db.prepare(
      `INSERT INTO profiles (user_id, level, field, time_available, hours_per_week, mode, updated_at)
       VALUES (@userId, @level, @field, @time, @hours, @mode, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         level=excluded.level, field=excluded.field, time_available=excluded.time_available,
         hours_per_week=excluded.hours_per_week, mode=excluded.mode, updated_at=datetime('now')`
    ).run({
      userId,
      level: profile.level,
      field: profile.field,
      time: profile.time || null,
      hours: profile.hours || null,
      mode: profile.mode || null
    });

    db.prepare('DELETE FROM profile_interests WHERE user_id = ?').run(userId);
    const insertInterest = db.prepare('INSERT INTO profile_interests (user_id, interest_key) VALUES (?, ?)');
    profile.interests.forEach((k) => insertInterest.run(userId, k));

    if (Array.isArray(profile.skills)) {
      db.prepare('DELETE FROM profile_skills WHERE user_id = ?').run(userId);
      const insertSkill = db.prepare('INSERT INTO profile_skills (user_id, name, level) VALUES (?, ?, ?)');
      profile.skills.forEach((s) => insertSkill.run(userId, s.name, s.level || 'Beginner'));
    }
  });
  saveProfile();

  const matchedKeys = engine.matchTracks(profile);
  const built = matchedKeys.map((key) => engine.buildRoadmap(key, profile));

  let source = 'rule-based';
  if (ai.isConfigured()) {
    try {
      const primary = built[0];
      const enrichment = await ai.enrichRoadmap({ profile, baseRoadmap: primary });
      // Merge AI text into the rule-based structure (keeps weeks/skills/resources intact,
      // replaces focus text and adds a genuinely personalised week-1 day plan).
      primary.summary = enrichment.summary;
      enrichment.stages.forEach((aiStage, i) => {
        if (primary.stages[i]) {
          primary.stages[i].focus = aiStage.focus || primary.stages[i].focus;
          if (Array.isArray(aiStage.dayWiseWeek1) && aiStage.dayWiseWeek1.length) {
            primary.stages[i].dayWise[0] = { week: 1, days: aiStage.dayWiseWeek1 };
          }
        }
      });
      source = 'ai';
    } catch (err) {
      console.warn('[roadmap] AI enrichment failed, using rule-based roadmap:', err.message);
    }
  }

  const primaryRoadmap = built[0];
  const roadmapId = uuid();
  db.prepare(
    `INSERT INTO roadmaps (id, user_id, track_key, track_label, total_weeks, source, data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(roadmapId, userId, primaryRoadmap.track.key, primaryRoadmap.track.label, primaryRoadmap.totalWeeks, source, JSON.stringify({ matched: built, name: profile.name || null }));

  res.status(201).json({
    id: roadmapId,
    source,
    name: profile.name || null,
    matched: built,
    labels: {
      level: engine.LEVEL_LABELS[profile.level],
      time: engine.TIME_LABELS[profile.time],
      hours: engine.HOURS_LABELS[profile.hours],
      mode: engine.MODE_LABELS[profile.mode]
    }
  });
});

// GET /api/roadmap/latest — most recent generated roadmap for this user
router.get('/latest', (req, res) => {
  const row = db
    .prepare('SELECT * FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.user.id);
  if (!row) return res.status(404).json({ error: 'No roadmap generated yet' });
  const data = JSON.parse(row.data_json);
  res.json({
    id: row.id,
    source: row.source,
    trackKey: row.track_key,
    trackLabel: row.track_label,
    totalWeeks: row.total_weeks,
    createdAt: row.created_at,
    name: data.name,
    matched: data.matched
  });
});

// GET /api/roadmap/history — all past roadmaps (e.g. after retakes)
router.get('/history', (req, res) => {
  const rows = db
    .prepare('SELECT id, track_key, track_label, total_weeks, source, created_at FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ roadmaps: rows });
});

module.exports = router;
