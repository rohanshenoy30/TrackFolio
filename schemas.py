from pydantic import BaseModel
from datetime import date
from typing import Optional

class StockCreate(BaseModel):
    ticker: str
    buy_date: date
    sell_date: date
    quantity: int
    portfolio_id: int
    uid: str

class StockRemove(BaseModel):
    ticker: str
    uid: str
    portfolio_id: int  # pid