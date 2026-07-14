from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class RoleTokenObtainPairSerializer(TokenObtainPairSerializer):
    expected_role = None
    role_error = "This login form cannot be used for this account."

    def validate(self, attrs):
        data = super().validate(attrs)

        if self.user.status != self.user.STATUS_ACTIVE:
            raise serializers.ValidationError("This account is not active.")

        if not self.is_allowed_role():
            raise serializers.ValidationError(self.role_error)

        return data

    def is_allowed_role(self):
        raise NotImplementedError


class MemberTokenObtainPairSerializer(RoleTokenObtainPairSerializer):
    # role_error = "Please use a member account to login here."
    role_error = "No user found"

    def is_allowed_role(self):
        return not (self.user.is_staff or self.user.is_superuser)


class AdminTokenObtainPairSerializer(RoleTokenObtainPairSerializer):
    role_error = "Please use a staff or admin account to login here."

    def is_allowed_role(self):
        return self.user.is_staff or self.user.is_superuser


class MemberTokenObtainPairView(TokenObtainPairView):
    serializer_class = MemberTokenObtainPairSerializer


class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer
