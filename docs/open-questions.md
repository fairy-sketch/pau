# Open questions

Business rules the brief leaves open. Each becomes a per-organisation (or per-person) setting with
the default shown, in the milestone noted. Nothing here is hardcoded.

| #   | Question                                                                                                     | Default                                                   | Setting lands in |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------- |
| 1   | Drop-in cap: calendar month or rolling 30 days? Do no-shows count?                                           | Calendar month; counts bookings                           | M3               |
| 2   | Trial: 7 days from first booking or from sign-up?                                                            | From first booking                                        | M3               |
| 3   | Do Performance and Regular differ in which sessions they unlock, or only in priority and price?              | Configurable eligibility; same sessions in the seed       | M3               |
| 4   | Mid-season joiners: pro-rated or full price?                                                                 | Full price, admin can adjust                              | M3               |
| 5   | Is booking required for PAU track sessions, or are walk-ins allowed?                                         | Booking required; coaches can add walk-ins                | M2 / M6          |
| 6   | Coach auto-actions: confirmation-only, or "book and notify with undo" later?                                 | Confirmation-only                                         | M5               |
| 7   | Which LLM provider and hosting region for the coach (Swiss/EU data protection, with a DPA)?                  | Undecided. Needs Ramon before M5                          | M5               |
| 8   | Which payment provider account first: Stripe or Payrexx? Is the club or the platform the merchant of record? | Stripe recommended. Needs Ramon before M7                 | M7               |
| 9   | Plan approval: which load increase needs coach approval? Weekly load guardrail?                              | Any increase in weekly load or intensity; max +10% a week | M5               |
| 10  | Pain flag threshold for the stronger "see a professional" message?                                           | Level ≥ 7                                                 | M4 / M5          |
| 11  | Product name.                                                                                                | `PATH` (working name), in `APP_NAME`                      | M0 (done)        |

## Raised while building

| #   | Question                                                                                                            | Raised in  | Status |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 12  | Is Docker installed on Ramon's machine? The answer in the M0 go-ahead was left as a template (`[yes / no]`).        | M0         | Open   |
| 13  | Should a GitHub Actions workflow run `pnpm test` on every push? (Needs a choice on running Supabase in CI from M1.) | M0         | Open   |
| 14  | Logo and app icon: the current mark is a placeholder.                                                               | M0         | Open   |
| 15  | What moves the Path line within a stage: sessions logged (demo: 12 per stage), training load, or the stage dates?   | Stage line | Open   |
