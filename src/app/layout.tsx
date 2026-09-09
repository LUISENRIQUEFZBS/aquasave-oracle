import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aquasave",
  description: "Certificación de productos ahorradores de agua",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}