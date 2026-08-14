"use client";

import { useState, FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/context/auth-context";
import { useUsers, useCertifications } from "@/lib/hooks";
import {
  createAccount,
  updateUserRoleAndSubteam,
  deleteUserProfile,
  createCertification,
  updateCertification,
  deleteCertification,
} from "@/lib/admin-actions";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import { SUBTEAMS, type Role, type Subteam } from "@/types";

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"roster" | "certifications">("roster");

  if (profile?.role !== "coach") {
    return (
      <AppShell>
        <p className="text-sm text-steel">Only coaches can access admin settings.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Admin</h1>
        <p className="text-sm text-steel">Manage accounts and the certification catalog.</p>
      </div>

      <div className="flex gap-1.5 mb-5">
        <TabButton active={tab === "roster"} onClick={() => setTab("roster")} label="Roster" />
        <TabButton
          active={tab === "certifications"}
          onClick={() => setTab("certifications")}
          label="Certifications"
        />
      </div>

      {tab === "roster" ? <RosterTab /> : <CertificationsTab />}
    </AppShell>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`tracked-label text-xs px-3 py-1.5 rounded-sm border ${
        active ? "bg-ink text-white border-ink" : "bg-white text-steel border-steel-line"
      }`}
    >
      {label}
    </button>
  );
}

function RosterTab() {
  const { users } = useUsers();
  const { certifications } = useCertifications();
  const [showForm, setShowForm] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; tempPassword: string } | null>(
    null
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-steel">{users.length} accounts</p>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          + New account
        </button>
      </div>

      {lastCreated && (
        <div className="bg-success/10 border border-success/30 rounded p-3 text-sm">
          <p className="font-medium">Account created for {lastCreated.email}</p>
          <p className="text-steel mt-1">
            Temporary password:{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border border-steel-line font-mono">
              {lastCreated.tempPassword}
            </code>{" "}
            — give this to the student. They&apos;ll be forced to set their own password on first
            login.
          </p>
          <button
            onClick={() => setLastCreated(null)}
            className="text-xs text-steel underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-paper-raised border border-steel-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper border-b border-steel-line">
            <tr className="text-left tracked-label text-[10px] text-steel">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Subteam</th>
              <th className="px-3 py-2">Certs</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <RosterRow key={u.uid} user={u} certCount={u.certificationIds.length} />
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <NewAccountDialog
          certifications={certifications}
          onClose={() => setShowForm(false)}
          onCreated={(email, tempPassword) => {
            setLastCreated({ email, tempPassword });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function RosterRow({
  user,
  certCount,
}: {
  user: import("@/types").UserProfile;
  certCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [subteam, setSubteam] = useState<Subteam | "">(user.subteam ?? "");

  async function save() {
    await updateUserRoleAndSubteam(user.uid, {
      role,
      subteam: role === "coach" ? null : (subteam as Subteam) || null,
    });
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Remove ${user.displayName}'s access? This can't be undone here.`)) return;
    await deleteUserProfile(user.uid);
  }

  return (
    <tr className="border-b border-steel-line last:border-0">
      <td className="px-3 py-2">{user.displayName}</td>
      <td className="px-3 py-2 text-steel">{user.email}</td>
      <td className="px-3 py-2">
        {editing ? (
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input py-1">
            <option value="student">Student</option>
            <option value="student_leader">Student leader</option>
            <option value="coach">Coach</option>
          </select>
        ) : (
          <span className="tracked-label text-[10px]">{user.role.replace("_", " ")}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {editing && role !== "coach" ? (
          <select
            value={subteam}
            onChange={(e) => setSubteam(e.target.value as Subteam)}
            className="input py-1"
          >
            <option value="">—</option>
            {SUBTEAMS.map((s) => (
              <option key={s} value={s}>
                {SUBTEAM_META[s].label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-steel">{user.subteam ? SUBTEAM_META[user.subteam].label : "—"}</span>
        )}
      </td>
      <td className="px-3 py-2 text-steel">{certCount}</td>
      <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
        {editing ? (
          <>
            <button onClick={save} className="text-blueprint text-xs tracked-label">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-steel text-xs tracked-label">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="text-blueprint text-xs tracked-label">
              Edit
            </button>
            <button onClick={remove} className="text-danger text-xs tracked-label">
              Remove
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

function NewAccountDialog({
  certifications,
  onClose,
  onCreated,
}: {
  certifications: import("@/types").Certification[];
  onClose: () => void;
  onCreated: (email: string, tempPassword: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [subteam, setSubteam] = useState<Subteam>("mechanical");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void certifications;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { tempPassword } = await createAccount({
        displayName,
        email,
        role,
        subteam: role === "coach" ? null : subteam,
      });
      onCreated(email, tempPassword);
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code ?? "";
      const message = err instanceof Error ? err.message : String(err);
      if (code.includes("email-already-in-use")) {
        setError("That email is already registered.");
      } else if (code === "permission-denied") {
        setError(
          "The account was created, but saving its profile was denied by Firestore. This usually means firestore.rules hasn't been published yet (Firebase console > Firestore Database > Rules > Publish), or your own coach profile document is missing/misconfigured."
        );
      } else {
        setError(`Couldn't create the account: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-steel-line rounded w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="tracked-label text-xs text-blueprint font-bold">New account</h2>
          <button type="button" onClick={onClose} className="text-steel text-sm">
            Close
          </button>
        </div>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Name</span>
          <input className="input mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Email</span>
          <input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Role</span>
          <select className="input mt-1" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="student">Student</option>
            <option value="student_leader">Student leader</option>
            <option value="coach">Coach</option>
          </select>
        </label>
        {role !== "coach" && (
          <label className="block">
            <span className="tracked-label text-xs text-steel">Subteam</span>
            <select className="input mt-1" value={subteam} onChange={(e) => setSubteam(e.target.value as Subteam)}>
              {SUBTEAMS.map((s) => (
                <option key={s} value={s}>
                  {SUBTEAM_META[s].label}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function CertificationsTab() {
  const { certifications } = useCertifications();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<import("@/types").Certification | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-steel">{certifications.length} certifications</p>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          + New certification
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {certifications.map((c) => (
          <div key={c.id} className="bg-paper-raised border border-steel-line rounded p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">{c.name}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditing(c)} className="text-blueprint text-xs tracked-label">
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${c.name}"? Tasks requiring it will no longer be gated.`)) {
                      deleteCertification(c.id);
                    }
                  }}
                  className="text-danger text-xs tracked-label"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-xs text-steel mt-1">{c.description || "No description"}</p>
            <p className="tracked-label text-[10px] text-blueprint mt-2">
              {c.subteam ? SUBTEAM_META[c.subteam].label : "All subteams"}
            </p>
          </div>
        ))}
        {certifications.length === 0 && (
          <p className="text-sm text-steel">No certifications yet — add your first one.</p>
        )}
      </div>

      {showForm && <CertDialog mode="create" onClose={() => setShowForm(false)} />}
      {editing && (
        <CertDialog mode="edit" certification={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function CertDialog({
  mode,
  certification,
  onClose,
}: {
  mode: "create" | "edit";
  certification?: import("@/types").Certification;
  onClose: () => void;
}) {
  const [name, setName] = useState(certification?.name ?? "");
  const [description, setDescription] = useState(certification?.description ?? "");
  const [subteam, setSubteam] = useState<Subteam | "">(certification?.subteam ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createCertification({ name, description, subteam: subteam || null });
      } else if (certification) {
        await updateCertification(certification.id, {
          name,
          description,
          subteam: subteam || null,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-paper-raised border border-steel-line rounded w-full max-w-sm p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="tracked-label text-xs text-blueprint font-bold">
            {mode === "create" ? "New certification" : "Edit certification"}
          </h2>
          <button type="button" onClick={onClose} className="text-steel text-sm">
            Close
          </button>
        </div>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Name</span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. CNC Mill" />
        </label>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Description</span>
          <textarea className="input mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block">
          <span className="tracked-label text-xs text-steel">Subteam scope</span>
          <select className="input mt-1" value={subteam} onChange={(e) => setSubteam(e.target.value as Subteam)}>
            <option value="">All subteams</option>
            {SUBTEAMS.map((s) => (
              <option key={s} value={s}>
                {SUBTEAM_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Saving…" : mode === "create" ? "Create certification" : "Save changes"}
        </button>
      </form>
    </div>
  );
}