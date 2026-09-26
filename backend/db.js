// db.js
// Single SQLite database for the whole app. better-sqlite3 is synchronous,
// which keeps the route code simple and is more than fast enough for an
// SIH prototype (and for most real deployments of this size).

require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'skillsync.db');
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- ========== Users & auth ==========
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- student | expert | admin
  headline TEXT,                       -- e.g. "Senior Data Analyst, Orbit Fintech" (for experts)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Profile / wizard answers (page 1 + page 5) ==========
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level TEXT,           -- 10th | 12th | iti | diploma | ug | pg
  field TEXT,           -- free text field/course studied
  time_available TEXT,  -- 2-4w | 1-3m | 3-6m | 6-12m | 1y+
  hours_per_week TEXT,  -- <5 | 5-10 | 10-20 | 20+
  mode TEXT,            -- online | offline | college | none
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profile_interests (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_key TEXT NOT NULL,
  PRIMARY KEY (user_id, interest_key)
);

CREATE TABLE IF NOT EXISTS profile_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Beginner' -- Beginner | Intermediate | Advanced
);

CREATE TABLE IF NOT EXISTS profile_experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_role TEXT NOT NULL,
  duration TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profile_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Roadmaps (AI + rule-based output, page 1) ==========
CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_key TEXT NOT NULL,
  track_label TEXT NOT NULL,
  total_weeks INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'rule-based', -- 'rule-based' | 'ai'
  data_json TEXT NOT NULL, -- full stage/resource/day-wise breakdown, serialised
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Industry demand data (page 1) ==========
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  demand_tag TEXT NOT NULL,   -- 'High demand' | 'Rising' | 'Oversupplied' etc
  demand_pct INTEGER NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL,
  courses_json TEXT NOT NULL DEFAULT '[]', -- top courses this company hires for
  skills_json TEXT NOT NULL DEFAULT '[]',  -- top skills this company hires for
  avg_interns INTEGER DEFAULT 0,
  interns_placed INTEGER DEFAULT 0,
  colleges_json TEXT NOT NULL DEFAULT '[]',
  intern_status TEXT DEFAULT 'Open'        -- 'Hiring now' | 'Open' | 'Seasonal'
);

-- ========== Career spotlight (page 2) ==========
CREATE TABLE IF NOT EXISTS career_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT,
  years_experience INTEGER,
  salary_range TEXT,
  short_quote TEXT,
  full_story TEXT,
  started_from TEXT,     -- what they studied / where they started
  path_taken TEXT,       -- the actual path: courses, certs, jobs in order
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Q&A (page 4) ==========
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | answered
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  answerer_name TEXT NOT NULL,
  answerer_role TEXT,
  body TEXT NOT NULL,
  is_bot INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL
);
`);

module.exports = db;
