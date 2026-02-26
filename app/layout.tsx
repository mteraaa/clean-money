import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLARO",
  description: "Transparent Financial Management System for VSU-SEB",
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
