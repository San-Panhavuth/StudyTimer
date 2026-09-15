"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type QrScanner from "qr-scanner";
import Sheet from "@/components/sheet";
import { requestLinkChildAction } from "@/app/(app)/actions";

export default function AddChildSheet({
  open,
  onClose,
  onRequested,
}: {
  open: boolean;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [tab, setTab] = useState<"code" | "scan">("code");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  function submitCode(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const { email } = await requestLinkChildAction(trimmed);
        setCode("");
        onRequested();
        closeAddSheet();
        setSuccessEmail(email);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that child.");
      }
    });
  }

  useEffect(() => {
    if (!open || tab !== "scan") {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const { default: QrScannerCtor } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      const scanner = new QrScannerCtor(
        videoRef.current,
        (result) => {
          scanner.stop();
          submitCode(result.data);
        },
        { highlightScanRegion: true, highlightCodeOutline: true },
      );
      scannerRef.current = scanner;
      try {
        await scanner.start();
      } catch {
        setError("Couldn't access the camera. Check permissions, or use Enter Code instead.");
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  function closeAddSheet() {
    setError(null);
    setTab("code");
    onClose();
  }

  return (
    <>
      <Sheet open={open} onClose={closeAddSheet} title="Add a child">
        <div className="role-toggle">
          <button type="button" className={`role-toggle-btn${tab === "code" ? " on" : ""}`} onClick={() => setTab("code")}>
            Enter Code
          </button>
          <button type="button" className={`role-toggle-btn${tab === "scan" ? " on" : ""}`} onClick={() => setTab("scan")}>
            Scan QR
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ width: "100%", marginTop: 10 }}>
            {error}
          </div>
        )}

        {tab === "code" ? (
          <div className="sheet-add" style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Child ID..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCode(code);
              }}
            />
            <button onClick={() => submitCode(code)} disabled={pending}>
              Add
            </button>
          </div>
        ) : (
          <div className="qr-scan-box">
            <video ref={videoRef} muted playsInline />
          </div>
        )}

        <button className="sheet-close" onClick={closeAddSheet} style={{ marginTop: 12 }}>
          Close
        </button>
      </Sheet>

      <Sheet open={!!successEmail} onClose={() => setSuccessEmail(null)} title="Child added">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <div className="success-check">
            <svg className="icon" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <p style={{ textAlign: "center" }}>
            <b>{successEmail}</b> is linked. You can now see their study log.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setSuccessEmail(null)}>
          Done
        </button>
      </Sheet>
    </>
  );
}
