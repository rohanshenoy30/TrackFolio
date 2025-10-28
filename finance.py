import yfinance as yf
import time

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
