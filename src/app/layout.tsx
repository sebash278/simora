import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#090b0e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SIMORA · Monitoreo de Ruido Ambiental IoT",
  description:
    "Sistema de Monitoreo de Ruido Ambiental mediante Sensores Móviles en Espacios Académicos",
  applicationName: "SIMORA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SIMORA",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090b0e] text-[#f0f3f6]">
        {children}
      </body>
    </html>
  );
}
