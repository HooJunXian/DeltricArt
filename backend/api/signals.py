from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate, pre_delete, pre_save
from django.dispatch import receiver


SUPERADMIN_USERNAME = "superadmin"
SUPERADMIN_EMAIL = "superadmin@example.com"
DEFAULT_SUPERADMIN_PASSWORD = "abc12345"
LOCKED_GROUP_NAMES = {"Super Admin"}

ROLE_PERMISSION_MAP = {
    "Catalog Manager": [
        "add_category",
        "change_category",
        "view_category",
        "add_product",
        "change_product",
        "view_product",
        "add_productimage",
        "change_productimage",
        "view_productimage",
        "add_productinventory",
        "change_productinventory",
        "view_productinventory",
    ],
    "Sales Manager": [
        "view_order",
        "change_order",
        "view_orderitem",
        "change_orderitem",
        "view_cart",
        "change_cart",
        "view_cartitem",
        "change_cartitem",
    ],
    "Customer Support": [
        "view_user",
        "change_user",
        "view_customerprofile",
        "change_customerprofile",
        "view_address",
        "change_address",
        "view_order",
        "view_orderitem",
    ],
    "Super Admin": [],
}


def is_protected_superadmin(user):
    return bool(user and getattr(user, "username", "") == SUPERADMIN_USERNAME)


@receiver(post_migrate)
def setup_roles_and_superadmin(sender, **kwargs):
    if sender.name != "api":
        return

    user_model = get_user_model()

    for role_name, permission_codenames in ROLE_PERMISSION_MAP.items():
        group, _ = Group.objects.get_or_create(name=role_name)
        if permission_codenames:
            permissions = Permission.objects.filter(codename__in=permission_codenames)
            group.permissions.set(permissions)

    superadmin, created = user_model.objects.get_or_create(
        username=SUPERADMIN_USERNAME,
        defaults={
            "email": SUPERADMIN_EMAIL,
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
        },
    )
    if created:
        superadmin.set_password(DEFAULT_SUPERADMIN_PASSWORD)
        superadmin.save(update_fields=["password"])

    if not superadmin.is_staff or not superadmin.is_superuser or not superadmin.is_active:
        superadmin.is_staff = True
        superadmin.is_superuser = True
        superadmin.is_active = True
        superadmin.save(update_fields=["is_staff", "is_superuser", "is_active"])

    superadmin.groups.set(Group.objects.filter(name="Super Admin"))
    superadmin.user_permissions.set(Permission.objects.all())


@receiver(pre_save, sender=Group)
def protect_locked_groups(sender, instance, **kwargs):
    if not instance.pk:
        return

    original = sender.objects.filter(pk=instance.pk).first()
    if original and original.name in LOCKED_GROUP_NAMES and instance.name != original.name:
        raise ValueError(f"The {original.name} group is protected and cannot be renamed.")


@receiver(pre_delete, sender=Group)
def prevent_locked_group_delete(sender, instance, **kwargs):
    if instance.name in LOCKED_GROUP_NAMES:
        raise ValueError(f"The {instance.name} group is protected and cannot be deleted.")


@receiver(pre_save, sender=get_user_model())
def protect_superadmin_save(sender, instance, **kwargs):
    if not instance.pk:
        return

    original = sender.objects.filter(pk=instance.pk).first()
    if not is_protected_superadmin(original):
        return

    instance.username = original.username
    instance.is_superuser = True
    instance.is_staff = True
    instance.is_active = True


@receiver(pre_delete, sender=get_user_model())
def prevent_superadmin_delete(sender, instance, **kwargs):
    if is_protected_superadmin(instance):
        raise ValueError("The protected superadmin account cannot be deleted.")
