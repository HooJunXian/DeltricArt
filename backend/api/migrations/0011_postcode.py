from django.db import migrations, models
import django.db.models.deletion


def seed_malaysia_postcodes(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    Postcode = apps.get_model("api", "Postcode")

    malaysia, _ = Country.objects.get_or_create(
        code="MY",
        defaults={
            "name": "Malaysia",
            "is_show": True,
        },
    )

    Postcode.objects.get_or_create(
        pPostcode="47100",
        pCity="Puchong",
        pState="Selangor",
        pCountry=malaysia,
    )


def remove_seeded_malaysia_postcodes(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    Postcode = apps.get_model("api", "Postcode")

    malaysia = Country.objects.filter(code="MY").first()
    if malaysia:
        Postcode.objects.filter(
            pPostcode="47100",
            pCity="Puchong",
            pState="Selangor",
            pCountry=malaysia,
        ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_company"),
    ]

    operations = [
        migrations.CreateModel(
            name="Postcode",
            fields=[
                ("pId", models.AutoField(primary_key=True, serialize=False)),
                ("pPostcode", models.CharField(db_index=True, max_length=10)),
                ("pCity", models.CharField(db_index=True, max_length=120)),
                ("pState", models.CharField(db_index=True, max_length=120)),
                (
                    "pCountry",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="postcodes",
                        to="api.country",
                    ),
                ),
            ],
            options={
                "db_table": "postcodes",
                "ordering": ["pPostcode", "pCity", "pState"],
            },
        ),
        migrations.AddConstraint(
            model_name="postcode",
            constraint=models.UniqueConstraint(
                fields=("pPostcode", "pCity", "pState", "pCountry"),
                name="unique_postcode_city_state_country",
            ),
        ),
        migrations.RunPython(seed_malaysia_postcodes, remove_seeded_malaysia_postcodes),
    ]
