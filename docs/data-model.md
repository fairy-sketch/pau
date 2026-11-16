# Data model

Overview from the brief (section 5.5). Kept current as tables are built.

**Built so far (M0):** `job` (background job queue, infrastructure only). None of the entities below exist yet; they arrive from M1.

```mermaid
erDiagram
  PERSON ||--o{ PATH_GOAL : pursues
  PATH_GOAL ||--o{ PATH_STAGE : "ordered stages"
  PATH_GOAL ||--o{ PATH_CHECKPOINT : "progress over time"
  PERSON ||--o{ RECOMMENDATION : "next step"
  PERSON ||--o{ TRAINING_ENTRY : logs
  TRAINING_ENTRY ||--o{ TRAINING_ENTRY_ITEM : details
  TRAINING_ENTRY ||--o{ TRAINING_COMMENT : "coach comments"
  PERSON ||--o{ PERSONAL_BEST : achieves
  PERSON ||--o{ TRAINING_PLAN : follows
  TRAINING_PLAN ||--o{ PLAN_ITEM : contains
  TRAINING_PLAN ||--o{ PLAN_REVISION : "AI / coach changes"
  PLAN_ITEM |o--o| TRAINING_ENTRY : "done as"
  PERSON ||--|| COACH_PROFILE : has
  PERSON ||--o{ COACH_MEMORY : "coach learns"
  PERSON ||--o{ COACH_ACTION_PROPOSAL : "confirms / rejects"
  PERSON ||--o{ CONSENT_GRANT : "shares scopes with org"
  PERSON ||--o{ ORG_MEMBER : "joins clubs as"
  ORGANIZATION ||--o{ ORG_MEMBER : has
  ORG_MEMBER ||--o{ ROLE_GRANT : holds
  ORGANIZATION ||--o{ COACH_ALERT : "receives (with consent)"
  ORGANIZATION ||--o{ OFFERING : offers
  OFFERING ||--o{ SCHEDULE_RULE : "RRULE + EXDATE"
  SCHEDULE_RULE ||--o{ SESSION : materialises
  SESSION ||--o{ BOOKING : "capacity-limited"
  SESSION ||--o{ WAITLIST_ENTRY : queues
  SESSION ||--o{ ATTENDANCE : records
  ORG_MEMBER ||--o{ BOOKING : makes
  ORGANIZATION ||--o{ PRODUCT : sells
  PRODUCT ||--o{ ENTITLEMENT_RULE : allows
  ORG_MEMBER ||--o{ ORDER : places
  ORDER ||--o{ ORDER_LINE : contains
  ORDER ||--o{ PAYMENT : "TWINT | card | manual"
  ORDER ||--o| INVOICE : "Swiss QR-bill"
  INVOICE ||--o{ PAYMENT_REMINDER : "level 1-3"
  ORDER_LINE ||--o| PASS : creates
  PASS ||--o{ PASS_LEDGER : "append-only"
  BOOKING ||--o| PASS_LEDGER : debits
  PLAN_ITEM }o--o| SESSION : "club session in plan"
  COACH_ACTION_PROPOSAL }o--o| BOOKING : "executes via booking API"
```
