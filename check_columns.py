
from pathlib import Path

from dotenv import dotenv_values

import pymysql

import psycopg



e = dotenv_values(Path.home() / "CivicPulse" / ".env.migration")

tables = [

    "departments", "users", "complaints",

    "officer_registration_requests", "complaint_attachments",

    "complaint_feedback", "complaint_resolution_verifications",

    "complaint_status_history", "audit_logs",

    "officer_activation_tokens", "otp_verifications",

    "password_reset_tokens",

]



s = pymysql.connect(

    host="127.0.0.1", user="root", password="",

    database="civicpulse_db",

)

t = psycopg.connect(

    host=e["PGHOST"], port=int(e["PGPORT"]),

    dbname=e["PGDATABASE"], user=e["PGUSER"],

    password=e["PGPASSWORD"], sslmode="require",

)



try:

    with s.cursor() as sc, t.cursor() as tc:

        for table in tables:

            sc.execute(f"SHOW COLUMNS FROM `{table}`")

            source_cols = {row[0] for row in sc.fetchall()}

            tc.execute(

                "SELECT column_name FROM information_schema.columns "

                "WHERE table_schema='public' AND table_name=%s",

                (table,),

            )

            target_cols = {row[0] for row in tc.fetchall()}

            if source_cols == target_cols:

                print("OK:", table)

            else:

                print("MISMATCH:", table)

                print(" Missing:", sorted(source_cols - target_cols))

                print(" Extra:", sorted(target_cols - source_cols))

finally:

    s.close()

    t.close()
