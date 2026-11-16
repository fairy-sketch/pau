import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/src/ui/button";
import { Heading } from "@/src/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title") };
}

/** Precached by the service worker and shown when a page cannot be loaded. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <div className="p-screen mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8">
      <main id="main">
        <Heading as="h1" size="lg">
          {t("title")}
        </Heading>
        <p className="text-secondary mt-3 max-w-prose">{t("body")}</p>
      </main>
      <ButtonLink href="/" variant="secondary" className="w-full">
        {t("home")}
      </ButtonLink>
    </div>
  );
}
