"use client";

import { getProfile } from "./store";

/* Client helper for server-side (OpenAI) transcription.
 *
 * Posts the recorded answer audio to /api/transcribe. Returns the text, or null
 * when transcription isn't available or fails, so the caller can fall back to
 * on-device Whisper or the Web Speech API. Never throws. */

export async function transcribeViaServer(blob: Blob): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("audio", blob, "answer.webm");
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: fd,
      headers: { "x-user-id": getProfile().email || "" },
    });
    if (!res.ok) return null; // 501 unavailable, 502 failed -> fall back
    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}
