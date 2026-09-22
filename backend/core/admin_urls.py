from django.urls import path
from .admin_views import (
    AdminDashboardStatsView,
    AdminUsersListView,
    AdminUserDetailView,
    AdminProductsView,
    AdminProductDetailView,
    AdminCoveragesView,
    AdminCoverageDetailView,
    AdminCompaniesView,
    AdminTransactionsView,
    AdminOrdersView,
)

urlpatterns = [
    path('dashboard/', AdminDashboardStatsView.as_view(), name='admin-dashboard'),
    path('users/', AdminUsersListView.as_view(), name='admin-users-list'),
    path('users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('products/', AdminProductsView.as_view(), name='admin-products-list'),
    path('products/<int:plan_id>/', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('coverages/', AdminCoveragesView.as_view(), name='admin-coverages-list'),
    path('coverages/<int:coverage_id>/', AdminCoverageDetailView.as_view(), name='admin-coverage-detail'),
    path('companies/', AdminCompaniesView.as_view(), name='admin-companies-list'),
    path('transactions/', AdminTransactionsView.as_view(), name='admin-transactions-list'),
    path('orders/', AdminOrdersView.as_view(), name='admin-orders-list'),
]
