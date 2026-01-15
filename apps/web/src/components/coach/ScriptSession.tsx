"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

import {
  getScriptVoiceAgentConfig,
  getScript,
  Script,
  ScriptLine,
  Difficulty,
} from "@/lib/script-api";
import { DeepgramVoiceAgentClient } from "@/lib/deepgram-voice-agent";

interface ScriptSessionProps {
  scriptId: string;
  level: Difficulty;
  onSessionEnd?: (data: SessionData) => void;
}

interface SessionData {
  duration: number;
  messagesExchanged: number;
  linesCompleted: number;
}

interface Transcript {
  speaker: "user" | "coach";
  text: string;
  timestamp: Date;
}

export function ScriptSession({
  scriptId,
  level,
  onSessionEnd,
}: ScriptSessionProps) {
  const [script, setScript] = useState<Script | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingToStart, setIsWaitingToStart] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const scriptLineRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<DeepgramVoiceAgentClient | null>(null);

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToCurrentLine = useCallback(() => {
    scriptLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcripts, scrollToBottom]);

  // Load script data on mount (doesn't require user gesture)
  useEffect(() => {
    getScript(scriptId).then(setScript).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load script");
    });
  }, [scriptId]);

  const initializeSession = useCallback(async () => {
    if (!script) return;

    try {
      setIsWaitingToStart(false);
      setIsConnecting(true);
      setError(null);

      // Get voice agent configuration from backend
      const config = await getScriptVoiceAgentConfig({
        mode: "script",
        level,
        script_id: scriptId,
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

            // Advance line index when speech is detected
            setCurrentLineIndex((prev) => {
              const nextIndex = Math.min(prev + 1, (script?.lines.length || 1) - 1);
              return nextIndex;
            });
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
  }, [script, level, scriptId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scrollToCurrentLine();
  }, [currentLineIndex, scrollToCurrentLine]);

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
      linesCompleted: currentLineIndex + 1,
    });
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    window.location.href = "/coach/script?level=" + level;
  }, [sessionStartTime, transcripts.length, currentLineIndex, onSessionEnd, level]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
        <p className="mb-4 text-red-500">Error: {error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsWaitingToStart(true);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading script
  if (!script) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-white">Loading script...</p>
        </div>
      </div>
    );
  }

  // Waiting for user to click Start (required for AudioContext)
  if (isWaitingToStart) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">{script.title}</h1>
          <p className="text-slate-400 mb-6">{script.title_ja}</p>
          <p className="text-slate-300 mb-8">
            Practice this conversation with your AI coach.
            Click the button below to start - you&apos;ll need to allow microphone access.
          </p>
          <button
            onClick={initializeSession}
            className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            🎤 Start Practice
          </button>
          <p className="text-slate-500 text-sm mt-4">
            Level: {level.charAt(0).toUpperCase() + level.slice(1)}
          </p>
        </div>
      </div>
    );
  }

  // Connecting to Deepgram
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

  const progress = Math.round(((currentLineIndex + 1) / script.lines.length) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={"/coach/script?level=" + level}
              className="text-slate-400 hover:text-white"
            >
              &larr;
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {script.title}
              </h1>
              <p className="text-sm text-slate-400">{script.title_ja}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-600/20 px-3 py-1 text-sm text-blue-400">
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
            <button
              onClick={endSession}
              className="rounded-full bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              End Session
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full p-4">
          <div className="grid h-[calc(100vh-200px)] gap-4 md:grid-cols-2">
            {/* Script Panel */}
            <div className="rounded-lg bg-slate-800/50 p-4 overflow-hidden flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Script</h2>
                <span className="text-xs text-slate-400">
                  {currentLineIndex + 1} / {script.lines.length} lines
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {script.lines.map((line, idx) => {
                  const isCurrentLine = idx === currentLineIndex;
                  const isPastLine = idx < currentLineIndex;
                  const isUserLine = line.speaker === "user";

                  return (
                    <div
                      key={line.id}
                      ref={isCurrentLine ? scriptLineRef : undefined}
                      className={
                        "rounded-lg p-3 transition-all " +
                        (isCurrentLine
                          ? "bg-blue-600/30 ring-2 ring-blue-500"
                          : isPastLine
                          ? "bg-slate-700/30 opacity-60"
                          : "bg-slate-700/50")
                      }
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={
                            "text-xs font-medium px-2 py-0.5 rounded " +
                            (isUserLine
                              ? "bg-green-600/30 text-green-400"
                              : "bg-purple-600/30 text-purple-400")
                          }
                        >
                          {isUserLine ? "You" : "Partner"}
                        </span>
                        {isPastLine && (
                          <span className="text-xs text-green-400">✓</span>
                        )}
                      </div>
                      <p className={"mt-2 " + (isUserLine ? "text-white font-medium" : "text-slate-300")}>
                        {line.text}
                      </p>
                      {line.notes && (
                        <p className="mt-1 text-xs text-slate-400 italic">
                          Hint: {line.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transcript Panel */}
            <div className="rounded-lg bg-slate-800/50 p-4 overflow-hidden flex flex-col">
              <h2 className="mb-3 text-sm font-semibold text-slate-300">
                Live Transcript
              </h2>
              <div className="flex-1 overflow-y-auto">
                {transcripts.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <div className="text-center">
                      <p className="mb-2">Your coach is ready!</p>
                      <p className="text-sm">
                        Listen to the partner and speak your lines.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map((transcript, idx) => (
                      <div
                        key={idx}
                        className={
                          "flex " +
                          (transcript.speaker === "user"
                            ? "justify-end"
                            : "justify-start")
                        }
                      >
                        <div
                          className={
                            "max-w-[85%] rounded-lg px-3 py-2 " +
                            (transcript.speaker === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-700 text-slate-100")
                          }
                        >
                          <p className="text-sm">{transcript.text}</p>
                          <p className="mt-1 text-xs opacity-60">
                            {transcript.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isAgentThinking && (
                      <div className="flex justify-start">
                        <div className="rounded-lg bg-slate-700 px-3 py-2 text-slate-400">
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
                            <span className="text-xs">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="border-t border-slate-700 bg-slate-800/50 px-4 py-3">
        <div className="container mx-auto">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs text-slate-400">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: progress + "%" }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className={
                "rounded-full p-3 transition-colors " +
                (isMuted
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-slate-700 text-white hover:bg-slate-600")
              }
            >
              {isMuted ? (
                <svg
                  className="h-5 w-5"
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
                  className="h-5 w-5"
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
            <span className="text-sm text-slate-400">
              {isMuted ? "Muted" : "Listening..."}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
