# Monty Finance

Монорепозиторий приложения **Monty**: веб-клиент на React и API на FastAPI для учёта финансов (в т.ч. интеграция с Telegram) и вертикали **Food** (каталог блюд с составом, недельное меню).

## Структура

| Каталог | Описание |
|---------|----------|
| [`monty-backend`](monty-backend/) | FastAPI, SQLAlchemy, фоновые задачи (APScheduler) |
| [`monty-frontend`](monty-frontend/) | Vite, React 19, TypeScript, Mantine, React Router |
| [`docs`](docs/) | План Monty 2.0: [`redesign/plan.md`](docs/redesign/plan.md). Архитектурные заметки: [`food-service-architecture.md`](docs/food-service-architecture.md), модель данных v2 — [`food-data-model-v2.md`](docs/food-data-model-v2.md) |

### Backend: разделение по сервисам

Код сгруппирован по вертикалям, чтобы проще расширять superapp:

| Путь | Содержимое |
|------|------------|
| [`app/finance/`](monty-backend/app/finance/) | Бюджет, транзакции, категории, аналитика, цели, digest, настройки, auth |
| [`app/finance/models.py`](monty-backend/app/finance/models.py) | ORM: пользователи, транзакции, категории, бюджеты, settings |
| [`app/finance/schemas.py`](monty-backend/app/finance/schemas.py) | Pydantic-схемы finance |
| [`app/finance/routers/`](monty-backend/app/finance/routers/) | HTTP-роутеры (`auth`, `transactions`, …) |
| [`app/finance/services/`](monty-backend/app/finance/services/) | Бизнес-логика, планировщик, digest, auth_service |
| [`app/food/`](monty-backend/app/food/) | Food: [`router.py`](monty-backend/app/food/router.py) собирает префикс `/food`; подроутеры в [`app/food/routers/`](monty-backend/app/food/routers/) (`meal`, `catalog`, `plan`) |
| [`app/food/models/`](monty-backend/app/food/models/) | ORM: `meal` (категории приёма пищи, блюда), `catalog` (единицы, ингредиенты, строки состава блюда), `plan` (слоты недельного меню) |
| [`app/food/schemas/`](monty-backend/app/food/schemas/) | Pydantic-схемы Food (те же слои) |
| [`app/food/serialization.py`](monty-backend/app/food/serialization.py) | Сборка ответов API (блюдо со строками состава, слот меню с названием блюда) |
| [`app/food/db_bootstrap.py`](monty-backend/app/food/db_bootstrap.py) | Добавление новых колонок в `food_dishes` на уже существующей SQLite/Postgres БД (проект без Alembic, основной путь — `create_all` при старте) |
| [`app/food/models/shop.py`](monty-backend/app/food/models/shop.py) | Списки покупок и позиции |
| [`app/food/models/pantry.py`](monty-backend/app/food/models/pantry.py) | Кладовая (остатки по продукту) |
| [`app/food/services/shopping_generator.py`](monty-backend/app/food/services/shopping_generator.py) | Сборка списка покупок из меню за период |
| [`app/food/services/telegram_reminder.py`](monty-backend/app/food/services/telegram_reminder.py) | Текст напоминания в Telegram «меню на завтра» (по слотам из БД) |
| [`app/core/`](monty-backend/app/core/) | Конфиг, БД engine, `get_db` |
| [`app/middleware/`](monty-backend/app/middleware/) | JWT / текущий пользователь |
| [`app/models/__init__.py`](monty-backend/app/models/__init__.py) | Реэкспорт всех ORM-модулей для `Base.metadata` (обратная совместимость) |

Пустые заглушки [`app/api/`](monty-backend/app/api/) и [`app/schemas/`](monty-backend/app/schemas/) оставлены с комментарием: новый код подключается из `finance` / `food`.

### Frontend: разделение по сервисам

| Путь | Содержимое |
|------|------------|
| [`src/services/http.ts`](monty-frontend/src/services/http.ts) | Axios-клиент и заголовок `Authorization` |
| [`src/services/finance.ts`](monty-frontend/src/services/finance.ts) | API finance (auth, транзакции, бюджеты, …) |
| [`src/services/food.ts`](monty-frontend/src/services/food.ts) | API Food: категории и блюда, единицы и справочник ингредиентов, замена состава блюда (`PUT .../ingredients`), меню недели (`/menu`, слоты) |
| [`src/services/index.ts`](monty-frontend/src/services/index.ts) | Сводный экспорт |
| [`src/features/finance/queries.ts`](monty-frontend/src/features/finance/queries.ts) | TanStack Query: ключи, хуки чтения и мутации с инвалидацией |
| [`src/features/voice/`](monty-frontend/src/features/voice/) | Голосовой ввод: запись (`useVoiceRecorder`), шторка подтверждения (`VoiceSheet`), `useVoiceInput()` |
| [`src/features/home/`](monty-frontend/src/features/home/), [`add/`](monty-frontend/src/features/add/), [`history/`](monty-frontend/src/features/history/) | Экраны Главная, Добавление, История; чистая логика (`summary.ts`, `amountExpression.ts`, `history.ts`) покрыта тестами |
| [`src/ui/`](monty-frontend/src/ui/) | Базовые компоненты: `AmountText`, `Section`, `ListRow`, `PageHeader`, `CategoryIcon`, `EmptyState`, форматтеры денег |
| [`src/theme/tokens.css`](monty-frontend/src/theme/tokens.css) | Дизайн-токены `--monty-*` поверх `--tg-theme-*` (тема Telegram), фоллбэки для светлой/тёмной |
| [`src/lib/telegram.ts`](monty-frontend/src/lib/telegram.ts) | Обёртка `Telegram.WebApp`: init, haptics, `BackButton`, синхронизация темы |
| [`src/food/`](monty-frontend/src/food/) | UI Food: [`FoodLayout.tsx`](monty-frontend/src/food/FoodLayout.tsx) (вкладки: каталог, меню, **гид** — только просмотр меню и рецептов, **список** покупок, **склад**); страницы в [`food/pages/`](monty-frontend/src/food/pages/) |
| [`src/api/index.ts`](monty-frontend/src/api/index.ts) | Реэкспорт из `services` для старых импортов `from '../api'` |
| [`src/theme/dashboardChrome.ts`](monty-frontend/src/theme/dashboardChrome.ts) | Хелперы для старых экранов (Food и др.): поверхности на токенах, пропсы модалок и шторок |

Новые экраны — в [`src/features/`](monty-frontend/src/features/); в [`src/pages/`](monty-frontend/src/pages/) остались Анализ, Настройки, Сервисы и вход. Оболочка с таб-баром — [`src/components/Layout.tsx`](monty-frontend/src/components/Layout.tsx).

### UI: дизайн-система

Интерфейс следует теме Telegram: цвета — только через токены `var(--monty-*)` из [`tokens.css`](monty-frontend/src/theme/tokens.css) (фон, поверхность, текст, hint, акцент, разделители; деньги — `--monty-income`, `--monty-negative`, группы — `--monty-group-*`). Не хардкодьте цвета и градиенты и не ветвитесь по `colorScheme` — токены уже переключаются.

- **Страница:** `Container size="sm"` с `pb="var(--monty-page-pb)"` (таб-бар + safe area), заголовок — `PageHeader` (с `onBack` показывает нативную кнопку «Назад» Telegram).
- **Группы контента:** `Section` (заголовок-капсом + скруглённая поверхность) со строками `ListRow` / `TransactionRow`.
- **Суммы:** `AmountText` / `formatMoney` — табличные цифры, знак и цвет по типу операции.
- **Действия:** обычный `Button` (primary = акцент Telegram); шторки — `Drawer position="bottom"`.

Корневой [`Makefile`](Makefile) поднимает backend и frontend для локальной разработки.

## Требования

- **Node.js** (LTS) и npm — для фронтенда
- **Python 3.12+** — для бэкенда
- **PostgreSQL** — если `STAGE` не `DEV` (см. ниже)

## Backend

```bash
cd monty-backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Создайте файл `monty-backend/.env` (переменные читаются через `pydantic-settings`). Важные поля:

- `STAGE` — при значении **`DEV`** используется SQLite (`DEV_DATABASE_URL`), иначе PostgreSQL (`DATABASE_URL`)
- `DATABASE_URL`, `DEV_DATABASE_URL` — строки подключения к БД
- `JWT_SECRET_KEY` — секрет для JWT (в продакшене обязательно сменить)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALLOWED_TELEGRAM_IDS` и др. — по необходимости для Telegram (`TELEGRAM_CHAT_ID` — чат для напоминаний и сводок)
- **Фоновые задачи** ([`app/finance/services/scheduler.py`](monty-backend/app/finance/services/scheduler.py), часовой пояс **Asia/Almaty**): **20:00** — сообщение в Telegram «кухня на завтра» (список блюд из Food → Меню на завтра или просьба составить расписание); **21:00** — напоминание записать траты; **23:50** — сводка дня по финансам. Нужны `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.

**Миграции БД** — Alembic ([`monty-backend/migrations`](monty-backend/migrations/)). При старте API выполняется `alembic upgrade head` ([`app/core/migrations.py`](monty-backend/app/core/migrations.py)); база, созданная до Alembic, автоматически доводится до baseline старыми `db_bootstrap`-хелперами и помечается ревизией `0001`. Новая миграция после изменения моделей:

```bash
cd monty-backend && .venv/bin/alembic revision --autogenerate -m "что изменилось"
```

**Голосовой ввод** — `POST /voice/parse` (JWT, multipart: `audio` или `text`) → транскрипция `gpt-4o-mini-transcribe` → общий парсер [`expense_parser.py`](monty-backend/app/finance/services/expense_parser.py) (его же использует Siri) → черновики; сохранение подтверждённых — `POST /transactions/bulk`. Нужен `OPENAI_API_KEY`.

Тесты backend:

```bash
cd monty-backend && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest
```

Запуск API (порт **8000**):

```bash
make backend-run
# или: cd monty-backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Документация OpenAPI: `http://localhost:8000/docs`

### Food API (префикс `/food`, тот же JWT)

| Область | Эндпоинты (кратко) |
|---------|-------------------|
| Категории приёма пищи | `GET/POST /food/meal-categories`, `PATCH/DELETE /food/meal-categories/{id}` |
| Блюда | `GET/POST /food/dishes`, `PATCH/DELETE /food/dishes/{id}`; ответы включают вложенный **состав** (`ingredients`) |
| Единицы измерения | `GET /food/units` (при пустой таблице создаются базовые: g, ml, pcs, …) |
| Справочник продуктов | `GET /food/ingredients?q=…`, `POST/PATCH/DELETE /food/ingredients/{id}` |
| Состав блюда | `PUT /food/dishes/{id}/ingredients` — тело `{ "items": [ { "ingredient_id", "quantity", "unit_id", … } ] }` (полная замена списка) |
| Меню недели | `GET /food/menu?from=…&to=…`, `POST /food/menu/slots`, `PATCH/DELETE /food/menu/slots/{id}` |
| Список покупок | `GET /food/shopping-lists/latest`, `POST /food/shopping-lists/generate` (тело `{ date_from, date_to }` — агрегация состава блюд из меню), `POST /food/shopping-lists/{id}/items`, `PATCH /food/shopping-items/{id}` |
| Кладовая | `GET/POST /food/pantry`, `PATCH/DELETE /food/pantry/{id}` (на продукт одна строка на дом; `POST` при уже существующей строке суммирует количество при той же единице) |

На MVP данные привязаны к одному «дому» (`household_id` в коде). Целевая схема домена и связка с Finance — в [`docs/food-data-model-v2.md`](docs/food-data-model-v2.md).

## Frontend

```bash
cd monty-frontend
npm install
```

По умолчанию клиент ходит на `http://localhost:8000`. Чтобы указать другой API:

```bash
# monty-frontend/.env.local
VITE_API_URL=https://your-api.example.com
```

Запуск dev-сервера:

```bash
make frontend-run
# или: cd monty-frontend && npm run dev
```

Сборка и тесты:

```bash
cd monty-frontend && npm run build
cd monty-frontend && npm test
```

## Разработка

Запустите backend и frontend в двух терминалах из корня репозитория:

```bash
make backend-run
make frontend-run
```

Дополнительно см. [`monty-frontend/README.md`](monty-frontend/README.md).
test
