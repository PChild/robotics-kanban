"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Check,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquare,
  Search,
  Send,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { getDownloadURL, ref } from "firebase/storage";
import { AppShell } from "@/components/app-shell";
import { ModalBackdrop } from "@/components/modal-backdrop";
import { useAuth } from "@/context/auth-context";
import { storage } from "@/lib/firebase";
import { useManufacturingComments, useManufacturingExports } from "@/lib/hooks";
import {
  addManufacturingComment,
  deleteManufacturingExport,
  setManufacturingStatus,
} from "@/lib/manufacturing-actions";
import type {
  ManufacturingEndOperation,
  ManufacturingExport,
  ManufacturingExportKind,
} from "@/types";

type QueueFilter = "pending" | "all" | "complete" | "cancelled";
type KindFilter = "all" | ManufacturingExportKind;

const KIND_LABEL: Record<ManufacturingExportKind, string> = {
  dxf: "DXF",
  step: "STEP",
  lathe: "LATHE",
};

const previewUrlCache = new Map<string, string>();

export default function PartsPage() {
  const { firebaseUser, profile, isCoach } = useAuth();
  const { exports, loading, error } = useManufacturingExports();
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: exports.filter((item) => item.manufacturingStatus === "pending").length,
      complete: exports.filter((item) => item.manufacturingStatus === "complete").length,
      cancelled: exports.filter((item) => item.manufacturingStatus === "cancelled").length,
    }),
    [exports],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return exports.filter((item) => {
      if (queueFilter !== "all" && item.manufacturingStatus !== queueFilter) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (!term) return true;
      return [
        item.friendlyName,
        item.material,
        item.subsystem,
        item.machiningType,
        item.requestedBy?.name,
        item.fileName,
      ].some((value) => value?.toLocaleLowerCase().includes(term));
    });
  }, [exports, kindFilter, queueFilter, search]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] lg:flex lg:h-[calc(100dvh-6.5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <div className="mb-5 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Parts</h1>
            <p className="mt-1 max-w-2xl text-sm text-steel">
              Manufacturing files, setup notes, and production status from Onshape.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded border border-steel-line bg-paper-raised">
            <Stat label="To make" value={counts.pending} attention={counts.pending > 0} />
            <Stat label="Done" value={counts.complete} success />
            <Stat label="Cancelled" value={counts.cancelled} />
          </div>
        </div>

        <div className="mb-4 grid shrink-0 gap-3 rounded border border-steel-line bg-paper-raised p-3 lg:grid-cols-[minmax(22rem,1fr)_auto_11rem] lg:items-center">
          <label className="relative block min-w-0">
            <span className="sr-only">Search parts</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" size={18} />
            <input
              className="input input-with-icon h-11 text-base"
              placeholder="Search part, material, subsystem, or requester…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="grid w-full grid-cols-4 overflow-hidden rounded border border-steel-line bg-surface lg:w-auto">
            {(["pending", "all", "complete", "cancelled"] as QueueFilter[]).map((filter) => (
              <FilterButton
                key={filter}
                active={queueFilter === filter}
                onClick={() => setQueueFilter(filter)}
              >
                {filter === "pending"
                  ? "To make"
                  : filter === "complete"
                    ? "Completed"
                    : filter === "cancelled"
                      ? "Cancelled"
                      : "All"}
              </FilterButton>
            ))}
          </div>
          <select
            className="input h-11 w-full"
            aria-label="Filter by manufacturing process"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as KindFilter)}
          >
            <option value="all">All processes</option>
            <option value="dxf">DXF cutting</option>
            <option value="step">3D printing</option>
            <option value="lathe">Lathe</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(310px,0.85fr)_minmax(0,1.65fr)] lg:items-stretch lg:overflow-hidden">
          <section className="overflow-hidden rounded border border-steel-line bg-paper-raised lg:flex lg:min-h-0 lg:flex-col">
            <div className="flex items-center justify-between border-b border-steel-line px-3 py-2.5">
              <h2 className="tracked-label text-[10px] font-bold text-steel">Parts</h2>
              <span className="font-mono text-[11px] text-steel">{filtered.length} shown</span>
            </div>
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-steel">
                  <LoaderCircle className="animate-spin" size={17} /> Loading parts…
                </div>
              ) : filtered.length === 0 ? (
                <EmptyQueue hasParts={exports.length > 0} />
              ) : (
                filtered.map((item) => (
                  <PartRow
                    key={item.id}
                    item={item}
                    selected={selected?.id === item.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))
              )}
            </div>
          </section>

          {selected ? (
            <PartDetails
              key={selected.id}
              item={selected}
              canDelete={isCoach}
              onDeleted={() => setSelectedId(null)}
              currentUser={
                firebaseUser && profile
                  ? { uid: firebaseUser.uid, name: profile.displayName }
                  : null
              }
            />
          ) : (
            !loading && (
              <section className="hidden min-h-80 place-items-center rounded border border-dashed border-steel-line bg-paper-raised/70 p-8 text-center lg:grid">
                <div>
                  <Wrench className="mx-auto mb-3 text-steel" size={26} />
                  <p className="font-medium">No part selected</p>
                  <p className="mt-1 text-sm text-steel">Change the filters to find a manufacturing request.</p>
                </div>
              </section>
            )
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  attention = false,
  success = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
  success?: boolean;
}) {
  return (
    <div className="min-w-16 border-r border-steel-line px-3 py-2 text-center last:border-r-0 sm:min-w-20">
      <p className="tracked-label text-[8px] text-steel">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${attention ? "text-hazard" : success ? "text-success" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tracked-label border-r border-steel-line px-3 py-2 text-[9px] last:border-r-0 ${
        active ? "bg-blueprint text-white" : "text-steel hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function PartRow({
  item,
  selected,
  onClick,
}: {
  item: ManufacturingExport;
  selected: boolean;
  onClick: () => void;
}) {
  const done = item.manufacturingStatus === "complete";
  const cancelled = item.manufacturingStatus === "cancelled";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex w-full items-start gap-3 border-b border-steel-line px-3 py-3 text-left last:border-b-0 ${
        selected ? "bg-blueprint/10 shadow-[inset_3px_0_0_var(--blueprint)]" : "hover:bg-paper"
      }`}
    >
      <PartPreview
        item={item}
        className={`mt-0.5 size-14 shrink-0 rounded-sm border ${done ? "border-success/30" : cancelled ? "border-danger/30" : "border-steel-line"}`}
        fallbackClassName={done ? "bg-success/10 text-success" : cancelled ? "bg-danger/10 text-danger" : "bg-surface text-blueprint"}
        fallback={cancelled ? <XCircle size={19} /> : item.kind === "step" ? <Box size={19} /> : item.kind === "lathe" ? <Wrench size={19} /> : <FileText size={19} />}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${done || cancelled ? "text-steel line-through decoration-steel-line" : "text-ink"}`}>
            {item.friendlyName}
          </p>
          {done ? <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={16} /> : cancelled ? <XCircle className="mt-0.5 shrink-0 text-danger" size={16} /> : <Circle className="mt-0.5 shrink-0 text-steel-line" size={16} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-steel">
          <span>{titleCase(item.machiningType)}</span>
          <span aria-hidden="true">·</span>
          <span>Qty {item.quantity}</span>
          {item.material && <><span aria-hidden="true">·</span><span>{titleCase(item.material)}</span></>}
        </div>
        <p className="mt-1.5 text-[10px] text-steel/80">{formatDate(item.createdAt)}</p>
      </div>
    </button>
  );
}

function PartPreview({
  item,
  className,
  fallbackClassName,
  fallback,
}: {
  item: ManufacturingExport;
  className: string;
  fallbackClassName: string;
  fallback: React.ReactNode;
}) {
  const storagePath = item.previewStoragePath;
  const [url, setUrl] = useState<string | null>(() => storagePath ? previewUrlCache.get(storagePath) ?? null : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!storagePath) return;
    const cached = previewUrlCache.get(storagePath);
    let active = true;
    const previewUrlPromise = cached
      ? Promise.resolve(cached)
      : getDownloadURL(ref(storage, storagePath));
    previewUrlPromise
      .then((previewUrl) => {
        previewUrlCache.set(storagePath, previewUrl);
        if (active) setUrl(previewUrl);
      })
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [storagePath]);

  if (!url || failed) {
    return <div className={`${className} ${fallbackClassName} grid place-items-center`}>{fallback}</div>;
  }

  return (
    <div className={`${className} bg-white`}>
      {/* Firebase supplies a runtime URL, so this cannot use a build-time Next image host allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Preview of ${item.friendlyName}`}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function EmptyQueue({ hasParts }: { hasParts: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <CheckCircle2 className="mx-auto mb-3 text-success" size={25} />
      <p className="text-sm font-medium">{hasParts ? "Nothing matches this view" : "No parts exported yet"}</p>
      <p className="mt-1 text-xs leading-relaxed text-steel">
        {hasParts ? "Try a different status, process, or search." : "New Onshape exports will appear here automatically."}
      </p>
    </div>
  );
}

function CommentsSection({
  item,
  currentUser,
}: {
  item: ManufacturingExport;
  currentUser: { uid: string; name: string } | null;
}) {
  const { comments, loading, error } = useManufacturingComments(item.id);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !body.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addManufacturingComment(item.id, body, currentUser);
      setBody("");
    } catch (commentError) {
      console.error(commentError);
      setSubmitError("Comment could not be posted. Check the deployed Firestore rules and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DetailGroup title="Shop comments" icon={<MessageSquare size={14} />}>
      {loading ? (
        <p className="flex items-center gap-2 py-2 text-xs text-steel"><LoaderCircle className="animate-spin" size={13} /> Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="py-1 text-xs text-steel">No comments yet. Add setup notes, progress, or issues here.</p>
      ) : (
        <div className="mb-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-sm border border-steel-line bg-paper px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="font-semibold text-ink">{comment.authorName}</span>
                <time className="shrink-0 text-steel">{formatDateTime(comment.createdAt)}</time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink">{comment.body}</p>
            </article>
          ))}
        </div>
      )}

      {(error || submitError) && <p className="mb-2 text-xs text-danger">{submitError || error}</p>}

      <form onSubmit={submitComment} className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Add a comment about making this part</span>
          <textarea
            className="input min-h-20 resize-y"
            placeholder="Add a comment about making this part…"
            value={body}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn-primary inline-flex h-10 shrink-0 items-center gap-2"
          disabled={!currentUser || !body.trim() || submitting}
        >
          {submitting ? <LoaderCircle className="animate-spin" size={14} /> : <Send size={14} />}
          Comment
        </button>
      </form>
    </DetailGroup>
  );
}

function PartDetails({
  item,
  currentUser,
  canDelete,
  onDeleted,
}: {
  item: ManufacturingExport;
  currentUser: { uid: string; name: string } | null;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const done = item.manufacturingStatus === "complete";
  const cancelled = item.manufacturingStatus === "cancelled";
  const onshapeUrl = buildOnshapeUrl(item);

  async function changeStatus(status: "pending" | "complete" | "cancelled") {
    if (!currentUser || updating || deleting) return;
    setUpdating(true);
    setActionError(null);
    try {
      await setManufacturingStatus(item.id, status, currentUser);
    } catch (error) {
      console.error(error);
      setActionError("Could not update this part. Check the deployed Firestore rules and try again.");
    } finally {
      setUpdating(false);
    }
  }

  async function downloadFile() {
    if (!item.storagePath || downloading || deleting) return;
    setDownloading(true);
    setActionError(null);
    try {
      const url = await getDownloadURL(ref(storage, item.storagePath));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.fileName ?? item.friendlyName;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      console.error(error);
      setActionError("The manufacturing file could not be downloaded. Check the deployed Storage rules.");
    } finally {
      setDownloading(false);
    }
  }

  async function deletePart() {
    if (!canDelete || deleting || updating || downloading) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteManufacturingExport(item);
      setDeleteConfirmOpen(false);
      onDeleted();
    } catch (error) {
      console.error(error);
      setDeleteError(
        "This part could not be fully deleted. Any already-missing files are handled safely, so check the deployed Firestore and Storage rules and try again.",
      );
      setDeleting(false);
    }
  }

  function openDeleteDialog() {
    if (!canDelete || deleting || updating || downloading) return;
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteDialog() {
    if (!deleting) setDeleteConfirmOpen(false);
  }

  return (
    <>
      <section className="overflow-hidden rounded border border-steel-line bg-paper-raised lg:h-full lg:min-h-0 lg:overflow-y-auto">
      <div className={`h-1 ${done ? "bg-success" : cancelled ? "bg-danger" : "bg-blueprint"}`} />
      <div className="border-b border-steel-line p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={item.manufacturingStatus} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{item.friendlyName}</h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {item.storagePath && (
              <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={downloadFile} disabled={downloading || deleting}>
                {downloading ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
                {downloading ? "Preparing…" : `Download ${KIND_LABEL[item.kind]}`}
              </button>
            )}
            {onshapeUrl && (
              <a className="btn-secondary inline-flex items-center gap-2" href={onshapeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Onshape
              </a>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-2 border-danger/50 text-danger hover:bg-danger/10"
                onClick={openDeleteDialog}
                disabled={deleting || updating || downloading}
              >
                {deleting ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Delete part"}
              </button>
            )}
          </div>
        </div>

        {item.previewStoragePath && (
          <PartPreview
            item={item}
            className="mt-4 h-56 w-full overflow-hidden rounded border border-steel-line"
            fallbackClassName="bg-paper text-steel"
            fallback={item.kind === "step" ? <Box size={30} /> : item.kind === "lathe" ? <Wrench size={30} /> : <FileText size={30} />}
          />
        )}

        {actionError && <p className="mt-3 rounded-sm bg-danger/10 px-3 py-2 text-xs text-danger">{actionError}</p>}

        {item.manufacturingStatus === "pending" ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => changeStatus("complete")}
              disabled={!currentUser || updating || deleting}
              className="btn-primary flex min-h-14 items-center justify-center gap-2"
            >
              {updating ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={16} strokeWidth={3} />}
              Mark part complete
            </button>
            <button
              type="button"
              onClick={() => changeStatus("cancelled")}
              disabled={!currentUser || updating || deleting}
              className="btn-secondary flex min-h-14 items-center justify-center gap-2"
              style={{ color: "var(--danger)" }}
            >
              <XCircle size={16} /> Cancel request
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => changeStatus("pending")}
            disabled={!currentUser || updating || deleting}
            className={`mt-5 flex w-full items-center gap-3 rounded border px-3 py-3 text-left transition-colors ${
              done
                ? "border-success/40 bg-success/10 hover:bg-success/15"
                : "border-danger/40 bg-danger/10 hover:bg-danger/15"
            }`}
          >
            <span className={`grid size-6 shrink-0 place-items-center rounded-sm text-white ${done ? "bg-success" : "bg-danger"}`}>
              {updating ? <LoaderCircle className="animate-spin" size={14} /> : done ? <Check size={15} strokeWidth={3} /> : <XCircle size={15} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{done ? "Manufacturing complete" : "Request cancelled"}</span>
              <span className="mt-0.5 block text-xs text-steel">
                {done ? completionSummary(item) : cancellationSummary(item)}
              </span>
            </span>
            <span className={`tracked-label text-[9px] ${done ? "text-success" : "text-danger"}`}>Move back to queue</span>
          </button>
        )}
      </div>

      <div className="grid gap-px bg-steel-line sm:grid-cols-2 lg:grid-cols-3">
        <InfoCell label="Process" value={titleCase(item.machiningType)} />
        <InfoCell label="Quantity" value={String(item.quantity)} emphasis />
        <InfoCell label="Material" value={item.material ? titleCase(item.material) : "Not specified"} />
        <InfoCell label="Subsystem" value={item.subsystem || "Not specified"} />
        <InfoCell label="Requested by" value={item.requestedBy?.name || "Unknown"} />
        <InfoCell label="Requested" value={formatDateTime(item.createdAt)} />
        {item.kind === "lathe" && item.overallLengthInches !== undefined && (
          <InfoCell label="Shaft length" value={`${formatMeasurement(item.overallLengthInches)} in`} emphasis />
        )}
        {item.kind === "dxf" && item.materialThicknessInches !== undefined && (
          <InfoCell label="Thickness" value={`${formatMeasurement(item.materialThicknessInches)} in`} />
        )}
        {item.kind === "dxf" && item.dxfBounds && (
          <InfoCell
            label="Bounding box"
            value={`${formatMeasurement(item.dxfBounds.widthInches)} × ${formatMeasurement(item.dxfBounds.heightInches)} in`}
            emphasis
          />
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {item.kind === "lathe" && item.lathe && <LatheDetails item={item} />}
        <CommentsSection item={item} currentUser={deleting ? null : currentUser} />
      </div>
      </section>

      {deleteConfirmOpen && (
        <ModalBackdrop onClose={closeDeleteDialog}>
          <div
            className="w-full max-w-md rounded border border-danger/40 bg-paper-raised p-5 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-part-title"
            aria-describedby="delete-part-description"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                <Trash2 size={18} />
              </span>
              <div className="min-w-0">
                <h2 id="delete-part-title" className="text-lg font-semibold">Delete this part?</h2>
                <p id="delete-part-description" className="mt-1.5 text-sm leading-relaxed text-steel">
                  This will permanently delete <strong className="font-semibold text-ink">{item.friendlyName}</strong>, its manufacturing file, preview image, and all comments.
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              This cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-xs leading-relaxed text-danger">{deleteError}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={closeDeleteDialog} disabled={deleting}>
                Keep part
              </button>
              <button
                type="button"
                className="btn-primary inline-flex items-center justify-center gap-2 bg-danger hover:opacity-90"
                onClick={deletePart}
                disabled={deleting}
                autoFocus
              >
                {deleting ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: ManufacturingExport["manufacturingStatus"] }) {
  const done = status === "complete";
  const cancelled = status === "cancelled";
  return (
    <span className={`tracked-label inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[9px] font-bold ${done ? "bg-success text-white" : cancelled ? "bg-danger text-white" : "bg-hazard text-ink"}`}>
      {done ? <CheckCircle2 size={12} /> : cancelled ? <XCircle size={12} /> : <Wrench size={12} />}
      {done ? "Completed" : cancelled ? "Cancelled" : "To make"}
    </span>
  );
}

function InfoCell({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="tracked-label text-[8px] font-semibold text-steel">{label}</p>
      <p className={`mt-1 truncate text-sm ${emphasis ? "text-lg font-semibold text-blueprint" : "font-medium"}`} title={value}>{value}</p>
    </div>
  );
}

function LatheDetails({ item }: { item: ManufacturingExport }) {
  const lathe = item.lathe!;
  const stockDimensions = lathe.diameterInches
    ? `${lathe.diameterInches}\" diameter`
    : lathe.outerDiameterInches
      ? `${lathe.outerDiameterInches}\" OD${lathe.innerDiameterInches ? ` × ${lathe.innerDiameterInches}\" ID` : ""}`
      : "Fixed stock profile";
  return (
    <DetailGroup title="Lathe setup" icon={<Wrench size={14} />}>
      <dl className="mb-4 space-y-2 text-xs">
        <DetailRow label="Stock" value={titleCase(lathe.stockType)} />
        <DetailRow label="Dimensions" value={stockDimensions} />
        {lathe.endReference && <DetailRow label="End reference" value={lathe.endReference} />}
      </dl>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <OperationCard label="End A" operation={lathe.endA} />
        <OperationCard label="End B" operation={lathe.endB} />
      </div>
    </DetailGroup>
  );
}

function OperationCard({ label, operation }: { label: string; operation: ManufacturingEndOperation }) {
  return (
    <div className="rounded-sm border border-steel-line bg-paper p-3">
      <p className="tracked-label text-[8px] font-bold text-blueprint">{label}</p>
      <p className="mt-1 text-xs font-semibold">{titleCase(operation.operation)}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-steel">{formatOperation(operation)}</p>
    </div>
  );
}

function DetailGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="tracked-label mb-2 flex items-center gap-2 text-[9px] font-bold text-steel">
        <span className="text-blueprint">{icon}</span> {title}
      </h3>
      <div className="rounded border border-steel-line bg-surface p-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-steel">{label}</dt>
      <dd className={`${mono ? "font-mono text-[10px]" : "font-medium"} min-w-0 break-all text-right text-ink`} title={value}>{value}</dd>
    </div>
  );
}

function formatOperation(operation: ManufacturingEndOperation) {
  if (operation.operation === "turn down") return `${operation.diameterInches}\" diameter × ${operation.lengthInches}\" long`;
  if (operation.operation === "tap") return `${operation.thread} thread × ${operation.depthInches}\" deep`;
  if (operation.operation === "drill") return `${operation.diameterInches}\" diameter × ${operation.depthInches}\" deep`;
  if (operation.operation === "other") return operation.notes || "See model";
  return "No additional operation";
}

function formatDate(date: Date | null) {
  return date?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) ?? "Date pending";
}

function formatDateTime(date: Date | null) {
  return date?.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) ?? "Pending";
}

function formatMeasurement(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

function completionSummary(item: ManufacturingExport) {
  const by = item.manufacturingCompletedBy?.name;
  const when = item.manufacturingCompletedAt ? formatDateTime(item.manufacturingCompletedAt) : null;
  if (by && when) return `Finished by ${by} · ${when}`;
  if (by) return `Finished by ${by}`;
  return "Finished quantity confirmed";
}

function cancellationSummary(item: ManufacturingExport) {
  const by = item.manufacturingCancelledBy?.name;
  const when = item.manufacturingCancelledAt ? formatDateTime(item.manufacturingCancelledAt) : null;
  if (by && when) return `Cancelled by ${by} · ${when}`;
  if (by) return `Cancelled by ${by}`;
  return "This part will not be made";
}

function titleCase(value: string) {
  if (value === "SRPP") return value;
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildOnshapeUrl(item: ManufacturingExport) {
  try {
    const { context } = item;
    const path = `/documents/${encodeURIComponent(context.documentId)}/${context.workspaceOrVersion}/${encodeURIComponent(context.workspaceOrVersionId)}/e/${encodeURIComponent(context.elementId)}`;
    return new URL(path, context.server).toString();
  } catch {
    return null;
  }
}
