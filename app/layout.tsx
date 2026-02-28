import type { Metadata } from "next";
import { Lexend, Lexend_Exa, Inter } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLARO",
  description: "Transparent Financial Management System for VSU-SEB",
};

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

const lexendExa = Lexend_Exa({
  subsets: ["latin"],
  variable: "--font-lexend-exa",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${lexendExa.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
