import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { APP_NAME, DEFAULT_CURRENCY } from "@/src/config/app";
import { Button } from "@/src/ui/button";
import {
  DataList,
  DataRow,
  DemoBadge,
  Display,
  Label,
  SectionHeading,
  StatusChip,
  Surface,
} from "@/src/ui/primitives";
import { ProgressChart, type ProgressPoint } from "@/src/ui/progress-chart";
import { StageTrack, type StageTrackItem } from "@/src/ui/stage-track";
import { Ticker } from "@/src/ui/ticker";
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
      label: t("stageTrack.stage", {
        index: String(i + 1).padStart(2, "0"),
        name: t(`stageTrack.names.${key}`),
      }),
      status,
      statusLabel: t(`stageTrack.status.${status}`),
      note: status === "current" ? t("stageTrack.daysLeft", { count: 12 }) : undefined,
    };
  });

  const points: ProgressPoint[] = WEEKLY_LOAD.map((value, i) => ({
    label: t("chart.week", { number: FIRST_WEEK + i }),
    value,
    highlight: i === WEEKLY_LOAD.length - 1,
  }));

  const sessions = [
    { key: "track", start: TRACK_START, spots: 6 },
    { key: "gym", start: GYM_START, spots: 0 },
    { key: "community", start: COMMUNITY_START, spots: 12 },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="p-5 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <Label>{APP_NAME}</Label>
          <DemoBadge>{tc("demo")}</DemoBadge>
        </div>
        <Display size="md" className="mt-6">
          {t("title")}
        </Display>
        <p className="text-muted mt-4 max-w-prose">{t("intro")}</p>
      </header>

      <main id="main" className="space-y-14 px-5 pb-16 md:px-10">
        <section aria-labelledby="sg-colour">
          <SectionHeading id="sg-colour">{t("sections.colour")}</SectionHeading>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
            {colorTokens.map((token) => (
              <li key={token.id}>
                <div
                  className="border-fg h-16 border"
                  style={{ backgroundColor: `var(${token.cssVar})` }}
                />
                <p className="type-label mt-2 font-bold">{token.name}</p>
                <p className="type-label text-muted">{token.hex}</p>
                <p className="mt-1 text-xs">{t(`colour.usage.${token.id}`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sg-type">
          <SectionHeading id="sg-type">{t("sections.type")}</SectionHeading>
          <div className="mt-4 space-y-8">
            <div>
              <Label className="text-muted">{t("type.displayLabel")}</Label>
              <Display as="p" size="lg" className="mt-2">
                {t("type.displaySample")}
              </Display>
            </div>
            <div>
              <Label className="text-muted">{t("type.monoLabel")}</Label>
              <p className="mt-2 max-w-prose">{t("type.monoSample")}</p>
            </div>
            <div>
              <Label className="text-muted">{t("type.labelLabel")}</Label>
              <p className="type-label mt-2 font-bold">{t("type.labelSample")}</p>
            </div>
            <div>
              <Label className="text-muted">{t("type.dataLabel")}</Label>
              <p className="type-data text-data-lg mt-2 flex flex-wrap gap-x-6 gap-y-2">
                <span>{trackTime}</span>
                <span className="uppercase">{t("type.dataSpots", { count: 6 })}</span>
                <span>{format.number(33, { style: "currency", currency: DEFAULT_CURRENCY })}</span>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="sg-shape">
          <SectionHeading id="sg-shape">{t("sections.shape")}</SectionHeading>
          <ul className="mt-2">
            <li className="border-fg border-b border-dotted py-3">{t("shape.radius")}</li>
            <li className="border-fg border-b border-dotted py-3">{t("shape.dividers")}</li>
            <li className="border-fg border-b border-dotted py-3">
              {t("shape.motion", { duration: motionTokens.quickMs })}
            </li>
            <li className="border-fg border-b border-dotted py-3">{t("shape.targets")}</li>
          </ul>
        </section>

        <section aria-labelledby="sg-components">
          <SectionHeading id="sg-components">{t("sections.components")}</SectionHeading>
          <div className="mt-4 space-y-8">
            <div>
              <Label className="text-muted">{t("components.buttons")}</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                <Button variant="accent">{t("components.book")}</Button>
                <Button variant="primary">{t("components.joinWaitlist")}</Button>
                <Button variant="outline">{t("components.cancel")}</Button>
              </div>
            </div>
            <div>
              <Label className="text-muted">{t("components.chips")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusChip>{t("components.chipSpots", { count: 3 })}</StatusChip>
                <StatusChip tone="booked">{t("components.chipBooked")}</StatusChip>
                <StatusChip tone="live">{t("components.chipLive")}</StatusChip>
                <StatusChip tone="alert">{t("components.chipAlert")}</StatusChip>
                <DemoBadge>{tc("demo")}</DemoBadge>
              </div>
            </div>
            <div>
              <Label className="text-muted">{t("components.list")}</Label>
              <DataList className="mt-2">
                {sessions.map((s) => (
                  <DataRow
                    key={s.key}
                    lead={time(s.start)}
                    title={t(`sessions.${s.key}.title`)}
                    meta={t(`sessions.${s.key}.meta`)}
                    trailing={
                      s.spots > 0 ? (
                        <StatusChip>{t("components.chipSpots", { count: s.spots })}</StatusChip>
                      ) : (
                        <StatusChip tone="live">{t("components.chipFull")}</StatusChip>
                      )
                    }
                  />
                ))}
              </DataList>
            </div>
            <div>
              <Label className="text-muted">{t("components.ticker")}</Label>
              <div className="mt-2">
                <Ticker
                  label={t("components.tickerLabel")}
                  pauseLabel={t("components.tickerPause")}
                  playLabel={t("components.tickerPlay")}
                  items={[
                    t("components.tickerItems.next", { time: trackTime }),
                    t("components.tickerItems.spots"),
                    t("components.tickerItems.stage"),
                    t("components.tickerItems.pb"),
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="sg-stage">
          <SectionHeading id="sg-stage">{t("sections.stageTrack")}</SectionHeading>
          <div className="mt-6">
            <StageTrack stages={stages} label={t("stageTrack.label")} />
          </div>
        </section>

        <section aria-labelledby="sg-chart">
          <SectionHeading id="sg-chart">{t("sections.chart")}</SectionHeading>
          <div className="mt-6">
            <ProgressChart
              points={points}
              title={t("chart.title")}
              unit={t("chart.unit")}
              columnLabels={{ period: t("chart.columnPeriod"), value: t("chart.columnValue") }}
            />
            <p className="text-muted mt-3 text-xs">{t("chart.note")}</p>
          </div>
        </section>

        <section aria-labelledby="sg-cover">
          <SectionHeading id="sg-cover">{t("sections.cover")}</SectionHeading>
          <Surface tone="ink" className="mt-6 space-y-8 p-5 md:p-8">
            <div>
              <Display as="p" size="md">
                {t("cover.goalLine", {
                  goal: t("cover.goal"),
                  date: format.dateTime(GOAL_DATE, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}
              </Display>
              <p className="text-muted mt-3">{t("cover.why")}</p>
            </div>
            <StageTrack stages={stages} label={t("stageTrack.label")} />
            <Surface tone="paper" className="p-4">
              <Label className="text-muted">{t("cover.nextLabel")}</Label>
              <p className="mt-1 text-lg font-bold uppercase">
                {t("cover.nextTitle", { time: trackTime })}
              </p>
              <p className="type-label text-muted mt-1">{t("cover.nextMeta", { count: 6 })}</p>
              <Button variant="accent" className="mt-4 w-full">
                {t("cover.action")}
              </Button>
            </Surface>
          </Surface>
        </section>
      </main>
    </div>
  );
}
