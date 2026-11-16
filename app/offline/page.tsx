import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/src/ui/button";
import { Display, Surface } from "@/src/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title") };
}

/** Precached by the service worker and shown when a page cannot be loaded. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <Surface tone="ink" className="flex min-h-dvh flex-col justify-end gap-6 p-5 md:p-10">
      <main id="main">
        <Display size="lg">{t("title")}</Display>
        <p className="text-muted mt-6 max-w-prose">{t("body")}</p>
      </main>
      <div>
        <ButtonLink href="/" variant="outline">
          {t("home")}
        </ButtonLink>
      </div>
    </Surface>
  );
}
