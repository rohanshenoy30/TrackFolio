from Stock import Stock
from datetime import datetime

class Portfolio:
    def __init__(self, id):
        self.id = id
        self.stocks = dict()
    
    def get_stocks(self):
        stockList = []
        for key in self.stocks:
            (ticker, start_date, end_date) = key
            stockList.append(Stock(ticker, start_date, end_date, self.stocks[key]))
        return stockList
    
    def add_stock(self, ticker, start_date : datetime, end_date : datetime, quantity):
        key = (ticker, start_date, end_date)
        if key not in self.stocks:
            self.stocks[key] = quantity
        else:
            self.stocks[key] += quantity
    
    def remove_stock(self, ticker, start_date : datetime, end_date : datetime, quantityToRemove):
        key = (ticker, start_date, end_date)
        if key not in self.stocks:
            return

        if self.stocks[key] <= quantityToRemove:
            self.stocks.pop(key)
        else:
            self.stocks[key] -= quantityToRemove
