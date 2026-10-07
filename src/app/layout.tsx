import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpsPro · Attendance, rosters and payroll-ready hours for shift teams",
  description:
    "See who's working at every location across the UAE, checked by selfie and location, with rosters, your attendance rules and vendor costs in one system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={satoshi.variable}>
      <body>
        {/* Intro elements start hidden for the GSAP reveal; show them if JS is off. */}
        <noscript>
          <style>{`[data-intro]{visibility:visible}`}</style>
        </noscript>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
