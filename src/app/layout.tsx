import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { PlausibleAnalytics } from "@/components/analytics/plausible";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { dirFor } from "@/lib/i18n/config";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  SITE_KEYWORDS,
  SITE_NAME,
  siteUrl,
} from "@/lib/seo/site";

// Inter for body — wide weight range, neutral. Bebas Neue for display —
// tall condensed grotesk that reads as "gym sign" rather than "AI template".
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DEFAULT_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
    languages: { en: "/", ar: "/" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
    url: siteUrl(),
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = readLocaleFromCookie();
  const dir = dirFor(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${bebas.variable}`}
    >
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ToastProvider />
        <PlausibleAnalytics />
      </body>
    </html>
  );
}
