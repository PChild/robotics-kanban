"use client";

import { useState, FormEvent } from "react";
import type { Task, Subteam, Priority, Certification, UserProfile } from "@/types";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { createTask, updateTask, deleteTask, leaveTask } from "@/lib/task-actions";
import { useAuth } from "@/context/auth-context";

interface TaskDialogProps {
  mode: "create" | "edit";
  defaultSubteam: Subteam;
  editableSubteams: Subteam[]; // subteams this user is allowed to assign the task to
  certifications: Certification[];
  users: UserProfile[];
  task?: Task; // required when mode === "edit"
  onClose: () => void;
}

export function TaskDialog({
  mode,
  defaultSubteam,
  editableSubteams,
  certifications,
  users,
  task,
  onClose,
}: TaskDialogProps) {
  const { profile, isCoach, canManageSubteam } = useAuth();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [subteam, setSubteam] = useState<Subteam>(task?.subteam ?? defaultSubteam);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [requiredCertificationIds, setRequiredCertificationIds] = useState<string[]>(
    task?.requiredCertificationIds ?? []
  );
  const [requireAll, setRequireAll] = useState(task?.requireAllCertifications ?? false);
  const [assigneeUids, setAssigneeUids] = useState<string[]>(task?.assigneeUids ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageThisTask = task ? canManageSubteam(task.subteam) : true;
  const canDelete = mode === "edit" && task && canManageSubteam(task.subteam);
  const readOnly = mode === "edit" && !canManageThisTask;

  // Anyone assignable to this subteam's tasks: coaches (subteam-agnostic) plus
  // students/leaders on the matching subteam.
  const assignableUsers = users.filter((u) => u.role === "coach" || u.subteam === subteam);

  const creator = task ? users.find((u) => u.uid === task.createdByUid) : undefined;

  function toggleCert(id: string) {
    setRequiredCertificationIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleAssignee(uid: string) {
    setAssigneeUids((prev) => (prev.includes(uid) ? prev.filter((a) => a !== uid) : [...prev, uid]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createTask({
          title,
          description,
          subteam,
          priority,
          requiredCertificationIds,
          requireAllCertifications: requireAll,
          createdByUid: profile.uid,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeUids,
        });
      } else if (task) {
        await updateTask(task.id, {
          title,
          description,
          subteam,
          priority,
          requiredCertificationIds,
          requireAllCertifications: requireAll,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeUids,
        });
      }
      onClose();
    } catch {
      setError("Something went wrong saving this task. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    await deleteTask(task.id);
    onClose();
  }

  async function handleLeave() {
    if (!task || !profile) return;
    await leaveTask(task.id, profile.uid);
    onClose();
  }

  const isOnThisTask = task && profile && task.assigneeUids.includes(profile.uid);

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-steel-line rounded w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="tracked-label text-xs text-blueprint font-bold">
            {mode === "create" ? "New task" : readOnly ? "Task" : "Edit task"}
          </h2>
          <button type="button" onClick={onClose} className="text-steel text-sm">
            Close
          </button>
        </div>

        {task && (
          <p className="text-xs text-steel">
            Created by {creator?.displayName ?? "someone no longer on the roster"} on{" "}
            {new Date(task.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}

        <label className="block">
          <span className="tracked-label text-xs text-steel">Title</span>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={readOnly}
          />
        </label>

        <label className="block">
          <span className="tracked-label text-xs text-steel">Description</span>
          <textarea
            className="input mt-1"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="tracked-label text-xs text-steel">Subteam</span>
            <select
              className="input mt-1"
              value={subteam}
              onChange={(e) => setSubteam(e.target.value as Subteam)}
              disabled={readOnly || (mode === "edit" && !isCoach)}
            >
              {editableSubteams.map((s) => (
                <option key={s} value={s}>
                  {SUBTEAM_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="tracked-label text-xs text-steel">Priority</span>
            <select
              className="input mt-1"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              disabled={readOnly}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="tracked-label text-xs text-steel">Due date (optional)</span>
          <input
            type="date"
            className="input mt-1"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={readOnly}
          />
        </label>

        {!readOnly && (
          <div>
            <span className="tracked-label text-xs text-steel">Assignees</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {assignableUsers.map((u) => (
                <button
                  type="button"
                  key={u.uid}
                  onClick={() => toggleAssignee(u.uid)}
                  className={`text-xs px-2 py-1 rounded-sm border ${
                    assigneeUids.includes(u.uid)
                      ? "bg-blueprint text-white border-blueprint"
                      : "bg-white text-steel border-steel-line"
                  }`}
                >
                  {u.displayName}
                  {u.role === "coach" && " (coach)"}
                </button>
              ))}
              {assignableUsers.length === 0 && (
                <p className="text-xs text-steel">No one on the roster for this subteam yet.</p>
              )}
            </div>
          </div>
        )}
        {readOnly && (
          <div>
            <span className="tracked-label text-xs text-steel">Assignees</span>
            <p className="text-sm mt-1">
              {task && task.assigneeUids.length > 0
                ? users
                    .filter((u) => task.assigneeUids.includes(u.uid))
                    .map((u) => u.displayName)
                    .join(", ")
                : "Unclaimed"}
            </p>
          </div>
        )}

        <div>
          <span className="tracked-label text-xs text-steel">Required certifications</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {certifications
              .filter((c) => c.subteam === null || c.subteam === subteam)
              .map((c) => (
                <button
                  type="button"
                  key={c.id}
                  disabled={readOnly}
                  onClick={() => toggleCert(c.id)}
                  className={`text-xs px-2 py-1 rounded-sm border ${
                    requiredCertificationIds.includes(c.id)
                      ? "bg-blueprint text-white border-blueprint"
                      : "bg-white text-steel border-steel-line"
                  }`}
                >
                  {c.name}
                </button>
              ))}
          </div>
          {requiredCertificationIds.length > 1 && (
            <label className="flex items-center gap-2 mt-2 text-xs text-steel">
              <input
                type="checkbox"
                checked={requireAll}
                onChange={(e) => setRequireAll(e.target.checked)}
                disabled={readOnly}
              />
              Require all selected certifications (default: any one is enough)
            </label>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          {!readOnly && (
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving…" : mode === "create" ? "Create task" : "Save changes"}
            </button>
          )}
          {isOnThisTask && (
            <button type="button" onClick={handleLeave} className="btn-secondary">
              Leave task
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-danger text-xs tracked-label ml-auto"
            >
              Delete task
            </button>
          )}
        </div>
      </form>
    </div>
  );
}