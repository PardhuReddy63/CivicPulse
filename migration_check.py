
from pathlib import Path

from dotenv import dotenv_values

import pymysql

import psycopg



ROOT = Path.home() / "CivicPulse"

env = dotenv_values(ROOT / ".env.migration")



TABLES = [

    "departments",

    "users",

    "complaints",

    "officer_registration_requests",

    "complaint_attachments",

    "complaint_feedback",

    "complaint_resolution_verifications",

    "complaint_status_history",

    "audit_logs",

    "officer_activation_tokens",

    "otp_verifications",

    "password_reset_tokens",

]



def main():

    source = pymysql.connect(

        host="127.0.0.1",

        port=3306,

        user="root",

        password="",

        database="civicpulse_db",

        cursorclass=pymysql.cursors.DictCursor,

    )

    target = psycopg.connect(

        host=env["PGHOST"],

        port=int(env["PGPORT"]),

        dbname=env["PGDATABASE"],

        user=env["PGUSER"],

        password=env["PGPASSWORD"],

        sslmode="require",

    )

    try:

        total = 0

        with source.cursor() as cur:

            for table in TABLES:

                cur.execute(f"SELECT COUNT(*) AS n FROM `{table}`")

                count = cur.fetchone()["n"]

                total += count

                print(f"MariaDB {table}: {count}")



        with target.cursor() as cur:

            for table in TABLES:

                cur.execute(f'SELECT COUNT(*) FROM public."{table}"')

                count = cur.fetchone()[0]

                print(f"Supabase {table}: {count}")



        print(f"Source total: {total}")

        print("CHECK ONLY — no records were changed.")

    finally:

        source.close()

        target.close()



if __name__ == "__main__":

    main()
