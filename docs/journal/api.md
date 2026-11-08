# Journal — API

Все эндпоинты под JWT Monty (`get_current_user`), префикс `/journal`. Без ключа шифрования в PROD — 503.

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/journal/overview` | `{today, me: Streak, today_entries, mood_mode, partners: [{user_id, first_name, streak, last_mood, last_entry_date}]}` |
| GET | `/journal/entries?date_from&date_to&limit&offset` | Свои записи, новые сверху: `{entries, total}` |
| POST | `/journal/entries` | `{content?, mood?}` → 201. 400: нет ни текста, ни настроения; в `manual` нет настроения |
| GET | `/journal/entries/{id}` | Своя запись (чужая → 404) |
| PATCH | `/journal/entries/{id}` | `{content?, mood?}`; новый текст → повторный анализ; mood → `mood_source=user` |
| POST | `/journal/entries/{id}/analyze` | Повторить анализ ИИ |
| DELETE | `/journal/entries/{id}` | 204 |
| GET | `/journal/analytics?days=7..366` | `series`, `weekday`, `tags` (со средним настроением), `emotions`, `spending` (точки + корзины low/mid/high) |
| GET | `/journal/settings` | `{mood_mode, reminder_enabled, reminder_time}` |
| PUT | `/journal/settings` | Частичное обновление; перерегистрирует job напоминания |
| POST | `/journal/settings/test-reminder` | Отправить напоминание сейчас; 502, если бот не запущен пользователем |

`Streak = {current, best, today_done, frozen_days: date[]}`.

`spending`: расходы семьи (EXPENSE без SAVINGS, скрытые исключены ORM-хуком Finance) по локальным дням,
сгруппированные по настроению дня: ≤2.5 плохой, ≥3.5 хороший.
