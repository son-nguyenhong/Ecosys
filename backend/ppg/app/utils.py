"""
Tien ich dung chung cho tang API cua PPG.

Ly do co file nay — bug that da gap:
    Cot PostgreSQL kieu NUMERIC (weight, amount_planned, allocation_pct, target_value…)
    duoc asyncpg tra ve dang decimal.Decimal. FastAPI/Pydantic v2 serialize Decimal
    thanh CHUOI JSON: {"weight": "40.00"}.
    Frontend khai bao cac truong nay la `number` va lam toan tren do, nen:
        0 + "40.00" + "30.00"  ->  "040.0030.00"   (noi chuoi, khong phai cong)
        -> Number("040.0030.00") = NaN  -> UI hien "NaN%"
    Vi vay phai doi Decimal -> float NGAY o bien API, de payload dung voi hop dong
    da khai bao (TypeScript types + openapi).

Luu y ve tien: float64 chinh xac tuyet doi voi so nguyen den 2^53 (~9.0e15).
NUMERIC(18,2) co the vuot nguong nay ve ly thuyet; neu sau nay can cong don so tien
lon hon the, phai chuyen sang tra chuoi va tinh bang decimal ca hai dau (FE + BE).
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Mapping


def to_jsonable(value: Any) -> Any:
    """Doi Decimal -> float, de nguyen moi kieu khac (de quy qua dict/list/tuple)."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Mapping):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v) for v in value]
    return value


def row_to_dict(row: Any) -> dict:
    """asyncpg.Record -> dict, voi moi Decimal doi thanh float.

    Dung thay cho dict(row) o cac endpoint tra ve cot NUMERIC.
    """
    return {k: to_jsonable(v) for k, v in dict(row).items()}
