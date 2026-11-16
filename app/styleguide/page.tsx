import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { APP_NAME } from "@/src/config/app";
import { Button } from "@/src/ui/button";
import { Icon, iconGroups } from "@/src/ui/icons";
import {
  Card,
  DataList,
  DataRow,
  DemoBadge,
  Display,
  Heading,
  Label,
  StatusPill,
} from "@/src/ui/primitives";
import { communityImages, heroForSport, imageForSport, textureImages } from "@/src/config/images";
import { ClassCard, HeroPhoto, TextureEmpty } from "@/src/ui/photo";
import { ProgressChart, type ProgressPoint } from "@/src/ui/progress-chart";
import { StageTrack, type StageTrackItem } from "@/src/ui/stage-track";
import { TabBar } from "@/src/ui/tab-bar";
import { Toggle } from "@/src/ui/toggle";
import { colorTokens, motionTokens } from "@/src/ui/tokens";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("styleguide");
  return { title: t("title") };
}

/* Demo values only. Fixed instants, so the page prerenders. */
const TRACK_START = new Date("2026-11-19T17:30:00Z");
const GYM_START = new Date("2026-11-20T17:00:00Z");
const COMMUNITY_START = new Date("2026-11-21T09:00:00Z");
const GOAL_DATE = new Date("2027-05-09T10:00:00Z");
const WEEKLY_LOAD = [1180, 1320, 1260, 1450, 1510, 1240, 1620, 1700, 1480, 1810, 1760, 1920];
const FIRST_WEEK = 35;
const STAGE_KEYS = ["foundation", "build", "sharpen", "test", "recover"] as const;
const CURRENT_STAGE = 1;

export default async function StyleguidePage() {
  const t = await getTranslations("styleguide");
  const tc = await getTranslations("common");
  const format = await getFormatter();

  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit" });
  const trackTime = time(TRACK_START);

  const stages: StageTrackItem[] = STAGE_KEYS.map((key, i) => {
    const status = i < CURRENT_STAGE ? "done" : i === CURRENT_STAGE ? "current" : "upcoming";
    return {
      id: key,
      label: t(`stageTrack.names.${key}`),
      status,
      statusLabel: t(`stageTrack.status.${status}`),
    };
  });
  const stageTrack = (
    <StageTrack
      stages={stages}
      label={t("stageTrack.label")}
      position={t("stageTrack.position", { current: CURRENT_STAGE + 1, total: stages.length })}
      note={t("stageTrack.daysLeft", { count: 12 })}
      progress={5 / 12}
    />
  );

  const points: ProgressPoint[] = WEEKLY_LOAD.map((value, i) => ({
    label: t("chart.week", { number: FIRST_WEEK + i }),
    value,
    highlight: i === WEEKLY_LOAD.length - 1,
  }));

  const sessions = [
    { key: "track", start: TRACK_START, spots: 6, booked: true },
    { key: "gym", start: GYM_START, spots: 0, booked: false },
    { key: "community", start: COMMUNITY_START, spots: 12, booked: false },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="px-screen pt-6 pb-10">
        <div className="flex items-center justify-between gap-4">
          <span className="type-heading text-title">{APP_NAME}</span>
          <DemoBadge>{tc("demo")}</DemoBadge>
        </div>
        <Heading as="h1" size="lg" className="mt-10">
          {t("title")}
        </Heading>
        <p className="text-secondary mt-3 max-w-prose">{t("intro")}</p>
      </header>

      <main id="main" className="px-screen space-y-16 pb-20">
        <section aria-labelledby="sg-colour" className="space-y-6">
          <Heading id="sg-colour">{t("sections.colour")}</Heading>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {colorTokens.map((token) => (
              <li key={token.id}>
                <div
                  className="rounded-control border-hairline h-16 border"
                  style={{ backgroundColor: `var(${token.cssVar})` }}
                />
                <p className="mt-3 font-semibold">{token.name}</p>
                <p className="type-label text-secondary">{token.hex}</p>
                <p className="text-small text-secondary mt-1">{t(`colour.usage.${token.id}`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sg-type" className="space-y-8">
          <Heading id="sg-type">{t("sections.type")}</Heading>
          <div>
            <Label>{t("type.goalLabel")}</Label>
            <Display as="p" className="mt-2">
              {t("type.goalSample")}
            </Display>
          </div>
          <div>
            <Label>{t("type.headingLabel")}</Label>
            <Heading as="p" size="lg" className="mt-2">
              {t("type.headingSample")}
            </Heading>
          </div>
          <div>
            <Label>{t("type.bodyLabel")}</Label>
            <p className="mt-2 max-w-prose">{t("type.bodySample")}</p>
          </div>
          <div>
            <Label>{t("type.labelLabel")}</Label>
            <p className="type-label mt-2">{t("type.labelSample")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("type.dataLabel")}</Label>
              <p className="type-data mt-2">{trackTime}</p>
            </div>
            <div>
              <Label>{t("type.numberLabel")}</Label>
              <p className="mt-2">
                <span className="type-number">{format.number(6)}</span>{" "}
                <span className="text-small text-secondary">{t("type.numberUnit")}</span>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="sg-shape" className="space-y-6">
          <Heading id="sg-shape">{t("sections.shape")}</Heading>
          <ul className="text-secondary space-y-3">
            <li>{t("shape.radius")}</li>
            <li>{t("shape.dividers")}</li>
            <li>{t("shape.space")}</li>
            <li>{t("shape.elevation")}</li>
            <li>{t("shape.motion", { duration: motionTokens.quickMs })}</li>
            <li>{t("shape.targets")}</li>
          </ul>
        </section>

        <section aria-labelledby="sg-components" className="space-y-10">
          <Heading id="sg-components">{t("sections.components")}</Heading>
          <div className="space-y-3">
            <Label>{t("components.buttons")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">{t("components.book")}</Button>
              <Button variant="secondary">{t("components.joinWaitlist")}</Button>
              <Button variant="ghost">{t("components.close")}</Button>
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t("components.pills")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill>{t("components.pillBooked")}</StatusPill>
              <StatusPill tone="line">{t("components.pillWaitlist")}</StatusPill>
              <span className="text-small text-secondary">
                {t("components.spots", { count: 6 })}
              </span>
              <DemoBadge>{tc("demo")}</DemoBadge>
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t("components.toggles")}</Label>
            <Card flat className="divide-hairline divide-y py-1">
              <Toggle label={t("components.toggleLog")} defaultChecked />
              <Toggle
                label={t("components.togglePain")}
                description={t("components.togglePainHint")}
              />
            </Card>
          </div>
          <div className="space-y-3">
            <Label>{t("components.list")}</Label>
            <DataList>
              {sessions.map((s) => (
                <DataRow
                  key={s.key}
                  lead={time(s.start)}
                  title={t(`sessions.${s.key}.title`)}
                  meta={t(`sessions.${s.key}.meta`)}
                  trailing={
                    s.booked ? (
                      <StatusPill>{t("components.pillBooked")}</StatusPill>
                    ) : s.spots > 0 ? (
                      t("components.spots", { count: s.spots })
                    ) : (
                      t("components.full")
                    )
                  }
                />
              ))}
            </DataList>
          </div>
          <div className="space-y-3">
            <Label>{t("components.tabs")}</Label>
            <div className="rounded-card border-hairline overflow-hidden border">
              <TabBar
                label={t("components.tabsLabel")}
                items={[
                  {
                    href: "#sg-components",
                    label: t("components.tabPath"),
                    icon: "path",
                    current: true,
                  },
                  { href: "#sg-components", label: t("components.tabCoach"), icon: "coach" },
                  { href: "#sg-components", label: t("components.tabLog"), icon: "log" },
                  { href: "#sg-components", label: t("components.tabWeek"), icon: "week" },
                  { href: "#sg-components", label: t("components.tabMe"), icon: "me" },
                ]}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="sg-photos" className="space-y-8">
          <Heading id="sg-photos">{t("sections.photos")}</Heading>
          <p className="text-secondary max-w-prose">{t("photos.intro")}</p>
          <div className="space-y-3">
            <Label>{t("photos.cardLabel")}</Label>
            <ClassCard
              image={imageForSport("yoga")}
              lead={time(COMMUNITY_START)}
              title={t("photos.cardTitle")}
              meta={t("photos.cardMeta")}
              trailing={t("components.spots", { count: 6 })}
              action={
                <Button variant="primary" className="w-full">
                  {t("components.book")}
                </Button>
              }
            />
          </div>
          <div className="space-y-3">
            <Label>{t("photos.heroLabel")}</Label>
            <div className="rounded-card border-hairline overflow-hidden border pb-5">
              <HeroPhoto image={heroForSport("running")}>
                <div className="px-5">
                  <Label>{t("cover.goalLabel")}</Label>
                  <Display as="p" className="mt-2">
                    {t("cover.goal")}
                  </Display>
                </div>
              </HeroPhoto>
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t("photos.peopleLabel")}</Label>
            <div className="rounded-card border-hairline overflow-hidden border pb-5">
              <HeroPhoto image={communityImages.feed[0]} size="banner">
                <div className="px-5">
                  <Heading as="p">{t("photos.peopleTitle")}</Heading>
                  <p className="text-small text-secondary mt-1">{t("photos.peopleBody")}</p>
                </div>
              </HeroPhoto>
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t("photos.textureLabel")}</Label>
            <TextureEmpty image={textureImages.default}>
              <Heading as="p">{t("photos.emptyTitle")}</Heading>
              <p className="text-small text-secondary mt-1">{t("photos.emptyBody")}</p>
            </TextureEmpty>
          </div>
        </section>

        <section aria-labelledby="sg-icons" className="space-y-6">
          <Heading id="sg-icons">{t("sections.icons")}</Heading>
          <p className="text-secondary max-w-prose">{t("icons.intro")}</p>
          {iconGroups.map((group) => (
            <ul key={group.id} className="grid grid-cols-4 gap-2 sm:grid-cols-6" data-icon-group>
              {group.names.map((name) => (
                <li
                  key={name}
                  className="rounded-control border-hairline bg-surface flex flex-col items-center gap-2 border px-1 py-3"
                >
                  <Icon name={name} size={28} />
                  <span className="type-label text-secondary text-[0.5625rem]">{name}</span>
                </li>
              ))}
            </ul>
          ))}
        </section>

        <section aria-labelledby="sg-stage" className="space-y-6">
          <Heading id="sg-stage">{t("sections.stageTrack")}</Heading>
          {stageTrack}
        </section>

        <section aria-labelledby="sg-chart" className="space-y-6">
          <Heading id="sg-chart">{t("sections.chart")}</Heading>
          <ProgressChart
            points={points}
            title={t("chart.title")}
            unit={t("chart.unit")}
            columnLabels={{ period: t("chart.columnPeriod"), value: t("chart.columnValue") }}
          />
          <p className="text-small text-secondary">{t("chart.note")}</p>
        </section>

        <section aria-labelledby="sg-cover" className="space-y-8">
          <Heading id="sg-cover">{t("sections.cover")}</Heading>
          <div>
            <Label>{t("cover.goalLabel")}</Label>
            <Display as="p" className="mt-2">
              {t("cover.goal")}
            </Display>
            <p className="text-secondary mt-3">
              {t("cover.why", {
                date: format.dateTime(GOAL_DATE, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </p>
            <div className="mt-6">{stageTrack}</div>
          </div>
          <Card className="space-y-4">
            <div>
              <Label>{t("cover.nextLabel")}</Label>
              <Heading as="p" className="mt-1.5 text-[1.375rem]">
                {t("cover.nextTitle", { time: trackTime })}
              </Heading>
              <p className="text-small text-secondary mt-1">{t("cover.nextMeta", { count: 6 })}</p>
            </div>
            <Button variant="primary" className="w-full">
              {t("cover.action")}
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
