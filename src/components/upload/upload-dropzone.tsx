"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";

type UploadState = "idle" | "selected" | "uploading" | "error";

const ACCEPTED = ".pdf,.txt,application/pdf,text/plain";
const MAX_FILE_SIZE_MB = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [state, setState] = React.useState<UploadState>("idle");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  function validateAndSetFile(candidate: File) {
    const isAccepted =
      candidate.type === "application/pdf" ||
      candidate.type === "text/plain" ||
      candidate.name.toLowerCase().endsWith(".pdf") ||
      candidate.name.toLowerCase().endsWith(".txt");

    if (!isAccepted) {
      setError("Only PDF and TXT files are supported.");
      setState("error");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. The limit is ${MAX_FILE_SIZE_MB}MB.`);
      setState("error");
      return;
    }
    if (candidate.size === 0) {
      setError("This file is empty.");
      setState("error");
      return;
    }
    setError(null);
    setFile(candidate);
    setState("selected");
  }

  function handleUpload() {
    if (!file) return;
    setState("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        const { document } = JSON.parse(xhr.responseText);
        toast({
          title: "Upload complete",
          description: "Reading and understanding your document...",
          variant: "success",
        });
        router.push(`/documents/${document.id}`);
      } else {
        let message = "Upload failed. Please try again.";
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          // ignore parse failure, use default message
        }
        setError(message);
        setState("error");
      }
    };

    xhr.onerror = () => {
      setError("Network error during upload. Please try again.");
      setState("error");
    };

    xhr.send(formData);
  }

  function reset() {
    setFile(null);
    setError(null);
    setProgress(0);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) validateAndSetFile(f);
        }}
      />

      {(state === "idle" || state === "error") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) validateAndSetFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border-strong bg-surface px-6 py-14 text-center transition-colors hover:border-brand hover:bg-brand-soft/40",
            dragActive && "border-brand bg-brand-soft/40",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UploadCloud className="size-6" />
          </div>
          <div>
            <p className="font-medium">Drop a document here, or click to browse</p>
            <p className="mt-1 text-sm text-foreground-muted">
              PDF or TXT · up to {MAX_FILE_SIZE_MB}MB
            </p>
          </div>
          {state === "error" && error && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-danger-soft px-3 py-1.5 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {(state === "selected" || state === "uploading") && file && (
        <div className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-foreground-muted">{formatBytes(file.size)}</p>
              {state === "uploading" && (
                <div className="mt-3 space-y-1.5">
                  <Progress value={progress} />
                  <p className="text-xs text-foreground-subtle">
                    {progress < 100 ? `Uploading… ${progress}%` : "Finishing up…"}
                  </p>
                </div>
              )}
            </div>
            {state === "selected" && (
              <button
                onClick={reset}
                className="text-foreground-subtle hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {state === "selected" && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpload}>
                Upload document
              </Button>
            </div>
          )}

          {state === "uploading" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="size-4 animate-spin" />
              Uploading your document…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
