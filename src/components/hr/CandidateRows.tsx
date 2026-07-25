"use client";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import type { CandidateInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";

const ACCEPT = ".pdf,.docx";
const uid = () => Math.random().toString(36).slice(2, 9);
export const emptyRow = (): CandidateInput => ({ id: uid(), name: "", cv: null, jmp: null });

/** Compact per-row file button (CV / JMP) with validation + filename preview. */
function FileSlot({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const maxBytes = publicEnv.maxFileMb * 1024 * 1024;
  return (
    <label
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-2 text-xs",
        file ? "text-foreground" : "text-muted-foreground hover:bg-muted",
      )}
      title={file?.name}
    >
      {file ? <FileText className="h-3.5 w-3.5 text-accent" /> : <Upload className="h-3.5 w-3.5" />}
      <span className="max-w-[110px] truncate">{file ? file.name : label}</span>
      <input
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > maxBytes) {
            alert(`File exceeds ${publicEnv.maxFileMb} MB.`);
            return;
          }
          onChange(f);
        }}
      />
    </label>
  );
}

export function CandidateRows({
  rows,
  setRows,
  disabled,
}: {
  rows: CandidateInput[];
  setRows: (r: CandidateInput[]) => void;
  disabled?: boolean;
}) {
  const update = (id: string, patch: Partial<CandidateInput>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground sm:grid">
        <span>Candidate name</span>
        <span>CV (required)</span>
        <span>JMP (optional)</span>
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Input
            placeholder={`Candidate ${i + 1}`}
            value={r.name}
            disabled={disabled}
            onChange={(e) => update(r.id, { name: e.target.value })}
            className="h-9"
          />
          <FileSlot label="Upload CV" file={r.cv} onChange={(f) => update(r.id, { cv: f })} />
          <FileSlot label="Upload JMP" file={r.jmp} onChange={(f) => update(r.id, { jmp: f })} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || rows.length === 1}
            onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
            aria-label="Remove candidate"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="subtle"
        size="sm"
        disabled={disabled}
        onClick={() => setRows([...rows, emptyRow()])}
      >
        <Plus className="h-4 w-4" /> Add candidate
      </Button>
    </div>
  );
}
