"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/* Browser-native speech-to-text. PrepPath listens; it doesn't speak back.
   Uses the Web Speech API (Chrome / Edge / Safari) — no API key needed.
   onTranscript receives each finalized chunk; the parent appends it. */

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

export function VoiceButton({
  onTranscript,
  onInterim,
  className,
  compact = false,
  tone = "light",
}: {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

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

  const start = () => {
    const recog = getRecognizer();
    if (!recog) {
      setSupported(false);
      return;
    }
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (final.trim()) onTranscript(final.trim());
      if (interim && onInterim) onInterim(interim);
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);

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
