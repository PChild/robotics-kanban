"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { AppShell } from "@/components/app-shell";
import { TaskDialog } from "@/components/task-dialog";
import { useAuth } from "@/context/auth-context";
import { useCertifications, useTasks, useUsers } from "@/lib/hooks";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { SUBTEAMS, type Priority, type Task, type TaskStatus } from "@/types";

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  blocked: "Stuck",
  review: "Review",
  done: "Done",
};

export default function CalendarPage() {
  const { profile, isCoach, canManageSubteam } = useAuth();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const { certifications } = useCertifications();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const dueTasks = useMemo(
    () => tasks
      .filter((task) => task.status !== "done" && task.dueDate)
      .sort((a, b) => {
        const dateDifference = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        return dateDifference || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }),
    [tasks]
  );

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of dueTasks) {
      const key = task.dueDate?.slice(0, 10);
      if (!key) continue;
      grouped.set(key, [...(grouped.get(key) ?? []), task]);
    }
    return grouped;
  }, [dueTasks]);

  const calendarDays = useMemo(() => {
    const first = startOfWeek(startOfMonth(visibleMonth));
    const last = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start: first, end: last });
  }, [visibleMonth]);

  const monthTasks = dueTasks.filter((task) => task.dueDate?.startsWith(format(visibleMonth, "yyyy-MM")));
  const editableSubteams = isCoach
    ? SUBTEAMS
    : profile?.role === "student_leader" && profile.subteam
      ? [profile.subteam]
      : [];

  function openToday() {
    setVisibleMonth(startOfMonth(new Date()));
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Task calendar</h1>
          <p className="text-sm text-steel">
            {dueTasks.length} open task{dueTasks.length === 1 ? "" : "s"} with due dates. Select one to view or edit it.
          </p>
        </div>
        <button type="button" onClick={openToday} className="btn-secondary text-xs">Today</button>
      </div>

      <div className="bg-paper-raised border border-steel-line rounded overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-3 border-b border-steel-line">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
            className="btn-secondary text-xs px-3"
            aria-label="Previous month"
          >
            ←
          </button>
          <h2 className="font-semibold text-sm sm:text-base">{format(visibleMonth, "MMMM yyyy")}</h2>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            className="btn-secondary text-xs px-3"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="hidden sm:grid grid-cols-7 border-b border-steel-line bg-paper">
          {eachDayOfInterval({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }).map((day) => (
            <div key={day.getDay()} className="tracked-label text-[10px] text-steel text-center px-2 py-2">
              {format(day, "EEE")}
            </div>
          ))}
        </div>

        <div className="hidden sm:grid grid-cols-7">
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(key) ?? [];
            const today = isSameDay(day, new Date());
            return (
              <div
                key={key}
                className={`min-h-32 border-r border-b border-steel-line p-1.5 last:border-r-0 ${
                  isSameMonth(day, visibleMonth) ? "bg-paper-raised" : "bg-paper/60"
                }`}
              >
                <div className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? "bg-blueprint text-white font-semibold" : isSameMonth(day, visibleMonth) ? "text-ink" : "text-steel/60"
                }`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <CalendarTask key={task.id} task={task} onClick={() => setOpenTask(task)} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sm:hidden p-3 space-y-4">
          {monthTasks.length === 0 ? (
            <p className="text-sm text-steel text-center py-8">No open tasks are due this month.</p>
          ) : (
            Array.from(new Set(monthTasks.map((task) => task.dueDate?.slice(0, 10) ?? ""))).map((key) => {
              const day = dateFromKey(key);
              return (
                <section key={key}>
                  <h3 className={`tracked-label text-[10px] mb-1.5 ${isSameDay(day, new Date()) ? "text-blueprint" : "text-steel"}`}>
                    {format(day, "EEEE, MMMM d")}{isSameDay(day, new Date()) ? " · Today" : ""}
                  </h3>
                  <div className="space-y-2">
                    {(tasksByDate.get(key) ?? []).map((task) => (
                      <CalendarTask key={task.id} task={task} onClick={() => setOpenTask(task)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      {openTask && (
        <TaskDialog
          mode="edit"
          task={openTask}
          tasks={tasks}
          defaultSubteam={openTask.subteam}
          editableSubteams={canManageSubteam(openTask.subteam) ? editableSubteams : [openTask.subteam]}
          certifications={certifications}
          users={users}
          onClose={() => setOpenTask(null)}
        />
      )}
    </AppShell>
  );
}

function CalendarTask({ task, onClick, compact = false }: { task: Task; onClick: () => void; compact?: boolean }) {
  const meta = SUBTEAM_META[task.subteam];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-sm text-white border border-black/10 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blueprint ${compact ? "px-1.5 py-1" : "px-3 py-2"}`}
      style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 86%, var(--paper-raised))` }}
      title={`${task.title} · ${meta.label}`}
    >
      <span className={`${compact ? "text-[10px] line-clamp-2" : "text-sm"} block font-medium leading-snug`}>{task.title}</span>
      <span className={`flex items-center justify-between gap-1 text-white/80 ${compact ? "mt-1 text-[8px]" : "mt-1.5 text-[9px]"}`}>
        <span className="tracked-label truncate">{STATUS_LABEL[task.status]}</span>
        <span className={`tracked-label shrink-0 rounded-sm px-1 py-0.5 ${
          task.priority === "high"
            ? "bg-danger text-white"
            : task.priority === "medium"
              ? "bg-hazard text-ink"
              : "bg-black/20 text-white"
        }`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </span>
      {!compact && <span className="tracked-label text-[9px] text-white/70 mt-1 block">{meta.label}</span>}
    </button>
  );
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
