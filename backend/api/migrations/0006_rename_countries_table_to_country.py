# Align Django's model state with the existing country table.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_custom_admin_catalog_fields"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    DO $$
                    BEGIN
                        IF to_regclass('public.countries') IS NOT NULL
                           AND to_regclass('public.country') IS NULL THEN
                            ALTER TABLE countries RENAME TO country;
                        END IF;
                    END $$;
                    """,
                    reverse_sql="""
                    DO $$
                    BEGIN
                        IF to_regclass('public.country') IS NOT NULL
                           AND to_regclass('public.countries') IS NULL THEN
                            ALTER TABLE country RENAME TO countries;
                        END IF;
                    END $$;
                    """,
                ),
            ],
            state_operations=[
                migrations.AlterModelTable(
                    name="country",
                    table="country",
                ),
            ],
        ),
    ]
