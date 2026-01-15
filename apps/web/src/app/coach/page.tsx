"use client";

import Link from "next/link";
import { useState } from "react";

type Level = "beginner" | "intermediate" | "advanced";

const levels: { value: Level; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Simple vocabulary, slow pace" },
  { value: "intermediate", label: "Intermediate", description: "Natural pace, some idioms" },
  { value: "advanced", label: "Advanced", description: "Native speed, complex expressions" },
];

const modes = [
  {
    href: "/coach/situation",
    title: "Situation Practice",
    titleJa: "シチュエーション練習",
    description: "Practice real-world scenarios like ordering at a restaurant or asking for directions",
    icon: "🎭",
  },
  {
    href: "/coach/script",
    title: "Script Practice",
    titleJa: "スクリプト練習",
    description: "Practice conversations with guided scripts - you follow along and speak your lines",
    icon: "📝",
  },
  {
    href: "/coach/freetalk",
    title: "Free Talk",
    titleJa: "フリートーク",
    description: "Have a natural conversation using 3 target words",
    icon: "💬",
    disabled: true,
  },
  {
    href: "/coach/pronunciation",
    title: "Pronunciation",
    titleJa: "発音トレーニング",
    description: "Practice pronunciation with instant feedback",
    icon: "🎤",
    disabled: true,
  },
];

export default function CoachPage() {
  const [selectedLevel, setSelectedLevel] = useState<Level>("beginner");

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">
          English Conversation Coach
        </h1>
        <p className="text-lg text-slate-300">
          Practice English with AI-powered conversation coaching
        </p>
      </div>

      {/* Level Selection */}
      <div className="mb-12">
        <h2 className="mb-4 text-center text-xl font-semibold text-white">
          Select Your Level
        </h2>
        <div className="flex justify-center gap-4">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelectedLevel(level.value)}
              className={
                "rounded-lg px-6 py-3 transition-all " +
                (selectedLevel === level.value
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600")
              }
            >
              <div className="font-medium">{level.label}</div>
              <div className="text-xs opacity-75">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selection */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {modes.map((mode) => (
          <Link
            key={mode.href}
            href={mode.disabled ? "#" : mode.href + "?level=" + selectedLevel}
            className={
              "group relative overflow-hidden rounded-2xl bg-slate-800 p-6 transition-all " +
              (mode.disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-slate-700 hover:shadow-xl hover:shadow-blue-900/20")
            }
            onClick={(e) => mode.disabled && e.preventDefault()}
          >
            {mode.disabled && (
              <div className="absolute right-2 top-2 rounded bg-slate-600 px-2 py-1 text-xs text-slate-300">
                Coming Soon
              </div>
            )}
            <div className="mb-4 text-4xl">{mode.icon}</div>
            <h3 className="mb-1 text-xl font-semibold text-white">
              {mode.title}
            </h3>
            <p className="mb-2 text-sm text-slate-400">{mode.titleJa}</p>
            <p className="text-sm text-slate-300">{mode.description}</p>
          </Link>
        ))}
      </div>

      {/* Back to Home */}
      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
