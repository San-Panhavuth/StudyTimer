"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Sheet from "@/components/sheet";
import { signOutAction } from "@/app/(auth)/actions";

export default function ProfileMenu({
  displayName,
  role,
  childCode,
}: {
  displayName: string;
  role: "child" | "parent";
  childCode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function copyChildCode() {
    if (!childCode) return;
    try {
      await navigator.clipboard.writeText(childCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — nothing to fall back to
    }
  }

  async function openQr() {
    if (!childCode) return;
    setQrOpen(true);
    if (!qrDataUrl) {
      const url = await QRCode.toDataURL(childCode, { margin: 1, width: 320 });
      setQrDataUrl(url);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        className="profile-btn"
        aria-label="Profile"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg className="icon" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4"></circle>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
        </svg>
        <span>{displayName}</span>
      </button>

      <div ref={menuRef} className={`profile-dropdown${open ? " open" : ""}`}>
        {role === "child" && childCode && (
          <div className="dd-child-id">
            <span className="dd-child-id-label">Your Child ID</span>
            <div className="dd-child-id-row">
              <code>{childCode}</code>
              <button type="button" className="icon-btn" onClick={copyChildCode} aria-label="Copy Child ID">
                {copied ? (
                  <svg className="icon" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg className="icon" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="12" height="12" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%", marginTop: 8 }}
              onClick={openQr}
            >
              Show QR Code
            </button>
          </div>
        )}
        <form action={signOutAction}>
          <button className="dd-logout" type="submit">
            <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </button>
        </form>
      </div>

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="Your Child ID">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR code for child ID ${childCode}`} width={220} height={220} />
          ) : (
            <div style={{ width: 220, height: 220 }} />
          )}
          <code style={{ fontSize: 18, letterSpacing: "0.1em" }}>{childCode}</code>
          <p style={{ textAlign: "center" }}>Have a parent scan this, or enter the code above, to link your account.</p>
        </div>
        <button className="sheet-close" onClick={() => setQrOpen(false)}>
          Close
        </button>
      </Sheet>
    </>
  );
}
