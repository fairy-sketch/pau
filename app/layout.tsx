import "./globals.css";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_NAME } from "@/src/config/app";
import { tokenHex } from "@/src/ui/tokens";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    applicationName: APP_NAME,
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t("description"),
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black" },
    icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }] },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: tokenHex("ink"),
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="type-label bg-fg text-bg sr-only z-50 p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("skipToContent")}
        </a>
        <SerwistProvider swUrl="/serwist/sw.js">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
