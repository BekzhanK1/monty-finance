from datetime import date, timedelta
from decimal import Decimal

from app.finance.models import Transaction
from app.food.models import FoodPantryItem
from tests.food_factory import Food


def _items(body):
    return {it["label"]: it for it in body["items"]}


def test_week_flow_menu_to_list_to_pantry_to_cooking(client, db, monkeypatch):
    monkeypatch.setattr("app.food.routers.shopping_list.send_transaction_notification", lambda **_: True)
    f = Food(db)
    rice, chicken = f.ingredient("Рис"), f.ingredient("Курица", category="meat")
    plov = f.dish("Плов", [(rice, 300, "g"), (chicken, 500, "g")], servings=2)
    monday = date(2026, 10, 5)
    slot = f.slot(plov, monday, servings=2)

    # 1. Menu shows the dish is missing everything.
    menu = client.get("/food/menu", params={"from": monday.isoformat(), "to": (monday + timedelta(days=6)).isoformat()}).json()
    assert (menu[0]["readiness"], menu[0]["missing_count"]) == ("missing", 2)

    # 2. Build the list from the menu (twice — no duplicates) and add a manual item.
    rng = {"date_from": monday.isoformat(), "date_to": (monday + timedelta(days=6)).isoformat()}
    assert client.post("/food/shopping-list/from-menu", json=rng).json()["added"] == 2
    assert client.post("/food/shopping-list/from-menu", json=rng).json()["added"] == 0
    body = client.post("/food/shopping-list/items", json={"label": "Хлеб"}).json()
    items = _items(body)
    assert items["Курица"]["category"] == "meat" and items["Курица"]["sources"] == "Плов"
    assert items["Хлеб"]["category"] == "bakery" and items["Хлеб"]["quantity"] is None

    # 3. Buy rice and chicken, leave bread; complete with a receipt total.
    for label in ("Рис", "Курица"):
        client.patch(f"/food/shopping-list/items/{items[label]['id']}", json={"checked": True})
    done = client.post("/food/shopping-list/complete", json={"to_pantry": True, "total_amount": 7400}).json()
    assert done["moved_to_pantry"] == 2
    assert [it["label"] for it in done["list"]["items"]] == ["Хлеб"]
    tx = db.query(Transaction).filter(Transaction.id == done["transaction_id"]).one()
    assert tx.amount == 7400 and "Рис" in tx.comment

    # 4. Today shows the dish ready; cooking writes it off.
    today = client.get("/food/today", params={"day": monday.isoformat()}).json()
    assert today["slots"][0]["readiness"] == "ready"
    assert today["shopping_open"] == 1
    cooked = client.post(f"/food/menu/slots/{slot.id}/cook", json={}).json()
    assert {c["name"]: c["quantity"] for c in cooked["consumed"]} == {"Рис": 300, "Курица": 500}
    assert cooked["slot"]["cooked_at"] is not None
    assert client.post(f"/food/menu/slots/{slot.id}/cook", json={}).status_code == 409
    stock = {r.ingredient.name: Decimal(r.quantity) for r in db.query(FoodPantryItem).all()}
    assert stock == {"Рис": 0, "Курица": 0}


def test_complete_requires_bought_items(client):
    res = client.post("/food/shopping-list/complete", json={})
    assert res.status_code == 400


def test_item_edit_and_delete(client, db):
    f = Food(db)
    body = client.post("/food/shopping-list/items", json={"label": "Сметана", "quantity": 1, "unit_id": f.unit("pcs").id}).json()
    item = body["items"][0]
    body = client.patch(f"/food/shopping-list/items/{item['id']}",
                        json={"label": "Сметана 20%", "quantity": None, "unit_id": None, "category": "dairy"}).json()
    assert (body["items"][0]["label"], body["items"][0]["quantity"], body["items"][0]["unit_code"]) == ("Сметана 20%", None, None)
    assert client.patch(f"/food/shopping-list/items/{item['id']}", json={"category": "nope"}).status_code == 400
    assert client.delete(f"/food/shopping-list/items/{item['id']}").json()["items"] == []


def test_pantry_create_by_name_adjust_and_statuses(client, db):
    f = Food(db)
    today = date.today()
    res = client.post("/food/pantry", json={
        "name": "Молоко", "quantity": 1, "unit_id": f.unit("l").id,
        "expires_on": (today + timedelta(days=2)).isoformat(), "min_quantity": 1,
    })
    assert res.status_code == 201, res.text
    milk = res.json()
    assert (milk["location"], milk["aisle"], milk["status"], milk["days_left"]) == ("fridge", "dairy", "expiring", 2)

    # Adding 500 ml to a litre row converts.
    milk = client.post("/food/pantry", json={"name": "молоко", "quantity": 500, "unit_id": f.unit("ml").id}).json()
    assert milk["quantity"] == 1.5 and milk["unit_code"] == "l"
    assert client.post("/food/pantry", json={"name": "Молоко", "quantity": 2, "unit_id": f.unit("pcs").id}).status_code == 400

    low = client.post(f"/food/pantry/{milk['id']}/adjust", json={"delta": -1}).json()
    assert low["quantity"] == 0.5
    low = client.patch(f"/food/pantry/{milk['id']}", json={"expires_on": None}).json()
    assert (low["status"], low["expires_on"]) == ("low", None)
    out = client.post(f"/food/pantry/{milk['id']}/adjust", json={"delta": -10}).json()
    assert (out["quantity"], out["status"]) == (0, "out")

    today_body = client.get("/food/today").json()
    assert [p["ingredient_name"] for p in today_body["low_stock"]] == ["Молоко"]
    added = client.post("/food/shopping-list/low-stock").json()
    assert added["added"] == 1 and added["list"]["items"][0]["quantity"] == 1


def test_dish_availability_cook_and_to_shopping(client, db):
    f = Food(db)
    eggs, flour = f.ingredient("Яйца", "pcs", category="dairy"), f.ingredient("Мука")
    dish = f.dish("Блины", [(eggs, 2, "pcs"), (flour, 200, "g")], servings=2)
    f.stock(eggs, 3, "pcs")

    avail = client.get(f"/food/dishes/{dish.id}/availability", params={"servings": 4}).json()
    assert avail["readiness"] == "partial"
    assert [(line["name"], line["status"], line["missing"]) for line in avail["lines"]] == [
        ("Яйца", "short", 1), ("Мука", "none", 400),
    ]
    added = client.post(f"/food/dishes/{dish.id}/to-shopping", json={"servings": 4}).json()
    assert {it["label"]: it["quantity"] for it in added["list"]["items"]} == {"Яйца": 1, "Мука": 400}

    cooked = client.post(f"/food/dishes/{dish.id}/cook", json={"servings": 2}).json()
    assert cooked["consumed"] == [{"ingredient_id": eggs.id, "name": "Яйца", "quantity": 2, "unit_code": "pcs", "shortfall": False}]


def test_uncook_keeps_stock(client, db):
    f = Food(db)
    eggs = f.ingredient("Яйца", "pcs")
    dish = f.dish("Омлет", [(eggs, 2, "pcs")])
    slot = f.slot(dish, date(2026, 10, 5))
    f.stock(eggs, 2, "pcs")
    client.post(f"/food/menu/slots/{slot.id}/cook", json={})
    res = client.post(f"/food/menu/slots/{slot.id}/uncook").json()
    assert res["slot"]["cooked_at"] is None
    assert Decimal(db.query(FoodPantryItem).one().quantity) == 0
