// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const db = require('./db'); // ensures schema is created on boot

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const roadmapRoutes = require('./routes/roadmap');
const industryRoutes = require('./routes/industry');
const spotlightRoutes = require('./routes/spotlight');
const internshipsRoutes = require('./routes/internships');
const qnaRoutes = require('./routes/qna');

const path = require('path');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Serve the frontend website from the public/ folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'skillsync-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/industry', industryRoutes);
app.use('/api/spotlight', spotlightRoutes);
app.use('/api/internships', internshipsRoutes);
app.use('/api/qna', qnaRoutes);

// 404 handler for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Any other page request → send the website (so refreshing works too)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SkillSync backend listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
