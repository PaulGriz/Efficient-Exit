import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Efficient Exit — Simulate, Compare, Optimize",
    template: "%s — Efficient Exit",
  },
  applicationName: "Efficient Exit",
  description:
    "An interactive overhead simulation that compares strategies for getting a seated crowd out the door — front-to-back, back-to-front, outside-in, inside-out, and random — with live congestion and completion-time stats.",
  keywords: [
    "simulation",
    "crowd flow",
    "wedding exit",
    "queueing",
    "three.js",
    "react three fiber",
    "next.js",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    title: "Efficient Exit",
    description:
      "Simulate. Compare. Optimize. Visualise smarter ways for crowds to leave.",
    siteName: "Efficient Exit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Efficient Exit",
    description:
      "Simulate. Compare. Optimize. Visualise smarter ways for crowds to leave.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-mono",
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
