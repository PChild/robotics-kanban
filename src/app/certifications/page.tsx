"use client";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/context/auth-context";
import { useUsers, useCertifications } from "@/lib/hooks";
import { grantCertification, revokeCertification } from "@/lib/admin-actions";
import { SUBTEAM_META } from "@/lib/subteam-meta";
import type { UserProfile, Certification } from "@/types";

export default function CertificationsPage() {
  const { profile, isCoach, isStudentLeader } = useAuth();
  const canManage = isCoach || isStudentLeader;

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-lg font-semibold">Certifications</h1>
        <p className="text-sm text-steel">
          {canManage
            ? "Grant or revoke certifications for students. Tasks with matching requirements unlock automatically."
            : "Your certifications determine which tasks you can claim."}
        </p>
      </div>

      {canManage ? <ManageGrid /> : <MyCertifications />}
      {!profile && null}
    </AppShell>
  );
}

function MyCertifications() {
  const { profile } = useAuth();
  const { certifications, loading } = useCertifications();

  if (loading || !profile) {
    return <p className="text-sm text-steel">Loading…</p>;
  }

  const relevant = certifications.filter(
    (c) => c.subteam === null || c.subteam === profile.subteam
  );

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {relevant.map((c) => {
        const held = profile.certificationIds.includes(c.id);
        return (
          <div
            key={c.id}
            className={`border rounded p-3 ${
              held ? "bg-success/10 border-success/30" : "bg-paper-raised border-steel-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{c.name}</p>
              <span
                className={`tracked-label text-[10px] ${held ? "text-success" : "text-steel"}`}
              >
                {held ? "Certified" : "Not yet"}
              </span>
            </div>
            {c.description && <p className="text-xs text-steel mt-1">{c.description}</p>}
          </div>
        );
      })}
      {relevant.length === 0 && (
        <p className="text-sm text-steel">No certifications defined for your subteam yet.</p>
      )}
    </div>
  );
}

function ManageGrid() {
  const { profile, isCoach } = useAuth();
  const { users } = useUsers();
  const { certifications } = useCertifications();

  const students = users
    .filter((u) => u.role !== "coach")
    .filter((u) => isCoach || u.subteam === profile?.subteam)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  if (students.length === 0) {
    return <p className="text-sm text-steel">No students on your roster yet.</p>;
  }
  if (certifications.length === 0) {
    return (
      <p className="text-sm text-steel">
        No certifications exist yet. {isCoach ? "Create some from Admin > Certifications." : "Ask your coach to add some."}
      </p>
    );
  }

  async function toggle(user: UserProfile, cert: Certification) {
    if (user.certificationIds.includes(cert.id)) {
      await revokeCertification(user.uid, cert.id);
    } else {
      await grantCertification(user.uid, cert.id);
    }
  }

  return (
    <div className="bg-paper-raised border border-steel-line rounded overflow-x-auto">
      <table className="text-sm min-w-full">
        <thead className="bg-paper border-b border-steel-line">
          <tr>
            <th className="text-left px-3 py-2 tracked-label text-[10px] text-steel sticky left-0 bg-paper">
              Student
            </th>
            {certifications.map((c) => (
              <th key={c.id} className="px-3 py-2 tracked-label text-[10px] text-steel whitespace-nowrap">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((u) => (
            <tr key={u.uid} className="border-b border-steel-line last:border-0">
              <td className="px-3 py-2 sticky left-0 bg-paper-raised whitespace-nowrap">
                <p className="font-medium">{u.displayName}</p>
                <p className="text-[10px] text-steel">
                  {u.subteam ? SUBTEAM_META[u.subteam].label : "—"}
                </p>
              </td>
              {certifications.map((c) => {
                const held = u.certificationIds.includes(c.id);
                return (
                  <td key={c.id} className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggle(u, c)}
                      className={`w-6 h-6 rounded-sm border text-xs ${
                        held
                          ? "bg-success text-white border-success"
                          : "bg-white text-steel border-steel-line hover:border-steel"
                      }`}
                      title={held ? `Revoke ${c.name}` : `Grant ${c.name}`}
                    >
                      {held ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
