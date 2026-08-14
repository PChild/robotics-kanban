"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { useAuth } from "@/context/auth-context";
import { useTasks, useUsers, useCertifications } from "@/lib/hooks";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { SUBTEAMS, type Subteam } from "@/types";

export default function AllBoardsPage() {
  const { profile, isCoach } = useAuth();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const { certifications } = useCertifications();
  const [filter, setFilter] = useState<Subteam | "all">("all");

  const editableSubteams = useMemo(() => {
    if (isCoach) return SUBTEAMS;
    if (profile?.role === "student_leader" && profile.subteam) return [profile.subteam];
    return [];
  }, [isCoach, profile]);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">All-team board</h1>
        <p className="text-sm text-steel">See how tasks are distributed across every subteam.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All subteams" />
        {SUBTEAMS.map((s) => (
          <FilterChip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={SUBTEAM_META[s].label}
            color={SUBTEAM_META[s].color}
          />
        ))}
      </div>

      <KanbanBoard
        tasks={tasks}
        certifications={certifications}
        users={users}
        subteam={filter === "all" ? undefined : filter}
        createDefaultSubteam={filter === "all" ? editableSubteams[0] ?? "mechanical" : filter}
        editableSubteams={editableSubteams}
      />
    </AppShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`tracked-label text-[10px] px-2.5 py-1.5 rounded-sm border flex items-center gap-1.5 ${
        active ? "bg-ink text-white border-ink" : "bg-white text-steel border-steel-line"
      }`}
    >
      {color && (
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
      )}
      {label}
    </button>
  );
}
