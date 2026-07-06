# Health — документация

Живой продуктовый слой Monty **Health**: сценарии со стороны пользователя, затем API и БД.

| Документ | Содержание |
|----------|------------|
| [user-stories.md](./user-stories.md) | User stories (триггер → шаги → результат) |
| [decisions.md](./decisions.md) | **Решения D1–D5**, MVP vs V2 |
| [data-model.md](./data-model.md) | **Сущности и таблицы** `gym_*`, инварианты D1–D5 |
| [api.md](./api.md) | **REST** `/gym/*`, эндпоинты под сценарии G-* |
| [prototype/gym.html](./prototype/gym.html) | HTML-прототип (mock, кликабельный) |

### Прототип

```bash
xdg-open docs/health/prototype/gym.html
```

Mobile-first (~430px).

## Gym — суть

- **Одна программа:** дни A, B, C…, план подход×повтор.
- **Свои упражнения** (RU/EN), общие **категории**.
- **Поход:** подходы по одному → вес (0 ок) → отдых 90s (+30/−15) → история.
- **Resume** незавершённой сессии ([D1](./decisions.md#d1-незавершённая-тренировка)).
- **MVP:** поиск, drag в программе, zero states, прошлый вес, haptic, ⋯ для опасных действий.

Подробно: [user-stories.md](./user-stories.md) · [decisions.md](./decisions.md) · [data-model.md](./data-model.md) · [api.md](./api.md).

## Как обновляем

Описываешь поведение «как для пользователя» → правки в `user-stories.md` и при необходимости `decisions.md` / `data-model.md` / `api.md`. ID сценариев (`G-2`, …) и решений (`D1`, …) стараемся не менять.
