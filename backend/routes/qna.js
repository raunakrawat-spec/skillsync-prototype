// routes/qna.js
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const ai = require('../utils/aiClient');

const router = express.Router();

// GET /api/qna/questions — list all questions with their answers
router.get('/questions', (req, res) => {
  const questions = db.prepare('SELECT * FROM questions ORDER BY created_at DESC').all();
  const withAnswers = questions.map((q) => ({
    ...q,
    answers: db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY created_at ASC').all(q.id)
  }));
  res.json({ questions: withAnswers });
});

// GET /api/qna/questions/:id
router.get('/questions/:id', (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  const answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY created_at ASC').all(q.id);
  res.json({ question: { ...q, answers } });
});

// POST /api/qna/questions — ask a new question
router.post('/questions', requireAuth, (req, res) => {
  const { title, body } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });

  const id = uuid();
  db.prepare('INSERT INTO questions (id, user_id, title, body) VALUES (?, ?, ?, ?)').run(id, req.user.id, title, body || null);
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  res.status(201).json({ question: { ...question, answers: [] } });
});

// POST /api/qna/questions/:id/answer — a human expert answers
router.post('/questions/:id/answer', requireAuth, (req, res) => {
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body is required' });

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const id = uuid();
  db.prepare(
    `INSERT INTO answers (id, question_id, user_id, answerer_name, answerer_role, body, is_bot)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(id, question.id, req.user.id, req.user.name, req.user.headline || 'SkillSync member', body);

  db.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").run(question.id);

  const answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY created_at ASC').all(question.id);
  res.status(201).json({ answers });
});

// POST /api/qna/questions/:id/bot-answer — ask the AI chatbot to answer.
// Falls back to a friendly canned response if no AI key is configured or
// the call fails, so the button always does something useful.
router.post('/questions/:id/bot-answer', requireAuth, async (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  let answerBody;
  try {
    if (!ai.isConfigured()) throw new Error('AI not configured');
    answerBody = await ai.answerQuestion({ title: question.title, body: question.body });
  } catch (err) {
    answerBody =
      "Thanks for the question! Our AI assistant isn't available right now, but this has been " +
      'flagged for an expert to answer soon. In the meantime, check the FAQs tab — a similar ' +
      'question may already be covered there.';
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO answers (id, question_id, user_id, answerer_name, answerer_role, body, is_bot)
     VALUES (?, ?, NULL, 'SkillSync AI', 'Assistant', ?, 1)`
  ).run(id, question.id, answerBody);

  db.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").run(question.id);
  const answers = db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY created_at ASC').all(question.id);
  res.status(201).json({ answers });
});

// GET /api/qna/faqs
router.get('/faqs', (req, res) => {
  res.json({ faqs: db.prepare('SELECT * FROM faqs').all() });
});

module.exports = router;
