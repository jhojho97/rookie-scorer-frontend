"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileArchive, FolderUp, UploadCloud } from "lucide-react";
import type { CandidateInput } from "@/types";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";

const uid = () => Math.random().toString(36).slice(2, 9);

/** Filenames that look like a CV rather than a paper. */
const CV_HINT = /\b(cv|resume|vita|vitae)\b/i;
const DOC_EXT = /\.(pdf|docx)$/i;

/** Strip extension and CV/JMP words to get at the person's name. */
function candidateKey(filename: string): string {
  return filename
    .replace(DOC_EXT, "")
    .replace(/\b(cv|resume|vita|vitae|jmp|job.?market.?paper|paper|draft)\b/gi, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function prettyName(key: string): string {
  return key.replace(/\b\w/g, (c) => c.toUpperCase()) || "Candidate";
}

/**
 * Group dropped files into candidates.
 *
 * Two shapes are handled, because both are how these files actually arrive:
 *  - a folder per candidate (relative paths from a directory drop), and
 *  - loose files named "Smith_CV.pdf" / "Smith_JMP.pdf".
 * Within a group the CV is the file whose name says so, else the smaller file —
 * a job-market paper is essentially always longer than a CV.
 */
export function groupFiles(files: File[]): CandidateInput[] {
  const docs = files.filter((f) => DOC_EXT.test(f.name));
  const groups = new Map<string, File[]>();

  for (const f of docs) {
    const rel = (f as File & { path?: string; webkitRelativePath?: string });
    const relPath = rel.webkitRelativePath || rel.path || "";
    const parts = relPath.split("/").filter(Boolean);
    // A directory drop gives "batch/Smith Jane/cv.pdf" -> group on "Smith Jane".
    const folder = parts.length >= 2 ? parts[parts.length - 2] : "";
    const key = folder ? folder.toLowerCase() : candidateKey(f.name) || f.name.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  return [...groups.entries()].map(([key, fs]) => {
    let cv: File | null = null;
    let jmp: File | null = null;
    const named = fs.filter((f) => CV_HINT.test(f.name));
    if (named.length) {
      cv = named[0];
      jmp = fs.find((f) => f !== cv) ?? null;
    } else if (fs.length === 1) {
      cv = fs[0];
    } else {
      const sorted = [...fs].sort((a, b) => a.size - b.size);
      cv = sorted[0];
      jmp = sorted[sorted.length - 1];
    }
    return { id: uid(), name: prettyName(key), cv, jmp };
  });
}

export function BulkUpload({
  existing,
  onCandidates,
  onArchive,
  onError,
  disabled,
}: {
  /** Rows already staged. A drop ADDS to these rather than replacing them. */
  existing: CandidateInput[];
  /** The full staged list after the drop is merged in. */
  onCandidates: (c: CandidateInput[]) => void;
  onArchive: (f: File) => void;
  /** Called on EVERY drop: a message to show, or null to clear the last one.
   *  The caller must not clear this itself -- see onDrop. */
  onError: (msg: string | null) => void;
  disabled?: boolean;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const maxBytes = publicEnv.maxFileMb * 1024 * 1024;

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted.length) return;

      // Every message for this drop is collected and reported in ONE onError
      // call at the end.
      //
      // It used to call onError() as each problem was found and then
      // onCandidates() afterwards -- and the page's onCandidates handler
      // cleared the error. React batches both into one update, so the clear
      // always won and the message never appeared. Dropping 21 folders
      // silently kept 20 of them, which is exactly the case where the user
      // most needs to be told.
      const problems: string[] = [];
      const report = () => onError(problems.length ? problems.join(" ") : null);

      const zip = accepted.find((f) => /\.zip$/i.test(f.name));
      if (zip) {
        // A zip of candidate folders goes to the server whole — it unpacks and
        // identifies each folder's CV and JMP itself.
        onArchive(zip);
        setHint(`${zip.name} — the server will unpack it.`);
        report();
        return;
      }

      const oversized = accepted.filter((f) => f.size > maxBytes);
      if (oversized.length) {
        problems.push(
          `${oversized.length} file${oversized.length === 1 ? "" : "s"} over ${publicEnv.maxFileMb} MB ${
            oversized.length === 1 ? "was" : "were"
          } skipped: ${oversized.map((f) => f.name).join(", ")}.`,
        );
      }

      const usable = accepted.filter((f) => f.size <= maxBytes);
      const grouped = groupFiles(usable);
      if (!grouped.length) {
        problems.push("No PDF or DOCX files were found in that drop.");
        setHint(null);
        report();
        return;
      }

      // A drop ADDS to what is already staged. It used to replace it, so
      // dragging a second candidate in silently discarded the first -- and any
      // row typed in by hand along with it.
      //
      // Blank placeholder rows are not real candidates, so they make way for
      // the drop rather than counting against the limit.
      const staged = existing.filter((r) => r.cv);
      const merged = [...staged];
      let added = 0;
      let replaced = 0;
      for (const c of grouped) {
        // Same person dropped twice updates that row instead of making a twin.
        const at = merged.findIndex(
          (r) => r.name.trim().toLowerCase() === c.name.trim().toLowerCase(),
        );
        if (at >= 0) {
          merged[at] = { ...c, id: merged[at].id };
          replaced += 1;
        } else {
          merged.push(c);
          added += 1;
        }
      }

      // The cap applies to the MERGED total, not to this drop alone.
      const kept = merged.slice(0, publicEnv.maxBatch);
      const dropped = merged.slice(publicEnv.maxBatch);
      if (dropped.length) {
        // Name who was left out. "Only the first 20 were added" does not tell
        // the recruiter WHICH 20, and the order here is drop order, not
        // anything they chose.
        problems.push(
          `That would make ${merged.length} candidates and the limit is ${publicEnv.maxBatch} per batch, ` +
            `so ${dropped.length} ${dropped.length === 1 ? "was" : "were"} left out: ` +
            `${dropped.map((c) => c.name).join(", ")}. Score these ${publicEnv.maxBatch} first, ` +
            `then drop the rest as a second batch.`,
        );
      }

      onCandidates(kept);
      const parts = [`Added ${added}`];
      if (replaced) parts.push(`updated ${replaced}`);
      setHint(
        `${parts.join(", ")} — ${kept.length} candidate${kept.length === 1 ? "" : "s"} staged. ` +
          `Check the pairing below.`,
      );
      report();
    },
    [existing, maxBytes, onArchive, onCandidates, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
    noClick: false,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center transition-colors hover:border-accent/60 hover:bg-muted/30",
          isDragActive && "border-accent bg-accent/5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} aria-label="Bulk upload candidate files" />
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm">
          <span className="font-medium text-accent">Drop a folder, a zip, or many files</span> to add
          candidates at once
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FolderUp className="h-3.5 w-3.5" /> one folder per candidate
          </span>
          <span className="inline-flex items-center gap-1">
            <FileArchive className="h-3.5 w-3.5" /> or a .zip
          </span>
          <span>· up to {publicEnv.maxBatch} candidates</span>
        </p>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
