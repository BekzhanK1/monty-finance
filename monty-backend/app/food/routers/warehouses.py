"""Склады и перемещения между ними."""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_db
from app.finance.models import User
from app.food.deps import get_food_household_id
from app.food.models import (
    FoodIngredient,
    FoodPantryItem,
    FoodStockMovement,
    FoodStockTransfer,
    FoodStockTransferLine,
    FoodUnit,
    FoodWarehouse,
)
from app.food.schemas import (
    FoodTransferCreate,
    FoodTransferLineResponse,
    FoodTransferResponse,
    FoodWarehouseCreate,
    FoodWarehouseResponse,
    FoodWarehouseUpdate,
)
from app.food.services import transfers, warehouses
from app.food.services.expiry import stock_status
from app.middleware.auth import get_current_user

router = APIRouter()

ATTENTION = {"expired", "expiring", "low", "out"}


def _warehouse_response(db: Session, w: FoodWarehouse) -> FoodWarehouseResponse:
    rows = db.query(FoodPantryItem).filter(FoodPantryItem.warehouse_id == w.id).all()
    attention = sum(
        1 for r in rows
        if stock_status(quantity=Decimal(r.quantity),
                        min_quantity=Decimal(r.min_quantity) if r.min_quantity is not None else None,
                        expires_on=r.expires_on)[0] in ATTENTION
        and not (Decimal(r.quantity) <= 0 and r.min_quantity is None)
    )
    return FoodWarehouseResponse(
        id=w.id, name=w.name, emoji=w.emoji, is_default=w.is_default, sort_order=w.sort_order,
        items_count=sum(1 for r in rows if Decimal(r.quantity) > 0), attention_count=attention,
    )


def _get(db: Session, household_id: int, warehouse_id: int) -> FoodWarehouse:
    w = db.query(FoodWarehouse).filter(
        FoodWarehouse.id == warehouse_id, FoodWarehouse.household_id == household_id,
        FoodWarehouse.is_archived.is_(False)).first()
    if not w:
        raise HTTPException(status_code=404, detail="Склад не найден")
    return w


@router.get("/warehouses", response_model=list[FoodWarehouseResponse])
def list_warehouses(db: Session = Depends(get_db), household_id: int = Depends(get_food_household_id)):
    warehouses.ensure_default_warehouse(db, household_id=household_id)
    db.commit()
    return [_warehouse_response(db, w) for w in warehouses.list_warehouses(db, household_id=household_id)]


@router.post("/warehouses", response_model=FoodWarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(body: FoodWarehouseCreate, db: Session = Depends(get_db),
                     household_id: int = Depends(get_food_household_id)):
    existing = warehouses.list_warehouses(db, household_id=household_id)
    if any(w.name.strip().casefold() == body.name.strip().casefold() for w in existing):
        raise HTTPException(status_code=400, detail="Склад с таким названием уже есть")
    w = FoodWarehouse(household_id=household_id, name=body.name.strip(), emoji=body.emoji,
                      is_default=not existing, sort_order=len(existing))
    db.add(w)
    db.commit()
    return _warehouse_response(db, w)


@router.patch("/warehouses/{warehouse_id}", response_model=FoodWarehouseResponse)
def update_warehouse(warehouse_id: int, body: FoodWarehouseUpdate, db: Session = Depends(get_db),
                     household_id: int = Depends(get_food_household_id)):
    w = _get(db, household_id, warehouse_id)
    if body.name is not None:
        w.name = body.name.strip()
    if body.emoji is not None:
        w.emoji = body.emoji
    if body.sort_order is not None:
        w.sort_order = body.sort_order
    if body.is_default:
        for other in warehouses.list_warehouses(db, household_id=household_id):
            other.is_default = other.id == w.id
    db.commit()
    return _warehouse_response(db, w)


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db),
                     household_id: int = Depends(get_food_household_id)):
    """Only an empty, non-default warehouse; with history it is archived instead of deleted."""
    w = _get(db, household_id, warehouse_id)
    if w.is_default:
        raise HTTPException(status_code=400, detail="Это основной склад — сначала сделайте основным другой")
    stocked = db.query(FoodPantryItem).filter(FoodPantryItem.warehouse_id == w.id, FoodPantryItem.quantity > 0).count()
    if stocked:
        raise HTTPException(status_code=400, detail=f"На складе ещё есть продукты ({stocked}) — переместите их или спишите")
    has_history = (
        db.query(FoodStockMovement).filter(FoodStockMovement.warehouse_id == w.id).first() is not None
        or db.query(FoodStockTransfer).filter(
            (FoodStockTransfer.from_warehouse_id == w.id) | (FoodStockTransfer.to_warehouse_id == w.id)).first() is not None
    )
    db.query(FoodPantryItem).filter(FoodPantryItem.warehouse_id == w.id).delete()
    if has_history:
        w.is_archived = True
    else:
        db.delete(w)
    db.commit()
    return None


# ---------- transfers ----------

def _transfer_response(doc: FoodStockTransfer, users: dict[int, str]) -> FoodTransferResponse:
    return FoodTransferResponse(
        id=doc.id, number=doc.number,
        from_warehouse_id=doc.from_warehouse_id, from_warehouse_name=doc.from_warehouse.name,
        to_warehouse_id=doc.to_warehouse_id, to_warehouse_name=doc.to_warehouse.name,
        comment=doc.comment, created_at=doc.created_at, cancelled_at=doc.cancelled_at,
        user_name=users.get(doc.user_id),
        lines=[FoodTransferLineResponse(ingredient_id=line.ingredient_id, ingredient_name=line.ingredient.name,
                                        quantity=float(line.quantity), unit_code=line.unit.code)
               for line in doc.lines],
    )


def _user_names(db: Session, docs: list[FoodStockTransfer]) -> dict[int, str]:
    ids = {d.user_id for d in docs if d.user_id}
    return {u.id: u.first_name for u in db.query(User).filter(User.id.in_(ids)).all()} if ids else {}


@router.get("/transfers", response_model=list[FoodTransferResponse])
def list_transfers(
    warehouse_id: int | None = Query(None, description="Только документы, где участвует этот склад"),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
):
    q = (
        db.query(FoodStockTransfer)
        .options(
            selectinload(FoodStockTransfer.lines).selectinload(FoodStockTransferLine.ingredient),
            selectinload(FoodStockTransfer.lines).selectinload(FoodStockTransferLine.unit),
            selectinload(FoodStockTransfer.from_warehouse),
            selectinload(FoodStockTransfer.to_warehouse),
        )
        .filter(FoodStockTransfer.household_id == household_id)
    )
    if warehouse_id is not None:
        q = q.filter((FoodStockTransfer.from_warehouse_id == warehouse_id) | (FoodStockTransfer.to_warehouse_id == warehouse_id))
    docs = q.order_by(FoodStockTransfer.number.desc()).limit(limit).all()
    users = _user_names(db, docs)
    return [_transfer_response(d, users) for d in docs]


@router.post("/transfers", response_model=FoodTransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    body: FoodTransferCreate,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
):
    """Провести перемещение: всё или ничего — при нехватке хоть одной позиции остатки не меняются."""
    source = _get(db, household_id, body.from_warehouse_id)
    target = _get(db, household_id, body.to_warehouse_id)
    ingredients = {i.id: i for i in db.query(FoodIngredient).filter(
        FoodIngredient.household_id == household_id,
        FoodIngredient.id.in_({line.ingredient_id for line in body.lines})).all()}
    units = {u.id: u for u in db.query(FoodUnit).all()}
    lines = []
    for line in body.lines:
        if line.ingredient_id not in ingredients or line.unit_id not in units:
            raise HTTPException(status_code=400, detail="Неизвестный продукт или единица")
        lines.append(transfers.LineInput(ingredients[line.ingredient_id], Decimal(str(line.quantity)), units[line.unit_id]))
    try:
        doc = transfers.post_transfer(db, household_id=household_id, source=source, target=target, lines=lines,
                                      comment=body.comment, user_id=current_user.id)
    except transfers.TransferError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _transfer_response(doc, _user_names(db, [doc]))


@router.post("/transfers/{transfer_id}/cancel", response_model=FoodTransferResponse)
def cancel_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    household_id: int = Depends(get_food_household_id),
    current_user: User = Depends(get_current_user),
):
    """Отменить проведение: вернуть всё на исходный склад (если на складе назначения ещё есть)."""
    doc = db.query(FoodStockTransfer).filter(
        FoodStockTransfer.id == transfer_id, FoodStockTransfer.household_id == household_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    try:
        doc = transfers.cancel_transfer(db, transfers.load_transfer(db, doc.id), user_id=current_user.id)
    except transfers.TransferError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _transfer_response(doc, _user_names(db, [doc]))
