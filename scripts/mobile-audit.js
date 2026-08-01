/**
 * Paste-able browser audit. Measures, for the current page at 375px:
 *   - horizontal overflow at the document level (the real killer)
 *   - any text element rendering outside the viewport
 *   - tap targets under 44px
 *   - inputs under 16px (iOS zooms on focus below that)
 *   - content width vs viewport (catches "small element floating in the middle")
 */
(() => {
  const vw = document.documentElement.clientWidth;
  const overflow = [];
  document.querySelectorAll('h1,h2,h3,p,li,button,a,span,dt,dd,input,select,img').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !(el.textContent || '').trim()) return;
    // Skip anything inside a deliberate horizontal scroller.
    let n = el.parentElement, scroller = false;
    while (n && n !== document.body) {
      if (getComputedStyle(n).overflowX === 'auto') { scroller = true; break; }
      n = n.parentElement;
    }
    if (scroller) return;
    if (r.right > vw + 1 || r.left < -1) {
      overflow.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 34), right: Math.round(r.right) });
    }
  });

  const small = [];
  document.querySelectorAll('a,button,select,input[type=checkbox]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.height < 44) {
      small.push({ t: (el.textContent || el.tagName).trim().slice(0, 22), h: Math.round(r.height) });
    }
  });

  const tinyFonts = [...document.querySelectorAll('input,select,textarea')]
    .map((e) => parseFloat(getComputedStyle(e).fontSize))
    .filter((s) => s < 16);

  // Widest block-level content vs viewport — a low ratio means the page reads
  // as a small widget floating in a large empty frame.
  let widest = 0;
  document.querySelectorAll('main *, section, article').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 40) widest = Math.max(widest, Math.round(r.width));
  });

  return JSON.stringify({
    url: location.pathname,
    docScrollWidth: document.documentElement.scrollWidth,
    viewport: vw,
    horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    textOverflow: overflow.slice(0, 6),
    smallTapTargets: small.slice(0, 8),
    inputsUnder16px: tinyFonts.length,
    widestContent: widest,
    contentFillRatio: +(widest / vw).toFixed(2),
  }, null, 1);
})()
