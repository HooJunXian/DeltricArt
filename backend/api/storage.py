from django.core.files.storage import storages


def private_room_storage():
    return storages["private_rooms"]
