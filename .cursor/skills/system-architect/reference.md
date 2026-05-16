# Monty architecture reference

Read sections as needed; do not load entirely into every reply.

## Product & domain (Food)

| Document | Path |
|----------|------|
| Index | `docs/services/food/README.md` |
| Vision & boundaries | `docs/services/food/vision.md` |
| Domains & entities | `docs/services/food/domains.md` |
| User flows | `docs/services/food/user-flows.md` |
| Screens & navigation | `docs/services/food/screens.md` |
| Integrations (Telegram, Finance) | `docs/services/food/integrations.md` |
| Implementation plan | `docs/services/food/plan.md` |
| Phase status | `docs/services/food/roadmap.md` |
| ADRs (product) | `docs/services/food/decisions.md` |

## Technical legacy (cross-check before duplicating)

| Document | Path |
|----------|------|
| Food superapp notes | `docs/food-service-architecture.md` |
| Data model v2 | `docs/food-data-model-v2.md` |

Prefer `docs/services/food/*` when they conflict with legacy root `docs/` files.

## Repository map

```
monty-finance/
├── monty-backend/app/
│   ├── main.py              # FastAPI app, lifespan, router includes
│   ├── core/                # config, engine, get_db
│   ├── middleware/          # JWT current user
│   ├── finance/             # budgets, transactions, auth, scheduler
│   ├── food/                # /food API, models/, services/
│   └── models/__init__.py   # ORM registration for create_all
├── monty-frontend/src/
│   ├── services/http.ts     # axios + JWT
│   ├── services/finance.ts
│   ├── services/food.ts
│   ├── food/                # Food UI shell + pages
│   ├── pages/               # Finance dashboard etc.
│   └── theme/dashboardChrome.ts
├── docs/services/food/      # canonical product spec
└── Makefile                 # backend-run, frontend-run
```

## Key runtime facts

- **API**: FastAPI, OpenAPI at `/docs`, port 8000
- **DB**: SQLite if `STAGE=DEV`, else PostgreSQL
- **FE**: Vite, React 19, Mantine, `VITE_API_URL`
- **Timezone**: scheduler uses Asia/Almaty
- **Food API prefix**: `/food` (JWT same as Finance)

## Accepted decisions (quick index)

See full text in `decisions.md`. IDs for architect reviews:

| ID | Topic |
|----|--------|
| D1 | Start screen: Menu if ≥3 seeded dishes else Catalog onboarding |
| D2 | `servings` on menu slots in MVP |
| D3 | Shopping list regen: ask new vs update draft |
| D4 | Dish delete = archive |
| D5 | «Always at home» = ingredient flag |
| D6 | Sum shopping lines only same (product, unit) |
| D7 | Single currency from Finance |
| D8 | `household_id` from auth, no MVP constant |
| D9 | One Telegram reminder per day per household |
| D10 | Seed 5 dishes without ingredients + hint |

## Finance ↔ Food contract (MVP)

- Food: `actual_price` on shopping items; optional `linked_transaction_id`
- Finance: category «Продукты», transaction create from UI action
- No Food-side budget ledger

## Extension template (new vertical)

1. `app/<name>/` with `router.py`, `routers/`, `models/`, `schemas/`, `services/`
2. Register router in `app/main.py`
3. `src/<name>/` + `src/services/<name>.ts`
4. Entry from «Все сервисы» shell
5. Product folder `docs/services/<name>/` if scope is non-trivial
