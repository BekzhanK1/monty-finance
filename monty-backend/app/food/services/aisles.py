"""Store aisles for grouping shopping lists, plus a keyword guesser for Russian product names."""

AISLES: list[tuple[str, str, str]] = [
    # key, label, emoji
    ("produce", "Овощи и фрукты", "🥦"),
    ("dairy", "Молочное и яйца", "🥛"),
    ("meat", "Мясо и рыба", "🥩"),
    ("bakery", "Хлеб и выпечка", "🍞"),
    ("grocery", "Бакалея", "🍝"),
    ("frozen", "Заморозка", "🧊"),
    ("spices", "Специи и соусы", "🧂"),
    ("drinks", "Напитки", "🥤"),
    ("sweets", "Сладкое", "🍫"),
    ("household", "Для дома", "🧻"),
    ("other", "Другое", "🛒"),
]
AISLE_KEYS = {key for key, _, _ in AISLES}

# Word stems → aisle. Checked in order, first match wins.
_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("frozen", ("заморож", "пельмен", "мороженое", "вареник")),
    ("dairy", ("молок", "кефир", "сметан", "творог", "сыр", "йогурт", "масло сливоч", "сливки", "яйц", "яйко", "ряженк", "айран", "катык")),
    ("meat", ("мяс", "говя", "свин", "баран", "куриц", "курин", "филе", "фарш", "индейк", "рыб", "лосос", "семг", "сельд", "кревет", "колбас", "сосис", "бекон", "ветчин", "казы", "конин", "печень")),
    ("produce", ("картоф", "картош", "морков", "лук", "чеснок", "помидор", "томат", "огур", "капуст", "перец болгар", "болгарск", "зелен", "укроп", "петруш", "кинза", "салат", "яблок", "банан", "лимон", "апельсин", "мандарин", "груш", "виноград", "ягод", "клубник", "авокадо", "кабач", "баклаж", "свекл", "редис", "гриб", "шампиньон", "тыкв", "имбир", "фрукт", "овощ")),
    ("bakery", ("хлеб", "батон", "лаваш", "булк", "багет", "лепешк", "тортил", "круассан", "лепёшк")),
    # "фасоль" must hit grocery before "соль" hits spices.
    ("grocery", ("рис", "греч", "макарон", "паст", "спагет", "лапш", "мука", "сахар", "овсян", "круп", "булгур", "киноа", "фасол", "чечев", "нут", "горох", "консерв", "тушен", "орех", "мёд", "мед ", "джем", "хлопья", "дрожж", "крахмал", "сод")),
    ("spices", ("соль", "перец", "специ", "приправ", "соус", "кетчуп", "майонез", "горчиц", "уксус", "паприк", "куркум", "зира", "лавров", "корица", "ванил", "масло растит", "оливков", "подсолнеч", "масло")),
    ("drinks", ("вода", "сок", "чай", "кофе", "лимонад", "кола", "компот", "морс", "пиво", "вино")),
    ("sweets", ("шоколад", "конфет", "печенье", "торт", "пирожн", "вафл", "зефир", "мармелад")),
    ("household", ("бумаг", "салфет", "мыло", "шампун", "порош", "губк", "пакет", "фольг", "пленк", "плёнк", "средство", "зубн", "туалет")),
]


def guess_aisle(name: str) -> str:
    text = f" {name.strip().lower()} "
    for aisle, stems in _KEYWORDS:
        if any(stem in text for stem in stems):
            return aisle
    return "other"


def aisle_for(category: str | None, name: str) -> str:
    """A stored aisle key wins; legacy free-text categories fall back to guessing from the name."""
    if category in AISLE_KEYS:
        return category
    return guess_aisle(name)


# Where a freshly bought product usually goes.
_DEFAULT_LOCATION = {"produce": "fridge", "dairy": "fridge", "meat": "fridge", "frozen": "freezer"}


def default_location(aisle: str) -> str:
    return _DEFAULT_LOCATION.get(aisle, "pantry")
