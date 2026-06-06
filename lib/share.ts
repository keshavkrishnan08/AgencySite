"use client";

/** Draws a 1080×1080 shareable score card onto a canvas and returns it. */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  opts: { score: number; role: string; sessions: number }
) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // background
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#fbfaf5");
  bg.addColorStop(1, "#f0ede3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // accent blob
  const blob = ctx.createRadialGradient(S * 0.8, S * 0.2, 40, S * 0.8, S * 0.2, 520);
  blob.addColorStop(0, "rgba(25,169,184,0.20)");
  blob.addColorStop(1, "rgba(25,169,184,0)");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, S, S);

  // card
  const m = 90;
  roundRect(ctx, m, m, S - m * 2, S - m * 2, 48);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(27,32,48,0.12)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fill();
  ctx.shadowColor = "transparent";

  const cx = S / 2;

  // wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = "#0c5660";
  ctx.font = "600 44px Georgia, serif";
  ctx.fillText("PrepPath", cx, 250);

  // label
  ctx.fillStyle = "#989cab";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText("INTERVIEW READINESS", cx, 330);

  // big score
  const color = scoreColor(opts.score);
  ctx.fillStyle = color;
  ctx.font = "700 300px Georgia, serif";
  ctx.fillText(String(opts.score), cx, 640);

  ctx.fillStyle = "#585e70";
  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillText("out of 100", cx, 700);

  // role
  ctx.fillStyle = "#1b2030";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText(`Preparing for ${opts.role}`, cx, 810);

  ctx.fillStyle = "#989cab";
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillText(`${opts.sessions} sessions practiced · improving every time`, cx, 870);

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function scoreColor(s: number): string {
  if (s < 40) return "#db5e4a";
  if (s < 60) return "#dd8b3d";
  if (s < 80) return "#19a9b8";
  return "#3e9d6e";
}
