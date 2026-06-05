import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Font: Official Würth typeface loaded from /public/fonts/ via @font-face in globals.css.
 * Files: WuerthBook.ttf (400), WuerthDemiBold.ttf (600), WuerthBold.ttf (700), WuerthGlobal-Bold (800)
 * No next/font/google needed — fonts are self-hosted.
 */

export const metadata: Metadata = {
  title: "Würth Professional Solutions – Expense Claims",
  description: "Online expense claim portal for Würth Professional Solutions LLC, Dubai UAE",
  // appleWebApp removed — apple-mobile-web-app-capable is deprecated in modern iOS
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#CC0000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-paper antialiased"
        style={{ fontFamily: "Wuerth, system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
