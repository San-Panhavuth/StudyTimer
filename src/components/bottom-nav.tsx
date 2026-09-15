"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

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
