import { chromium } from 'playwright';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'screenshots');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

function makeAnswer(num, q, cat, text, scores, strength, growth) {
  return {
    questionNumber: num, questionText: q, category: cat, answerText: text,
    scores: { ...scores, overall: Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/5) },
    feedback: { clarity: 'Good structure.', relevance: 'On point.', specificity: 'Add numbers.', confidence: 'Strong delivery.', conciseness: 'Tight answer.' },
    strengthSummary: strength, growthSummary: growth,
    anxiety: { fillers: [], hedges: [], apologies: [], underminers: [] },
  };
}

const sessions = [
  {
    id: 's1-abc123', createdAt: new Date(Date.now() - 86400000*7).toISOString(),
    targetRole: 'Product Manager', company: 'Google', situation: 'career_change', mode: 'practice',
    overall: 68, dimensions: { clarity: 70, relevance: 66, specificity: 64, confidence: 69, conciseness: 72 },
    durationSeconds: 1200, answers: [
      makeAnswer(1, 'Tell me about yourself.', 'Behavioral', 'I am a product manager with 8 years of experience building B2B SaaS products. At my last company I led a team of 12 and grew revenue 40% year over year by focusing on customer retention and reducing churn from 8% to 3%.', { clarity: 75, relevance: 72, specificity: 70, confidence: 73, conciseness: 76 }, 'Strong quantified impact.', 'Add more about why this role.'),
      makeAnswer(2, 'Why do you want this role?', 'Motivational', 'I want to work at Google because I believe in building products that reach billions of users. My experience scaling products from 10k to 1M users directly maps to the challenges of this role.', { clarity: 70, relevance: 74, specificity: 60, confidence: 68, conciseness: 71 }, 'Good company connection.', 'Be more specific about the team.'),
      makeAnswer(3, 'Describe leading under pressure.', 'Behavioral', 'During a critical product launch, our main API provider went down 48 hours before release. I coordinated engineering to implement a backup, communicated revised timelines, and we launched 12 hours late with zero customer impact.', { clarity: 78, relevance: 76, specificity: 74, confidence: 75, conciseness: 77 }, 'Excellent crisis narrative.', 'Quantify team size.'),
    ]
  },
  {
    id: 's2-def456', createdAt: new Date(Date.now() - 86400000*5).toISOString(),
    targetRole: 'Product Manager', company: 'Meta', situation: 'career_change', mode: 'practice',
    overall: 76, dimensions: { clarity: 78, relevance: 75, specificity: 72, confidence: 76, conciseness: 79 },
    durationSeconds: 1100, answers: [
      makeAnswer(1, 'How do you prioritize features?', 'Technical', 'I use a weighted scoring model combining customer impact, revenue potential, and engineering effort. At my last role this reduced our backlog by 60% and increased feature adoption by 35%.', { clarity: 80, relevance: 78, specificity: 75, confidence: 77, conciseness: 80 }, 'Clear framework with results.', 'Mention stakeholder alignment.'),
    ]
  },
  {
    id: 's3-ghi789', createdAt: new Date(Date.now() - 86400000*3).toISOString(),
    targetRole: 'Product Manager', company: 'Stripe', situation: 'career_change', mode: 'practice',
    overall: 81, dimensions: { clarity: 82, relevance: 80, specificity: 78, confidence: 81, conciseness: 83 },
    durationSeconds: 950, answers: [
      makeAnswer(1, 'Tell me about a product you shipped.', 'Behavioral', 'I shipped a recommendation engine that increased user engagement by 28% and generated $2.1M in incremental revenue within 6 months. I led a cross-functional team of 8 across engineering, design, and data science.', { clarity: 85, relevance: 82, specificity: 80, confidence: 83, conciseness: 84 }, 'Outstanding metrics.', 'Add the challenge you overcame.'),
    ]
  },
  {
    id: 's4-jkl012', createdAt: new Date(Date.now() - 86400000*1).toISOString(),
    targetRole: 'Product Manager', company: 'Airbnb', situation: 'career_change', mode: 'practice',
    overall: 84, dimensions: { clarity: 85, relevance: 83, specificity: 82, confidence: 84, conciseness: 86 },
    durationSeconds: 900, answers: [
      makeAnswer(1, 'What makes you unique for this role?', 'Motivational', 'My background combines deep technical product management with consumer empathy — I have built products used by 5M people while maintaining a direct line to user research. At Airbnb specifically, my experience scaling marketplace products would translate immediately.', { clarity: 87, relevance: 85, specificity: 83, confidence: 86, conciseness: 88 }, 'Perfect role-specific positioning.', 'Add a concrete example.'),
    ]
  }
];

const profile = {
  name: 'Sarah Chen', email: 'sarah@example.com', situation: 'career_change',
  targetRole: 'Product Manager', company: '', interviewGap: '1-3yr',
  plan: 'premium', createdAt: new Date(Date.now() - 86400000*14).toISOString(), emailTips: true
};

const streak = { current: 4, longest: 7, lastSessionDate: new Date(Date.now() - 86400000).toISOString().slice(0,10) };

const onboarding = { situation: 'career_change', targetRole: 'Product Manager', interviewGap: '1-3yr' };

// Navigate and seed
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
await page.evaluate(({sessions, profile, streak, onboarding}) => {
  localStorage.setItem('pp:sessions', JSON.stringify(sessions));
  localStorage.setItem('pp:profile', JSON.stringify(profile));
  localStorage.setItem('pp:streak', JSON.stringify(streak));
  localStorage.setItem('pp:onboarding', JSON.stringify(onboarding));
}, { sessions, profile, streak, onboarding });

// Dashboard
console.log('Capturing dashboard...');
await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
// Dismiss tour
try { await page.click('text=Skip the tour', { timeout: 2000 }); await page.waitForTimeout(1000); } catch(e) {}
try { await page.click('button:has-text("×")', { timeout: 500 }); } catch(e) {}
await page.waitForTimeout(2000);
await page.screenshot({ path: join(SCREENSHOT_DIR, '07-dashboard.png') });
console.log('  ✓ 07-dashboard.png');

await page.screenshot({ path: join(SCREENSHOT_DIR, '08-dashboard-full.png'), fullPage: true });
console.log('  ✓ 08-dashboard-full.png');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1000);
await page.screenshot({ path: join(SCREENSHOT_DIR, '09-dashboard-mobile.png') });
console.log('  ✓ 09-dashboard-mobile.png');

// Session results
console.log('Capturing session results...');
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:3000/session/s4-jkl012', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: join(SCREENSHOT_DIR, '13-session-results.png') });
console.log('  ✓ 13-session-results.png');

await page.screenshot({ path: join(SCREENSHOT_DIR, '14-session-results-full.png'), fullPage: true });
console.log('  ✓ 14-session-results-full.png');

// Session s1 (lower score for before/after contrast)
await page.goto('http://localhost:3000/session/s1-abc123', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: join(SCREENSHOT_DIR, '15-session-early.png') });
console.log('  ✓ 15-session-early.png');

await browser.close();
console.log('\nDone!');
