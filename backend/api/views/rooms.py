import mimetypes

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..models import RoomCustomization
from ..serializers import RoomCustomizationSerializer


class RoomCustomizationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RoomCustomizationSerializer

    def get_queryset(self):
        return (
            RoomCustomization.objects.filter(user=self.request.user)
            .prefetch_related("placements__product__category__parent", "placements__product__images")
        )


class RoomCustomizationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RoomCustomizationSerializer

    def get_queryset(self):
        return (
            RoomCustomization.objects.filter(user=self.request.user)
            .prefetch_related("placements__product__category__parent", "placements__product__images")
        )

    def perform_destroy(self, instance):
        storage = instance.room_image.storage
        image_name = instance.room_image.name
        instance.delete()
        if image_name:
            storage.delete(image_name)


class RoomCustomizationImageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        room = get_object_or_404(
            RoomCustomization,
            pk=pk,
            user=request.user,
        )
        content_type = mimetypes.guess_type(room.room_image.name)[0] or "application/octet-stream"
        return FileResponse(
            room.room_image.storage.open(room.room_image.name, "rb"),
            content_type=content_type,
            as_attachment=False,
        )
