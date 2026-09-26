// seed.js
// Populates the database with the same demo data that was hardcoded into
// the frontend prototype, so the connected app looks identical on first
// run. Safe to re-run — it clears and re-inserts the demo tables only
// (never touches users/profiles/roadmaps/questions people have created).

const db = require('./db');

const run = db.transaction(() => {
  db.prepare('DELETE FROM courses').run();
  db.prepare('DELETE FROM companies').run();
  db.prepare('DELETE FROM career_stories').run();
  db.prepare('DELETE FROM faqs').run();

  const insertCourse = db.prepare('INSERT INTO courses (title, demand_tag, demand_pct, note) VALUES (?, ?, ?, ?)');
  insertCourse.run('Full-Stack Web Development', 'High demand', 86, 'Demanded by 340+ listed companies this quarter');
  insertCourse.run('Data Analytics & Visualisation', 'High demand', 78, 'Demanded by 265+ listed companies this quarter');
  insertCourse.run('Industrial Automation (PLC/SCADA)', 'Rising', 54, 'Demanded by 140+ listed companies this quarter');
  insertCourse.run('Cloud Computing & DevOps', 'High demand', 71, 'Demanded by 210+ listed companies this quarter');
  insertCourse.run('Digital Marketing', 'Rising', 48, 'Demanded by 120+ listed companies this quarter');

  const insertCompany = db.prepare(
    `INSERT INTO companies (name, sector, courses_json, skills_json, avg_interns, interns_placed, colleges_json, intern_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertCompany.run(
    'Vertex Technologies', 'IT',
    JSON.stringify(['Full-Stack Development', 'Cloud Computing', 'DevOps', 'QA Automation']),
    JSON.stringify(['JavaScript', 'React', 'Node.js', 'SQL', 'Docker', 'AWS']),
    45, 210,
    JSON.stringify(['COEP Pune', 'VJTI Mumbai', 'PICT']),
    'Hiring now'
  );
  insertCompany.run(
    'Sahyadri Manufacturing', 'Manufacturing',
    JSON.stringify(['Industrial Automation', 'Lean Manufacturing', 'Quality Engineering']),
    JSON.stringify(['CNC Machining', 'Quality Control', 'Lean Manufacturing', 'AutoCAD']),
    18, 64,
    JSON.stringify(['Government Polytechnic Pune', 'MIT WPU']),
    'Open'
  );
  insertCompany.run(
    'Orbit Fintech', 'Finance',
    JSON.stringify(['Data Analytics', 'Financial Modelling', 'Python for Finance']),
    JSON.stringify(['Excel', 'SQL', 'Python', 'Power BI', 'Financial Modelling']),
    20, 96,
    JSON.stringify(['Fergusson College', 'Symbiosis']),
    'Seasonal'
  );
  insertCompany.run(
    'Bhoomi Agritech', 'Agriculture',
    JSON.stringify(['Agri-Tech Fundamentals', 'Precision Agriculture']),
    JSON.stringify(['Agronomy basics', 'Farm data tools', 'IoT sensors']),
    12, 38,
    JSON.stringify(['MPKV Rahuri', 'College of Agriculture, Pune']),
    'Open'
  );

  const insertStory = db.prepare(
    `INSERT INTO career_stories
     (name, role, company, years_experience, salary_range, short_quote, full_story, started_from, path_taken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertStory.run(
    'Riya Sawant', 'Senior Data Analyst', 'Orbit Fintech', 5, '₹11–14 LPA',
    "I switched from a mechanical engineering background into analytics through a 6-month certification. What actually got me hired wasn't the certificate — it was a portfolio of real dashboards I'd built on public datasets.",
    "Riya graduated in Mechanical Engineering and worked briefly in a manufacturing QA role before realising she enjoyed working with data more than machines. She took a focused 6-month data-analytics certification while working part-time, and spent evenings building three portfolio dashboards from public government datasets. She applied to 40+ analyst roles, got 4 interviews, and joined Orbit Fintech as a junior analyst. Four years of steady upskilling in SQL, Python, and financial modelling later, she now leads a small analytics pod.",
    'Mechanical Engineering, Diploma',
    '6-month Data Analytics certification -> portfolio dashboards on public datasets -> Junior Analyst @ Orbit Fintech -> Senior Data Analyst'
  );
  insertStory.run(
    'Aman Kulkarni', 'Production Supervisor', 'Sahyadri Manufacturing', 8, '₹6–8 LPA',
    'Diploma holders are often overlooked, but shop-floor experience plus a Lean Manufacturing certification moved me into supervision within three years.',
    'Aman completed a Diploma in Mechanical Engineering and started as a shop-floor trainee. He focused on mastering CNC operation and quality-control processes in his first two years, then completed a part-time Lean Manufacturing certification. His manager put him forward for a supervisory training programme, and within three years of joining he was promoted to Production Supervisor.',
    'Diploma, Mechanical Engineering',
    'Shop-floor trainee -> CNC + QC mastery -> Lean Manufacturing certification -> Production Supervisor'
  );
  insertStory.run(
    'Priya Nair', 'DevOps Lead', 'Vertex Technologies', 6, '₹18–22 LPA',
    'I started as a QA tester. The skill that actually moved my career was cloud infrastructure — I taught myself, then found a mentor inside the company.',
    'Priya joined Vertex Technologies as a manual QA tester straight out of a B.Sc in Computer Science. She noticed the DevOps team was always short-staffed and started shadowing them, teaching herself Docker and AWS on weekends. After building an internal deployment tool as a side project, she was moved into the DevOps team, and within six years grew into leading it.',
    'B.Sc Computer Science',
    'QA Tester -> self-taught Docker/AWS -> internal side project -> DevOps engineer -> DevOps Lead'
  );

  const insertFaq = db.prepare('INSERT INTO faqs (question, answer) VALUES (?, ?)');
  insertFaq.run(
    'How is "in-demand" calculated for a skill?',
    'We aggregate skill mentions from employer postings and hiring requests submitted on SkillSync, weighted by how recently they were posted.'
  );
  insertFaq.run(
    'Is SkillSync free to use for students?',
    'Yes. Student and job-seeker accounts are completely free. Only institutional/employer accounts may have verification steps.'
  );
  insertFaq.run(
    'Can training institutes use this data too?',
    'Yes — that\'s a core part of the platform. Institutes get an aggregated view of skill gaps to help plan or update curricula.'
  );
});

run();
console.log('Seed data inserted successfully.');
