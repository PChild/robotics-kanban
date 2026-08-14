"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function NavBar() {
  const { profile, isCoach, signOut } = useAuth();
  const pathname = usePathname();

  if (!profile) return null;

  const links = [
    { href: "/board", label: "All boards" },
    ...(profile.subteam
      ? [{ href: `/board/${profile.subteam}`, label: "My subteam" }]
      : []),
    { href: "/my-tasks", label: "My tasks" },
    { href: "/certifications", label: "Certifications" },
    { href: "/metrics", label: "Metrics" },
    ...(isCoach ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-steel-line bg-paper-raised">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="tracked-label text-sm font-bold text-blueprint-deep whitespace-nowrap">
          Team board
        </span>
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`tracked-label text-xs px-3 py-2 rounded whitespace-nowrap ${
                  active
                    ? "bg-blueprint text-white"
                    : "text-steel hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm text-steel">
            {profile.displayName}
            <span className="tracked-label text-[10px] ml-2 text-blueprint">
              {profile.role.replace("_", " ")}
            </span>
          </span>
          <button onClick={() => signOut()} className="btn-secondary text-xs px-2 py-1">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
