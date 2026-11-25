import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nango GitHub Repos Demo",
  description: "Minimal Next.js + TypeScript example using Nango to connect GitHub and list repositories.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
