"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/context/auth-context";
import { useTasks, useUsers, useCertifications } from "@/lib/hooks";
import { TaskCard } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import type { Task } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  blocked: "Stuck",
  review: "Review",
  done: "Done",
};

export default function MyTasksPage() {
  const { profile, canManageSubteam } = useAuth();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const { certifications } = useCertifications();
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const myTasks = useMemo(
    () => tasks.filter((t) => profile && t.assigneeUids.includes(profile.uid)),
    [tasks, profile]
  );

  const eligibleOpenTasks = useMemo(() => {
    if (!profile) return [];
    return tasks.filter((t) => {
      if (t.assigneeUids.length > 0) return false;
      if (t.requiredCertificationIds.length === 0) return true;
      return t.requireAllCertifications
        ? t.requiredCertificationIds.every((id) => profile.certificationIds.includes(id))
        : t.requiredCertificationIds.some((id) => profile.certificationIds.includes(id));
    });
  }, [tasks, profile]);

  if (!profile) return null;

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">My tasks</h1>
        <p className="text-sm text-steel">What you&apos;re working on, and what&apos;s ready for you to pick up.</p>
      </div>

      <section className="mb-8">
        <h2 className="tracked-label text-xs text-steel mb-2">
          Claimed by me ({myTasks.length})
        </h2>
        {myTasks.length === 0 ? (
          <p className="text-sm text-steel">
            Nothing claimed yet — check the list below for tasks you&apos;re certified for.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {myTasks.map((t) => (
              <div key={t.id}>
                <TaskCard
                  task={t}
                  tasks={tasks}
                  certifications={certifications}
                  users={users}
                  draggable={false}
                  onOpen={() => setOpenTask(t)}
                />
                <p className="tracked-label text-[10px] text-steel mt-1 pl-1">
                  {STATUS_LABEL[t.status]}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="tracked-label text-xs text-steel mb-2">
          Ready to claim ({eligibleOpenTasks.length})
        </h2>
        {eligibleOpenTasks.length === 0 ? (
          <p className="text-sm text-steel">
            No open tasks match your certifications right now — check back later or ask a coach
            about earning a new one.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eligibleOpenTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                tasks={tasks}
                certifications={certifications}
                users={users}
                draggable={false}
                onOpen={() => setOpenTask(t)}
              />
            ))}
          </div>
        )}
      </section>

      {openTask && (
        <TaskDialog
          mode="edit"
          task={openTask}
          defaultSubteam={openTask.subteam}
          editableSubteams={canManageSubteam(openTask.subteam) ? [openTask.subteam] : [openTask.subteam]}
          certifications={certifications}
          users={users}
          tasks={tasks}
          onClose={() => setOpenTask(null)}
        />
      )}
    </AppShell>
  );
}
