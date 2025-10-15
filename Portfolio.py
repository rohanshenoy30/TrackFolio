import backend
from Stock import Stock
from datetime import datetime

class Portfolio:
    def __init__(self, id, name, stocks):
        self.id = id
        self.name = name
        self.stocks = stocks()

    def __init__(self, id, name):
        self.id = id
        self.name = name
        self.stocks = dict()
    
    def rename(self, name : str):
        self.name = name
        backend.rename_portfolio(self.id)

    def get_stocks(self):
        stockList = []
        for key in self.stocks:
            (ticker, buy_date, sell_date) = key
            stockList.append(Stock(ticker, buy_date, sell_date, self.stocks[key]))
        return stockList
    
    def add_stock(self, ticker, buy_date : datetime, sell_date : datetime, quantity):
        key = (ticker, buy_date, sell_date)
        if key not in self.stocks:
            self.stocks[key] = quantity
            backend.add_stock(self.id, ticker, buy_date, sell_date, quantity)
        else:
            self.stocks[key] += quantity
            backend.update_stock_quantity_by_attributes(self.id, ticker, buy_date, sell_date, self.stocks[key])

    def remove_stock(self, ticker, buy_date : datetime, sell_date : datetime, quantityToRemove):
        key = (ticker, buy_date, sell_date)
        if key not in self.stocks:
            return

        if self.stocks[key] <= quantityToRemove:
            self.stocks.pop(key)
            backend.remove_stock_by_attributes(self.id, ticker, buy_date, sell_date)
        else:
            self.stocks[key] -= quantityToRemove
            backend.update_stock_quantity_by_attributes(self.id, ticker, buy_date, sell_date, self.stocks[key])