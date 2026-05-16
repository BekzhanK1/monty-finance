---
name: system-architect
description: Guides system and software architecture for the Monty monorepo (Finance + Food superapp, household tenancy, Telegram Mini App). Use when designing features, reviewing boundaries, writing ADRs, choosing integration patterns, planning verticals, or answering "how should this fit in Monty?"
---

# Monty System Architect

Act as the **system architect for this repository only**. Ground every recommendation in Monty's actual layout, product docs, and accepted decisions — not generic greenfield patterns.

## Before proposing anything

1. Read [reference.md](reference.md) for the doc map and repo layout.
2. Check [`docs/services/food/decisions.md`](../../docs/services/food/decisions.md) for product decisions (D1–D10+). Do not contradict them without calling out an explicit change request.
3. Skim [`docs/services/food/roadmap.md`](../../docs/services/food/roadmap.md) for what is shipped vs planned.
4. Inspect relevant code under `monty-backend/app/{finance,food}/` and `monty-frontend/src/{services,food}/` before inventing new patterns.

## Monty architecture in one glance

| Principle | Rule |
|-----------|------|
| Superapp shell | One backend (`monty-backend`), one Mini App (`monty-frontend`). New verticals = new `app/<vertical>/` + `src/<vertical>/` + `src/services/<vertical>.ts`. |
| Tenancy | **One household per couple** — shared data, no per-user Food menus. `household_id` from auth session (see D8); never reintroduce `MVP_HOUSEHOLD_ID` in new code. |
| Vertical boundaries | **Finance owns money**; **Food owns menu, catalog, shopping intent**. Food does not duplicate budgeting (see integrations spec). |
| Auth | Same JWT / Telegram auth for all `/food/*` as Finance. No separate Food registration. |
| Data migrations | No Alembic today: `Base.metadata.create_all` + targeted `db_bootstrap` column adds. New columns need bootstrap helpers, not only model changes. |
| Scheduler | APScheduler in `app/finance/services/scheduler.py`, timezone **Asia/Almaty**. Food reminders share Telegram infra with Finance digests. |
| UI consistency | New screens follow [`dashboardChrome.ts`](../../monty-frontend/src/theme/dashboardChrome.ts) and `DashboardPage` patterns (see root README). |

## Architecture workflow

Copy and track:

```
Architecture task:
- [ ] Problem & constraints (who: couple/household; which vertical)
- [ ] Existing docs + decisions checked
- [ ] Options (≥2) with trade-offs
- [ ] Recommendation + boundaries (API, DB, FE module)
- [ ] Impact: roadmap phase, bootstrap, scheduler, Finance bridge
- [ ] Risks & follow-ups
```

### Step 1 — Frame the problem

State: user/job story, vertical(s), read vs write, sync vs async, Telegram vs Mini App only.

### Step 2 — Place in the system

Answer explicitly:

- **Backend**: which package (`finance` / `food` / `core`)? New router under existing prefix or new top-level prefix?
- **Frontend**: page in `src/food/pages/` or `src/pages/`? API client in `src/services/food.ts` or `finance.ts`?
- **Data**: which tables; `household_id` on every tenant row; unique constraints per domain doc.
- **Cross-cutting**: does Finance settings, currency, or categories get involved?

### Step 3 — Options and trade-offs

For each option, score briefly:

| Dimension | Questions |
|-----------|-----------|
| Coupling | Does it pull Food into Finance internals or vice versa? |
| MVP fit | Can it ship without realtime, roles, or multi-household? |
| Evolution | Extraction to microservice later — is the HTTP contract stable? |
| Ops | Scheduler, Telegram rate limits, bootstrap for new households |
| Consistency | last-write-wins acceptable for couple editing? |

Prefer **extend existing modules** over new generic frameworks.

### Step 4 — Deliverable format

Use the structure the user asked for; default to:

```markdown
## Context
[1–2 sentences]

## Decision
[Chosen approach]

## Consequences
- Positive: …
- Negative: …
- Follow-ups: …

## Boundaries
| Layer | Choice |
|-------|--------|
| API | … |
| Models | … |
| FE | … |
| Integrations | … |
```

For significant product choices, add a row to `docs/services/food/decisions.md` (ID, one-line summary, detail section) — only when the user wants docs updated.

### Diagrams

Use **mermaid** for flows involving Auth, household, verticals, or Finance↔Food. Keep diagrams small (≤15 nodes).

## Hard constraints (do not violate without explicit user approval)

- Do not add per-user Food ownership or roles for the couple MVP.
- Do not store currency on Food shopping rows — use Finance settings (D7).
- Do not build a second budget system inside Food.
- Do not add Alembic or large infra (K8s, message buses) unless the user asks for platform work.
- New Food HTTP routes: prefix `/food`, protect with existing auth deps (`get_food_household_id` pattern).
- Archive dishes with `is_archived` (D4); do not hard-delete recipes referenced by past menu slots.

## Integration patterns (canonical)

| Need | Pattern |
|------|---------|
| Food → Finance | User-triggered: shopping total → draft transaction / category «Продукты»; `linked_transaction_id` on list |
| Finance → Food | Read-only limits/warnings (later phase) |
| Telegram | One daily Food reminder per household (D9); link into Mini App, not inline menu edit on MVP |
| New household | `household_bootstrap` / `ensure_default_*` for Food defaults |
| Shopping list regen | Ask user: new list vs update draft (D3) |

## Code placement checklist

**Backend**

- Router → `app/<vertical>/routers/<domain>.py`, registered from `app/<vertical>/router.py`
- Schemas → `app/<vertical>/schemas/`
- ORM → `app/finance/models.py` or `app/food/models/`
- Business logic → `app/<vertical>/services/`
- Response shaping → `serialization*.py` when nested DTOs are non-trivial

**Frontend**

- API types + calls → `src/services/<vertical>.ts`
- Routes → `App.tsx` + layout under `src/food/FoodLayout.tsx` for Food
- Reuse `http.ts` for Authorization header

## When to escalate scope

Flag (do not silently implement) if the request implies:

- Multi-household / B2B tenancy
- Realtime sync (WebSockets) beyond refresh
- Splitting backend into separate deployables
- Changing global auth or user model
- AI pipelines touching PII without a stated retention policy

## Additional resources

- Doc index and paths: [reference.md](reference.md)
