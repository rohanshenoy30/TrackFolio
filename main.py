from fastapi import FastAPI
from schemas import StockCreate
from database import get_db_connection
from fastapi.middleware.cors import CORSMiddleware
import backend

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # React dev URLs
    allow_credentials=True,
    allow_methods=["*"],         # allow POST, GET, etc.
    allow_headers=["*"],         # allow all custom headers
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

@app.get("/ping")
def ping():
    return {"status": "ok"}