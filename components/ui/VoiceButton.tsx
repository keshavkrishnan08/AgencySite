"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryMetrics } from "@/lib/types";

/* Browser-native speech-to-text. Axon Careers listens; it doesn't speak back.
   It also measures delivery: how long you spoke, your pace, and your pauses,
   so it can coach the speaking, not just the words. */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

function getRecognizer(): any | null {
  if (typeof window === "undefined") return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

const PAUSE_MS = 2500; // a gap longer than this counts as a long pause

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
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  // delivery tracking
  const startRef = useRef(0);
  const lastTickRef = useRef(0);
  const wordsRef = useRef(0);
  const pauseCountRef = useRef(0);
  const longestPauseRef = useRef(0);
  const emittedRef = useRef(false);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const emitDelivery = () => {
    if (emittedRef.current || !onDelivery) return;
    if (startRef.current === 0 || wordsRef.current === 0) return;
    emittedRef.current = true;
    const durationSec = (performance.now() - startRef.current) / 1000;
    const wpm = durationSec > 0 ? Math.round(wordsRef.current / (durationSec / 60)) : 0;
    onDelivery({
      durationSec: Math.round(durationSec),
      wordCount: wordsRef.current,
      wpm,
      pauseCount: pauseCountRef.current,
      longestPauseSec: Math.round(longestPauseRef.current),
    });
  };

  const start = () => {
    const recog = getRecognizer();
    if (!recog) {
      setSupported(false);
      return;
    }
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;

    // reset delivery counters
    startRef.current = performance.now();
    lastTickRef.current = 0;
    wordsRef.current = 0;
    pauseCountRef.current = 0;
    longestPauseRef.current = 0;
    emittedRef.current = false;

    recog.onresult = (event: any) => {
      const now = performance.now();
      if (lastTickRef.current !== 0) {
        const gap = now - lastTickRef.current;
        if (gap > PAUSE_MS) {
          pauseCountRef.current += 1;
          longestPauseRef.current = Math.max(longestPauseRef.current, gap / 1000);
        }
      }
      lastTickRef.current = now;

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
    recog.onerror = () => {
      emitDelivery();
      setListening(false);
    };
    recog.onend = () => {
      emitDelivery();
      setListening(false);
    };

    recogRef.current = recog;
    try {
      recog.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try {
      recogRef.current?.stop();
    } catch {
      /* noop */
    }
    emitDelivery();
    setListening(false);
  };

  if (!supported) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs",
          tone === "dark" ? "text-white/45" : "text-ink-3",
          className
        )}
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
      onClick={listening ? stop : start}
      aria-pressed={listening}
      aria-label={listening ? "Stop recording" : "Speak your answer"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
        listening ? "border-transparent bg-coral text-white shadow-sm" : idle,
        className
      )}
    >
      {listening ? (
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
