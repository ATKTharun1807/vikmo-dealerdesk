import sys
from django.test.runner import DiscoverRunner
from django.db import connections
from django.db.backends.postgresql.creation import DatabaseCreation


def _force_destroy_test_db(self, test_database_name, verbosity):
    """
    Terminates active/pooled connections and drops database with FORCE on PostgreSQL.
    """
    with self._nodb_cursor() as cursor:
        try:
            cursor.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid();
                """,
                [test_database_name],
            )
        except Exception:
            pass
        try:
            cursor.execute(
                "DROP DATABASE %s WITH (FORCE)"
                % self.connection.ops.quote_name(test_database_name)
            )
        except Exception:
            cursor.execute(
                "DROP DATABASE %s"
                % self.connection.ops.quote_name(test_database_name)
            )


# Patch PostgreSQL DatabaseCreation
DatabaseCreation._destroy_test_db = _force_destroy_test_db


class PostgresForceRunner(DiscoverRunner):
    """
    Test runner optimized for PostgreSQL (Neon / Supabase / RDS).
    Ensures active or pooled connection sessions are terminated and
    databases are dropped cleanly with FORCE to prevent 'ObjectInUse' errors.
    """

    def teardown_databases(self, old_config, **kwargs):
        for alias in connections:
            conn = connections[alias]
            test_db_name = (
                conn.settings_dict.get("TEST", {}).get("NAME")
                or f"test_{conn.settings_dict.get('NAME')}"
            )
            try:
                with conn._nodb_cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE datname = %s AND pid <> pg_backend_pid();
                        """,
                        [test_db_name],
                    )
            except Exception:
                pass

        super().teardown_databases(old_config, **kwargs)
