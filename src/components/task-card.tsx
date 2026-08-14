"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task, Certification, UserProfile } from "@/types";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { useAuth } from "@/context/auth-context";
import { claimTask } from "@/lib/task-actions";

const PRIORITY_MARK: Record<Task["priority"], { label: string; color: string }> = {
  high: { label: "!!!", color: "var(--danger)" },
  medium: { label: "!!", color: "var(--hazard)" },
  low: { label: "!", color: "var(--steel)" },
};

interface TaskCardProps {
  task: Task;
  certifications: Certification[];
  users: UserProfile[];
  draggable: boolean;
  onOpen: () => void;
}

export function TaskCard({ task, certifications, users, draggable, onOpen }: TaskCardProps) {
  const { profile } = useAuth();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });

  const meta = SUBTEAM_META[task.subteam];
  const assignee = users.find((u) => u.uid === task.assigneeUid);
  const requiredCerts = certifications.filter((c) =>
    task.requiredCertificationIds.includes(c.id)
  );

  const isEligible =
    !!profile &&
    (task.requiredCertificationIds.length === 0 ||
      (task.requireAllCertifications
        ? task.requiredCertificationIds.every((id) =>
            profile.certificationIds.includes(id)
          )
        : task.requiredCertificationIds.some((id) =>
            profile.certificationIds.includes(id)
          )));

  const canClaim = !task.assigneeUid && isEligible && profile?.role === "student";

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: meta.color }}
      className="relative bg-paper-raised border border-steel-line border-l-4 rounded-sm shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={onOpen}
        {...(draggable ? { ...listeners, ...attributes } : {})}
        className={`w-full text-left p-3 ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="tracked-label text-[10px] text-steel">
            {meta.label} · #{task.id.slice(0, 5)}
          </span>
          <span
            className="tracked-label text-[10px] font-bold"
            style={{ color: PRIORITY_MARK[task.priority].color }}
            title={`${task.priority} priority`}
          >
            {PRIORITY_MARK[task.priority].label}
          </span>
        </div>

        <p className="text-sm font-medium mt-1.5 leading-snug">{task.title}</p>

        {requiredCerts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {requiredCerts.map((c) => (
              <span
                key={c.id}
                className="tracked-label text-[9px] px-1.5 py-0.5 rounded-sm bg-blueprint/10 text-blueprint-deep border border-blueprint/20"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-dashed border-steel-line mt-2.5 pt-2 flex items-center justify-between">
          <span className="text-xs text-steel truncate">
            {assignee ? assignee.displayName : "Unclaimed"}
          </span>
          {task.dueDate && (
            <span className="text-[10px] text-steel tracked-label">
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </button>

      {canClaim && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (profile) claimTask(task.id, profile.uid);
          }}
          className="w-full text-center tracked-label text-[10px] font-semibold py-1.5 bg-success/10 text-success border-t border-success/30 hover:bg-success/20"
        >
          Claim task
        </button>
      )}

      {!task.assigneeUid && !isEligible && task.requiredCertificationIds.length > 0 && (
        <div className="w-full text-center tracked-label text-[10px] py-1.5 bg-steel/10 text-steel border-t border-steel-line">
          Cert required
        </div>
      )}
    </div>
  );
}
