import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";

/**
 * Barlow is the closest publicly available font to the Würth corporate typeface.
 * PRODUCTION: Replace with the actual licensed "Würth Sans" font files by adding
 * them to /public/fonts/ and updating the CSS @font-face declaration in globals.css.
 */
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Würth Professional Solutions – Expense Claims",
  description: "Online expense claim portal for Würth Professional Solutions LLC, Dubai UAE",
  appleWebApp: { statusBarStyle: "default", title: "WPS Claims" },
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
    <html lang="en" className={barlow.variable}>
      <body className="min-h-screen bg-paper antialiased font-barlow">{children}</body>
    </html>
  );
}
