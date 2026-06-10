# Edge-Case & Compound-Action Audit (100 actions)

## Audit results (automated)
- `qa-chaos.mjs` (browser edge actions): **15/15, 0 exceptions**
- `qa-api-battery.mjs` (adversarial APIs): **9/9** — huge/unicode/injection handled, malformed never 500s, rate-limit throttled 30/40 concurrent → 429
- `qa-ai.mjs`: accuracy ✅ · consistency ✅ · zero markdown leaks ✅
- `qa-e2e.mjs`: full signup→practice→score→dashboard **11/11**
- `qa-browser.mjs`: every page 0 runtime errors

### 🐞 Bug found & fixed during this audit
**Hydration mismatch on `/dashboard?upgraded=1`** — the AppShell `verifying` state was seeded from `window.location` in the initializer, so the server rendered `false` and the client `true`, throwing repeated "Hydration failed" errors on the Stripe-return path. Fixed: seed `false`, detect `upgraded` in a client-only effect (hydration-safe; `useSearchParams` was rejected because it forces a Suspense bailout on the statically-prerendered app pages).



User-perspective audit: midway actions, backing out, double-actions, junk input,
deep links, races, tampering. Status set by the automated harnesses
(`qa-chaos.mjs`, `qa-ai.mjs`, `qa-browser.mjs`, `qa-e2e.mjs`) + reasoning.
Legend: ✅ pass · ⚙️ handled-by-design · 🔍 manual/known.

## A. Navigation & routing
1. Deep-link every route directly (unauth) — ✅ all 200 / gated→signin
2. Browser back after landing→onboarding — ⚙️ history works
3. Browser forward after back — ⚙️
4. Refresh mid-onboarding (step 3) — 🔍 resets to step 1 (state is in-memory; acceptable)
5. Deep-link /session/<bad-id> — ✅ shows "not found" state, no crash
6. Deep-link /practice unauth — ✅ →/signin
7. Rapid route switching (10 navs in 2s) — ✅ no leak/crash
8. Open two tabs, navigate both — ⚙️ localStorage shared, onStoreChange syncs
9. Hard refresh on dashboard — ✅ re-hydrates
10. Trailing slash / case variants — ⚙️ Next normalizes

## B. Auth
11. Sign in with wrong password — ✅ inline error, no crash
12. Sign up with already-registered email — ✅ error surfaced
13. Sign up with invalid email format — ✅ HTML5 + server validation
14. Empty email/password submit — ✅ required fields block
15. Magic-link request — ⚙️ sends if configured, else no-op
16. Sign out mid-session (on a tool page) — ⚙️ → returns to landing
17. Sign out then back button — ⚙️ gate re-redirects
18. Session token tampered in localStorage — ⚙️ Supabase rejects → signed out
19. Switch account (signout→signin other) — ⚙️ checkedFor re-keys per email
20. Concurrent signup double-click — ✅ button disabled while processing

## C. Onboarding
21. Back out to landing mid-flow — ⚙️
22. Change a chip answer then continue — ✅ auto-advances on last field
23. Career-change branch adds a step — ✅ dynamic count
24. Low-confidence branch adds dread step — ✅
25. Skip optional company field — ✅ optional, continues
26. Role typed then cleared — ✅ Continue disabled until set
27. Very long role string (500 chars) — ✅ stored, sliced downstream
28. Emoji/unicode in company field — ✅ stored safely
29. Rapid double-tap a chip — ✅ idempotent select
30. Finish → lands on /signin?next=/upgrade — ✅ (qa-onboarding)

## D. Paywall & payment
31. Toggle monthly/annual repeatedly — ✅ no state corruption
32. Click subscribe twice fast — ✅ disabled during processing
33. Cancel at Stripe (cancel_url) — ✅ →/upgrade?canceled=1, no access
34. Tamper ?upgraded=1 without paying — ⚙️ verify-checkout blocks (paid:false)
35. Hit /dashboard?upgraded=1 manually — ⚙️ verification gate, not granted
36. Back button from Stripe checkout — ⚙️ no access granted
37. Premium flag tampered in localStorage — ⚙️ sub-status check reconciles
38. "Maybe later" → returns to dashboard — ✅
39. Switch plan after viewing order summary — ✅ price/rows update
40. Checkout with no Stripe key (dev) — ✅ {configured:false} demo path

## E. Practice (the core compound flow)
41. Start with no role (setup screen) — ✅ defaults Office Manager
42. Submit empty answer — ✅ disabled until 5 words
43. Submit 1-word answer — ✅ blocked (min words)
44. Submit huge answer (5k words) — ✅ sliced to 4000 chars server-side
45. Score, then End immediately — ✅ saves the 1 scored answer
46. End with zero answers — ✅ →/dashboard, no empty session
47. Answer all 8 → session summary — ✅ aggregates + saves
48. Mid-session refresh — 🔍 restarts (in-memory); no corruption
49. Double-click "Submit answer" — ✅ disabled while scoring
50. Follow-up: skip it and move next — ✅ optional
51. Follow-up: answer it, then next — ✅ both answers counted
52. Voice mic denied — ✅ "Microphone blocked" state, typing still works
53. Rapid Next clicks — ✅ guarded by scored state
54. Same answer twice (different Q) — ✅ scored independently, deterministic
55. Unicode/emoji answer — ✅ scored, no crash
56. Answer with markdown (**bold**) — ✅ renders via Inline, no raw symbols
57. Network drop during scoring — ✅ falls back to heuristic, no crash
58. Premium user never hits in-page paywall — ✅ (index 0 + !isPremium gate)
59. Focus-drill mode (?focus=specificity) — ✅ generates focus questions
60. Autostart param (?autostart=1) — ✅ starts immediately

## F. Tools (each: empty, huge, rapid, save/delete)
61. Gap story: empty submit — ✅ heuristic versions, grammatical
62. Gap story: save then delete a version — ⚙️ localStorage CRUD
63. Company research: empty company — ✅ 400 "Company required"
64. Company research: huge posting — ✅ sliced
65. Question predictor: empty posting — ✅ 400 "Paste the posting"
66. Question predictor: gibberish posting — ✅ returns generic-but-valid
67. Salary: deflect (ask their range) — ✅ rewarded by coach
68. Salary: fold instantly — ✅ penalized (composure)
69. Salary: 4 rounds to close — ✅ progresses to accepted
70. Your story: fill 4 steps incrementally — ⚙️ assembles live
71. Tool generate while previous loading — ✅ button disabled
72. Debrief: score multiple answers — ✅ uses AnswerScoreCard
73. Tracker: add/edit/delete interview — ⚙️ CRUD persists
74. Rapid generate (rate limit) — ✅ 429 after threshold
75. Injection text in tool input ("</script>") — ✅ rendered as text, not executed

## G. Dashboard & session
76. Dashboard with 0 sessions — ✅ empty state (no fake data)
77. Dashboard after 1 session — ✅ score+streak+recent (qa-e2e)
78. Range toggle 7/30/all — ⚙️ recomputes charts
79. Session deep-link valid id — ✅ renders breakdown
80. Score → dashboard reflects it — ✅ (qa-e2e, 11/11)
81. Streak increments per day — ⚙️ touchStreak on save
82. Comparison vs recent average shows — ✅ deterministic delta
83. Many sessions (50) perf — 🔍 charts cap/aggregate

## H. Schedule & plan
84. Add interview, set active — ✅ countdown shows
85. Remove the active interview — ✅ falls back to soonest
86. Add interview with past date — ✅ shows "Past", prompts next
87. Add 5 interviews, switch between — ✅ selector
88. Empty schedule prompt — ✅
89. Plan with interview <1 day out — ✅ buckets=1
90. Plan tasks adapt to weak area — ✅ focus drill task

## I. State, sync, persistence
91. localStorage cleared mid-use — ⚙️ re-hydrates from DB on next load
92. Cross-device: data syncs on signin — ⚙️ pull+push (cloud.ts)
93. Reset all (settings) — ⚙️ clears + →landing
94. Profile edit saves + syncs — ✅ pushProfile incl company/gap
95. Schedule/company persist to DB (RLS) — ✅ verified live

## J. Security & abuse
96. AI key in client bundle — ✅ 0 (server-only, verified)
97. XSS via AI output — ✅ React escapes; RichText builds JSX (no innerHTML)
98. Rate limit per IP/user on AI routes — ✅ 30/min, 429
99. RLS: user can't read others' rows — ⚙️ policies enforced
100. Malformed JSON to every API — ✅ 400, never 500
