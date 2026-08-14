"use client";

import { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { NavBar } from "@/components/nav-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <NavBar />
      <main className="flex-1 grid-paper">
        <div className="max-w-[1800px] mx-auto px-6 py-6">{children}</div>
      </main>
    </RequireAuth>
  );
}