# Generated for the custom React admin catalog dashboard.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_alter_country_table_alter_exchangerate_table_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="productcategory",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="productcategory",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="product",
            name="image",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="product",
            name="price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="product",
            name="stock_quantity",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="product",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
