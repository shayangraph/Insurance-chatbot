from django.urls import path
from .views import CreateOrderView, OrderDetailView, DownloadPolicyPDFView, PayNextInstallmentView

urlpatterns = [
    path('create/', CreateOrderView.as_view(), name='order_create'),
    path('<uuid:pk>/', OrderDetailView.as_view(), name='order_detail'),
    path('<uuid:pk>/download/', DownloadPolicyPDFView.as_view(), name='order_download_pdf'),
    path('<uuid:pk>/pay-installment/', PayNextInstallmentView.as_view(), name='order_pay_installment'),
]
