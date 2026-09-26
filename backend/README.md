# SkillSync Backend

Backend API for the SkillSync SIH prototype — a labour-market intelligence
and curriculum-alignment platform. This server powers all five pages of the
frontend: Industry Demand / Roadmap, Career Spotlight, Internships, Q&A, and
Profile.

## Stack

- **Node.js + Express** — REST API
- **SQLite (better-sqlite3)** — zero-setup embedded database (one file, no
  separate DB server to install — swap for Postgres/MySQL later if you need
  to scale, the query layer is isolated in `db.js` and the route files)
- **JWT auth** (`jsonwebtoken` + `bcryptjs`) — signup/login
- **Anthropic API (optional)** — if you set `ANTHROPIC_API_KEY`, roadmap
  generation and the Q&A chatbot call Claude for a richer, personalised,
  day-wise plan. If you don't set a key, everything still works using the
  built-in rule-based matching engine (ported 1:1 from the prototype's
  in-browser JS).

## 1. Install

```bash
cd skillsync-backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and at minimum change `JWT_SECRET` to a random string. Leave
`ANTHROPIC_API_KEY` blank if you don't have one yet — the app degrades
gracefully.

## 3. Seed demo data

Populates trending courses, sample companies (with course/skill demand +
internship data), career-spotlight stories, and FAQs — the same data that
was hardcoded in the HTML prototype.

```bash
npm run seed
```

## 4. Run

```bash
npm start
# or, for auto-restart on file changes during development:
npm run dev
```

The API listens on `http://localhost:4000` by default. Check it's alive:

```bash
curl http://localhost:4000/api/health
```

## API overview

All endpoints are under `/api`. Endpoints marked 🔒 require an
`Authorization: Bearer <token>` header (token comes from register/login).

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` 🔒 | Current user |

### Profile (page 5)
| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` 🔒 | Full profile: level, field, interests, skills, experience, achievements, saved courses |
| PUT | `/api/profile` 🔒 | Upsert `{ level, field, interests[], skills[], time, hours, mode }` |
| POST | `/api/profile/experience` 🔒 | `{ companyRole, duration }` |
| POST | `/api/profile/achievement` 🔒 | `{ title }` |
| POST | `/api/profile/saved-courses` 🔒 | `{ courseTitle }` |

### Roadmap (page 1 — main feature)
| Method | Path | Description |
|---|---|---|
| POST | `/api/roadmap/generate` 🔒 | Wizard answers in → matched track(s) + week-by-week + day-wise roadmap out. Uses Claude if configured, else rule-based engine. |
| GET | `/api/roadmap/latest` 🔒 | Most recently generated roadmap |
| GET | `/api/roadmap/history` 🔒 | All past roadmaps (e.g. after retakes) |

### Industry demand (page 1 — other tabs)
| Method | Path | Description |
|---|---|---|
| GET | `/api/industry/courses` | Trending courses with demand % |
| GET | `/api/industry/companies?search=&sector=` | Browse companies |
| GET | `/api/industry/companies/:name/course-demand` | Top courses a company hires for |
| GET | `/api/industry/companies/:name/skill-demand` | Top skills a company hires for |

### Career Spotlight (page 2)
| Method | Path | Description |
|---|---|---|
| GET | `/api/spotlight` | All stories |
| GET | `/api/spotlight/:id` | One full story |
| POST | `/api/spotlight` 🔒 | Submit your own story |

### Internships (page 3)
| Method | Path | Description |
|---|---|---|
| GET | `/api/internships?sector=` | Companies taking interns + colleges they visit |
| GET | `/api/internships/standing?skills=Excel,SQL` | Ranks companies by how ready you are, given your (or the passed) skills |

### Q&A (page 4)
| Method | Path | Description |
|---|---|---|
| GET | `/api/qna/questions` | All questions with answers |
| POST | `/api/qna/questions` 🔒 | `{ title, body }` |
| POST | `/api/qna/questions/:id/answer` 🔒 | Human expert answers: `{ body }` |
| POST | `/api/qna/questions/:id/bot-answer` 🔒 | Ask the AI chatbot to answer instead |
| GET | `/api/qna/faqs` | FAQ list |

## How this connects to the frontend

`SkillSync-connected.html` (in the same delivery as this backend) is your
uploaded prototype wired up to call these endpoints instead of only running
in-browser. It expects the API at `http://localhost:4000/api` by default —
change the `API_BASE` constant near the top of its `<script>` block if you
deploy the backend elsewhere, and update `CORS_ORIGIN` in `.env` to match
wherever you host the HTML file.

## Notes on the AI integration

`utils/aiClient.js` calls Claude via the standard Anthropic Messages API. It
is used in two places, both **optional enhancements** with automatic
fallback to deterministic logic so a missing/invalid key never breaks the
app:

1. `POST /api/roadmap/generate` — refines stage descriptions and writes a
   genuine day-by-day plan for week 1 of the roadmap, personalised to the
   trainee's background and hour budget.
2. `POST /api/qna/questions/:id/bot-answer` — answers a trainee's question
   directly when no human expert has replied yet.

## Deploying so GitHub Pages (or any static host) can reach it

GitHub Pages / GitHub itself only serves static files — it cannot run this
Node server. Put the two pieces on two different hosts, both from the same
repo:

1. **Push both folders to one GitHub repo**, e.g.:
   ```
   your-repo/
     index.html          <- SkillSync-frontend.html, renamed
     skillsync-backend/  <- this whole folder
   ```
2. **Deploy `skillsync-backend/` to a Node host** — Render's free tier is
   the easiest:
   - New → Web Service → connect your repo → set **Root Directory** to
     `skillsync-backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variables from `.env.example` (`JWT_SECRET` at
     minimum — generate a random string; leave `ANTHROPIC_API_KEY` blank
     if you don't have one)
   - Deploy, then run `npm run seed` once via Render's Shell tab to load
     demo data
   - Copy the live URL Render gives you, e.g.
     `https://skillsync-backend.onrender.com`
   - Railway or Fly.io work the same way — connect repo, set start
     command `node server.js`, add the same env vars.
3. **Point the frontend at it**: open `index.html`, find
   `DEPLOYED_BACKEND_URL` near the top of the `<script>` tag, and set it to
   `https://<your-backend-host>/api`. Commit and push.
4. **Enable GitHub Pages**: repo Settings → Pages → deploy from your main
   branch. Your site (`https://<user>.github.io/<repo>`) now calls the
   live backend.
5. **Lock down CORS**: back on the host, set `CORS_ORIGIN` to your exact
   Pages URL (no trailing slash) instead of `*`, and redeploy.

## Production notes

- Swap SQLite for Postgres/MySQL by replacing `db.js` — the rest of the
  code only calls `db.prepare(...).run/get/all(...)`, which is easy to
  mirror with `pg`/`mysql2` query builders if you outgrow SQLite.
- Add rate limiting (e.g. `express-rate-limit`) before exposing this
  publicly, especially on `/api/auth/*` and the AI-backed endpoints.
- Consider moving expert verification/roles (`users.role`) into a proper
  admin workflow before letting arbitrary users post Spotlight stories or
  answer questions as "experts".
