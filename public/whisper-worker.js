// On-device speech-to-text with Whisper (transformers.js v3). Runs fully in the
// browser — audio never leaves the device, no API key. Loaded from CDN as a
// module worker so it doesn't touch the Next/webpack build.
//
// Performance:
//  - WebGPU when available (several x faster than CPU), else WASM.
//  - Precision tuned per device: fp16 on GPU (fast + accurate), q8 on CPU
//    (small download, usable speed).
//  - The pipeline is kept warm across calls, so only the first call pays load.
//
// Messages in:  { type: "load" }  |  { type: "transcribe", audio: Float32Array }
// Messages out: { type: "progress", data }  { type: "device", device }
//               { type: "ready" }  { type: "result", text }  { type: "error", message }

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

env.allowLocalModels = false;

const MODEL = "onnx-community/whisper-base.en";
let transcriberPromise = null;

async function pickDevice() {
  try {
    if (typeof navigator !== "undefined" && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    /* fall through to wasm */
  }
  return "wasm";
}

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const device = await pickDevice();
      const dtype =
        device === "webgpu"
          ? { encoder_model: "fp16", decoder_model_merged: "fp16" }
          : { encoder_model: "q8", decoder_model_merged: "q8" };
      self.postMessage({ type: "device", device });
      return pipeline("automatic-speech-recognition", MODEL, {
        device,
        dtype,
        progress_callback: (p) => self.postMessage({ type: "progress", data: p }),
      });
    })();
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
