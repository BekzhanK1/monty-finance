# Journal — документация

Вертикаль **Journal** в Monty: личный дневник для пары. Короткая запись или просто настроение,
серии (streaks), видимость серии партнёра, напоминания в Telegram, графики и паттерны —
включая связь настроения и трат из Finance.

Перенесено и переосмыслено из Moodlog: без email/Google-логина, подписок, промокодов и админки;
настоящее шифрование вместо XOR; настроение 1–5 вместо LLM-оценки −2..+2.

| Документ | Содержание |
|----------|------------|
| [user-stories.md](./user-stories.md) | Сценарии J-* (триггер → шаги → результат) |
| [decisions.md](./decisions.md) | **Решения J1–J7**, что отложено |
| [data-model.md](./data-model.md) | Таблицы `journal_*`, инварианты, шифрование |
| [api.md](./api.md) | REST `/journal/*` |
| [tech-debt.md](./tech-debt.md) | Технический долг Journal и найденный по пути долг Monty |

## Где код

| Путь | Что |
|------|-----|
| `monty-backend/app/journal/` | `models.py`, `schemas.py`, `crypto.py`, `router.py` → `/journal` |
| `app/journal/routers/` | `overview` (серии, партнёры, аналитика), `entries`, `settings` |
| `app/journal/services/` | `streaks` (чистая логика), `analysis` (1 вызов LLM), `analytics`, `reminders` |
| `migrations/versions/0006_journal.py` | Таблицы `journal_entries`, `journal_settings` |
| `monty-frontend/src/features/journal/` | Экраны Сегодня / История / Запись / Анализ / Настройки, `mood.ts` (чистая логика + тесты) |

## Запуск в проде

1. Сгенерировать ключ и положить в `monty-backend/.env` на сервере:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   # JOURNAL_ENCRYPTION_KEY=<ключ>
   ```
   **Сохраните ключ отдельно (менеджер паролей).** Потеря или замена ключа = все записи нечитаемы.
   Без ключа в PROD `/journal/*` отвечает 503, остальной Monty работает.
2. `OPENAI_API_KEY` уже используется Finance — Journal берёт тот же.
3. Каждый должен один раз нажать **Start** у бота — иначе Telegram не даст прислать личное напоминание.
   Проверить: Дневник → Настройки → «Тест».
4. Миграция `0006` применяется сама при старте (`run_migrations`).

## Тесты

```bash
cd monty-backend && .venv/bin/pytest tests/test_journal_*.py   # серии, приватность, режимы настроения, аналитика
cd monty-frontend && npx vitest run src/features/journal          # mood.ts
```
