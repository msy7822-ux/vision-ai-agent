"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

import { getVoiceAgentConfig } from "@/lib/coach-api";
import { DeepgramVoiceAgentClient } from "@/lib/deepgram-voice-agent";

type Level = "beginner" | "intermediate" | "advanced";
type Mode = "freetalk" | "pronunciation" | "situation";

interface CoachSessionProps {
  mode: Mode;
  level: Level;
  scenario?: string;
  scenarioTitle?: string;
  scenarioTitleJa?: string;
  scenarioIcon?: string;
  onSessionEnd?: (data: SessionData) => void;
}

interface SessionData {
  duration: number;
  messagesExchanged: number;
}

interface Transcript {
  speaker: "user" | "coach";
  text: string;
  timestamp: Date;
}

export function CoachSession({
  mode,
  level,
  scenario,
  scenarioTitle,
  scenarioTitleJa,
  scenarioIcon,
  onSessionEnd,
}: CoachSessionProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<DeepgramVoiceAgentClient | null>(null);
  const isInitializedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcripts, scrollToBottom]);

  const initializeSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get voice agent configuration from backend (includes API key)
      const config = await getVoiceAgentConfig({
        mode,
        level,
        scenario,
      });

      if (!config.api_key) {
        throw new Error("Deepgram API key not configured on server");
      }

      // Create Deepgram Voice Agent client
      const client = new DeepgramVoiceAgentClient(
        {
          apiKey: config.api_key,
          prompt: config.prompt,
          greeting: config.greeting,
          voice: config.voice,
          listenModel: config.listen_model,
          thinkProvider: config.think_provider,
          thinkModel: config.think_model,
        },
        {
          onTranscript: (role, text) => {
            setTranscripts((prev) => [
              ...prev,
              {
                speaker: role === "user" ? "user" : "coach",
                text,
                timestamp: new Date(),
              },
            ]);
            setIsAgentThinking(false);
          },
          onUserStartedSpeaking: () => {
            setIsAgentThinking(false);
          },
          onAgentThinking: () => {
            setIsAgentThinking(true);
          },
          onAgentStartedSpeaking: () => {
            setIsAgentThinking(false);
          },
          onError: (err) => {
            console.error("Voice agent error:", err);
            setError(err.message);
          },
          onConnected: () => {
            console.log("Connected to Deepgram Voice Agent");
            setIsConnecting(false);
          },
          onDisconnected: () => {
            console.log("Disconnected from Deepgram Voice Agent");
          },
        }
      );

      clientRef.current = client;
      await client.connect();
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  }, [mode, level, scenario]);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    initializeSession();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    const newMuted = !isMuted;
    clientRef.current.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const endSession = useCallback(() => {
    const duration = Math.round(
      (new Date().getTime() - sessionStartTime.getTime()) / 1000
    );
    onSessionEnd?.({
      duration,
      messagesExchanged: transcripts.length,
    });
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    // Navigate back
    window.location.href = `/coach/situation?level=${level}`;
  }, [sessionStartTime, transcripts.length, onSessionEnd, level]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
        <p className="mb-4 text-red-500">Error: {error}</p>
        <button
          onClick={() => {
            isInitializedRef.current = false;
            initializeSession();
          }}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-white">Connecting to your coach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/coach/situation?level=${level}`}
              className="text-slate-400 hover:text-white"
            >
              &larr;
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{scenarioIcon}</span>
                <h1 className="text-lg font-semibold text-white">
                  {scenarioTitle}
                </h1>
              </div>
              <p className="text-sm text-slate-400">{scenarioTitleJa}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-600/20 px-3 py-1 text-sm text-blue-400">
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full max-w-3xl p-4">
          {/* Transcript Area */}
          <div className="h-[calc(100vh-180px)] overflow-y-auto rounded-lg bg-slate-800/50 p-4">
            {transcripts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="text-center">
                  <p className="mb-2">Your coach is ready!</p>
                  <p className="text-sm">
                    Start speaking to begin the conversation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {transcripts.map((transcript, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      transcript.speaker === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        transcript.speaker === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-100"
                      }`}
                    >
                      <p>{transcript.text}</p>
                      <p className="mt-1 text-xs opacity-60">
                        {transcript.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isAgentThinking && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-slate-700 px-4 py-2 text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="border-t border-slate-700 bg-slate-800/50 px-4 py-4">
        <div className="container mx-auto flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={`rounded-full p-4 transition-colors ${
              isMuted
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            {isMuted ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={endSession}
            className="rounded-full bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700"
          >
            End Session
          </button>
        </div>
      </footer>
    </div>
  );
}
