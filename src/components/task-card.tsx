"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import type { Task, Certification, UserProfile } from "@/types";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { useAuth } from "@/context/auth-context";
import { claimTask, incompletePrerequisites } from "@/lib/task-actions";

const PRIORITY_MARK: Record<Task["priority"], { label: string; color: string }> = {
  high: { label: "High", color: "var(--danger)" },
  medium: { label: "Medium", color: "var(--hazard)" },
  low: { label: "Low", color: "var(--steel)" },
};

const BLOCKED_REASON_LABEL: Record<NonNullable<Task["blockedReason"]>, string> = {
  parts: "Waiting on parts / order",
  information: "Waiting on information",
  approval: "Waiting on approval",
  prerequisite: "Waiting on prerequisite",
  other: "Blocked",
};

export function TaskCard({ task, tasks, certifications, users, draggable, onOpen }: {
  task: Task; tasks: Task[]; certifications: Certification[]; users: UserProfile[]; draggable: boolean; onOpen: () => void;
}) {
  const { profile } = useAuth();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !draggable });
  const meta = SUBTEAM_META[task.subteam];
  const assignees = users.filter((u) => task.assigneeUids.includes(u.uid));
  const requiredCerts = certifications.filter((c) => task.requiredCertificationIds.includes(c.id));
  const contact = users.find((u) => u.uid === (task.pointOfContactUid || task.createdByUid));
  const incomplete = incompletePrerequisites(task, tasks);
  const alreadyOn = !!profile && task.assigneeUids.includes(profile.uid);
  const isEligible = !!profile && (task.requiredCertificationIds.length === 0 ||
    (task.requireAllCertifications
      ? task.requiredCertificationIds.every((id) => profile.certificationIds.includes(id))
      : task.requiredCertificationIds.some((id) => profile.certificationIds.includes(id))));
  const canClaim = task.assigneeUids.length === 0 && isEligible &&
    (profile?.role === "student" || profile?.role === "student_leader");
  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef}
      style={{ ...style, backgroundColor: `color-mix(in srgb, ${meta.color} 82%, var(--paper-raised))` }}
      className="relative border border-ink/20 rounded-sm shadow-sm hover:shadow-md transition-shadow text-white">
      <button onClick={onOpen} {...(draggable ? { ...listeners, ...attributes } : {})}
        className={`w-full text-left p-3 ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="tracked-label text-[10px] text-white/80">{meta.label}</span>
          <span className="tracked-label text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20"
            style={{ color: PRIORITY_MARK[task.priority].color }} title={`${task.priority} priority`}>
            {PRIORITY_MARK[task.priority].label}
          </span>
        </div>
        <p className="text-sm font-medium mt-1.5 leading-snug text-white">{task.title}</p>
        {(task.status === "blocked" || incomplete.length > 0) && (
          <div className="mt-2 text-[10px] rounded-sm bg-black/25 border border-white/30 px-2 py-1.5">
            {task.status === "blocked" ? (
              <span className="font-semibold">
                {task.blockedReason ? BLOCKED_REASON_LABEL[task.blockedReason] : "Stuck"}
                {task.blockedDetails ? ` — ${task.blockedDetails}` : ""}
              </span>
            ) : (
              <span>Waiting on {incomplete.length} prerequisite{incomplete.length === 1 ? "" : "s"}</span>
            )}
          </div>
        )}
        {requiredCerts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {requiredCerts.map((c) => (
              <span key={c.id} className="tracked-label text-[9px] px-1.5 py-0.5 rounded-sm bg-white/90 text-blueprint-deep border border-white">
                {c.name}
              </span>
            ))}
          </div>
        )}
        <div className="border-t border-dashed border-white/35 mt-2.5 pt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-white/85 truncate">
            {assignees.length > 0 ? assignees.map((a) => a.displayName).join(", ") : "Unclaimed"}
          </span>
          <span className="text-[10px] text-white/80 whitespace-nowrap shrink-0">
            {task.dueDate ? `due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-white/80">
          <span className="truncate">POC: {contact?.displayName ?? "Task creator"}</span>
          <span className="shrink-0 flex gap-2">
            {(task.attachments?.length ?? 0) > 0 && <span title="Attachments">▤ {task.attachments.length}</span>}
            {(task.comments?.length ?? 0) > 0 && <span title="Updates">◫ {task.comments.length}</span>}
          </span>
        </div>
      </button>
      {canClaim && (
        <button onClick={(e) => { e.stopPropagation(); if (profile) claimTask(task.id, profile.uid); }}
          className="w-full text-center tracked-label text-[10px] font-semibold py-1.5 bg-white/90 text-success border-t border-white hover:bg-white">
          Claim task
        </button>
      )}
      {!alreadyOn && !isEligible && task.requiredCertificationIds.length > 0 && (
        <div className="w-full text-center tracked-label text-[10px] py-1.5 bg-black/20 text-white/85 border-t border-white/30">
          Cert required
        </div>
      )}
    </div>
  );
}
