import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DraftSpace",
  description: "A lightweight collaborative rich-text document editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
