"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const scenarios = [
  {
    id: "restaurant",
    title: "Restaurant",
    titleJa: "レストラン注文",
    description: "Order food, ask about menu items, and request the check",
    icon: "🍽️",
    difficulty: "Easy",
  },
  {
    id: "directions",
    title: "Asking Directions",
    titleJa: "道案内",
    description: "Ask for and give directions to places around town",
    icon: "🗺️",
    difficulty: "Medium",
  },
  {
    id: "hotel",
    title: "Hotel Check-in",
    titleJa: "ホテルチェックイン",
    description: "Check in, ask about amenities, and handle requests",
    icon: "🏨",
    difficulty: "Easy",
  },
  {
    id: "shopping",
    title: "Shopping",
    titleJa: "ショッピング",
    description: "Find items, ask about sizes/prices, and make purchases",
    icon: "🛍️",
    difficulty: "Medium",
  },
];

function SituationContent() {
  const searchParams = useSearchParams();
  const level = searchParams.get("level") || "beginner";

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/coach"
          className="text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Mode Selection
        </Link>
      </div>

      <div className="mb-12 text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">
          Situation Practice
        </h1>
        <p className="text-slate-300">
          Choose a real-world scenario to practice
        </p>
        <div className="mt-2 inline-block rounded-full bg-blue-600/20 px-4 py-1 text-sm text-blue-400">
          Level: {level.charAt(0).toUpperCase() + level.slice(1)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <Link
            key={scenario.id}
            href={`/coach/situation/${scenario.id}?level=${level}`}
            className="group relative overflow-hidden rounded-2xl bg-slate-800 p-6 transition-all hover:bg-slate-700 hover:shadow-xl hover:shadow-blue-900/20"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">{scenario.icon}</div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-white">
                    {scenario.title}
                  </h3>
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    scenario.difficulty === "Easy"
                      ? "bg-green-600/20 text-green-400"
                      : "bg-yellow-600/20 text-yellow-400"
                  }`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="mb-2 text-sm text-slate-400">{scenario.titleJa}</p>
                <p className="text-sm text-slate-300">{scenario.description}</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-0 bg-blue-500 transition-all group-hover:w-full" />
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function SituationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SituationContent />
    </Suspense>
  );
}
