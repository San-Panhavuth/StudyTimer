"use client";

import { useState } from "react";

// Collapsible photo strip for a session card: tap the toggle to drop down a
// horizontally scrolling row of thumbnails; tap a thumbnail to open it full size.
export default function SessionPhotos({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  if (images.length === 0) return null;

  return (
    <div className="session-photos">
      <button type="button" className={`photos-toggle${open ? " open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <svg className="icon" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>
          Photos ({images.length})
        </span>
        <svg className="icon chevron" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {open && (
        <div className="photos-strip" data-no-swipe>
          {images.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="photos-strip-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Session photo ${i + 1}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
