import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/* Server-side Claude wrapper. The app works fully without this. Every route
   falls back to the local heuristic engine when no key is present. */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
// Cheaper, faster model for light extraction/generation (follow-ups, examples,
// predictions). Cuts token cost where top-tier quality isn't needed.
export const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001";

export function hasAI(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

interface CallOpts {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function callClaude({
  system,
  user,
  maxTokens = 1024,
  temperature = 0.4,
  model = MODEL,
}: CallOpts): Promise<string> {
  const res = await getClient().messages.create({
    model,
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
