import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build Master — Project Feasibility App",
  description: "Commercial real estate investment feasibility & intelligence platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
