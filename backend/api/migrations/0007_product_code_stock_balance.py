from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_rename_countries_table_to_country"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="code",
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.RenameField(
            model_name="product",
            old_name="stock_quantity",
            new_name="stock_balance",
        ),
    ]
