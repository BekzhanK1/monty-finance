from decimal import Decimal

from app.food.models import FoodPantryItem, FoodStockMovement, FoodWarehouse
from tests.food_factory import Food


def _stock(db, warehouse_id, name):
    db.expire_all()
    row = (db.query(FoodPantryItem).join(FoodPantryItem.ingredient)
           .filter(FoodPantryItem.warehouse_id == warehouse_id).all())
    return {r.ingredient.name: (float(r.quantity), r.unit.code) for r in row}.get(name)


def test_default_warehouse_is_created_and_more_can_be_added(client, db):
    body = client.get("/food/warehouses").json()
    assert [(w["name"], w["is_default"]) for w in body] == [("Дом", True)]
    created = client.post("/food/warehouses", json={"name": "Квартира на Абая", "emoji": "🏢"}).json()
    assert created["is_default"] is False
    assert client.post("/food/warehouses", json={"name": "квартира на абая"}).status_code == 400
    client.patch(f"/food/warehouses/{created['id']}", json={"is_default": True})
    assert [w["is_default"] for w in client.get("/food/warehouses").json()] == [False, True]


def test_pantry_is_per_warehouse(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    milk = f.ingredient("Молоко", "ml", category="dairy")
    f.stock(milk, 1, "l")
    client.post("/food/pantry", json={"ingredient_id": milk.id, "quantity": 2, "unit_id": f.unit("l").id,
                                      "warehouse_id": flat.id})
    home = client.get("/food/pantry").json()
    there = client.get("/food/pantry", params={"warehouse_id": flat.id}).json()
    everywhere = client.get("/food/pantry", params={"warehouse_id": "all"}).json()
    assert [(i["quantity"], i["warehouse_name"]) for i in home] == [(1, "Дом")]
    assert [(i["quantity"], i["warehouse_name"]) for i in there] == [(2, "Абая")]
    assert len(everywhere) == 2


def test_transfer_moves_stock_with_unit_conversion_and_journal(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    flour, eggs = f.ingredient("Мука"), f.ingredient("Яйца", "pcs", category="dairy")
    f.stock(flour, 1, "kg", location="pantry")
    f.stock(eggs, 10, "pcs", location="fridge")

    res = client.post("/food/transfers", json={
        "from_warehouse_id": f.home.id, "to_warehouse_id": flat.id, "comment": "на дачу",
        "lines": [{"ingredient_id": flour.id, "quantity": 300, "unit_id": f.unit("g").id},
                  {"ingredient_id": eggs.id, "quantity": 4, "unit_id": f.unit("pcs").id}],
    })
    assert res.status_code == 201, res.text
    doc = res.json()
    assert doc["number"] == 1 and doc["from_warehouse_name"] == "Дом" and doc["to_warehouse_name"] == "Абая"
    # Source keeps its unit (kg); destination receives in the source row's unit.
    assert _stock(db, f.home.id, "Мука") == (0.7, "kg")
    assert _stock(db, flat.id, "Мука") == (0.3, "kg")
    assert _stock(db, f.home.id, "Яйца") == (6, "pcs") and _stock(db, flat.id, "Яйца") == (4, "pcs")
    moved = db.query(FoodPantryItem).filter_by(warehouse_id=flat.id, ingredient_id=eggs.id).one()
    assert moved.location == "fridge"

    kinds = sorted((m.kind, float(m.quantity)) for m in db.query(FoodStockMovement).filter_by(transfer_id=doc["id"]))
    assert kinds == [("transfer_in", 0.3), ("transfer_in", 4), ("transfer_out", -4), ("transfer_out", -0.3)]
    row = db.query(FoodPantryItem).filter_by(warehouse_id=flat.id, ingredient_id=flour.id).one()
    journal = client.get(f"/food/pantry/{row.id}/movements").json()
    assert [(m["kind"], m["transfer_number"]) for m in journal] == [("transfer_in", 1)]


def test_transfer_is_all_or_nothing(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    flour, eggs = f.ingredient("Мука"), f.ingredient("Яйца", "pcs")
    f.stock(flour, 1, "kg")
    f.stock(eggs, 2, "pcs")
    res = client.post("/food/transfers", json={
        "from_warehouse_id": f.home.id, "to_warehouse_id": flat.id,
        "lines": [{"ingredient_id": flour.id, "quantity": 500, "unit_id": f.unit("g").id},
                  {"ingredient_id": eggs.id, "quantity": 5, "unit_id": f.unit("pcs").id}],
    })
    assert res.status_code == 400
    assert "недостаточно" in res.json()["detail"] and "есть 2 шт." in res.json()["detail"]
    assert _stock(db, f.home.id, "Мука") == (1, "kg") and _stock(db, flat.id, "Мука") is None
    same = client.post("/food/transfers", json={"from_warehouse_id": f.home.id, "to_warehouse_id": f.home.id,
                                                "lines": [{"ingredient_id": flour.id, "quantity": 1, "unit_id": f.unit("g").id}]})
    assert same.status_code == 400


def test_cancel_transfer_returns_goods_unless_they_are_gone(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    eggs = f.ingredient("Яйца", "pcs")
    f.stock(eggs, 10, "pcs")
    body = {"from_warehouse_id": f.home.id, "to_warehouse_id": flat.id,
            "lines": [{"ingredient_id": eggs.id, "quantity": 4, "unit_id": f.unit("pcs").id}]}
    first = client.post("/food/transfers", json=body).json()
    cancelled = client.post(f"/food/transfers/{first['id']}/cancel").json()
    assert cancelled["cancelled_at"] is not None
    assert _stock(db, f.home.id, "Яйца") == (10, "pcs") and _stock(db, flat.id, "Яйца") == (0, "pcs")
    assert client.post(f"/food/transfers/{first['id']}/cancel").status_code == 400

    second = client.post("/food/transfers", json=body).json()
    assert second["number"] == 2
    row = db.query(FoodPantryItem).filter_by(warehouse_id=flat.id, ingredient_id=eggs.id).one()
    client.post(f"/food/pantry/{row.id}/adjust", json={"delta": -3})  # eaten there
    res = client.post(f"/food/transfers/{second['id']}/cancel")
    assert res.status_code == 400 and "недостаточно" in res.json()["detail"]
    assert [d["number"] for d in client.get("/food/transfers").json()] == [2, 1]


def test_cooking_availability_and_purchases_use_the_chosen_warehouse(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    eggs = f.ingredient("Яйца", "pcs", category="dairy")
    dish = f.dish("Омлет", [(eggs, 3, "pcs")], servings=2)
    f.stock(eggs, 6, "pcs", warehouse=flat)

    assert client.get(f"/food/dishes/{dish.id}/availability").json()["readiness"] == "missing"
    assert client.get(f"/food/dishes/{dish.id}/availability", params={"warehouse_id": flat.id}).json()["readiness"] == "ready"
    client.post(f"/food/dishes/{dish.id}/cook", params={"warehouse_id": flat.id}, json={})
    assert _stock(db, flat.id, "Яйца") == (3, "pcs")
    cook = db.query(FoodStockMovement).filter_by(kind="cook").one()
    assert (float(cook.quantity), cook.note) == (-3, "Омлет")

    item = client.post("/food/shopping-list/items", json={"label": "Яйца", "quantity": 10, "unit_id": f.unit("pcs").id}).json()["items"][0]
    client.patch(f"/food/shopping-list/items/{item['id']}", json={"checked": True})
    client.post("/food/shopping-list/complete", params={"warehouse_id": flat.id}, json={"to_pantry": True})
    assert _stock(db, flat.id, "Яйца") == (13, "pcs") and _stock(db, f.home.id, "Яйца") is None
    assert db.query(FoodStockMovement).filter_by(kind="purchase").count() == 1


def test_delete_warehouse_rules(client, db):
    f = Food(db)
    flat = f.warehouse("Абая")
    eggs = f.ingredient("Яйца", "pcs")
    row = f.stock(eggs, 2, "pcs", warehouse=flat)
    assert client.delete(f"/food/warehouses/{f.home.id}").status_code == 400  # default
    assert "переместите" in client.delete(f"/food/warehouses/{flat.id}").json()["detail"]
    client.post(f"/food/pantry/{row.id}/adjust", json={"delta": -2})  # journal entry → archive, not delete
    assert client.delete(f"/food/warehouses/{flat.id}").status_code == 204
    assert [w["name"] for w in client.get("/food/warehouses").json()] == ["Дом"]
    assert db.query(FoodWarehouse).filter_by(id=flat.id).one().is_archived is True
    assert client.get("/food/pantry", params={"warehouse_id": flat.id}).status_code == 404


def test_manual_edits_are_journaled(client, db):
    f = Food(db)
    rice = f.ingredient("Рис")
    row = client.post("/food/pantry", json={"ingredient_id": rice.id, "quantity": 1, "unit_id": f.unit("kg").id}).json()
    client.patch(f"/food/pantry/{row['id']}", json={"quantity": 0.6})
    client.patch(f"/food/pantry/{row['id']}", json={"quantity": 500, "unit_id": f.unit("g").id})
    moves = client.get(f"/food/pantry/{row['id']}/movements").json()
    assert [(m["kind"], m["quantity"], m["unit_code"]) for m in reversed(moves)] == [
        ("receipt", 1, "kg"), ("adjust", -0.4, "kg"), ("adjust", -0.6, "kg"), ("adjust", 500, "g"),
    ]
    # The journal adds up to the stock: 1 − 0.4 − 0.6 = 0 kg, then +500 g.
    assert Decimal(str(sum(m["quantity"] for m in moves if m["unit_code"] == "kg"))) == 0
