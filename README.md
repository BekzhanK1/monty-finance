# Monty Finance

Монорепозиторий приложения **Monty**: веб-клиент на React и API на FastAPI для учёта финансов (в т.ч. интеграция с Telegram).

## Структура

| Каталог | Описание |
|---------|----------|
| [`monty-backend`](monty-backend/) | FastAPI, SQLAlchemy, Alembic, фоновые задачи (APScheduler) |
| [`monty-frontend`](monty-frontend/) | Vite, React 19, TypeScript, Mantine, React Router |

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
- `TELEGRAM_BOT_TOKEN`, `ALLOWED_TELEGRAM_IDS` и др. — по необходимости для Telegram

Запуск API (порт **8000**):

```bash
make backend-run
# или: cd monty-backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Документация OpenAPI: `http://localhost:8000/docs`

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

Сборка:

```bash
cd monty-frontend && npm run build
```

## Разработка

Запустите backend и frontend в двух терминалах из корня репозитория:

```bash
make backend-run
make frontend-run
```

Дополнительно см. [`monty-frontend/README.md`](monty-frontend/README.md).
