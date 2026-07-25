/* A curated bank of the questions people actually get asked, grouped by type.
 * Browsable in /practice/library; each category launches a focused session.
 * These are the canonical prompts — the live generator personalises around them
 * per role, company and posting, but this is the reference set. */

export interface BankCategory {
  key: string; // interview focusType, or a domain marker
  label: string;
  blurb: string;
  domain?: "interview" | "storytelling" | "public_speaking";
  questions: string[];
}

export const QUESTION_BANK: BankCategory[] = [
  {
    key: "warmup",
    label: "Openers",
    blurb: "The first few minutes that set the tone.",
    questions: [
      "Tell me about yourself.",
      "Walk me through your resume.",
      "Why are you interested in this role?",
      "What do you know about our company?",
      "Why are you leaving your current job?",
      "What are you looking for in your next role?",
    ],
  },
  {
    key: "behavioral",
    label: "Behavioral",
    blurb: "\"Tell me about a time…\" — the STAR questions.",
    questions: [
      "Tell me about a time you faced a difficult challenge at work.",
      "Describe a time you failed and what you learned.",
      "Give an example of when you went above and beyond.",
      "Tell me about a time you had to meet a tight deadline.",
      "Describe a time you disagreed with your manager.",
      "Tell me about a mistake you made and how you handled it.",
      "Describe the project you're most proud of.",
      "Tell me about a time you had to learn something fast.",
    ],
  },
  {
    key: "situation",
    label: "Situational",
    blurb: "\"What would you do if…\" — hypotheticals.",
    questions: [
      "How would you handle a coworker who isn't pulling their weight?",
      "What would you do with a project that has unclear requirements?",
      "How would you prioritize three competing deadlines?",
      "A customer is upset. Walk me through how you'd respond.",
      "What would you focus on in your first 90 days here?",
      "How would you handle critical feedback on your work?",
    ],
  },
  {
    key: "leadership",
    label: "Leadership & conflict",
    blurb: "Influence, teams, and hard calls.",
    questions: [
      "Tell me about a time you led a team.",
      "Describe a conflict you resolved between team members.",
      "How do you motivate people who report to you?",
      "Tell me about a time you made an unpopular decision.",
      "How do you decide what to delegate?",
      "Describe a time you mentored someone.",
    ],
  },
  {
    key: "gap",
    label: "The gap question",
    blurb: "Time away, a layoff, a career switch.",
    questions: [
      "I see a gap in your resume — can you tell me about that?",
      "Why did you take time away from work?",
      "What have you been doing since your last role?",
      "You're changing careers. Why now?",
      "How does your past experience translate to this field?",
    ],
  },
  {
    key: "closer",
    label: "Closers",
    blurb: "The end — where strong candidates seal it.",
    questions: [
      "Do you have any questions for us?",
      "Where do you see yourself in five years?",
      "What are your salary expectations?",
      "What's your greatest strength?",
      "What's your greatest weakness?",
      "Is there anything else you'd like us to know?",
    ],
  },
  {
    key: "story",
    label: "Storytelling",
    blurb: "The signature stories worth building.",
    domain: "storytelling",
    questions: [
      "Tell the story of the hardest problem you've solved.",
      "Share a failure and exactly what changed after it.",
      "Describe a moment you led without any authority.",
      "What's your origin story — why this work, in 30 seconds?",
      "Tell a short story about what you stand for.",
    ],
  },
  {
    key: "speech",
    label: "Public speaking",
    blurb: "Delivery and thinking on your feet.",
    domain: "public_speaking",
    questions: [
      "Speak for 60 seconds on 'the best advice I ever got.'",
      "Explain what you do to a smart 12-year-old.",
      "Make a 45-second case for an opinion you hold.",
      "Pitch yourself in 30 seconds.",
      "Give a 30-second toast to a colleague.",
    ],
  },
];
