import { readFileSync } from 'node:fs';

/**
 * Design tokens measured off themonad.app's computed styles, locked here.
 *
 * These are not preferences. Each was read from the reference with
 * getComputedStyle and every one of them had drifted at least once:
 *  - body line-height was Tailwind's 1.5 instead of the reference's 1.65,
 *    which quietly tightened every paragraph, button label and card on the site
 *  - 96 opacity values across 25 files rendered FULL opacity, because Tailwind
 *    silently ignores steps off its coarse default scale (/72, /65, /45 …)
 *  - the h1 inherited line-height 1 from `sm:text-6xl`, which won at `lg`
 */
const css = readFileSync('src/app/globals.css', 'utf8');
const cfg = readFileSync('tailwind.config.ts', 'utf8');
const page = readFileSync('src/app/page.tsx', 'utf8');

let bad = 0;
const ok = (m: string) => console.log(`ok    ${m}`);
const fail = (m: string) => { bad++; console.log(`FAIL  ${m}`); };
const has = (src: string, needle: string, label: string) =>
  src.includes(needle) ? ok(label) : fail(`${label} — expected \`${needle}\``);

// Typography
has(css, 'line-height: 1.65', 'body line-height is 1.65, matching the reference');
has(page, 'leading-[1.04]', 'h1 line-height is 1.04');
has(page, 'lg:leading-[1.04]', 'h1 keeps 1.04 at lg — text-6xl would otherwise force 1');
has(css, 'max-width: 720px', 'section headings cap at 720px');
has(page, 'max-w-[820px]', 'h1 measure is 820px');
has(page, 'max-w-[520px]', 'hero quote measure is 520px');
has(page, 'max-w-[640px]', 'hero subhead measure is 640px');
has(page, 'max-w-[680px]', 'essay measure is 680px');
has(css, 'font-optical-sizing: auto', 'Fraunces uses its optical-size axis');

// The opacity scale — the largest single source of visual drift.
cfg.includes('opacity: Object.fromEntries')
  ? ok('opacity scale covers every integer, so /72 /65 /45 render correctly')
  : fail('opacity scale is Tailwind default — off-scale steps render FULL opacity');

// Components, all measured
has(css, 'py-[17px]', 'CTA vertical padding is 17px');
has(css, 'sm:px-11', 'CTA horizontal padding is 44px');
has(css, '#1b4530', 'CTA outline is the reference dark green');
has(css, 'animation: sheen 7s linear infinite', 'CTA carries the 7s sheen');
has(css, 'sheen 6s linear infinite, pill-glow', 'nav pill carries sheen + glow');
has(css, 'leading-[1.65]', 'nav pill label uses the 1.65 rhythm');
css.includes('rounded-full') && css.includes('.chip')
  ? ok('reading chips are fully rounded')
  : fail('reading chips are not fully rounded');
has(css, '3px double rgba(154, 123, 63, 0.45)', 'section separator is the double brass rule');
has(css, 'rgba(154, 123, 63, 0.35)', 'card border is brass at 35%');
has(css, 'px-7 pb-[26px] pt-[30px]', 'card padding is 30/28/26');
has(css, 'box-shadow: 0 18px 60px rgba(15, 18, 21, 0.07)', 'pricing card shadow matches');
has(css, "background: linear-gradient(120deg, #3e8862 0%, #245a40 45%", 'CTA gradient has the reference stops');
has(css, "radial-gradient(circle at 8px 8px", 'step cards carry the dot field');
has(css, 'linear-gradient(90deg, #c9a227, #2f7050)', 'step cards carry the gold-to-green top bar');
has(css, "M2 9.5 Q 50 2.5 98 7.5", 'the hand-drawn swoosh under "you" is the reference path');

console.log(bad ? `\n${bad} DESIGN TOKEN DRIFT(S)` : '\nDESIGN MATCHES THE REFERENCE');
process.exit(bad ? 1 : 0);
