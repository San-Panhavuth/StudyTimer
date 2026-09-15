"use client";

import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/(auth)/actions";

export default function ProfileMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
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
    </>
  );
}
