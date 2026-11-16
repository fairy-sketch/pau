import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/src/config/app";
import { ButtonLink } from "@/src/ui/button";
import { Display, Label, Surface } from "@/src/ui/primitives";

/** Placeholder cover for M0. The Path home replaces it in M1. */
export default async function HomePage() {
  const t = await getTranslations();

  return (
    <Surface tone="ink" className="flex min-h-dvh flex-col justify-between p-5 md:p-10">
      <Label>{t("home.kicker")}</Label>
      <main id="main" className="max-w-3xl">
        <Display size="lg">{APP_NAME}</Display>
        <p className="type-display text-display-sm mt-2">{t("app.tagline")}</p>
        <p className="text-muted mt-6 max-w-prose">{t("home.body")}</p>
      </main>
      <div>
        <ButtonLink href="/styleguide" variant="accent">
          {t("home.styleguideLink")}
        </ButtonLink>
      </div>
    </Surface>
  );
}
