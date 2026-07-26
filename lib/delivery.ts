import type { DeliveryMetrics } from "./types";

/* Turns spoken-delivery numbers into plain coaching notes. This is the piece
   that makes Axon Careers a speaking coach, not just a writing coach. */

export interface DeliveryNote {
  label: string;
  value: string;
  tone: "good" | "warn";
  text: string;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function deliveryNotes(m: DeliveryMetrics): DeliveryNote[] {
  const notes: DeliveryNote[] = [];

  // Length
  if (m.durationSec < 20) {
    notes.push({ label: "Length", value: fmtDuration(m.durationSec), tone: "warn", text: "That was short. Add the action you took and how it ended." });
  } else if (m.durationSec > 150) {
    notes.push({ label: "Length", value: fmtDuration(m.durationSec), tone: "warn", text: "You ran long. Cut the slow start and land the result sooner." });
  } else {
    notes.push({ label: "Length", value: fmtDuration(m.durationSec), tone: "good", text: "Well-paced. Long enough to be complete, short enough to hold attention." });
  }

  // Pace
  if (m.wpm >= 175) {
    notes.push({ label: "Pace", value: `${m.wpm} wpm`, tone: "warn", text: "You raced a bit. Slow down. A calm pace sounds more confident than a fast one." });
  } else if (m.wpm > 0 && m.wpm < 110) {
    notes.push({ label: "Pace", value: `${m.wpm} wpm`, tone: "warn", text: "A touch slow. A little more energy will keep them leaning in." });
  } else if (m.wpm > 0) {
    notes.push({ label: "Pace", value: `${m.wpm} wpm`, tone: "good", text: "Steady, easy-to-follow pace. Nicely done." });
  }

  // Pauses
  if (m.pauseCount >= 3) {
    notes.push({ label: "Pauses", value: `${m.pauseCount}`, tone: "warn", text: `You paused ${m.pauseCount} times${m.longestPauseSec >= 3 ? ` (longest ${Math.round(m.longestPauseSec)}s)` : ""}. A short pause is fine. Practice shrinks the long ones.` });
  } else {
    notes.push({ label: "Pauses", value: `${m.pauseCount}`, tone: "good", text: "You kept a smooth flow without long stalls." });
  }

  return notes;
}
