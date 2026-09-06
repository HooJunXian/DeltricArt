import json
from math import atan2

from django.db import transaction
from rest_framework import serializers

from ..models import Product, RoomCustomization, RoomCustomizationProduct
from .catalog import CustomerProductSerializer


MAX_ROOM_IMAGE_BYTES = 12 * 1024 * 1024


class RoomPlacementSerializer(serializers.ModelSerializer):
    placement_id = serializers.IntegerField(write_only=True, required=False)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
    )
    product = CustomerProductSerializer(read_only=True)

    class Meta:
        model = RoomCustomizationProduct
        fields = [
            "id",
            "placement_id",
            "product_id",
            "product",
            "position_x_cm",
            "position_y_cm",
            "width_cm",
            "height_cm",
            "z_index",
            "created_at",
        ]
        read_only_fields = ["id", "product", "width_cm", "height_cm", "created_at"]

    def validate_product_id(self, product):
        if not product.is_show or product.stock_balance <= 0:
            raise serializers.ValidationError("This artwork is not currently available.")
        if not product.width_cm or not product.height_cm:
            raise serializers.ValidationError("This artwork needs width and height before it can be placed.")
        return product

    def validate(self, attrs):
        room = self.context.get("room")
        product = attrs.get("product")
        x = attrs.get("position_x_cm")
        y = attrs.get("position_y_cm")
        if x is not None and x < 0:
            raise serializers.ValidationError({"position_x_cm": "Position cannot be negative."})
        if y is not None and y < 0:
            raise serializers.ValidationError({"position_y_cm": "Position cannot be negative."})
        if room and product:
            if x + product.width_cm > room.wall_width_cm:
                raise serializers.ValidationError({"position_x_cm": "Artwork extends beyond the wall width."})
            if y + product.height_cm > room.wall_height_cm:
                raise serializers.ValidationError({"position_y_cm": "Artwork extends beyond the wall height."})
        return attrs


class RoomCustomizationSerializer(serializers.ModelSerializer):
    placements = RoomPlacementSerializer(many=True, required=False)
    placements_payload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    room_image_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomCustomization
        fields = [
            "id",
            "name",
            "room_image",
            "room_image_url",
            "wall_width_cm",
            "wall_height_cm",
            "wall_corners",
            "image_width_px",
            "image_height_px",
            "placements",
            "placements_payload",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "room_image_url", "created_at", "updated_at"]
        extra_kwargs = {"room_image": {"write_only": True}}

    def get_room_image_url(self, obj):
        request = self.context.get("request")
        path = f"/api/room-customizations/{obj.id}/image/"
        return request.build_absolute_uri(path) if request else path

    def validate_room_image(self, value):
        content_type = getattr(value, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Upload a JPG, PNG, or WebP room photo.")
        if value.size > MAX_ROOM_IMAGE_BYTES:
            raise serializers.ValidationError("Room photos must be 12 MB or smaller.")
        return value

    def validate_wall_corners(self, value):
        if not isinstance(value, list) or len(value) != 4:
            raise serializers.ValidationError("Exactly four wall corners are required.")
        normalized = []
        for corner in value:
            if not isinstance(corner, dict) or "x" not in corner or "y" not in corner:
                raise serializers.ValidationError("Each corner must contain x and y coordinates.")
            try:
                x = float(corner["x"])
                y = float(corner["y"])
            except (TypeError, ValueError):
                raise serializers.ValidationError("Wall corner coordinates must be numbers.")
            if not 0 <= x <= 1 or not 0 <= y <= 1:
                raise serializers.ValidationError("Wall corner coordinates must be between 0 and 1.")
            normalized.append({"x": x, "y": y})

        center_x = sum(corner["x"] for corner in normalized) / 4
        center_y = sum(corner["y"] for corner in normalized) / 4
        around_center = sorted(
            normalized,
            key=lambda corner: atan2(corner["y"] - center_y, corner["x"] - center_x),
        )
        top_left_index = min(
            range(4),
            key=lambda index: around_center[index]["x"] + around_center[index]["y"],
        )
        ordered = around_center[top_left_index:] + around_center[:top_left_index]
        if ordered[1]["x"] < ordered[3]["x"]:
            ordered = [ordered[0], ordered[3], ordered[2], ordered[1]]
        return ordered

    def validate(self, attrs):
        payload = attrs.pop("placements_payload", None)
        if payload is not None:
            try:
                raw_placements = json.loads(payload or "[]")
            except json.JSONDecodeError:
                raise serializers.ValidationError({"placements_payload": "Placements must be valid JSON."})
            nested = RoomPlacementSerializer(data=raw_placements, many=True)
            nested.is_valid(raise_exception=True)
            attrs["placements"] = nested.validated_data

        width = attrs.get("wall_width_cm", getattr(self.instance, "wall_width_cm", None))
        height = attrs.get("wall_height_cm", getattr(self.instance, "wall_height_cm", None))
        if width is not None and width <= 0:
            raise serializers.ValidationError({"wall_width_cm": "Wall width must be greater than zero."})
        if height is not None and height <= 0:
            raise serializers.ValidationError({"wall_height_cm": "Wall height must be greater than zero."})

        placements = attrs.get("placements")
        if placements is not None and width is not None and height is not None:
            existing = {
                placement.id: placement
                for placement in self.instance.placements.all()
            } if self.instance else {}
            for index, placement in enumerate(placements):
                product = placement["product"]
                saved = existing.get(placement.get("placement_id"))
                placement_width = (
                    saved.width_cm
                    if saved and saved.product_id == product.id
                    else product.width_cm
                )
                placement_height = (
                    saved.height_cm
                    if saved and saved.product_id == product.id
                    else product.height_cm
                )
                x = placement["position_x_cm"]
                y = placement["position_y_cm"]
                errors = {}
                if x < 0 or x + placement_width > width:
                    errors["position_x_cm"] = "Artwork must remain inside the wall."
                if y < 0 or y + placement_height > height:
                    errors["position_y_cm"] = "Artwork must remain inside the wall."
                if errors:
                    raise serializers.ValidationError({"placements": {index: errors}})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        placements = validated_data.pop("placements", [])
        room = RoomCustomization.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )
        self._replace_placements(room, placements)
        return room

    @transaction.atomic
    def update(self, instance, validated_data):
        placements = validated_data.pop("placements", None)
        existing_placements = {
            placement.id: placement
            for placement in instance.placements.all()
        }
        old_image_name = instance.room_image.name if "room_image" in validated_data else ""
        instance = super().update(instance, validated_data)
        if placements is not None:
            instance.placements.all().delete()
            self._replace_placements(instance, placements, existing_placements)
        if old_image_name and old_image_name != instance.room_image.name:
            instance.room_image.storage.delete(old_image_name)
        return instance

    @staticmethod
    def _replace_placements(room, placements, existing_placements=None):
        existing_placements = existing_placements or {}
        RoomCustomizationProduct.objects.bulk_create(
            [
                RoomCustomizationSerializer._build_placement(
                    room,
                    item,
                    index,
                    existing_placements,
                )
                for index, item in enumerate(placements)
            ]
        )

    @staticmethod
    def _build_placement(room, item, index, existing_placements):
        saved = existing_placements.get(item.pop("placement_id", None))
        product = item["product"]
        preserve_snapshot = saved and saved.product_id == product.id
        return RoomCustomizationProduct(
            room_customization=room,
            product=product,
            position_x_cm=item["position_x_cm"],
            position_y_cm=item["position_y_cm"],
            width_cm=saved.width_cm if preserve_snapshot else product.width_cm,
            height_cm=saved.height_cm if preserve_snapshot else product.height_cm,
            z_index=item.get("z_index", index),
        )
