import psycopg2

def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        dbname="TrackFolioDB",
        user="postgres",
        password="postgres",
        port=5432
    )
    return conn