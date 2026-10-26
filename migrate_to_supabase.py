
import json

from pathlib import Path



import pymysql

import psycopg

from psycopg.types.json import Jsonb

from dotenv import dotenv_values



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



BOOL_COLUMNS = {

    "departments": {"active"},

    "users": {"active", "verified", "must_change_password"},

}





def connect_source():

    return pymysql.connect(

        host="127.0.0.1",

        port=3306,

        user="root",

        password="",

        database="civicpulse_db",

        cursorclass=pymysql.cursors.DictCursor,

    )





def connect_target():

    return psycopg.connect(

        host=env["PGHOST"],

        port=int(env["PGPORT"]),

        dbname=env["PGDATABASE"],

        user=env["PGUSER"],

        password=env["PGPASSWORD"],

        sslmode="require",

        connect_timeout=15,

    )





def convert_value(table, column, value):

    if value is None:

        return None



    if column in BOOL_COLUMNS.get(table, set()):

        return bool(value)



    if table == "audit_logs" and column == "details_json":

        if not value:

            return None

        return Jsonb(json.loads(value))



    return value






def validate_databases(source, target):

    with source.cursor() as cur:

        cur.execute("SHOW TABLES")

        source_tables = {list(row.values())[0] for row in cur.fetchall()}



    missing = set(TABLES) - source_tables

    if missing:

        raise RuntimeError(f"Missing MariaDB tables: {sorted(missing)}")



    with target.cursor() as cur:

        cur.execute("""

            SELECT table_name

            FROM information_schema.tables

            WHERE table_schema = 'public'

        """)

        target_tables = {row[0] for row in cur.fetchall()}



        missing = set(TABLES) - target_tables

        if missing:

            raise RuntimeError(f"Missing Supabase tables: {sorted(missing)}")



        for table in TABLES:

            cur.execute(f'SELECT COUNT(*) FROM public."{table}"')

            count = cur.fetchone()[0]

            if count != 0:

                raise RuntimeError(

                    f"Supabase table {table} contains {count} rows; stopping."

                )



    print("Pre-import checks passed: all destination tables are empty.")





def read_source(source):

    data = {}

    with source.cursor() as cur:

        for table in TABLES:

            cur.execute(f"SELECT * FROM `{table}`")

            data[table] = cur.fetchall()



    total = sum(len(rows) for rows in data.values())

    print(f"Read {total} records from MariaDB.")

    return data






def import_data(target, data):

    with target.transaction():

        with target.cursor() as cur:

            for table in TABLES:

                rows = data[table]

                if not rows:

                    print(f"{table}: 0 rows")

                    continue



                columns = list(rows[0].keys())

                quoted_columns = ", ".join(

                    '"' + col.replace('"', '""') + '"'

                    for col in columns

                )

                placeholders = ", ".join(["%s"] * len(columns))

                sql = (

                    f'INSERT INTO public."{table}" '

                    f"({quoted_columns}) VALUES ({placeholders})"

                )



                values = [

                    tuple(

                        convert_value(table, col, row[col])

                        for col in columns

                    )

                    for row in rows

                ]



                cur.executemany(sql, values)

                print(f"{table}: inserted {len(rows)} rows")



            for table in TABLES:

                cur.execute("""

                    SELECT column_name

                    FROM information_schema.columns

                    WHERE table_schema = 'public'

                      AND table_name = %s

                      AND is_identity = 'YES'

                """, (table,))

                identity_columns = [r[0] for r in cur.fetchall()]



                for column in identity_columns:

                    cur.execute(

                        f'SELECT MAX("{column}") '

                        f'FROM public."{table}"'

                    )

                    max_id = cur.fetchone()[0]



                    if max_id is not None:

                        cur.execute(

                            "SELECT pg_get_serial_sequence(%s, %s)",

                            (f"public.{table}", column),

                        )

                        sequence = cur.fetchone()[0]

                        if not sequence:

                            raise RuntimeError(

                                f"Identity sequence missing: {table}.{column}"

                            )



                        cur.execute(

                            "SELECT setval(%s::regclass, %s, true)",

                            (sequence, max_id),

                        )



            for table in TABLES:

                cur.execute(f'SELECT COUNT(*) FROM public."{table}"')

                actual = cur.fetchone()[0]

                expected = len(data[table])

                if actual != expected:

                    raise RuntimeError(

                        f"{table}: expected {expected}, got {actual}"

                    )



    print("Transaction committed; row counts verified.")






def main():

    source = None

    target = None



    try:

        print("Connecting to MariaDB...")

        source = connect_source()



        print("Connecting to Supabase...")

        target = connect_target()



        validate_databases(source, target)

        data = read_source(source)



        total = sum(len(rows) for rows in data.values())

        if total != 76:

            raise RuntimeError(

                f"Expected 76 source records, found {total}. Stopping."

            )



        print(f"\nReady to import {total} records.")

        import_data(target, data)



    finally:

        if source:

            source.close()

        if target:

            target.close()





if __name__ == "__main__":

    main()
