from datetime import datetime

class Stock:
    def __init__(self, ticker, start_date : datetime, end_date : datetime, quantity):
        self.ticker           = ticker
        self.start_date     = start_date
        self.end_date       = end_date
        self.quantity       = quantity
