"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/context/auth-context";
import { useTasks, useUsers } from "@/lib/hooks";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { downloadCsv } from "@/lib/csv";
import { SUBTEAMS, type Subteam, type Task, type TaskStatus } from "@/types";

interface TaskRecord {
  taskId: string;
  title: string;
  subteam: Subteam;
  status: TaskStatus;
  assignedAt: string | null;
  completedAt: string | null;
}

function buildPerUserRecords(tasks: Task[]): Record<string, TaskRecord[]> {
  const map: Record<string, TaskRecord[]> = {};
  for (const task of tasks) {
    const historyUids = new Set(task.history.map((h) => h.uid));
    const relevantUids = new Set([...task.assigneeUids, ...historyUids]);
    for (const uid of relevantUids) {
      const assigned = task.history.find((h) => h.uid === uid && h.type === "assigned");
      const completed = task.history.find((h) => h.uid === uid && h.type === "completed");
      if (!map[uid]) map[uid] = [];
      map[uid].push({
        taskId: task.id,
        title: task.title,
        subteam: task.subteam,
        status: task.status,
        assignedAt: assigned ? assigned.at : null,
        completedAt: completed ? completed.at : null,
      });
    }
  }
  return map;
}

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsPage() {
  const { profile, isCoach, isStudentLeader } = useAuth();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const [subteamFilter, setSubteamFilter] = useState<Subteam | "all">(
    isCoach ? "all" : (profile && profile.subteam ? profile.subteam : "all")
  );
  const [query, setQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const canView = isCoach || isStudentLeader;

  const records = useMemo(() => buildPerUserRecords(tasks), [tasks]);

  const roster = useMemo(() => {
    return users
      .filter((u) => u.role !== "coach")
      .filter((u) => (isCoach ? true : u.subteam === (profile ? profile.subteam : null)))
      .filter((u) => subteamFilter === "all" || u.subteam === subteamFilter)
      .filter((u) => u.displayName.toLowerCase().includes(query.toLowerCase()))
      .map((u) => {
        const recs = records[u.uid] || [];
        return {
          user: u,
          completed: recs.filter((r) => r.status === "done").length,
          active: recs.filter((r) => r.status !== "done").length,
          total: recs.length,
        };
      })
      .sort((a, b) => b.completed - a.completed);
  }, [users, records, isCoach, profile, subteamFilter, query]);

  const selectedUser = roster.find((r) => r.user.uid === selectedUid);
  const selectedRecords = selectedUid ? records[selectedUid] || [] : [];

  function exportSummaryCsv() {
    const rows: (string | number)[][] = [["Name", "Subteam", "Completed", "Active", "Total"]];
    for (const r of roster) {
      rows.push([
        r.user.displayName,
        r.user.subteam ? SUBTEAM_META[r.user.subteam].label : "-",
        r.completed,
        r.active,
        r.total,
      ]);
    }
    downloadCsv("task-summary-" + new Date().toISOString().slice(0, 10) + ".csv", rows);
  }

  function exportDetailCsv() {
    const rows: (string | number)[][] = [
      ["Name", "Subteam", "Task", "Task subteam", "Status", "Assigned", "Completed"],
    ];
    for (const r of roster) {
      const recs = records[r.user.uid] || [];
      for (const rec of recs) {
        rows.push([
          r.user.displayName,
          r.user.subteam ? SUBTEAM_META[r.user.subteam].label : "-",
          rec.title,
          SUBTEAM_META[rec.subteam].label,
          rec.status,
          fmt(rec.assignedAt),
          fmt(rec.completedAt),
        ]);
      }
    }
    downloadCsv("task-detail-" + new Date().toISOString().slice(0, 10) + ".csv", rows);
  }

  if (!canView) {
    return (
      <AppShell>
        <p className="text-sm text-steel">Reports are visible to coaches and student leaders.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Reports</h1>
          <p className="text-sm text-steel">
            Who has done what, and when. Click a name for the full task history.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportSummaryCsv} className="btn-secondary text-xs">
            Export summary CSV
          </button>
          <button onClick={exportDetailCsv} className="btn-secondary text-xs">
            Export full detail CSV
          </button>
        </div>
      </div>

      {isCoach && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <FilterChip active={subteamFilter === "all"} onClick={() => setSubteamFilter("all")} label="All subteams" />
          {SUBTEAMS.map((s) => (
            <FilterChip
              key={s}
              active={subteamFilter === s}
              onClick={() => setSubteamFilter(s)}
              label={SUBTEAM_META[s].label}
            />
          ))}
        </div>
      )}

      <input
        className="input mb-4 max-w-xs"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="bg-paper-raised border border-steel-line rounded overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-paper border-b border-steel-line">
            <tr className="text-left tracked-label text-[10px] text-steel">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Subteam</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => (
              <tr
                key={r.user.uid}
                onClick={() => setSelectedUid(r.user.uid)}
                className={
                  "border-b border-steel-line last:border-0 cursor-pointer hover:bg-paper " +
                  (selectedUid === r.user.uid ? "bg-blueprint/10" : "")
                }
              >
                <td className="px-3 py-2 font-medium">{r.user.displayName}</td>
                <td className="px-3 py-2 text-steel">
                  {r.user.subteam ? SUBTEAM_META[r.user.subteam].label : "-"}
                </td>
                <td className="px-3 py-2">{r.completed}</td>
                <td className="px-3 py-2 text-steel">{r.active}</td>
                <td className="px-3 py-2 text-steel">{r.total}</td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-steel text-sm">
                  No students match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="bg-paper-raised border border-steel-line rounded p-4">
          <h2 className="tracked-label text-xs font-bold mb-3">
            {selectedUser.user.displayName}&apos;s task history
          </h2>
          {selectedRecords.length === 0 ? (
            <p className="text-sm text-steel">No task history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left tracked-label text-[10px] text-steel border-b border-steel-line">
                  <th className="py-1.5 pr-3">Task</th>
                  <th className="py-1.5 pr-3">Subteam</th>
                  <th className="py-1.5 pr-3">Status</th>
                  <th className="py-1.5 pr-3">Assigned</th>
                  <th className="py-1.5 pr-3">Completed</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecords.map((rec) => (
                  <tr key={rec.taskId} className="border-b border-steel-line last:border-0">
                    <td className="py-1.5 pr-3">{rec.title}</td>
                    <td className="py-1.5 pr-3 text-steel">{SUBTEAM_META[rec.subteam].label}</td>
                    <td className="py-1.5 pr-3 text-steel capitalize">{rec.status.replace("_", " ")}</td>
                    <td className="py-1.5 pr-3 text-steel">{fmt(rec.assignedAt)}</td>
                    <td className="py-1.5 pr-3 text-steel">{fmt(rec.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AppShell>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "tracked-label text-[10px] px-2.5 py-1.5 rounded-sm border " +
        (active ? "bg-blueprint text-white border-blueprint" : "bg-surface text-steel border-steel-line")
      }
    >
      {label}
    </button>
  );
}