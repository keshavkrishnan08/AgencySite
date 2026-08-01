import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'screenshots');
await mkdir(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const seedData = {
  'axon-role': JSON.stringify({ title: 'Product Manager', industry: 'Tech', level: 'Senior' }),
  'axon-sessions': JSON.stringify([
    {
      id: 'demo-1', date: new Date(Date.now() - 86400000 * 6).toISOString(),
      role: 'Product Manager', company: 'Google',
      scores: { clarity: 72, relevance: 68, specificity: 65, confidence: 70, conciseness: 74 }, overall: 70,
      answers: [
        { question: 'Tell me about yourself', answer: 'I am a product manager with 8 years of experience building B2B SaaS products. At my last company I led a team of 12 and grew revenue 40% year over year.', score: { clarity: 75, relevance: 72, specificity: 70, confidence: 73, conciseness: 76 }, feedback: 'Strong opening with concrete numbers.' },
        { question: 'Why do you want this role?', answer: 'I want to work at Google because I believe in building products that reach billions. My experience scaling products from 10k to 1M users maps directly.', score: { clarity: 70, relevance: 74, specificity: 68, confidence: 71, conciseness: 73 }, feedback: 'Good connection to role.' }
      ]
    },
    {
      id: 'demo-2', date: new Date(Date.now() - 86400000 * 4).toISOString(),
      role: 'Product Manager', company: 'Meta',
      scores: { clarity: 78, relevance: 75, specificity: 72, confidence: 76, conciseness: 79 }, overall: 76,
      answers: [{ question: 'Describe leading a cross-functional team', answer: 'At Acme Corp, I led engineers, designers, and data scientists to launch our recommendation engine in 3 months, increasing engagement 28%.', score: { clarity: 80, relevance: 78, specificity: 75, confidence: 77, conciseness: 80 }, feedback: 'Excellent STAR structure.' }]
    },
    {
      id: 'demo-3', date: new Date(Date.now() - 86400000 * 2).toISOString(),
      role: 'Product Manager', company: 'Stripe',
      scores: { clarity: 82, relevance: 80, specificity: 78, confidence: 81, conciseness: 83 }, overall: 81, answers: []
    },
    {
      id: 'demo-4', date: new Date(Date.now() - 86400000).toISOString(),
      role: 'Product Manager', company: 'Airbnb',
      scores: { clarity: 85, relevance: 83, specificity: 80, confidence: 84, conciseness: 86 }, overall: 84, answers: []
    }
  ]),
  'axon-onboarded': 'true',
  'axon-activity': JSON.stringify(Array.from({length: 28}, (_, i) => i % 3 !== 0 ? new Date(Date.now() - 86400000 * (27 - i)).toISOString().slice(0,10) : null).filter(Boolean)),
};

async function screenshot(name, url, opts = {}) {
  const { width = 1280, height = 900, seed = false, fullPage = false, wait = 2000 } = opts;
  console.log(`Capturing ${name}...`);
  await page.setViewportSize({ width, height });

  if (seed) {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    for (const [key, val] of Object.entries(seedData)) {
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, val]);
    }
  }

  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(wait);

  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), fullPage });
  console.log(`  ✓ ${name}.png`);
}

await screenshot('01-landing-hero', 'http://localhost:3000');
await screenshot('02-landing-full', 'http://localhost:3000', { fullPage: true });
await screenshot('03-landing-mobile', 'http://localhost:3000', { width: 390, height: 844 });
await screenshot('04-start-page', 'http://localhost:3000/start');
await screenshot('05-onboarding', 'http://localhost:3000/onboarding', { seed: true });
await screenshot('06-practice', 'http://localhost:3000/practice', { seed: true, wait: 3000 });
await screenshot('07-dashboard', 'http://localhost:3000/dashboard', { seed: true, wait: 3000 });
await screenshot('08-dashboard-full', 'http://localhost:3000/dashboard', { seed: true, fullPage: true, wait: 3000 });
await screenshot('09-dashboard-mobile', 'http://localhost:3000/dashboard', { seed: true, width: 390, height: 844, wait: 3000 });
await screenshot('10-question-predictor', 'http://localhost:3000/tools/question-predictor', { seed: true });
await screenshot('11-gap-story', 'http://localhost:3000/tools/gap-story', { seed: true });
await screenshot('12-upgrade', 'http://localhost:3000/upgrade');

await browser.close();
console.log('\nAll screenshots saved to ./screenshots/');
