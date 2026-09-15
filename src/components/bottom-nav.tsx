"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AddChildSheet from "./add-child-sheet";

export default function BottomNav({ role }: { role: "child" | "parent" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  if (role === "parent") {
    return (
      <>
        <nav className="bottom-nav bottom-nav-parent">
          <Link href="/children" className={pathname === "/children" ? "active" : ""}>
            <svg className="icon" viewBox="0 0 24 24">
              <circle cx="9" cy="8" r="3"></circle>
              <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"></path>
              <circle cx="17.5" cy="9" r="2.3"></circle>
              <path d="M15.5 13.2c2.7.4 4.5 2.3 4.5 4.8"></path>
            </svg>
            Children
          </Link>
          <button type="button" className="bottom-nav-add" aria-label="Add child" onClick={() => setAddOpen(true)}>
            <svg className="icon" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <Link href="/children-log" className={pathname === "/children-log" ? "active" : ""}>
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M4 19V5"></path>
              <rect x="8" y="11" width="3.2" height="8"></rect>
              <rect x="13" y="7" width="3.2" height="12"></rect>
              <rect x="18" y="14" width="3.2" height="5"></rect>
            </svg>
            Children Log
          </Link>
        </nav>
        <AddChildSheet open={addOpen} onClose={() => setAddOpen(false)} onRequested={() => router.refresh()} />
      </>
    );
  }

  return (
    <nav className="bottom-nav">
      <Link href="/timer" className={pathname === "/timer" ? "active" : ""}>
        <svg className="icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
          <polyline points="12 7 12 12 15.5 14"></polyline>
        </svg>
        Timer
      </Link>
      <Link href="/log" className={pathname === "/log" ? "active" : ""}>
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M4 19V5"></path>
          <rect x="8" y="11" width="3.2" height="8"></rect>
          <rect x="13" y="7" width="3.2" height="12"></rect>
          <rect x="18" y="14" width="3.2" height="5"></rect>
        </svg>
        Study Log
      </Link>
    </nav>
  );
}
