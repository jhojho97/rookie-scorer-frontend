"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { publicEnv } from "@/lib/env";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export interface UploadCardProps {
  label: string;
  optional?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}

/** Drag-and-drop file input with validation, filename preview and remove. */
export function UploadCard({ label, optional, file, onChange }: UploadCardProps) {
  const maxBytes = publicEnv.maxFileMb * 1024 * 1024;

  const onDrop = useCallback(
    (accepted: File[]) => accepted[0] && onChange(accepted[0]),
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: maxBytes,
    multiple: false,
  });

  const rejection = fileRejections[0]?.errors[0];
  const rejectionMsg = rejection
    ? rejection.code === "file-too-large"
      ? `File exceeds ${publicEnv.maxFileMb} MB.`
      : "Only PDF or DOCX files are accepted."
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {optional && <span className="text-xs text-muted-foreground">(optional)</span>}
      </div>

      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <span className="flex items-center gap-2 truncate text-sm">
            <FileText className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center transition-colors hover:border-accent/60 hover:bg-muted/30",
            isDragActive && "border-accent bg-accent/5",
          )}
        >
          <input {...getInputProps()} aria-label={`Upload ${label}`} />
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium text-accent">Click to upload</span> or drag & drop
          </p>
          <p className="text-xs text-muted-foreground">PDF or DOCX · up to {publicEnv.maxFileMb} MB</p>
        </div>
      )}
      {rejectionMsg && <p className="text-xs text-negative">{rejectionMsg}</p>}
    </div>
  );
}
