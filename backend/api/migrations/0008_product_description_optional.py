from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_product_code_stock_balance"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
