/* Non-AI job breakdowns. Given a role title, classify it into a family and
 * return a structured, deterministic breakdown: the real interview process,
 * competencies assessed, hard/soft skills, a rough salary band, what
 * interviewers look for, and the mistakes that sink candidates. No LLM — this is
 * a curated dataset + keyword classifier, so it's instant, free, and stable. */

export interface InterviewRound {
  name: string;
  focus: string;
  format: string;
}
export interface JobFamily {
  key: string;
  label: string;
  blurb: string;
  process: InterviewRound[];
  competencies: string[];
  hardSkills: string[];
  softSkills: string[];
  salary: { low: number; mid: number; high: number }; // USD/yr, rough US medians
  lookFor: string[];
  redFlags: string[];
  focusTypes: string[]; // maps into the practice generator
}

// Keyword → family. First match wins; order matters (specific before generic).
const RULES: [RegExp, string][] = [
  [/nurse|rn |lpn|clinical|medical|health|dental|therapist|physician|caregiver|pharmac/i, "healthcare"],
  [/sales|account executive|business development|bdr|sdr|realtor|broker/i, "sales"],
  [/market|brand|content|seo|social media|growth|communications|pr /i, "marketing"],
  [/engineer|developer|software|data|programmer|devops|it |technician|analyst|scientist/i, "tech"],
  [/account|finance|financial|bookkeep|audit|tax|controller|treasur|payroll/i, "finance"],
  [/teacher|educat|instructor|professor|tutor|principal|counselor|coach/i, "education"],
  [/manager|director|supervisor|lead|head of|operations|coordinator|administrator|executive/i, "management"],
  [/customer|support|service|call center|help desk|client success|concierge/i, "support"],
  [/electric|plumb|carpent|weld|hvac|mechanic|technician|construct|maintenance|driver|warehouse|logistic/i, "trades"],
  [/design|creative|artist|writer|editor|photograph|video|ux|ui /i, "creative"],
  [/legal|attorney|lawyer|paralegal|compliance|counsel/i, "legal"],
  [/assistant|clerk|receptionist|office|secretary|data entry/i, "admin"],
  [/retail|server|barista|host|cashier|hospitality|hotel|restaurant|store/i, "hospitality"],
];

export function classifyRole(role: string): string {
  const r = (role || "").toLowerCase();
  for (const [re, fam] of RULES) if (re.test(r)) return fam;
  return "generic";
}

const B = (name: string, focus: string, format: string): InterviewRound => ({ name, focus, format });

export const FAMILIES: Record<string, JobFamily> = {
  management: {
    key: "management", label: "Management & Operations",
    blurb: "You're judged on judgment: how you lead people, make calls under pressure, and drive results through others.",
    process: [
      B("Recruiter screen", "Fit, motivation, salary range", "20-min phone call"),
      B("Hiring manager", "Leadership style, past results", "45-min behavioral"),
      B("Case / scenario", "How you'd handle a real team or ops problem", "Live problem-solving"),
      B("Cross-functional panel", "Collaboration, communication", "2-3 stakeholders"),
      B("Final / exec", "Vision, culture, the close", "Senior leader"),
    ],
    competencies: ["Leadership", "Decision-making", "Prioritization", "Conflict resolution", "Business impact"],
    hardSkills: ["Budget / P&L basics", "Project planning", "Data-driven decisions", "Process improvement"],
    softSkills: ["Delegation", "Coaching", "Influence without authority", "Calm under pressure"],
    salary: { low: 62000, mid: 92000, high: 140000 },
    lookFor: ["Results with numbers attached", "How you handle underperformers", "Ownership of failures"],
    redFlags: ["Taking sole credit for team wins", "Vague 'we' with no 'I'", "No metrics in any answer"],
    focusTypes: ["leadership", "situation", "behavioral"],
  },
  healthcare: {
    key: "healthcare", label: "Healthcare & Clinical",
    blurb: "Competence is assumed from your license — interviews test judgment, composure, and how you treat people.",
    process: [
      B("Phone screen", "Credentials, availability, shift fit", "15-min call"),
      B("Behavioral", "Patient scenarios, teamwork, safety", "Panel or 1:1"),
      B("Clinical / scenario", "How you'd handle a real situation", "Scenario walk-through"),
      B("Unit tour / peer", "Culture fit with the team", "Informal"),
    ],
    competencies: ["Patient safety", "Composure under pressure", "Teamwork", "Communication", "Compassion"],
    hardSkills: ["Clinical protocols", "EHR / charting", "Compliance (HIPAA)", "Equipment"],
    softSkills: ["Empathy", "Clear handoffs", "De-escalation", "Attention to detail"],
    salary: { low: 48000, mid: 78000, high: 120000 },
    lookFor: ["A calm, specific patient story", "How you escalate concerns", "Handling a difficult patient or family"],
    redFlags: ["Blaming patients", "Glossing over a safety step", "No example of teamwork"],
    focusTypes: ["situation", "behavioral", "warmup"],
  },
  sales: {
    key: "sales", label: "Sales & Business Development",
    blurb: "The interview IS a sales call. They're watching how you discover, handle objections, and close — on them.",
    process: [
      B("Recruiter screen", "Numbers: quota, attainment, deal size", "20-min call"),
      B("Hiring manager", "Your process and pipeline", "Behavioral + metrics"),
      B("Mock pitch / roleplay", "Live selling and objection handling", "Roleplay"),
      B("Panel", "Cross-team fit", "Multiple interviewers"),
      B("Final", "Close and comp", "Sales leader"),
    ],
    competencies: ["Discovery", "Objection handling", "Pipeline management", "Resilience", "Closing"],
    hardSkills: ["CRM (Salesforce/HubSpot)", "Forecasting", "Prospecting", "Negotiation"],
    softSkills: ["Active listening", "Persistence", "Storytelling", "Reading the room"],
    salary: { low: 45000, mid: 75000, high: 160000 },
    lookFor: ["Specific numbers (quota, %, deal size)", "A deal you almost lost and saved", "How you handle 'no'"],
    redFlags: ["No metrics", "Talking over the interviewer", "Never asking a discovery question back"],
    focusTypes: ["behavioral", "situation", "closer"],
  },
  marketing: {
    key: "marketing", label: "Marketing & Communications",
    blurb: "They test whether you connect creative work to business outcomes, and whether you can tell a clear story.",
    process: [
      B("Recruiter screen", "Portfolio, channels, fit", "20-min call"),
      B("Hiring manager", "Campaigns and results", "Behavioral"),
      B("Portfolio / exercise", "A take-home or live brief", "Presentation"),
      B("Panel", "Cross-functional collaboration", "Multiple stakeholders"),
    ],
    competencies: ["Campaign strategy", "Data literacy", "Storytelling", "Collaboration", "Creativity"],
    hardSkills: ["Analytics (GA)", "SEO/SEM", "Content", "A/B testing", "Marketing automation"],
    softSkills: ["Clear writing", "Presenting", "Stakeholder management", "Adaptability"],
    salary: { low: 48000, mid: 72000, high: 130000 },
    lookFor: ["A campaign with a measured result", "How you decided what to cut", "Handling creative feedback"],
    redFlags: ["Vanity metrics only", "No business impact", "Defensive about feedback"],
    focusTypes: ["behavioral", "situation", "values"],
  },
  tech: {
    key: "tech", label: "Technology & Data",
    blurb: "Expect a mix of role-knowledge and behavioral rounds. Clear thinking out loud matters as much as the answer.",
    process: [
      B("Recruiter screen", "Background, stack, comp", "30-min call"),
      B("Technical screen", "Role-specific problem", "Live or take-home"),
      B("Onsite / virtual loop", "Deeper technical + system thinking", "3-5 rounds"),
      B("Behavioral", "Collaboration, ownership", "Manager 1:1"),
      B("Team fit", "Values and working style", "Peers"),
    ],
    competencies: ["Problem decomposition", "Technical depth", "Communication", "Ownership", "Collaboration"],
    hardSkills: ["Role stack", "Debugging", "System design basics", "Data / SQL"],
    softSkills: ["Thinking out loud", "Asking clarifying questions", "Handling ambiguity"],
    salary: { low: 70000, mid: 110000, high: 200000 },
    lookFor: ["Structured problem-solving", "A project you owned end-to-end", "How you handle disagreement on approach"],
    redFlags: ["Jumping to code before clarifying", "Can't explain trade-offs", "Blaming teammates"],
    focusTypes: ["technical", "behavioral", "situation"],
  },
  finance: {
    key: "finance", label: "Finance & Accounting",
    blurb: "Precision and integrity are the whole game. They test accuracy, judgment, and how you communicate numbers.",
    process: [
      B("Recruiter screen", "Credentials, systems, fit", "20-min call"),
      B("Technical", "Accounting / modeling questions", "Case or quiz"),
      B("Hiring manager", "Judgment and communication", "Behavioral"),
      B("Panel", "Cross-team and controls", "Multiple interviewers"),
    ],
    competencies: ["Accuracy", "Analytical judgment", "Controls / compliance", "Communication", "Ethics"],
    hardSkills: ["Excel / modeling", "GAAP basics", "ERP systems", "Reconciliation", "Reporting"],
    softSkills: ["Attention to detail", "Explaining numbers simply", "Skepticism", "Deadline discipline"],
    salary: { low: 52000, mid: 82000, high: 140000 },
    lookFor: ["A time you caught an error", "How you explain finance to non-finance people", "Handling a tight close"],
    redFlags: ["Careless with a number in the interview", "Cutting a control corner", "No ethics example"],
    focusTypes: ["technical", "behavioral", "situation"],
  },
  education: {
    key: "education", label: "Education & Training",
    blurb: "They test classroom judgment, communication, and how you handle students, parents, and colleagues.",
    process: [
      B("Screen", "Certification, philosophy, fit", "20-min call"),
      B("Behavioral", "Classroom scenarios", "Panel"),
      B("Demo lesson", "Live teaching", "Sample lesson"),
      B("Community fit", "Values and collaboration", "Staff / leadership"),
    ],
    competencies: ["Classroom management", "Communication", "Adaptability", "Empathy", "Collaboration"],
    hardSkills: ["Curriculum design", "Assessment", "EdTech tools", "Data-driven instruction"],
    softSkills: ["Patience", "Clear explanation", "Family communication", "Composure"],
    salary: { low: 40000, mid: 58000, high: 90000 },
    lookFor: ["A tough classroom moment you turned around", "How you reach a struggling student", "Parent communication"],
    redFlags: ["Blaming students", "Rigid, one-size-fits-all approach", "No differentiation example"],
    focusTypes: ["situation", "behavioral", "values"],
  },
  support: {
    key: "support", label: "Customer Support & Success",
    blurb: "They test empathy under pressure and whether you can turn an angry customer into a loyal one.",
    process: [
      B("Screen", "Availability, tools, fit", "15-min call"),
      B("Behavioral", "De-escalation and ownership", "1:1"),
      B("Roleplay", "A live upset-customer scenario", "Roleplay"),
      B("Team fit", "Culture and collaboration", "Peers"),
    ],
    competencies: ["Empathy", "Problem-solving", "Patience", "Communication", "Ownership"],
    hardSkills: ["Helpdesk tools (Zendesk)", "Product knowledge", "Troubleshooting", "CRM"],
    softSkills: ["De-escalation", "Active listening", "Positive framing", "Multitasking"],
    salary: { low: 38000, mid: 55000, high: 85000 },
    lookFor: ["An angry customer you turned around", "How you say no gracefully", "Owning a mistake"],
    redFlags: ["Getting defensive in the roleplay", "Blaming the customer", "No follow-through"],
    focusTypes: ["situation", "behavioral", "warmup"],
  },
  trades: {
    key: "trades", label: "Skilled Trades & Logistics",
    blurb: "Reliability and safety carry the interview. They want to know you'll show up, work safe, and solve problems.",
    process: [
      B("Phone screen", "Certs, availability, reliability", "15-min call"),
      B("In-person", "Experience and safety judgment", "Shop or site"),
      B("Skills check", "A practical demonstration", "Hands-on"),
    ],
    competencies: ["Safety", "Reliability", "Problem-solving", "Physical stamina", "Teamwork"],
    hardSkills: ["Certifications / licenses", "Equipment operation", "Blueprint reading", "Diagnostics"],
    softSkills: ["Dependability", "Following procedure", "Clear communication", "Adaptability"],
    salary: { low: 40000, mid: 58000, high: 95000 },
    lookFor: ["A safety call you made", "Showing up when others didn't", "Solving a problem on the fly"],
    redFlags: ["Cutting a safety corner", "Attendance issues", "Can't explain a repair simply"],
    focusTypes: ["situation", "behavioral", "warmup"],
  },
  creative: {
    key: "creative", label: "Creative & Design",
    blurb: "Your portfolio gets you in; the interview tests how you think, take feedback, and tie work to goals.",
    process: [
      B("Screen", "Portfolio and fit", "20-min call"),
      B("Portfolio review", "Walk through your work and process", "Presentation"),
      B("Exercise", "A brief or critique", "Take-home or live"),
      B("Team fit", "Collaboration and feedback", "Peers"),
    ],
    competencies: ["Craft", "Process / rationale", "Collaboration", "Receiving feedback", "Business awareness"],
    hardSkills: ["Design tools", "Prototyping", "Typography / composition", "User research"],
    softSkills: ["Explaining decisions", "Taking critique", "Storytelling", "Iteration"],
    salary: { low: 45000, mid: 70000, high: 120000 },
    lookFor: ["Why you made a specific choice", "How you handled harsh feedback", "Work tied to a real outcome"],
    redFlags: ["Defensive about critique", "No rationale for choices", "Portfolio with no context"],
    focusTypes: ["behavioral", "values", "situation"],
  },
  legal: {
    key: "legal", label: "Legal & Compliance",
    blurb: "They test rigor, judgment, and communication — can you be precise, ethical, and still clear to non-lawyers.",
    process: [
      B("Screen", "Credentials and fit", "20-min call"),
      B("Substantive", "Legal reasoning and experience", "Behavioral + technical"),
      B("Writing / case", "A sample or scenario", "Exercise"),
      B("Panel", "Judgment and collaboration", "Multiple interviewers"),
    ],
    competencies: ["Legal reasoning", "Attention to detail", "Ethics", "Communication", "Risk judgment"],
    hardSkills: ["Research", "Drafting", "Regulatory knowledge", "Case management"],
    softSkills: ["Precision", "Explaining risk simply", "Discretion", "Composure"],
    salary: { low: 55000, mid: 95000, high: 180000 },
    lookFor: ["A judgment call under ambiguity", "Explaining a rule to a non-lawyer", "Handling a deadline crunch"],
    redFlags: ["Sloppy with facts", "No ethics example", "Over-jargoned answers"],
    focusTypes: ["situation", "behavioral", "technical"],
  },
  admin: {
    key: "admin", label: "Administrative & Office",
    blurb: "They test organization, discretion, and communication — the glue that keeps an office running.",
    process: [
      B("Screen", "Tools, availability, fit", "15-min call"),
      B("Behavioral", "Prioritization and discretion", "1:1"),
      B("Skills / scenario", "A real workday scenario", "Exercise"),
    ],
    competencies: ["Organization", "Prioritization", "Discretion", "Communication", "Reliability"],
    hardSkills: ["Office suite", "Scheduling", "Data entry", "Basic bookkeeping"],
    softSkills: ["Attention to detail", "Calm multitasking", "Professionalism", "Anticipation"],
    salary: { low: 36000, mid: 50000, high: 72000 },
    lookFor: ["Juggling competing priorities", "Handling confidential info", "Catching a costly mistake"],
    redFlags: ["Disorganized answers", "Oversharing confidential examples", "No prioritization method"],
    focusTypes: ["situation", "behavioral", "warmup"],
  },
  hospitality: {
    key: "hospitality", label: "Hospitality & Retail",
    blurb: "They test service instinct under pressure — friendliness, speed, and grace when things go wrong.",
    process: [
      B("Screen", "Availability and fit", "10-min call"),
      B("Behavioral", "Service scenarios", "1:1 or group"),
      B("Trial / roleplay", "A live service moment", "Roleplay or shift"),
    ],
    competencies: ["Customer service", "Composure", "Teamwork", "Speed", "Upselling"],
    hardSkills: ["POS systems", "Product knowledge", "Cash handling", "Inventory basics"],
    softSkills: ["Friendliness", "De-escalation", "Energy", "Reliability"],
    salary: { low: 30000, mid: 42000, high: 65000 },
    lookFor: ["A time you fixed a bad customer experience", "Working a rush", "Going above and beyond"],
    redFlags: ["Low energy", "Blaming customers", "No teamwork example"],
    focusTypes: ["situation", "warmup", "behavioral"],
  },
  generic: {
    key: "generic", label: "General Professional",
    blurb: "A standard process: fit, behavioral depth, and a scenario or two. Structure and specifics win.",
    process: [
      B("Recruiter screen", "Fit, motivation, logistics", "20-min call"),
      B("Hiring manager", "Behavioral depth (STAR)", "45-min 1:1"),
      B("Panel / scenario", "How you'd handle real situations", "Multiple interviewers"),
      B("Final", "Values and the close", "Senior leader"),
    ],
    competencies: ["Communication", "Problem-solving", "Reliability", "Collaboration", "Adaptability"],
    hardSkills: ["Role-specific tools", "Organization", "Data comfort"],
    softSkills: ["Clear storytelling", "Listening", "Ownership", "Composure"],
    salary: { low: 42000, mid: 62000, high: 95000 },
    lookFor: ["Specific, structured stories", "Results with numbers", "Ownership of mistakes"],
    redFlags: ["Vague answers", "No metrics", "Rambling"],
    focusTypes: ["behavioral", "situation", "warmup"],
  },
};

export function getJobBreakdown(role: string): { role: string; family: JobFamily } {
  const key = classifyRole(role);
  return { role: role || "your role", family: FAMILIES[key] || FAMILIES.generic };
}

export const money = (n: number): string =>
  n >= 1000 ? "$" + Math.round(n / 1000) + "k" : "$" + n;
