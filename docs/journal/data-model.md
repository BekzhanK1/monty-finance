# Journal — модель данных

Миграция `0006_journal` (идемпотентная: legacy-БД после `create_all` уже может иметь таблицы).

## `journal_entries`
| Колонка | Тип | Смысл |
|---------|-----|-------|
| `id` | String(36) PK | UUID |
| `user_id` | FK users, index | автор |
| `entry_date` | Date, index | локальный (Алматы) день, за который считается запись |
| `mood` | SmallInteger null | 1..5; `null` = неизвестно (никогда не «нейтрально» по умолчанию) |
| `mood_source` | String(8) null | `user` / `ai` |
| `content_enc` | Text null | Fernet(текст) |
| `analysis_enc` | Text null | Fernet(JSON `{summary, tags, emotions}`) |
| `analysis_status` | String(12) | `pending` / `done` / `failed` / `skipped` (нечего анализировать) |
| `created_at`, `updated_at` | DateTime | naive UTC, как во всём Monty |

Несколько записей в день разрешены; для графиков настроение дня = среднее.

## `journal_settings`
| Колонка | Тип | По умолчанию |
|---------|-----|--------------|
| `user_id` | PK, FK users | — |
| `mood_mode` | String(8) | `manual` |
| `reminder_enabled` | Boolean | `true` |
| `reminder_time` | String(5) `HH:MM` | `21:30` (Алматы) |

Строка создаётся лениво при первом обращении.

## Инварианты
- Запись имеет текст **или** настроение; в режиме `manual` настроение обязательно при создании.
- `mood_source = user` → ИИ не меняет `mood`.
- Без `content_enc` → `analysis_status = skipped`, `analysis_enc = null`.
- `pending` старше 5 минут отдаётся как `failed` (фоновая задача могла погибнуть при рестарте).
