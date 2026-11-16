import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/src/config/app";
import { ButtonLink } from "@/src/ui/button";
import { Display, Label } from "@/src/ui/primitives";

/** Placeholder cover for M0. The Path home replaces it in M1. */
export default async function HomePage() {
  const t = await getTranslations();

  return (
    <div className="p-screen mx-auto flex min-h-dvh max-w-md flex-col justify-between">
      <Label>{t("home.kicker")}</Label>
      <main id="main">
        <Display>{APP_NAME}</Display>
        <p className="type-heading text-heading mt-2">{t("app.tagline")}</p>
        <p className="text-secondary mt-6 max-w-prose">{t("home.body")}</p>
      </main>
      <ButtonLink href="/styleguide" variant="primary" className="w-full">
        {t("home.styleguideLink")}
      </ButtonLink>
    </div>
  );
}
