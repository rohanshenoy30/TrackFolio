import yfinance as yf
import time
from schemas import StockItem

def safe_download(ticker, start, end, max_retries=3):
    for attempt in range(max_retries):
        try:
            data = yf.download(ticker, start=start, end=end, progress=False)
            if data.empty:
                raise ValueError("No data returned")
            return data
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for {ticker}: {e}")
            time.sleep(1)
    print(f"Giving up on ticker: {ticker}")
    return None

import pandas as pd

def fetch_and_print_prices(ticker, buy_date_str, sell_date_str):
    df = safe_download(ticker, buy_date_str, sell_date_str)
    if df is None:
        print(f"Could not fetch data for {ticker} from {buy_date_str} to {sell_date_str}")
        return None

    if not df.empty:
        first_close = df['Close'].iloc[0].squeeze()
        last_close = df['Close'].iloc[-1].squeeze()
        pnl = last_close - first_close
        print(f"PnL: {pnl}")
        return pnl
    else:
        print("DataFrame is empty, no close prices available.")
        return None
    
def strip_time(date_str):
    # Extract only the date part before 'T'
    return date_str.split('T')[0] if 'T' in date_str else date_str

def get_stock_pnl_time_series(ticker, buy_date, sell_date, quantity):
    clean_buy_date = strip_time(buy_date)
    clean_sell_date = strip_time(sell_date)

    df = safe_download(ticker, clean_buy_date, clean_sell_date)
    if df is None or df.empty:
        return []
    buy_price = df['Close'].iloc[0]
    pnl_series = []
    for date, row in df.iterrows():
        pnl_per_share = row['Close'] - buy_price
        pnl_total = pnl_per_share * quantity
        pnl_series.append({"date": date.strftime("%Y-%m-%d"), "pnl": pnl_total})
    return pnl_series


