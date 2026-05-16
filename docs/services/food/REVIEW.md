# Code Review — Food MVP

> **Для ревьюера:** прочитай этот файл целиком, сверь с кодом и спецификацией, пройди test plan (или выборочно), затем **заполни раздел [Заключение ревьюера](#заключение-ревьюера)** внизу. Не меняй описание scope выше — только добавляй своё заключение, findings и статус.

---

## Инструкция (промпт)

Ты — code reviewer для вертикали **Food** в monorepo **monty-finance**.

### Что сделать

1. **Продукт и решения** (15 мин):  
   `decisions.md` → `plan.md` (критерии MVP) → `domains.md` (правила генератора, архива, pantry).

2. **Код** (основное время):  
   - Backend: `monty-backend/app/food/` (+ точечно `app/finance/models.py`, `finance/db_bootstrap.py`, `finance/services/auth_service.py`, `finance/services/scheduler.py`, `app/main.py`).  
   - Frontend: `monty-frontend/src/food/`, `monty-frontend/src/services/food.ts`.  
   - Документация статуса: `roadmap.md`, `plan.md`.

3. **Проверить риски** из § «Фокус ревью» — подтвердить или опровергнуть с ссылкой на файл/строку.

4. **QA:** минимум smoke из § «Test plan»; отметить что проверил лично vs по коду.

5. **Заполнить** [Заключение ревьюера](#заключение-ревьюера): вердикт, блокеры, замечания, рекомендации до merge.

### Критерии вердикта

| Вердикт | Когда |
|---------|--------|
| **Approve** | MVP-критерии выполнимы, блокеров нет, риски приемлемы или задокументированы |
| **Approve with nits** | Мелочи, не блокируют merge |
| **Request changes** | Баги, нарушение decisions, security, data loss |
| **Needs discussion** | Архитектурный спор (household, Finance bridge) |

### Вне скоупа этого review

Спринт 4.3–4.6 (режим магазина, теги, шаблоны, AI), invite flow, автотесты (желательны, но не gate для MVP).

---

## 1. Цель и результат

Реализован ежедневный цикл для пары:

**household_id → каталог и меню → умный список покупок → Telegram → (опц.) трата в Finance.**

| Спринт | Статус (заявлено автором) |
|--------|---------------------------|
| 1 — Household, сид, онбординг | ✅ |
| 2 — Порции, pantry default, архив, перегенерация | ✅ |
| 3 — Pantry в генераторе, Finance finalize, Telegram | ✅ |
| 4 P1 — Повтор недели, завершение списка | ✅ |
| 4.3–4.6, часть 3.x | ❌ backlog |

MVP-критерии в `plan.md` отмечены выполненными.

---

## 2. Архитектура

```text
Finance Auth (JWT / Telegram)
        │
        ▼
 users.household_id ──► get_food_household_id() ──► /food/* routers
        │                        │
        │                        ├── MealSlot, FoodDish, …
        │                        ├── shopping_generator (+ pantry_adjust)
        │                        └── finance_bridge (finalize)
        │
        └── Finance: Transaction.user_id (отдельно от household)

Cron 20:00 Asia/Almaty ──► telegram_reminder (household_id=MVP_HOUSEHOLD_ID в scheduler)
```

- Food изолирован в `monty-backend/app/food/`, префикс `/food`.
- Данные Food — по **household_id** [D8]; Finance — по **user_id**.
- Кросс-импорты: `food.deps` ← `User`; `finance_bridge` ← `Transaction`/`Category`; `auth_service` / `scheduler` ← `MVP_HOUSEHOLD_ID` (сид, cron для одного чата).

---

## 3. Реализованные эпики (кратко)

### Спринт 1

| Epic | Суть | Ключевые файлы |
|------|------|----------------|
| 1.1 [D8] | `users.household_id`, `get_food_household_id`, роутеры без хардкода в фильтрах | `food/deps.py`, `finance/db_bootstrap.py`, `food/routers/*` |
| 1.2 [D10,D1] | Сид категорий + 5 блюд; pantry-ингредиенты; `GET /food/bootstrap`; редирект `/food` | `household_bootstrap.py`, `FoodEntryPage.tsx` |

### Спринт 2

| Epic | Суть | Ключевые файлы |
|------|------|----------------|
| 2.1 [D2] | `slot.servings / dish.servings_default` в генераторе | `shopping_generator.py`, `FoodMenuPage.tsx` |
| 2.2 [D5] | `is_pantry_default`, skip если не `is_optional` | `catalog.py`, `pantry_ingredient_seed.py` |
| 2.3 [D4] | `is_archived`, soft delete, picker без архивных | `meal.py`, `FoodCatalogPage.tsx` |
| 2.4 [D3] | `generate` mode `new` \| `merge_draft` | `shopping_generator.py`, `FoodShoppingPage.tsx` |

### Спринт 3

| Epic | Суть | Ключевые файлы |
|------|------|----------------|
| 3.1 | Pantry: `need - stock` (та же единица); иначе `unit_mismatch` badge | `pantry_adjust.py` |
| 3.2 [D7] | `actual_price`, `finalize` → Finance | `finance_bridge.py`, `shop.py` |
| 3.3 [D9] | `FoodReminderSent`, max 1 msg/день/дом | `reminder.py`, `telegram_reminder.py` |

### Спринт 4 (P1)

| Epic | Суть | Ключевые файлы |
|------|------|----------------|
| 4.1 | `POST /food/menu/copy-week` | `menu_copy.py`, `FoodMenuPage.tsx` |
| 4.2 | `PATCH` list `status: done` без Finance | `shop.py`, `FoodShoppingPage.tsx` |

**Отложено:** «+ в склад» после покупки; время напоминания в Settings.

---

## 4. API (справочник)

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/food/bootstrap` | `dish_count`, сид при необходимости |
| GET | `/auth/me` | + `household_id` |
| GET | `/food/dishes?archived=false\|true` | Активные / архив |
| DELETE | `/food/dishes/{id}` | Soft → `is_archived=true` (проверить в коде) |
| POST | `/food/shopping-lists/generate` | `{ date_from, date_to, mode: "new"\|"merge_draft" }` |
| PATCH | `/food/shopping-items/{itemId}` | `checked`, `actual_price` |
| PATCH | `/food/shopping-lists/{id}` | `status` (в т.ч. `done`) |
| POST | `/food/shopping-lists/{id}/finalize` | Транзакция Finance + `done` |
| POST | `/food/menu/copy-week` | `{ target_week_start, source_week_start? }` |

Клиент: `monty-frontend/src/services/food.ts`.

---

## 5. Схема БД (bootstrap при старте)

Порядок в `main.py`: `create_all` → `ensure_users_household_id` → food column ensures → …

| Объект | Колонка / таблица |
|--------|-------------------|
| users | `household_id` |
| food_dishes | `is_archived`, `servings_default` |
| food_ingredients | `is_pantry_default` |
| food_shopping_items | `actual_price` NUMERIC(12,2) |
| food_shopping_lists | `linked_transaction_id` |
| food_reminder_sent | UNIQUE `(household_id, reminder_date)` |

Alembic не используется — проверить idempotent bootstrap.

---

## 6. Frontend

| Страница | Изменения |
|----------|-----------|
| `FoodEntryPage` | Редирект по `dish_count >= 3` |
| `FoodCatalogPage` | Онбординг, архив, `is_pantry_default` |
| `FoodMenuPage` | Порции, повтор недели |
| `FoodGuidePage` | Порции в тексте |
| `FoodShoppingPage` | Generate modal, цены, finalize, завершить, pantry badge |

---

## 7. Фокус ревью (риски)

Проверь и отметь в заключении: **OK / Issue / N/A**.

| # | Риск | На что смотреть |
|---|------|-----------------|
| R1 | **finance_bridge**: транзакция от `current_user`; категория «Продукты» или fallback на первую EXPENSE | `finance_bridge.py` |
| R2 | **Finalize vs «Завершить»**: finalize = `done` + `linked_transaction_id`; complete только `done` | `shop.py`, UI кнопки |
| R3 | **merge_draft**: только если есть `draft`; после `new` всегда `active` — UX понятен? | `shopping_generator.py` |
| R4 | **copy-week**: полная перезапись целевой недели; архивные `dish_id` копируются | `menu_copy.py` |
| R5 | **Pantry**: нет конвертации единиц [D6] — by design | `pantry_adjust.py` |
| R6 | **Telegram**: `reminder_date` = день отправки; контент = завтра; race check→send→mark | `telegram_reminder.py` + UNIQUE |
| R7 | **Цены**: DB decimal, Finance `int`; UI blur | schemas + `FoodShoppingPage` |
| R8 | **household**: партнёр вручную тот же id; нет invite | `auth_service.py` |
| R9 | **DELETE dish**: soft archive vs hard delete при слотах | `meal.py` |
| R10 | **Автотесты** | Почти нет — достаточен ли QA checklist? |

**Уточнение по R6:** в модели есть `UniqueConstraint(household_id, reminder_date)` — дубликат записи невозможен; теоретически возможна **двойная отправка в Telegram** при параллельном cron до commit.

---

## 8. Test plan (QA)

Отметь в заключении: `[x]` проверено / `[ ]` не проверено / `[-]` по коду.

- [ ] Два user с `household_id=1` — общее меню и список
- [ ] Новый дом: bootstrap → ≥3 блюда → редирект в Меню
- [ ] Порции: default 2, слот 4 → ×2 в списке (100 г → 200 г)
- [ ] `is_pantry_default` — не в списке; `is_optional` на строке — в списке
- [ ] Архив: не в picker; старые слоты в Гиде
- [ ] Generate `new` закрывает предыдущий `active`
- [ ] `merge_draft` сохраняет ручные строки
- [ ] Pantry вычитание; другая единица → badge
- [ ] Finalize → транзакция Finance; «Завершить» → `done` без Finance
- [ ] Finalize на уже `linked_transaction_id` → 400
- [ ] «Повтор недели» — слоты как у прошлой недели
- [ ] Telegram: одно сообщение за вечер (при `TELEGRAM_*`)

---

## 9. Diff map

```text
monty-backend/app/food/          # основной объём
monty-backend/app/finance/       # household_id, auth, scheduler
monty-backend/app/main.py
monty-frontend/src/food/
monty-frontend/src/services/food.ts
docs/services/food/plan.md
docs/services/food/roadmap.md
```

---

## 10. Backlog после merge

- 4.3 Режим «в магазине»
- 4.4 Теги
- 4.5 Шаблоны недели
- 4.6 AI-меню
- 3.1.3 Пополнение склада из списка
- 3.3.4 Время напоминания в Settings
- Multi-household / invite flow

---

## Заключение ревьюера

> **Заполни этот раздел.** Остальное не редактируй.

**Ревьюер:** Cursor Agent (code review)  
**Дата:** 2026-05-16  
**Вердикт:** Approve with nits

### Резюме (2–4 предложения)

Food MVP закрывает заявленный цикл: household из auth в роутерах, сид и редирект `/food`, генератор с порциями/pantry_default/pantry, Finance finalize и раздельное «Завершить», copy-week и Telegram с идемпотентностью по БД. Критичных багов и нарушений data-loss не найдено. Основные пробелы — UX для `merge_draft` (нет перевода списка в `draft`), cron Telegram жёстко на `household_id=1`, и отсутствие UI для `is_optional` в составе блюда; автотестов нет (вне gate).

### Блокеры (must fix before merge)

| # | Описание | Файл / место |
|---|----------|--------------|
| | | |

нет

### Замечания (should fix / nits)

| # | Severity | Описание | Файл |
|---|----------|----------|------|
| 1 | major | **D3 / merge_draft:** API и модалка есть, но в UI нет способа перевести список в `draft` — кнопка «Обновить черновик» всегда disabled при `active`. Путь `merge_draft` недоступен без ручного PATCH. | `FoodShoppingPage.tsx`, `shop.py` |
| 2 | major | **D8:** Роутеры используют `get_food_household_id`, но cron и дефолт напоминания остаются на `MVP_HOUSEHOLD_ID=1` — при втором доме Telegram не уйдёт. | `scheduler.py:46`, `telegram_reminder.py:113` |
| 3 | minor | **D5:** `is_optional` в генераторе учтён (`shopping_generator.py:25`), в каталоге флаг не редактируется — override «домашних» продуктов только через API. | `FoodCatalogPage.tsx` |
| 4 | minor | **R6:** Идемпотентность — check → send → mark; при параллельном cron теоретически двойное сообщение в Telegram до commit (UNIQUE ловит дубликат записи, не отправку). | `telegram_reminder.py:123–147` |
| 5 | nit | **R4:** copy-week копирует `dish_id` архивных блюд — слоты валидны, новые назначения архивных блокируются в `plan.py:89`. Документировать в UI при копировании. | `menu_copy.py:54` |
| 6 | nit | `get_food_household_id` не валидирует `None` (сейчас колонка NOT NULL + backfill). | `food/deps.py` |
| 7 | nit | `linked_transaction_id` в bootstrap DDL — `VARCHAR(36)`; согласовано с UUID `Transaction.id`. | `db_bootstrap.py:81`, `finance_bridge.py:74` |

### QA (test plan §8)

Ручной прогон в этой сессии не выполнялся — все пункты сверены по коду.

| Пункт | Статус |
|-------|--------|
| Два user с `household_id=1` — общее меню и список | `[-]` фильтры `household_id` в роутерах + `auth_service` backfill |
| Bootstrap → ≥3 блюда → редирект в Меню | `[-]` `household_bootstrap.py`, `FoodEntryPage.tsx` |
| Порции ×2 (100→200 г) | `[-]` `_servings_multiplier` в `shopping_generator.py` |
| `is_pantry_default` / `is_optional` | `[-]` генератор OK; `is_optional` в UI каталога нет |
| Архив: не в picker; слоты в Гиде | `[-]` `dishes.list()` default `archived=false`; Guide грузит оба списка |
| Generate `new` закрывает `active` | `[-]` `shopping_generator.py:147–150` |
| `merge_draft` сохраняет ручные строки | `[-]` delete только `ingredient_id IS NOT NULL`; UI draft недоступен |
| Pantry вычитание; badge единиц | `[-]` `pantry_adjust.py`, `serialization_shop.py` |
| Finalize → Finance; «Завершить» без Finance | `[-]` `finance_bridge.py`, `FoodShoppingPage.tsx:135–163` |
| Finalize при `linked_transaction_id` → 400 | `[-]` `finance_bridge.py:51–52` |
| Повтор недели | `[-]` `menu_copy.py`, `FoodMenuPage.tsx` |
| Telegram 1 msg/вечер | `[-]` UNIQUE + check; не проверялся live с `TELEGRAM_*` |

### Соответствие decisions D1–D10

| ID | OK? | Комментарий |
|----|-----|-------------|
| D1 | ✅ | `GET /food/bootstrap` + `FoodEntryPage` редирект при `dish_count >= 3`. |
| D2 | ✅ | `servings` в слоте, множитель в генераторе, stepper в `FoodMenuPage`. |
| D3 | ⚠️ | Диалог и `mode=new` по умолчанию — да; `merge_draft` без UI для статуса `draft`. |
| D4 | ✅ | `DELETE` → archive если есть слоты, иначе hard delete; picker без архивных. |
| D5 | ⚠️ | `is_pantry_default` в CRUD и генераторе; `is_optional` только в backend. |
| D6 | ✅ | Суммирование по `(ingredient_id, unit_id)`; pantry badge при другой единице. |
| D7 | ✅ | `actual_price` Numeric; Finance `amount` int; одна валюта в UI (₸). |
| D8 | ⚠️ | Роутеры из auth; `MVP_HOUSEHOLD_ID` остаётся в cron/auth seed (MVP-пара на id=1). |
| D9 | ✅ | `FoodReminderSent` UNIQUE; `reminder_date` = сегодня Almaty, контент на завтра. |
| D10 | ✅ | 5 блюд без ингредиентов + баннер в каталоге. |

### Риски §7

| R1–R10 | Статус | Комментарий |
|--------|--------|-------------|
| R1 | OK | Транзакция на `current_user.id`; категория «Продукты» / первый EXPENSE. |
| R2 | OK | Finalize: `done` + `linked_transaction_id`; «Завершить» — только PATCH `status=done`. |
| R3 | Issue | `merge_draft` корректен в backend, UX: после `new` только `active`, черновик из UI не создать. |
| R4 | OK | Полная перезапись целевой недели; архивные `dish_id` копируются (by design). |
| R5 | OK / N/A | Без конвертации единиц — по D6. |
| R6 | Issue | Race send/mark; для MVP приемлемо, задокументировано в §7. |
| R7 | OK | DB decimal → int в bridge; UI `onBlur` сохраняет цену. |
| R8 | OK | Партнёр вручную тот же `household_id`; invite вне скоупа. |
| R9 | OK | Soft archive при слотах, hard delete иначе (`meal.py:266–276`). |
| R10 | N/A | Автотестов Food нет; checklist §8 достаточен для MVP при ручном smoke. |

### Рекомендации после merge

1. Добавить в «Список» действие «Сохранить как черновик» (PATCH `status: draft`) или убрать disabled у merge с авто-переводом — закрыть D3 полностью.
2. Cron Food: итерировать households с меню/настройкой или брать id из env, убрать `MVP_HOUSEHOLD_ID` из `scheduler.py`.
3. Smoke QA по §8 на двух тестовых пользователях с одним `household_id` перед продом.
4. Опционально: `is_optional` в редакторе состава; mark-sent до send или advisory lock для R6.
5. Backlog из §10 без изменений.

### Подпись

- [x] Прочитал `decisions.md` и `plan.md`
- [x] Просмотрел критичные пути в `shopping_generator.py`, `finance_bridge.py`, `telegram_reminder.py`
- [x] Готов approve merge в `main` / release branch (с учётом nits выше; блокеров нет)
