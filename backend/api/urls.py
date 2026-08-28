from django.urls import path
from rest_framework.routers import DefaultRouter

from .auth import AdminTokenObtainPairView, MemberTokenObtainPairView
from .views import (
    AdminCategoryViewSet,
    AdminCompanyDetailView,
    AdminDashboardView,
    AdminProductViewSet,
    BillPlzCallbackView,
    BillPlzMockBillView,
    BillPlzReturnView,
    CartDetailView,
    CartItemAddView,
    CartItemDetailView,
    ChatbotView,
    CheckoutView,
    CompanyDetailView,
    CountryListView,
    CustomerProductListView,
    CurrentUserView,
    OrderDetailView,
    OrderCancelView,
    OrderListView,
    PostcodeListView,
    RegisterView,
)


router = DefaultRouter()
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")
router.register("admin/products", AdminProductViewSet, basename="admin-product")


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("member/login/", MemberTokenObtainPairView.as_view(), name="member-login"),
    path("member/register/", RegisterView.as_view(), name="member-register"),
    path("admin/login/", AdminTokenObtainPairView.as_view(), name="admin-login"),
    path("countries/", CountryListView.as_view(), name="country-list"),
    path("company/", CompanyDetailView.as_view(), name="company-detail"),
    path("postcodes/", PostcodeListView.as_view(), name="postcode-list"),
    path("products/", CustomerProductListView.as_view(), name="product-list"),
    path("chatbot/", ChatbotView.as_view(), name="chatbot"),
    path("cart/", CartDetailView.as_view(), name="cart-detail"),
    path("cart/items/", CartItemAddView.as_view(), name="cart-item-add"),
    path("cart/items/<int:product_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<str:order_number>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("payments/billplz/callback/", BillPlzCallbackView.as_view(), name="billplz-callback"),
    path("payments/billplz/mock/<str:bill_id>/", BillPlzMockBillView.as_view(), name="billplz-mock-bill"),
    path("payments/billplz/return/", BillPlzReturnView.as_view(), name="billplz-return"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard-data"),
    path("admin/company/", AdminCompanyDetailView.as_view(), name="admin-company-detail"),
] + router.urls
