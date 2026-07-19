import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

// ─── Font ─────────────────────────────────────────────────────────────────────
// next/font downloads JetBrains Mono at BUILD TIME and serves it from
// your own domain. Zero external font request at runtime = faster loads.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
});

// ─── SEO ──────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "BLAX SHEEP — Thrifted Streetwear & Custom Fits",
    template: "%s | BLAX SHEEP",
  },
  description:
    "Unique thrifted streetwear — jackets, pants, shoes and more. Customise with embroidery patches, DTF stickers & enamel pins.",
  keywords: ["thrift store", "streetwear", "vintage clothing", "custom patches", "India"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "BLAX SHEEP",
    title: "BLAX SHEEP — Thrifted Streetwear & Custom Fits",
    description: "Unique thrifted streetwear. Customise with patches, stickers & pins.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7FD04",
};

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
        <body className={jetbrainsMono.className}>
          <ConvexClientProvider>
            <Header />
            {children}
            <ToastContainer />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
