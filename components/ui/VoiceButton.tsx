"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryMetrics } from "@/lib/types";
import { whisperSupported, blobToPcm16k, transcribePcm, preloadWhisper } from "@/lib/whisper";

/* Voice input. Primary engine is on-device Whisper (transformers.js): the audio
   never leaves the browser and there is no API key. We record with the mic,
   measure delivery live (volume, pace, pauses), then transcribe on-device. If
   Whisper can't run (old browser, blocked CDN), we fall back to the browser's
   Web Speech API so voice still works. */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const PAUSE_MS = 2500; // a silence longer than this counts as a long pause
type Phase = "idle" | "rec" | "transcribing";

export function VoiceButton({
  onTranscript,
  onInterim,
  onDelivery,
  className,
  compact = false,
  tone = "light",
}: {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onDelivery?: (m: DeliveryMetrics) => void;
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const [engine, setEngine] = useState<"whisper" | "webspeech">("webspeech");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState(""); // e.g. "Loading voice model… 42%"
  const [micBlocked, setMicBlocked] = useState(false);
  const [webSpeechAvailable, setWebSpeechAvailable] = useState(true);

  // Whisper recording refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const recStartRef = useRef(0);
  const lastVoiceRef = useRef(0);
  const pauseCountRef = useRef(0);
  const longestPauseRef = useRef(0);

  // Web Speech refs
  const recogRef = useRef<any>(null);
  const wordsRef = useRef(0);
  const wsStartRef = useRef(0);
  const wsLastRef = useRef(0);
  const wsEmittedRef = useRef(false);

  useEffect(() => {
    if (whisperSupported()) setEngine("whisper");
    setWebSpeechAvailable(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => cleanupWhisper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Whisper (on-device) ---------------- */

  const cleanupWhisper = () => {
    cancelAnimationFrame(rafRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    streamRef.current = null;
    audioCtxRef.current = null;
  };

  const startWhisper = async () => {
    setMicBlocked(false);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") setMicBlocked(true);
      else setEngine("webspeech"); // mic capture unavailable; try the other engine
      return;
    }
    streamRef.current = stream;

    // live delivery: RMS for volume + pause detection
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ac = new Ctx();
      audioCtxRef.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 2048;
      ac.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      recStartRef.current = performance.now();
      lastVoiceRef.current = performance.now();
      pauseCountRef.current = 0;
      longestPauseRef.current = 0;
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > 0.015) {
          const gap = now - lastVoiceRef.current;
          if (gap > PAUSE_MS) {
            pauseCountRef.current += 1;
            longestPauseRef.current = Math.max(longestPauseRef.current, gap / 1000);
          }
          lastVoiceRef.current = now;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* analyser optional */
    }

    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    recorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = finishWhisper;
    mr.start();
    setPhase("rec");
  };

  const finishWhisper = async () => {
    cancelAnimationFrame(rafRef.current);
    const durationSec = (performance.now() - recStartRef.current) / 1000;
    cleanupWhisper();
    const type = chunksRef.current[0]?.type || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    if (!blob.size) { setPhase("idle"); return; }
    setPhase("transcribing");
    setStatus("");
    try {
      const pcm = await blobToPcm16k(blob);
      const text = await transcribePcm(pcm, (p) => {
        if (p?.status === "progress" && typeof p.progress === "number") {
          setStatus(`Loading voice model… ${Math.round(p.progress)}%`);
        } else {
          setStatus("Transcribing…");
        }
      });
      const clean = (text || "").trim();
      if (clean) {
        onTranscript(clean);
        const words = clean.split(/\s+/).filter(Boolean).length;
        onDelivery?.({
          durationSec: Math.round(durationSec),
          wordCount: words,
          wpm: durationSec > 0 ? Math.round(words / (durationSec / 60)) : 0,
          pauseCount: pauseCountRef.current,
          longestPauseSec: Math.round(longestPauseRef.current),
        });
      }
    } catch {
      setEngine("webspeech"); // on-device failed; use Web Speech next time
    } finally {
      setPhase("idle");
      setStatus("");
    }
  };

  const stopWhisper = () => {
    try { recorderRef.current?.stop(); } catch { /* triggers finishWhisper */ }
  };

  /* ---------------- Web Speech (fallback) ---------------- */

  const emitWsDelivery = () => {
    if (wsEmittedRef.current || !onDelivery) return;
    if (wsStartRef.current === 0 || wordsRef.current === 0) return;
    wsEmittedRef.current = true;
    const durationSec = (performance.now() - wsStartRef.current) / 1000;
    onDelivery({
      durationSec: Math.round(durationSec),
      wordCount: wordsRef.current,
      wpm: durationSec > 0 ? Math.round(wordsRef.current / (durationSec / 60)) : 0,
      pauseCount: pauseCountRef.current,
      longestPauseSec: Math.round(longestPauseRef.current),
    });
  };

  const startWebSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setWebSpeechAvailable(false); return; }
    const recog = new SR();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    wsStartRef.current = performance.now();
    wsLastRef.current = 0;
    wordsRef.current = 0;
    pauseCountRef.current = 0;
    longestPauseRef.current = 0;
    wsEmittedRef.current = false;
    recog.onresult = (event: any) => {
      const now = performance.now();
      if (wsLastRef.current !== 0) {
        const gap = now - wsLastRef.current;
        if (gap > PAUSE_MS) {
          pauseCountRef.current += 1;
          longestPauseRef.current = Math.max(longestPauseRef.current, gap / 1000);
        }
      }
      wsLastRef.current = now;
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (final.trim()) {
        wordsRef.current += final.trim().split(/\s+/).filter(Boolean).length;
        onTranscript(final.trim());
      }
      if (interim && onInterim) onInterim(interim);
    };
    recog.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setMicBlocked(true);
      emitWsDelivery();
      setPhase("idle");
    };
    recog.onend = () => { emitWsDelivery(); setPhase("idle"); };
    recogRef.current = recog;
    try { recog.start(); setPhase("rec"); } catch { setPhase("idle"); }
  };

  const stopWebSpeech = () => {
    try { recogRef.current?.stop(); } catch { /* noop */ }
    emitWsDelivery();
    setPhase("idle");
  };

  /* ---------------- shared ---------------- */

  // Warm the model when the user shows intent (hover/focus), so the first
  // transcription isn't a cold download. Runs once, only for the Whisper engine.
  const preloadedRef = useRef(false);
  const warm = () => {
    if (preloadedRef.current || engine !== "whisper") return;
    preloadedRef.current = true;
    preloadWhisper().catch(() => {});
  };

  const onClick = () => {
    if (phase === "transcribing") return;
    if (phase === "rec") {
      engine === "whisper" ? stopWhisper() : stopWebSpeech();
      return;
    }
    engine === "whisper" ? startWhisper() : startWebSpeech();
  };

  if (micBlocked) {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 text-xs", tone === "dark" ? "text-white/60" : "text-coral-ink", className)}
        title="Allow microphone access in your browser's address bar, then try again."
      >
        <MicOff size={15} /> {compact ? "Mic blocked" : "Microphone blocked. Enable it and try again."}
      </span>
    );
  }

  if (engine === "webspeech" && !webSpeechAvailable) {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 text-xs", tone === "dark" ? "text-white/45" : "text-ink-3", className)}
        title="Voice input works in Chrome, Edge, or Safari"
      >
        <MicOff size={15} /> {compact ? "" : "Voice unavailable here"}
      </span>
    );
  }

  const idle =
    tone === "dark"
      ? "border-white/20 text-white/80 hover:border-white/60 hover:text-white"
      : "border-line text-ink-2 hover:border-primary hover:text-primary-ink";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={warm}
      onFocus={warm}
      aria-pressed={phase === "rec"}
      aria-label={phase === "rec" ? "Stop recording" : "Speak your answer"}
      disabled={phase === "transcribing"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-80",
        phase === "rec" ? "border-transparent bg-coral text-white shadow-sm" : idle,
        className
      )}
    >
      {phase === "transcribing" ? (
        <>
          <Loader2 size={15} className="animate-spin" /> {compact ? "…" : status || "Transcribing…"}
        </>
      ) : phase === "rec" ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          {compact ? "Stop" : "Listening… tap to stop"}
        </>
      ) : (
        <>
          <Mic size={16} /> {compact ? "Speak" : "Speak your answer"}
        </>
      )}
    </button>
  );
}
