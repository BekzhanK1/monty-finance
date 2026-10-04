"""Unit conversion between compatible units (mass, volume). Spoons/pieces never convert."""

from decimal import Decimal

# code → (base code, factor to base)
_BASE: dict[str, tuple[str, Decimal]] = {
    "g": ("g", Decimal(1)),
    "kg": ("g", Decimal(1000)),
    "ml": ("ml", Decimal(1)),
    "l": ("ml", Decimal(1000)),
}


def convert(quantity: Decimal, from_code: str, to_code: str) -> Decimal | None:
    """`quantity` in `from_code` expressed in `to_code`, or None when incompatible."""
    if from_code == to_code:
        return quantity
    src = _BASE.get(from_code)
    dst = _BASE.get(to_code)
    if src is None or dst is None or src[0] != dst[0]:
        return None
    return quantity * src[1] / dst[1]


def compatible(a: str, b: str) -> bool:
    return convert(Decimal(1), a, b) is not None
