import psycopg2
from fastapi import FastAPI
from schemas import StockCreate, StockRemove, StockItem
from database import get_db_connection
from fastapi.middleware.cors import CORSMiddleware
import backend
from fastapi import FastAPI, HTTPException
from fastapi import Query
from finance import fetch_and_print_prices
from finance import get_stock_pnl_time_series

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/add_stock")
def add_stock(stock: StockCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        backend.add_stock(stock.portfolio_id, stock.ticker, stock.buy_date, stock.sell_date, stock.quantity, stock.uid, conn, cur)
        print("✅ Commit successful")
    except Exception as e:
        conn.rollback()
        print("❌ DB error:", e)
    finally:
        cur.close()
        conn.close()
    return {"message": "Stock added successfully"}

@app.post("/api/login")
async def login(user_info: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    email = user_info.get('email')
    name = user_info.get('name')

    try:
        backend.add_user(name, conn, cur)
        backend.ensure_default_portfolio(name, conn, cur)
        print("✅ Commit successful")
    except Exception as e:
        conn.rollback()
        print("❌ DB error:", e)

    portfolios = backend.fetch_portfolios_for_user(name, conn, cur)
    portfolios_list = [{"pid": p[0], "pname": p[1]} for p in portfolios]
    
    return {"message": f"User {name} with email {email} logged in successfully.", "portfolios": portfolios_list}

@app.get("/api/portfolio_stocks")
def get_portfolio_stocks(portfolio_id: int = Query(..., alias="pid"), user_id: str = Query(..., alias="uid")):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT ticker, quantity, buy_date, sell_date FROM stock WHERE pid = %s AND uid = %s",
        (portfolio_id, user_id)
    )
    rows = cursor.fetchall()
    cursor.close()

    if rows is None:
        raise HTTPException(status_code=404, detail="Portfolio not found or no stocks")

    stocks = []
    for row in rows:
        pl = fetch_and_print_prices(row[0], row[2], row[3])
        stocks.append({
            "ticker": row[0],
            "qty": row[1],
            "buy_date": row[2],
            "sell_date": row[3],
            "pl": pl * row[1]
        })

    return stocks

from fastapi import Body

@app.post("/api/create_portfolio")
def create_portfolio(portfolio: dict = Body(...)):
    pname = portfolio.get('pname')
    uid = portfolio.get('uid')

    if not pname or not uid:
        raise HTTPException(status_code=400, detail="Missing pname or uid")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO portfolio (pname, uid) VALUES (%s, %s) RETURNING pid, pname",
        (pname, uid)
    )
    new_portfolio = cursor.fetchone()
    conn.commit()
    cursor.close()

    if new_portfolio:
        return {"pid": new_portfolio[0], "pname": new_portfolio[1]}
    else:
        raise HTTPException(status_code=400, detail="Failed to create portfolio")

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

import traceback

@app.post("/api/remove_stock")
async def remove_stock_endpoint(request: Request):
    data = await request.json()
    print("Received data:", data)
    stock = StockRemove(**data)
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        backend.remove_stock_by_primary_key(stock.ticker, stock.uid, stock.portfolio_id, conn, cur)
        cur.close()
        conn.close()
        return {"message": "Stock removed successfully"}
    except Exception as e:
        print("Exception during remove_stock:", e)
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        if cur:
            cur.close()
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))
from typing import List
class PortfolioStocksRequest(BaseModel):
    stocks: List[StockItem]

@app.post("/api/portfolio_pnl_series")
def portfolio_pnl_series(request: PortfolioStocksRequest):
    all_series = []
    for stock in request.stocks:
        print(stock.buy_date, stock.sell_date, stock.ticker, stock.quantity)
        series = get_stock_pnl_time_series(stock.ticker, stock.buy_date, stock.sell_date, stock.quantity)
        all_series.append({"ticker": stock.ticker, "pnl_series": series})
    return all_series