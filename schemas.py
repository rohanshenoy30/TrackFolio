from pydantic import BaseModel
from datetime import date

class StockCreate(BaseModel):
    ticker: str
    buy_date: date
    sell_date: date
    quantity: int
    portfolio_id: int
    uid: str