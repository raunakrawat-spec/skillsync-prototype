// utils/aiClient.js
// Thin wrapper around the Anthropic Messages API. Every function here is
// optional-enhancement only: if ANTHROPIC_API_KEY is not set, or the API
// call fails for any reason (offline, rate limit, bad key...), callers must
// fall back to the deterministic rule-based engine so the product still
// works end-to-end without any AI key configured.

require('dotenv').config();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

const isConfigured = () => Boolean(API_KEY);

async function callClaude({ system, prompt, maxTokens = 1200 }) {
  if (!isConfigured()) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Ask Claude to turn the rule-based roadmap into a richer, personalised
 * plan: refine stage descriptions and produce a genuine day-by-day plan
 * for week 1, tailored to the user's exact time budget and background.
 * Returns parsed JSON matching the shape the frontend expects, or throws
 * on any failure (caller should catch and keep the rule-based version).
 */
async function enrichRoadmap({ profile, baseRoadmap }) {
  const system = `You are SkillSync AI, a labour-market and curriculum-alignment assistant for an
Indian skilling platform. You personalise learning roadmaps so a trainee's
skills match real industry demand. You must respond with ONLY valid JSON,
no markdown fences, no commentary, matching exactly this shape:
{
  "summary": "1-2 sentence personalised summary of why this track fits them",
  "stages": [
    { "title": "string (keep same order/count as input stages)",
      "focus": "string, rewritten to be specific to this person",
      "dayWiseWeek1": [ { "day": 1, "focus": "string", "task": "string, concrete task doable in their daily hour budget" } ]
    }
  ]
}
Keep the same number of stages and the same stage order as given. Do not
invent stages. Keep each task realistic for the person's weekly hour budget.`;

  const prompt = `Trainee profile:
- Name: ${profile.name || 'Not given'}
- Education level: ${profile.level}
- Field studied: ${profile.field}
- Interests: ${(profile.interests || []).join(', ')}
- Existing skills: ${(profile.skills || []).map((s) => `${s.name} (${s.level})`).join(', ') || 'none'}
- Time budget overall: ${profile.time}
- Hours per week: ${profile.hours}
- Preferred learning mode: ${profile.mode}

Matched track: ${baseRoadmap.track.label}
Total weeks: ${baseRoadmap.totalWeeks}
Stages (title, focus, weeks, skills):
${baseRoadmap.stages.map((s, i) => `${i + 1}. ${s.title} — ${s.focus} (${s.weeks} weeks; skills: ${s.skills.join(', ')})`).join('\n')}

Personalise this into the required JSON shape.`;

  const raw = await callClaude({ system, prompt, maxTokens: 1800 });
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Ask Claude to answer a trainee's Q&A question as a general careers/skills
 * assistant, used only when no human expert has answered yet and the user
 * explicitly requests a bot answer.
 */
async function answerQuestion({ title, body }) {
  const system = `You are the SkillSync Q&A assistant. Trainees on an Indian skill-development
platform ask you career and skilling questions. Answer helpfully, concisely
(under 150 words), in plain text (no markdown headers). Be encouraging but
honest, and mention concrete next steps where relevant. If the question
needs a human expert's personal experience, say so plainly rather than
inventing specifics about a named person or company.`;

  const prompt = `Question title: ${title}\nDetails: ${body || '(no extra details given)'}`;
  const raw = await callClaude({ system, prompt, maxTokens: 400 });
  return raw.trim();
}

module.exports = { isConfigured, enrichRoadmap, answerQuestion };
