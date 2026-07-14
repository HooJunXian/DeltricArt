from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_cart_cartitem"),
    ]

    operations = [
        migrations.CreateModel(
            name="Company",
            fields=[
                ("id", models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ("cName", models.CharField(max_length=180)),
                ("cAddress1", models.CharField(blank=True, max_length=255)),
                ("cAddress2", models.CharField(blank=True, max_length=255)),
                ("cPostcode", models.CharField(blank=True, max_length=20)),
                ("cCity", models.CharField(blank=True, max_length=120)),
                ("cState", models.CharField(blank=True, max_length=120)),
                ("cOfficeNo", models.CharField(blank=True, max_length=40)),
                ("cOfficeTelNo", models.CharField(blank=True, max_length=40)),
                ("cOwner", models.CharField(blank=True, max_length=120)),
                ("cOwnerTelNo", models.CharField(blank=True, max_length=40)),
                ("cOfficeEmail", models.EmailField(blank=True, max_length=254)),
                ("cOwnerEmail", models.EmailField(blank=True, max_length=254)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "company",
                "verbose_name_plural": "company",
            },
        ),
        migrations.AddConstraint(
            model_name="company",
            constraint=models.CheckConstraint(
                condition=models.Q(("id", 1)),
                name="single_company_row",
            ),
        ),
    ]
