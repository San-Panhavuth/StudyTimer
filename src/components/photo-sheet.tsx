"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sheet from "@/components/sheet";
import { MAX_PHOTOS } from "@/lib/photos";

type Props = {
  open: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (files: File[]) => void;
  onCancel: () => void;
};

export default function PhotoSheet({ open, busy, error, onSubmit, onCancel }: Props) {
  return (
    <Sheet open={open} onClose={busy ? () => {} : onCancel} title="Add photos">
      {/* Mounted only while open, so picked files reset on each stop. */}
      {open && <PhotoPicker busy={busy} error={error} onSubmit={onSubmit} onCancel={onCancel} />}
    </Sheet>
  );
}

function PhotoPicker({ busy, error, onSubmit, onCancel }: Omit<Props, "open">) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  }

  function removeAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <p>Add up to {MAX_PHOTOS} photos of what you studied.</p>

      <div className="photo-grid">
        {previews.map((url, i) => (
          <div className="photo-thumb" key={url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} />
            <button
              type="button"
              className="photo-remove"
              onClick={() => removeAt(i)}
              disabled={busy}
              aria-label={`Remove photo ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && (
          <button type="button" className="photo-add" onClick={() => inputRef.current?.click()} disabled={busy}>
            +
          </button>
        )}
      </div>
      <div className="photo-count">
        {files.length} / {MAX_PHOTOS}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handlePick} />

      {error && (
        <div className="auth-error" style={{ width: "100%" }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" onClick={() => onSubmit(files)} disabled={busy || files.length === 0}>
        {busy ? "Saving…" : "Save session"}
      </button>
      <button className="sheet-close" onClick={onCancel} disabled={busy}>
        Keep studying
      </button>
    </>
  );
}
