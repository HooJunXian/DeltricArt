import csv
from pathlib import Path

from django.db import migrations


DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "malaysia_postcodes.csv"


def load_malaysia_postcodes(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    Postcode = apps.get_model("api", "Postcode")

    malaysia, _ = Country.objects.get_or_create(
        code="MY",
        defaults={
            "name": "Malaysia",
            "is_show": True,
        },
    )

    with DATA_FILE.open(newline="", encoding="utf-8") as postcode_file:
        rows = csv.DictReader(postcode_file)
        postcodes = [
            Postcode(
                pPostcode=row["pPostcode"].strip(),
                pCity=row["pCity"].strip(),
                pState=row["pState"].strip(),
                pCountry=malaysia,
            )
            for row in rows
            if row.get("pPostcode") and row.get("pCity") and row.get("pState")
        ]

    Postcode.objects.bulk_create(postcodes, ignore_conflicts=True, batch_size=1000)


def unload_malaysia_postcodes(apps, schema_editor):
    Country = apps.get_model("api", "Country")
    Postcode = apps.get_model("api", "Postcode")

    malaysia = Country.objects.filter(code="MY").first()
    if not malaysia or not DATA_FILE.exists():
        return

    with DATA_FILE.open(newline="", encoding="utf-8") as postcode_file:
        rows = csv.DictReader(postcode_file)
        lookup_values = [
            (
                row["pPostcode"].strip(),
                row["pCity"].strip(),
                row["pState"].strip(),
            )
            for row in rows
            if row.get("pPostcode") and row.get("pCity") and row.get("pState")
        ]

    for postcode, city, state in lookup_values:
        Postcode.objects.filter(
            pPostcode=postcode,
            pCity=city,
            pState=state,
            pCountry=malaysia,
        ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_postcode"),
    ]

    operations = [
        migrations.RunPython(load_malaysia_postcodes, unload_malaysia_postcodes),
    ]
