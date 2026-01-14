"use client";

import { ReactNode } from "react";

interface CoachLayoutProps {
  children: ReactNode;
}

export default function CoachLayout({ children }: CoachLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {children}
    </div>
  );
}
