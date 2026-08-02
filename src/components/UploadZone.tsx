"use client";

import { useCallback, useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from "@/lib/constants";

interface UploadZoneProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");
const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024);

export function UploadZone({ file, onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFileSelected(files[0]);
    },
    [onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={
        file
          ? `Selected file ${file.name}. Press Enter to choose a different file.`
          : `Upload resume. ${ACCEPTED_EXTENSIONS.join(" or ").toUpperCase()}, up to ${MAX_FILE_MB}MB.`
      }
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`clay-well flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[28px] bg-muted p-6 text-center transition-all
        ${isDragging ? "ring-2 ring-primary/50 scale-[1.01]" : ""}
        ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        accept={ACCEPTED}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className={`clay-sm mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-card transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {file ? (
        <>
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB — click or drop to replace</p>
        </>
      ) : (
        <>
          <p className="font-medium">Drop your resume here, or click to browse</p>
          <p className="text-sm text-muted-foreground">PDF or DOCX, up to {MAX_FILE_MB}MB</p>
        </>
      )}
    </div>
  );
}
