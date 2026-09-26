// utils/roadmapEngine.js
// This is the same matching logic that used to live only in the browser
// (TRACKS / matchTracks / buildRoadmap in the prototype HTML), moved to the
// server so it can be reused by the API, combined with real industry-demand
// data from the database, and optionally enriched by the AI layer.

const TIME_WEEKS = { '2-4w': 3, '1-3m': 8, '3-6m': 18, '6-12m': 36, '1y+': 52 };
const STAGE_WEIGHTS = [1, 2, 2, 1.5, 1.5];

const LEVEL_LABELS = { '10th': '10th standard', '12th': '12th standard', iti: 'ITI', diploma: 'Diploma', ug: 'Undergraduate', pg: 'Postgraduate' };
const TIME_LABELS = { '2-4w': '2–4 weeks', '1-3m': '1–3 months', '3-6m': '3–6 months', '6-12m': '6–12 months', '1y+': '1 year+' };
const HOURS_LABELS = { '<5': 'Under 5 hrs/week', '5-10': '5–10 hrs/week', '10-20': '10–20 hrs/week', '20+': '20+ hrs/week' };
const MODE_LABELS = { online: 'Online / self-paced', offline: 'Offline institute', college: 'College-integrated', none: 'No preference' };

const TRACKS = {
  web: {
    label: 'Full-Stack Web Development', tagClass: 'gold',
    keywords: ['computer', 'it', 'information technology', 'software', 'cse', 'web', 'coding'],
    stages: [
      { title: 'Foundations', focus: 'Programming basics, HTML/CSS/JavaScript, and version control', skills: ['HTML/CSS', 'JavaScript', 'Git basics'] },
      { title: 'Core Framework Skills', focus: 'A front-end framework, a back-end runtime, and databases', skills: ['React or similar', 'Node.js/Express', 'SQL basics'] },
      { title: 'Build a Portfolio Project', focus: 'One full-stack project solving a real problem, deployed live', skills: ['REST APIs', 'Deployment', 'Testing'] },
      { title: 'Certification & Specialisation', focus: 'A recognised certification to validate your skills', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, GitHub profile, mock interviews, and applying', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  data: {
    label: 'Data Analytics & Visualisation', tagClass: 'gold',
    keywords: ['computer', 'statistics', 'maths', 'commerce', 'economics', 'data'],
    stages: [
      { title: 'Foundations', focus: 'Excel, basic statistics, and SQL for querying data', skills: ['Excel', 'SQL basics', 'Statistics'] },
      { title: 'Core Tooling', focus: 'Python or R for analysis, plus a BI/visualisation tool', skills: ['Python/R', 'Power BI or Tableau'] },
      { title: 'Build a Portfolio Project', focus: 'An end-to-end analysis of a real public dataset with a dashboard', skills: ['Data cleaning', 'Dashboards'] },
      { title: 'Certification & Specialisation', focus: 'A recognised data-analytics certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Case-study storytelling, resume, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  cloud: {
    label: 'Cloud Computing & DevOps', tagClass: 'teal',
    keywords: ['computer', 'it', 'information technology', 'software', 'network', 'cloud'],
    stages: [
      { title: 'Foundations', focus: 'Linux basics, networking fundamentals, and one cloud platform overview', skills: ['Linux basics', 'Networking'] },
      { title: 'Core Tooling', focus: 'Core services on one cloud provider, plus containers', skills: ['Cloud provider basics', 'Docker'] },
      { title: 'Build a Portfolio Project', focus: 'Deploy and automate a real application end-to-end', skills: ['CI/CD', 'Infra as code basics'] },
      { title: 'Certification & Specialisation', focus: 'An associate-level cloud certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, GitHub profile, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  aiml: {
    label: 'AI & Machine Learning', tagClass: 'gold',
    keywords: ['computer', 'maths', 'statistics', 'ai', 'machine learning', 'data'],
    stages: [
      { title: 'Foundations', focus: 'Python, linear algebra/statistics refresher, and core ML concepts', skills: ['Python', 'Statistics basics'] },
      { title: 'Core Tooling', focus: 'A ML library plus classic algorithms end-to-end', skills: ['scikit-learn/pandas', 'Model evaluation'] },
      { title: 'Build a Portfolio Project', focus: 'One applied ML project solving a real problem', skills: ['Data prep', 'Model deployment basics'] },
      { title: 'Certification & Specialisation', focus: 'A recognised ML/AI certification or specialised course', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Project writeups, resume, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  design: {
    label: 'UI/UX & Product Design', tagClass: 'teal',
    keywords: ['design', 'arts', 'architecture', 'fine art'],
    stages: [
      { title: 'Foundations', focus: 'Design principles, typography, and a design tool', skills: ['Design fundamentals', 'Figma basics'] },
      { title: 'Core Skills', focus: 'User research basics and wireframing to high-fidelity design', skills: ['Wireframing', 'Prototyping'] },
      { title: 'Build a Portfolio Project', focus: 'A full case study: problem, research, iterations, final UI', skills: ['Case study writing', 'UI polish'] },
      { title: 'Certification & Specialisation', focus: 'A recognised UX/product design certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Portfolio site, resume, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  core: {
    label: 'Core / Manufacturing Engineering', tagClass: 'teal',
    keywords: ['mechanical', 'production', 'manufacturing', 'iti', 'diploma', 'industrial'],
    stages: [
      { title: 'Foundations', focus: 'Shop-floor basics, safety standards, and blueprint reading', skills: ['Safety standards', 'Blueprint reading'] },
      { title: 'Core Tooling', focus: 'CNC/PLC basics and quality-control fundamentals', skills: ['CNC/PLC basics', 'Quality control'] },
      { title: 'Build Hands-on Experience', focus: 'Supervised floor time or an apprenticeship placement', skills: ['Lean manufacturing', 'AutoCAD'] },
      { title: 'Certification & Specialisation', focus: 'An ITI/NSDC-recognised trade certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, interview prep, and applying to local plants', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  electronics: {
    label: 'Electronics & Embedded Systems', tagClass: 'teal',
    keywords: ['electronics', 'embedded', 'electrical', 'ece', 'instrumentation'],
    stages: [
      { title: 'Foundations', focus: 'Circuits, basic electronics, and a microcontroller platform', skills: ['Circuit basics', 'Arduino/embedded C'] },
      { title: 'Core Tooling', focus: 'PCB basics and sensor/IoT integration', skills: ['PCB design basics', 'IoT integration'] },
      { title: 'Build a Portfolio Project', focus: 'One working embedded/IoT prototype', skills: ['Prototyping', 'Debugging hardware'] },
      { title: 'Certification & Specialisation', focus: 'A recognised embedded systems certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, project demo reel, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  finance: {
    label: 'Finance & Accounting', tagClass: 'indigo',
    keywords: ['commerce', 'finance', 'accounting', 'b.com', 'economics'],
    stages: [
      { title: 'Foundations', focus: 'Accounting fundamentals and Excel for finance', skills: ['Accounting basics', 'Excel for finance'] },
      { title: 'Core Tooling', focus: 'Financial modelling and a bookkeeping/ERP tool', skills: ['Financial modelling', 'Tally/ERP basics'] },
      { title: 'Build a Portfolio Project', focus: 'A real budgeting or valuation case study', skills: ['Case study', 'Reporting'] },
      { title: 'Certification & Specialisation', focus: 'A recognised finance certification (e.g. costing, taxation)', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, interview prep, and applying', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  agri: {
    label: 'Agriculture & Agri-Tech', tagClass: 'teal',
    keywords: ['agriculture', 'agri', 'farming', 'horticulture'],
    stages: [
      { title: 'Foundations', focus: 'Modern agronomy basics and farm data recording', skills: ['Agronomy basics', 'Farm record-keeping'] },
      { title: 'Core Tooling', focus: 'Precision-agriculture tools and basic agri-tech apps', skills: ['Precision ag tools', 'Agri-tech apps'] },
      { title: 'Build Hands-on Experience', focus: 'A supervised field project or FPO/agri-startup placement', skills: ['Field project', 'Yield analysis'] },
      { title: 'Certification & Specialisation', focus: 'A recognised agri-tech or agronomy certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, interview prep, and applying', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  health: {
    label: 'Healthcare & Allied Sciences', tagClass: 'indigo',
    keywords: ['health', 'nursing', 'biology', 'pharma', 'medical'],
    stages: [
      { title: 'Foundations', focus: 'Core clinical/allied-health fundamentals and patient safety', skills: ['Fundamentals', 'Patient safety'] },
      { title: 'Core Tooling', focus: 'Domain-specific practical skills and basic health-records systems', skills: ['Practical skills', 'Health records basics'] },
      { title: 'Build Hands-on Experience', focus: 'Supervised clinical/lab placement hours', skills: ['Clinical hours', 'Case documentation'] },
      { title: 'Certification & Specialisation', focus: 'A recognised allied-health certification/licence', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Resume, interview prep, and applying', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  marketing: {
    label: 'Digital Marketing', tagClass: 'gold',
    keywords: ['marketing', 'communication', 'advertising', 'commerce', 'ba'],
    stages: [
      { title: 'Foundations', focus: 'Marketing fundamentals, SEO basics, and content basics', skills: ['Marketing fundamentals', 'SEO basics'] },
      { title: 'Core Tooling', focus: 'Paid ads platforms and analytics tools', skills: ['Meta/Google ads', 'Analytics tools'] },
      { title: 'Build a Portfolio Project', focus: 'One real or simulated campaign, start to finish', skills: ['Campaign planning', 'Reporting'] },
      { title: 'Certification & Specialisation', focus: 'A recognised digital-marketing certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Portfolio, resume, and mock interviews', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  },
  business: {
    label: 'Entrepreneurship & Business', tagClass: 'indigo',
    keywords: ['business', 'entrepreneurship', 'management', 'bba', 'commerce'],
    stages: [
      { title: 'Foundations', focus: 'Business fundamentals and market validation basics', skills: ['Business fundamentals', 'Market validation'] },
      { title: 'Core Tooling', focus: 'Basic finance, pitching, and no-code tools', skills: ['Unit economics', 'Pitching'] },
      { title: 'Build a Portfolio Project', focus: 'A real or simulated venture plan / small pilot', skills: ['Venture plan', 'Pilot execution'] },
      { title: 'Certification & Specialisation', focus: 'A recognised entrepreneurship/business certification', skills: ['Chosen certification'] },
      { title: 'Job-Ready Polish', focus: 'Pitch deck, resume, and interview prep', skills: ['Interview prep', 'Resume/portfolio'] }
    ]
  }
};

function buildResource(mode, trackLabel, stage) {
  const templates = {
    online: {
      type: 'Online',
      name: `A self-paced online course on "${stage.title}" for ${trackLabel}`,
      note: `Look for a well-rated course covering: ${stage.skills.join(', ')}. YouTube playlists and free MOOCs are a good starting point before paying for anything.`
    },
    offline: {
      type: 'Offline institute',
      name: `A local training institute module on ${stage.title.toLowerCase()}`,
      note: `Search NSDC/State Skill Development Society listed centres near you offering ${trackLabel} training covering ${stage.skills.join(', ')}.`
    },
    college: {
      type: 'College programme',
      name: `A college-integrated or polytechnic add-on course`,
      note: `Check if your college, a nearby polytechnic, or a government institute offers a credit course or certification covering ${stage.title.toLowerCase()}.`
    }
  };
  return templates[mode] || templates.online;
}

/**
 * Rank tracks against a profile using interests, field-of-study keywords,
 * and existing skills. Mirrors the original client-side matchTracks().
 */
function matchTracks(profile) {
  const scores = {};
  Object.keys(TRACKS).forEach((k) => (scores[k] = 0));

  (profile.interests || []).forEach((i) => {
    if (scores[i] !== undefined) scores[i] += 3;
  });

  const fieldLower = (profile.field || '').toLowerCase();
  Object.entries(TRACKS).forEach(([k, t]) => {
    t.keywords.forEach((kw) => {
      if (fieldLower.includes(kw)) scores[k] += 1;
    });
  });

  (profile.skills || []).forEach((s) => {
    Object.entries(TRACKS).forEach(([k, t]) => {
      if (t.keywords.some((kw) => (s.name || '').toLowerCase().includes(kw))) scores[k] += 0.5;
    });
  });

  let ranked = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return [(profile.interests && profile.interests[0]) || 'web'];
  }
  return ranked.slice(0, 2).map((r) => r[0]);
}

/** Builds the week-by-week roadmap for one track, and adds a day-wise
 * breakdown for the first stage so users have something immediately
 * actionable (helpful for short "2-4 week" timelines especially). */
function buildRoadmap(trackKey, profile) {
  const track = TRACKS[trackKey];
  if (!track) throw new Error(`Unknown track: ${trackKey}`);

  const totalWeeks = TIME_WEEKS[profile.time] || 12;
  const sumW = STAGE_WEIGHTS.reduce((a, b) => a + b, 0);
  const defaultModes = ['online', 'offline', 'college', 'offline', 'college'];

  const stages = track.stages.map((s, i) => {
    const weeks = Math.max(1, Math.round((totalWeeks * STAGE_WEIGHTS[i]) / sumW));
    const mode = profile.mode && profile.mode !== 'none' ? profile.mode : defaultModes[i];
    const resource = buildResource(mode, track.label, s);
    return Object.assign({}, s, { weeks, resource, dayWise: buildDayWiseBreakdown(s, weeks, profile) });
  });

  return { track: { key: trackKey, label: track.label, tagClass: track.tagClass }, stages, totalWeeks };
}

/** Very simple, deterministic day-wise split of a stage's weeks into daily
 * focus lines, respecting the user's weekly-hours budget. Used as a
 * fallback and also as the shape the AI layer is asked to improve on. */
function buildDayWiseBreakdown(stage, weeks, profile) {
  const hoursMap = { '<5': 4, '5-10': 8, '10-20': 15, '20+': 25 };
  const weeklyHours = hoursMap[profile.hours] || 8;
  const daysActive = weeklyHours >= 20 ? 6 : weeklyHours >= 10 ? 5 : 4;
  const skills = stage.skills.length ? stage.skills : [stage.title];

  const plan = [];
  for (let w = 1; w <= Math.min(weeks, 2); w++) {
    // Only generate a detailed day-by-day plan for the first two weeks of
    // each stage to keep payloads small; later weeks repeat the pattern.
    const days = [];
    for (let d = 1; d <= daysActive; d++) {
      const skill = skills[(d - 1) % skills.length];
      days.push({
        day: d,
        focus: skill,
        task: `Spend ~${Math.max(1, Math.round(weeklyHours / daysActive))} hr on "${skill}" — study a lesson/video, then do one small hands-on exercise.`
      });
    }
    plan.push({ week: w, days });
  }
  return plan;
}

module.exports = {
  TRACKS,
  LEVEL_LABELS,
  TIME_LABELS,
  HOURS_LABELS,
  MODE_LABELS,
  TIME_WEEKS,
  matchTracks,
  buildRoadmap,
  buildResource,
  buildDayWiseBreakdown
};
