import { rateLimit } from "@/lib/ratelimit";
import { requirePremium } from "@/lib/entitlement";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";
import { TRANSCRIBE_MODEL, hasTranscription } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Answers can be a couple of minutes; give the upstream call room.
export const maxDuration = 60;

/* Speech-to-text via OpenAI's cheapest high-quality model (gpt-4o-mini-transcribe).
 *
 * The client records the answer and posts the audio here. If no OpenAI key is
 * configured, we return 501 with { unavailable: true } so the browser cleanly
 * falls back to on-device Whisper or the Web Speech API. Rate-limited like every
 * other AI route. Never throws to the client. */

const EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export async function POST(req: Request) {
  const limited = await rateLimit(req);
  if (limited) return limited;
  const gate = await requirePremium(req);
  if (gate) return gate;
  recordUsage(req);

  if (!hasTranscription()) {
    return NextResponse.json({ unavailable: true, error: "Transcription not configured." }, { status: 501 });
  }

  // Minimal shape we need from the uploaded blob; avoids DOM/Node FormData type friction.
  type Uploaded = { size: number; type: string; name?: string; arrayBuffer(): Promise<ArrayBuffer> };
  let file: Uploaded | null = null;
  try {
    const form = await req.formData();
    const f = (form as unknown as { get(k: string): unknown }).get("audio");
    if (f && typeof (f as Uploaded).arrayBuffer === "function") file = f as Uploaded;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No audio" }, { status: 400 });
  }
  // OpenAI caps uploads at 25MB; anything bigger isn't a real answer.
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  const ext = EXT[file.type] || "webm";
  try {
    // Re-wrap the bytes as a Blob so the forwarded multipart body is well-typed
    // regardless of the runtime's File/FormData typings.
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || "audio/webm" });
    const upstream = new FormData();
    upstream.append("file", blob, `answer.${ext}`);
    upstream.append("model", TRANSCRIBE_MODEL);
    upstream.append("response_format", "json");
    upstream.append("language", "en");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: upstream,
    });

    if (!res.ok) {
      // Let the client fall back to on-device transcription.
      return NextResponse.json({ error: "Transcription failed", fallback: true }, { status: 502 });
    }
    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return NextResponse.json({ text, source: "openai" });
  } catch {
    return NextResponse.json({ error: "Transcription failed", fallback: true }, { status: 502 });
  }
}
