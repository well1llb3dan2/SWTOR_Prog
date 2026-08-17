import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwaRegister";
import { SiteHeader } from "@/components/siteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infamous — Combat Analytics",
  description: "Live combat meters and raid progression for Star Wars: The Old Republic",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded via link rather than next/font so a build never needs network access. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Noto+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="blueprint">
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}
