import psycopg2
from Portfolio import Portfolio
from datetime import datetime
from database import get_db_connection
from schemas import StockCreate


def execute(query: str, conn, cur):
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

def fetch(query: str, conn, cur):
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        return rows
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

def add_user(user_id, conn, cur):
    user_exists = fetch(f"SELECT uid FROM tf_user WHERE uid = '{user_id}';")
    if not user_exists:
        execute(f"INSERT INTO tf_user VALUES ('{user_id}');", conn, cur)

def ensure_default_portfolio(uid, conn, cur):
    result = fetch(f"SELECT pid FROM portfolio WHERE pid = 1 AND uid = '{uid}';")
    if not result:
        execute(f"INSERT INTO portfolio (pid, pname, uid) VALUES (1, 'My First Portfolio', '{uid}');", conn, cur)

def fetch_portfolios_for_user(uid, conn, cur):
    query = f"SELECT pid, pname FROM portfolio WHERE uid = '{uid}';"
    portfolios = fetch(query, conn, cur)
    return portfolios

def add_stock(portfolio_id, ticker, buy_date : datetime, sell_date : datetime, quantity,uid : str, conn, cur):
    execute(f"""
        insert into stock 
        values (
            {portfolio_id}, 
            \'{ticker}\', 
            \'{buy_date}\', 
            \'{sell_date}\', 
            {quantity},
            \'{uid}'
        );
    """, conn, cur)

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

def get_portfolio_list(user_id, conn, cursor):
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

def close_connection(conn):
    conn.close()