import psycopg2
from Portfolio import Portfolio
from datetime import datetime
from database import get_db_connection
from schemas import StockCreate

print("connecting to DB")
conn = get_db_connection()
cursor = conn.cursor()

def execute(query : str):
    cursor.execute(query)
    conn.commit()

def add_user(user_id):
    execute(f"""
        insert into tf_user
        values (
            \'{user_id}\'
        );
    """)

def add_stock(portfolio_id, ticker, buy_date : datetime, sell_date : datetime, quantity):
    execute(f"""
        insert into stock 
        values (
            {portfolio_id}, 
            \'{ticker}\', 
            \'{buy_date}\', 
            \'{sell_date}\', 
            {quantity}
        );
    """)

def remove_stock_by_attributes(portfolio_id, ticker, buy_date : datetime, sell_date : datetime):
    execute(f"""
        delete from stock 
        where (
            pid, 
            ticker, 
            buy_date, 
            sell_date
        ) = (
            {portfolio_id}, 
            \'{ticker}\', 
            \'{buy_date}\', 
            \'{sell_date}\'
        );
    """)

def remove_stock(portfolio_id, stock : StockCreate):
    remove_stock_by_attributes(portfolio_id, stock.ticker, stock.buy_date, stock.sell_date)

def update_stock_quantity_by_attributes(portfolio_id, ticker, buy_date : datetime, sell_date : datetime, new_quantity):
    execute(f"""
        update stock 
        set quantity = {new_quantity} 
        where (
            pid, 
            ticker, 
            buy_date, 
            sell_date
        ) = (
            {portfolio_id}, 
            \'{ticker}\', 
            \'{buy_date}\', 
            \'{sell_date}\'
        );
    """)

def update_stock_quantity(portfolio_id, stock : StockCreate, new_quantity):
    update_stock_quantity_by_attributes(portfolio_id, stock.ticker, stock.buy_date, stock.sell_date, new_quantity)

def add_portfolio(user_id, portfolio_id, portfolio_name):
    execute(f"""
        insert into portfolio
        values (
            {portfolio_id},
            \'{portfolio_name}\'
        );
    """)

    execute(f"""
        insert into user_portfolio
        values (
            \'{user_id}\',
            {portfolio_id}
        );
    """)

def remove_portfolio_by_id(portfolio_id : int):
    execute(f"""
        delete from user_portfolio
        where pid = {portfolio_id};
    """)

    execute(f"""
        delete from stock
        where pid = {portfolio_id};
    """)

    execute(f"""
        delete from portfolio
        where pid = {portfolio_id};
    """)

def remove_portfolio(portfolio : Portfolio):
    remove_portfolio_by_id(portfolio.id)

def rename_portfolio(id, name):
    execute(f"""
        update portfolio
        set pname = \'{name}\'
        where pid = {id};
    """)

def get_portfolio_list(user_id):
    execute(f"""
        select * 
        from portfolio
        where pid in (
            select pid
            from user_portfolio
            where uid <= \'{user_id}\'
        );
    """)

    portfolio_list = []
    for t in cursor.fetchall():
        (pid, pname) = t
        portfolio_list.append(Portfolio(pid, pname))

    for p in portfolio_list:
        execute(f"""
            select ticker, buy_date, sell_date, quantity
            from stock
            where pid = {p.id}
        """)
        for t in cursor.fetchall():
            (ticker, buy_date, sell_date, quantity) = t
            p.stocks[(ticker, buy_date, sell_date)] = quantity

    return portfolio_list

def close_connection():
    conn.close()