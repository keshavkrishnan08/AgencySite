"use client";

/* Client side of on-device Whisper transcription. Manages a single module
   worker, exposes a promise-based transcribe(), and decodes recorded audio to
   the 16kHz mono Float32Array Whisper expects. Everything stays on-device. */

export function whisperSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof Worker !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    (typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined")
  );
}

let worker: Worker | null = null;
type Progress = { status?: string; progress?: number; file?: string };

function getWorker(): Worker {
  if (!worker) worker = new Worker("/whisper-worker.js", { type: "module" });
  return worker;
}

/** Warm the model (downloads + caches on first call). */
export function preloadWhisper(onProgress?: (p: Progress) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "progress") onProgress?.(m.data);
      else if (m.type === "ready") {
        w.removeEventListener("message", onMsg);
        resolve();
      } else if (m.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(m.message));
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "load" });
  });
}

/** Decode a recorded audio Blob into a 16kHz mono Float32Array. */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  // Asking for a 16kHz context makes decodeAudioData resample for us.
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0); // mono (first channel)
    return new Float32Array(data); // copy out before closing the context
  } finally {
    ctx.close();
  }
}

/** Transcribe a 16kHz mono Float32Array on-device. */
export function transcribePcm(audio: Float32Array, onProgress?: (p: Progress) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "progress") onProgress?.(m.data);
      else if (m.type === "result") {
        w.removeEventListener("message", onMsg);
        resolve(m.text || "");
      } else if (m.type === "error") {
        w.removeEventListener("message", onMsg);
        reject(new Error(m.message));
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "transcribe", audio }, [audio.buffer]);
  });
}
