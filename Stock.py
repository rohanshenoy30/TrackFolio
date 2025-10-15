from datetime import datetime

class Stock:
    def __init__(self, ticker, buy_date : datetime, sell_date : datetime, quantity):
        self.ticker             = ticker
        self.buy_date           = buy_date
        self.sell_date          = sell_date
        self.quantity           = quantity
