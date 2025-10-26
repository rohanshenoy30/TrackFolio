from fastapi import FastAPI
from schemas import StockCreate
from database import get_db_connection
from fastapi.middleware.cors import CORSMiddleware
import backend
from fastapi import FastAPI, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests

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
        backend.add_stock(stock.portfolio_id, stock.ticker, stock.buy_date, stock.sell_date, stock.quantity)
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
        backend.add_user(name)
        backend.ensure_default_portfolio(name)
        print("✅ Commit successful")
    except Exception as e:
        conn.rollback()
        print("❌ DB error:", e)

    
    return {"message": f"User {name} with email {email} logged in successfully."}