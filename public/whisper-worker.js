// On-device speech-to-text with Whisper (transformers.js). Runs fully in the
// browser — audio never leaves the device, no API key. Loaded from CDN as a
// module worker so it doesn't touch the Next/webpack build at all.
//
// Messages in:  { type: "load" }  |  { type: "transcribe", audio: Float32Array }
// Messages out: { type: "progress", data }  { type: "ready" }
//               { type: "result", text }     { type: "error", message }

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Pull models from the HF CDN (no local model files to serve).
env.allowLocalModels = false;

const MODEL = "Xenova/whisper-base.en"; // ~quantized, good English accuracy
let transcriberPromise = null;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL, {
      quantized: true,
      progress_callback: (p) => self.postMessage({ type: "progress", data: p }),
    });
  }
  return transcriberPromise;
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  try {
    if (msg.type === "load") {
      await getTranscriber();
      self.postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "transcribe") {
      const transcriber = await getTranscriber();
      const out = await transcriber(msg.audio, { chunk_length_s: 30, stride_length_s: 5 });
      const text = (out && out.text ? out.text : "").trim();
      self.postMessage({ type: "result", text });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err && err.message ? err.message : err) });
  }
};
