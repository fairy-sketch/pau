import type { JobHandlers, RecurringJob } from "./types";

/**
 * Every background job the app knows. M0 ships only a heartbeat that proves
 * the loop works. Later milestones register their jobs here:
 * materialise sessions, expire holds and waitlist offers, no-show sweep,
 * expire passes, booking and payment reminders, pattern detection and the
 * coach's learning loop.
 */
export const handlers: JobHandlers = {
  "system.heartbeat": async (_job, ctx) => {
    ctx.log(`heartbeat ${ctx.now.toISOString()}`);
  },
};

export const recurring: RecurringJob[] = [{ kind: "system.heartbeat", everyMinutes: 5 }];
