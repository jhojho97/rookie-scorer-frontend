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
  onCandidates,
  onArchive,
  onError,
  disabled,
}: {
  onCandidates: (c: CandidateInput[]) => void;
  onArchive: (f: File) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const maxBytes = publicEnv.maxFileMb * 1024 * 1024;

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted.length) return;

      const zip = accepted.find((f) => /\.zip$/i.test(f.name));
      if (zip) {
        // A zip of candidate folders goes to the server whole — it unpacks and
        // identifies each folder's CV and JMP itself.
        onArchive(zip);
        setHint(`${zip.name} — the server will unpack it.`);
        return;
      }

      const oversized = accepted.filter((f) => f.size > maxBytes);
      if (oversized.length) {
        onError(
          `${oversized.length} file${oversized.length === 1 ? "" : "s"} exceed ${publicEnv.maxFileMb} MB and ${
            oversized.length === 1 ? "was" : "were"
          } skipped: ${oversized.map((f) => f.name).join(", ")}`,
        );
      }
      const usable = accepted.filter((f) => f.size <= maxBytes);
      const grouped = groupFiles(usable);
      if (!grouped.length) {
        onError("No PDF or DOCX files found in that drop.");
        return;
      }
      if (grouped.length > publicEnv.maxBatch) {
        onError(
          `That drop contains ${grouped.length} candidates; the limit is ${publicEnv.maxBatch} per batch. Only the first ${publicEnv.maxBatch} were added.`,
        );
      }
      onCandidates(grouped.slice(0, publicEnv.maxBatch));
      setHint(
        `Matched ${Math.min(grouped.length, publicEnv.maxBatch)} candidate${grouped.length === 1 ? "" : "s"} — check the pairing below.`,
      );
    },
    [maxBytes, onArchive, onCandidates, onError],
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
