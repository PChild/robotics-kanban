import type { TimeEntry } from "@/types";

export function PersonalTimeReport({ entries, now }: { entries: TimeEntry[]; now: Date }) {
  const shopMs = entries.filter((entry) => entry.activity === "shop").reduce((sum, entry) => sum + durationMs(entry, now), 0);
  const outreachMs = entries.filter((entry) => entry.activity === "outreach").reduce((sum, entry) => sum + durationMs(entry, now), 0);
  return (
    <section className="mt-6 border-t border-steel-line pt-4">
      <h3 className="tracked-label text-xs font-bold">Attendance hours</h3>
      <div className="grid grid-cols-3 gap-2 my-4">
        <TimeTotal label="Total" milliseconds={shopMs + outreachMs} />
        <TimeTotal label="Shop" milliseconds={shopMs} />
        <TimeTotal label="Outreach" milliseconds={outreachMs} />
      </div>
      <h4 className="tracked-label text-[10px] text-steel mb-2">Session history</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-steel">No time has been recorded yet.</p>
      ) : (
        <div className="divide-y divide-steel-line border border-steel-line rounded">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{activityLabel(entry)}</p>
                <p className="text-[10px] text-steel mt-0.5">
                  {formatDateTime(entry.clockIn)} – {entry.clockOut ? formatTime(entry.clockOut) : "Now"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatDuration(durationMs(entry, now))}</p>
                {!entry.clockOut && <p className="tracked-label text-[9px] text-success">Signed in</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TimeTotal({ label, milliseconds }: { label: string; milliseconds: number }) {
  return (
    <div className="bg-paper border border-steel-line rounded p-2 sm:p-3">
      <p className="tracked-label text-[9px] text-steel">{label}</p>
      <p className="text-lg sm:text-2xl font-semibold mt-1">{formatDuration(milliseconds)}</p>
    </div>
  );
}

export function durationMs(entry: TimeEntry, now: Date) {
  return Math.max(0, new Date(entry.clockOut ?? now).getTime() - new Date(entry.clockIn).getTime());
}

export function totalDurationMs(entries: TimeEntry[], now: Date) {
  return entries.reduce((sum, entry) => sum + durationMs(entry, now), 0);
}

export function formatDuration(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  if (totalMinutes < 1) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function activityLabel(entry: TimeEntry) {
  return entry.activityName || (entry.activity === "shop" ? "Shop" : "Outreach");
}
