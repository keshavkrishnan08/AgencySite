/* Axon Careers — DEEP agent-based campaign sim, averaged over many runs.
   $5/creative x6 = $30/day. Agents have persona, mindset("culture"), device,
   and traits. Every click is a SESSION routed page-by-page with realistic
   drop-off. Most people choose MONTHLY. Averaged over RUNS seeded campaigns. */

const RUNS = 25;
let _s = 1;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const chance = (p) => rnd() < p;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const gauss = (m, sd) => { let u = 0; while (!u) u = rnd(); let v = rnd(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const tr = (m, sd) => clamp(gauss(m, sd));

const PER = 5, NC = 6, DAILY = PER * NC, DAYS = 30;
const CPM = 14, LEARN = 7, LMULT = 1.35, AUD = 45000, CAP = 7;
const EXP = { 1: 1, 2: 1.3, 3: 1.2, 4: 0.85, 5: 0.55, 6: 0.35 };
const CREA = [1.5, 1.1, 1.0, 0.9, 0.8, 0.55];
const MINDS = [
  { id: "Anxious returner",    w: .26, ctr: .018, intent: .72, pat: .62, trust: .55, price: .65, tech: .55, ab: 0 },
  { id: "Pragmatic switcher",  w: .18, ctr: .014, intent: .70, pat: .66, trust: .62, price: .50, tech: .70, ab: .06 },
  { id: "Skeptical veteran",   w: .20, ctr: .013, intent: .66, pat: .55, trust: .38, price: .55, tech: .65, ab: 0 },
  { id: "Eager climber",       w: .12, ctr: .012, intent: .80, pat: .70, trust: .68, price: .35, tech: .78, ab: .10 },
  { id: "Budget-tight parent", w: .12, ctr: .015, intent: .68, pat: .50, trust: .50, price: .85, tech: .45, ab: -.05 },
  { id: "Casual scroller",     w: .12, ctr: .009, intent: .30, pat: .40, trust: .45, price: .60, tech: .65, ab: -.05 },
];
const PAGES = ["click","lp","onb_start","onb_done","acct","paywall","trial","paid"];

function campaign() {
  const F = Object.fromEntries(PAGES.map(p=>[p,0]));
  const onb = {}, pwReason = {price:0,trust:0,mobileCard:0,hesitate:0}, pwDev={mobile:0,desktop:0}, pwMind={};
  const mindStat = {}; MINDS.forEach(m=>mindStat[m.id]={clicks:0,trial:0,paid:0});
  const plan = {monthly:0, annual:0};
  let impr=0, clicks=0, reached=0; const agents=[]; const tq=[];
  const newMind=()=>{let r=rnd(),c=0;for(const m of MINDS){c+=m.w;if(r<=c)return m;}return MINDS[0];};
  const make=()=>{ if(reached>=AUD)return null; const m=newMind();
    const a={m,persona:m.id==="Casual scroller"?pick(["returning","laid_off","career_change"]):
      ({"Pragmatic switcher":"career_change","Skeptical veteran":"laid_off","Eager climber":"promotion"})[m.id]||"returning",
      dev:chance(.75)?"mobile":"desktop", intent:tr(m.intent,.12), pat:tr(m.pat,.12), trust:tr(m.trust,.12),
      price:tr(m.price,.12), tech:tr(m.tech,.12), seen:0, trial:false, paid:false, plan:null, sess:0, consid:false};
    agents.push(a); reached++; return a; };
  const nScreens=(a)=> 5 + (a.persona==="career_change"?1:0) + ((a.m.intent<.75&&a.m.trust<.6)?1:0);

  function session(a){
    F.click++; const mob=a.dev==="mobile";
    if(!chance(mob?.82:.90))return;
    F.lp++;
    if(!chance(clamp(.50*(.4+a.intent))))return;
    F.onb_start++;
    const ns=nScreens(a), per=clamp(.965-(1-a.m.pat)*.14);
    for(let s=1;s<=ns;s++) if(!chance(per)){onb[s]=(onb[s]||0)+1; return;}
    F.onb_done++;
    if(!chance(clamp(.55+a.trust*.4)))return;
    F.acct++;
    if(!chance(.97))return;
    F.paywall++;
    const pT=clamp(.55*(.4+a.trust*.6)*(1-a.price*.5)*(mob?(.7+a.tech*.3):1)*(1+a.intent*.2-.1));
    if(!chance(pT)){ pwReason[a.price>.7?"price":a.trust<.45?"trust":(mob&&a.tech<.55)?"mobileCard":"hesitate"]++;
      pwDev[a.dev]++; pwMind[a.m.id]=(pwMind[a.m.id]||0)+1; a.consid=true; return; }
    F.trial++;
    const pA=clamp(.05+(1-a.price)*.10+a.m.ab+a.intent*.03); // MONTHLY dominant
    a.plan=chance(pA)?"annual":"monthly"; a.trial=true; mindStat[a.m.id].trial++;
  }

  for(let d=1;d<=DAYS;d++){
    const cpm=CPM*(d<=LEARN?LMULT:1), ip=(PER/cpm)*1000;
    for(const cm of CREA) for(let i=0;i<ip;i++){
      impr++; const pNew=Math.max(.1,(AUD-reached)/AUD);
      let a=chance(pNew)?make():null;
      if(!a){for(let t=0;t<4;t++){const c=pick(agents);if(c&&c.seen<CAP){a=c;break;}}}
      if(!a||a.trial||a.paid)continue;
      a.seen++; const e=EXP[Math.min(a.seen,6)]??.3;
      if(a.seen>1&&(a.consid||a.sess>0))a.intent=clamp(a.intent+.02);
      const ctr=a.m.ctr*cm*e*(a.dev==="mobile"?1:.95);
      if(chance(ctr)){clicks++;a.sess++;mindStat[a.m.id].clicks++;session(a);
        if(a.trial&&!a._q){a._q=1;tq.push({md:d+7,a});}}
    }
    for(const t of tq) if(t.md===d&&!t.a.paid){ if(chance(clamp(.55*(1-t.a.price*.4)))){t.a.paid=true;F.paid++;plan[t.a.plan]++;mindStat[t.a.m.id].paid++;} }
  }
  const paid=agents.filter(a=>a.paid);
  return {F,onb,pwReason,pwDev,pwMind,mindStat,plan,impr,clicks,reached,
    paid:paid.length, trials:F.trial,
    avgExpPaid: paid.reduce((s,a)=>s+a.seen,0)/Math.max(paid.length,1),
    multiExpPaid: paid.filter(a=>a.seen>1).length };
}

// ---- run RUNS campaigns, average ----
const acc={F:{},onb:{},pwReason:{},pwDev:{},pwMind:{},mindStat:{},plan:{monthly:0,annual:0}};
PAGES.forEach(p=>acc.F[p]=0);
let sImpr=0,sClicks=0,sReach=0,sPaid=0,sTrials=0,sAvgExp=0,sMulti=0,minPaid=1e9,maxPaid=0;
for(let r=0;r<RUNS;r++){ _s=1000+r*7919; const c=campaign();
  PAGES.forEach(p=>acc.F[p]+=c.F[p]); for(const k in c.onb)acc.onb[k]=(acc.onb[k]||0)+c.onb[k];
  for(const k in c.pwReason)acc.pwReason[k]=(acc.pwReason[k]||0)+c.pwReason[k];
  for(const k in c.pwDev)acc.pwDev[k]=(acc.pwDev[k]||0)+c.pwDev[k];
  for(const k in c.pwMind)acc.pwMind[k]=(acc.pwMind[k]||0)+c.pwMind[k];
  for(const k in c.mindStat){acc.mindStat[k]=acc.mindStat[k]||{clicks:0,trial:0,paid:0};
    acc.mindStat[k].clicks+=c.mindStat[k].clicks;acc.mindStat[k].trial+=c.mindStat[k].trial;acc.mindStat[k].paid+=c.mindStat[k].paid;}
  acc.plan.monthly+=c.plan.monthly; acc.plan.annual+=c.plan.annual;
  sImpr+=c.impr;sClicks+=c.clicks;sReach+=c.reached;sPaid+=c.paid;sTrials+=c.trials;sAvgExp+=c.avgExpPaid;sMulti+=c.multiExpPaid;
  minPaid=Math.min(minPaid,c.paid);maxPaid=Math.max(maxPaid,c.paid);
}
const A=(x)=>x/RUNS;
const f=(n,d=0)=>Number(n).toFixed(d), pc=(n,den)=>den?(n/den*100).toFixed(1)+"%":"—";

console.log("===== DEEP AGENT-BASED SIM — averaged over %s campaigns ($30/day, 30 days) =====\n",RUNS);
console.log("Per campaign: impressions %s | unique reach %s | frequency %sx | clicks %s (CTR %s)\n",
  f(A(sImpr)),f(A(sReach)),f(sImpr/sReach,2),f(A(sClicks)),pc(sClicks,sImpr));

console.log("===== PAGE-BY-PAGE FUNNEL (per visit) — avg counts + drop-off =====");
const L={click:"Ad click",lp:"/start landing viewed",onb_start:"Started onboarding",onb_done:"Finished the questions",
  acct:"Created account",paywall:"Reached paywall (/upgrade)",trial:"Started trial (card entered)",paid:"Paid (after trial)"};
let prev=0;
PAGES.forEach((p,i)=>{const v=A(acc.F[p]); const seg=i===0?"":"  ↓ "+pc(prev-v,prev)+" drop  ("+pc(v,prev)+" continue)";
  console.log("  %s %s %s%s",String(i+1),L[p].padEnd(26),f(v,1).padStart(7),seg); prev=v;});
console.log("\n  Net: click→paid %s | landing→paid %s",pc(acc.F.paid,acc.F.click),pc(acc.F.paid,acc.F.lp));

console.log("\n===== ONBOARDING: where they quit the questions (avg sessions) =====");
Object.keys(acc.onb).sort((a,b)=>a-b).forEach(s=>console.log("  screen %s: %s drop",s,f(A(acc.onb[s]),1)));

console.log("\n===== WHO STOPS AT THE PAYWALL =====");
const pwTot=Object.values(acc.pwReason).reduce((a,b)=>a+b,0);
console.log("  %s%% of people who reach the paywall do NOT start a trial.",pc(acc.F.paywall-acc.F.trial,acc.F.paywall).replace("%",""));
console.log("  Why they bail: hesitate/not-ready %s | mobile card-averse %s | price-sensitive %s | low-trust %s",
  pc(acc.pwReason.hesitate,pwTot),pc(acc.pwReason.mobileCard,pwTot),pc(acc.pwReason.price,pwTot),pc(acc.pwReason.trust,pwTot));
console.log("  Device of paywall-bailers: mobile %s | desktop %s",pc(acc.pwDev.mobile,pwTot),pc(acc.pwDev.desktop,pwTot));
console.log("  Mindset of paywall-bailers:");
Object.entries(acc.pwMind).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("    %s %s",k.padEnd(20),pc(v,pwTot)));

console.log("\n===== CONVERSION BY MINDSET (culture) — paid as %% of CLICKERS =====");
Object.entries(acc.mindStat).sort((a,b)=>b[1].paid-a[1].paid).forEach(([k,v])=>
  console.log("  %s | clicks %s | trials %s | paid %s | clicker→paid %s",
    k.padEnd(20),f(A(v.clicks)).padStart(4),f(A(v.trial),1).padStart(5),f(A(v.paid),1).padStart(4),pc(v.paid,v.clicks)));

console.log("\n===== PLAN MIX & MULTI-TOUCH =====");
const tp=acc.plan.monthly+acc.plan.annual;
console.log("  Monthly %s | Annual %s   (most pick monthly)",pc(acc.plan.monthly,tp),pc(acc.plan.annual,tp));
console.log("  Avg ad exposures before a paid conversion: %sx",f(sAvgExp/RUNS,1));
console.log("  Paid who'd seen the ad 2+ times first (multi-touch): %s",pc(sMulti,sPaid));

console.log("\n===== ECONOMICS (monthly-dominant, 12-month cohort) =====");
const ST=(g)=>g*.029+.30,PM=9.99,PA=79,CH=.12,AIT=.30,AIP=.45;
const spend=DAILY*DAYS, paid=A(sPaid), trials=A(sTrials);
const mo=A(acc.plan.monthly), an=A(acc.plan.annual);
let subs=mo,rev=0; for(let m=0;m<12;m++){rev+=subs*(PM-ST(PM)-AIP);subs*=(1-CH);} rev+=an*(PA-ST(PA)-AIP*12);
const tAi=trials*AIT, profit=rev-spend-tAi, CAC=spend/Math.max(paid,.001);
console.log("  Spend $%s/mo | Paid subs %s (range %s–%s across runs) | CAC $%s",f(spend),f(paid,1),f(minPaid),f(maxPaid),f(CAC,2));
console.log("  12-mo net revenue $%s | trial AI -$%s | PROFIT $%s | ROAS %sx | LTV:CAC %s:1",
  f(rev),f(tAi),f(profit),f(rev/spend,2),f((rev/Math.max(paid,1))/CAC,2));
console.log("\n  Reality check: first-month revenue (~$%s) < monthly spend ($%s) → you fund ~4-5 months",
  f(mo*(PM-ST(PM)) + an*(PA-ST(PA))/12,0),f(spend));
console.log("  before the cohort pays back. Profitable over a year only if churn≈12%% and trial→paid≈55%%.");
