import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * One interface, three states: OpenAI, Anthropic, or neither.
 *
 * Which one runs is decided by which key is present, not by a build flag, so a
 * deploy that is missing its key degrades to authored copy instead of throwing
 * a 500 at the last step of the funnel. `provider()` returning null is a
 * supported state, not an error.
 */

export type Effort = 'low' | 'medium' | 'high';

export interface Generation {
  system: string;
  user: string;
  /** JSON Schema. When present the reply is guaranteed to match it. */
  schema?: Record<string, unknown>;
  schemaName?: string;
  maxTokens: number;
  effort?: Effort;
}

export interface Provider {
  name: 'openai' | 'anthropic';
  model: string;
  /** Returns raw text, or the parsed object when `schema` was supplied. */
  generate<T = string>(req: Generation): Promise<T>;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';

let cachedOpenAi: OpenAI | null = null;
let cachedAnthropic: Anthropic | null = null;

/**
 * The active provider, or null when no key is configured.
 *
 * OpenAI wins when both are set, because setting OPENAI_API_KEY is the explicit
 * act — ANTHROPIC_API_KEY is often already in the environment for other tools.
 */
export function provider(): Provider | null {
  if (process.env.OPENAI_API_KEY) return openAiProvider();
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider();
  return null;
}

/* --------------------------------------------------------------- OpenAI */

function openAiProvider(): Provider {
  cachedOpenAi ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // The default is 2, which turns one blip into three billed calls on a
    // route the user is already waiting on. Retries are handled by the caller.
    maxRetries: 1,
    timeout: 120_000,
  });
  const client = cachedOpenAi;

  return {
    name: 'openai',
    model: OPENAI_MODEL,
    async generate<T>(req: Generation): Promise<T> {
      const res = await client.chat.completions.create({
        model: OPENAI_MODEL,
        max_completion_tokens: req.maxTokens,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        ...(req.schema
          ? {
              response_format: {
                type: 'json_schema' as const,
                json_schema: {
                  name: req.schemaName ?? 'result',
                  strict: true,
                  schema: req.schema,
                },
              },
            }
          : {}),
      });

      const text = res.choices[0]?.message?.content ?? '';
      if (!text) throw new Error('The model returned an empty response.');
      return (req.schema ? (JSON.parse(text) as T) : (text as T));
    },
  };
}

/* ------------------------------------------------------------ Anthropic */

function anthropicProvider(): Provider {
  cachedAnthropic ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 1,
  });
  const client = cachedAnthropic;

  return {
    name: 'anthropic',
    model: ANTHROPIC_MODEL,
    async generate<T>(req: Generation): Promise<T> {
      const stream = client.messages.stream({
        model: ANTHROPIC_MODEL,
        max_tokens: req.maxTokens,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: req.effort ?? 'medium',
          ...(req.schema ? { format: { type: 'json_schema' as const, schema: req.schema } } : {}),
        },
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      });

      const message = await stream.finalMessage();
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      if (!text) throw new Error('The model returned an empty response.');
      if (!req.schema) return text as T;

      try {
        return JSON.parse(text) as T;
      } catch {
        // Structured outputs make this near-unreachable; a max_tokens
        // truncation is the one way it happens, so say that plainly.
        throw new Error('The model returned malformed output.');
      }
    },
  };
}
