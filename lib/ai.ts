import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/* Server-side Claude wrapper. The app works fully without this. Every route
   falls back to the local heuristic engine when no key is present. */

// Policy: always use the minimum capable model (Haiku). NEVER large/expensive
// models — Opus is hard-blocked even if mis-set via env, and every default is
// Haiku. Env overrides are honored only when they aren't Opus.
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const minModel = (m?: string | null): string => (!m || /opus/i.test(m) ? DEFAULT_MODEL : m);

// Every route uses this. Default Haiku; an explicit non-Opus override is allowed.
export const FAST_MODEL = minModel(process.env.ANTHROPIC_MODEL_FAST);
const MODEL = minModel(process.env.ANTHROPIC_MODEL);
// Scoring also defaults to Haiku (minimum but strong). Override via env if ever
// needed, but never Opus.
export const SCORE_MODEL = minModel(process.env.ANTHROPIC_MODEL_SCORING);

// OpenAI: cheapest capable tier only. Anything that isn't a mini/nano model is
// downgraded to gpt-4o-mini, so we never run a big/expensive OpenAI model either.
const DEFAULT_OPENAI = "gpt-4o-mini";
const minOpenAI = (m?: string | null): string => (!m || !/mini|nano/i.test(m) ? DEFAULT_OPENAI : m);
const OPENAI_MODEL = minOpenAI(process.env.OPENAI_MODEL);

const useOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

export function hasAI(): boolean {
  // Either provider works; OpenAI is preferred when present.
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function callOpenAI(system: string, user: string, maxTokens: number, temperature: number, seed?: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      temperature,
      // A fixed seed makes the same prompt reproducible (used for scoring, so the
      // same answer grades the same way). OpenAI auto-caches stable prefixes too.
      ...(seed != null ? { seed } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

interface CallOpts {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  seed?: number; // set for reproducible output (e.g. deterministic scoring)
}

// Provider-agnostic call. Prefers OpenAI (gpt-4o-mini) when its key is set,
// else Anthropic (Haiku). Same minimal-model, low-cost policy on both sides.
export async function callClaude({
  system,
  user,
  maxTokens = 1024,
  temperature = 0.4,
  model = MODEL,
  seed,
}: CallOpts): Promise<string> {
  if (useOpenAI()) {
    return callOpenAI(system, user, maxTokens, temperature, seed);
  }
  const res = await getClient().messages.create({
    model: minModel(model), // never Opus, always at least Haiku
    max_tokens: maxTokens,
    temperature,
    // Cache the (stable) system prompt to cut cost on repeated calls.
    // Cast: cache_control isn't in this SDK version's types but the API supports it.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/** Robustly pull the first JSON object/array out of a model response. */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through */
  }
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
