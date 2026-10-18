import type { Metadata, Viewport } from "next";
import { Hanuman, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const hanuman = Hanuman({
  variable: "--font-hanuman",
  subsets: ["khmer", "latin"],
  weight: ["400", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Study Time",
  description: "Study timer for Cambodian school subjects.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanuman.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        {/* Some browser extensions stamp `bis_skin_checked` on every div before
            React hydrates, causing a (harmless) hydration warning. On /timer,
            strip it as it appears. Best-effort: depends on running before the
            extension's next pass. */}
        <Script
          id="strip-bis-skin-checked"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `if (location.pathname === "/timer") {
  var strip = function (root) {
    if (root.removeAttribute) root.removeAttribute("bis_skin_checked");
    var els = root.querySelectorAll ? root.querySelectorAll("[bis_skin_checked]") : [];
    for (var i = 0; i < els.length; i++) els[i].removeAttribute("bis_skin_checked");
  };
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === "attributes") m.target.removeAttribute("bis_skin_checked");
      else for (var j = 0; j < m.addedNodes.length; j++) if (m.addedNodes[j].nodeType === 1) strip(m.addedNodes[j]);
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["bis_skin_checked"] });
  document.addEventListener("DOMContentLoaded", function () { strip(document.documentElement); });
}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
