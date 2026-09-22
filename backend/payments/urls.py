from django.urls import path
from .views import ProcessSandboxPaymentView

urlpatterns = [
    path('sandbox-pay/', ProcessSandboxPaymentView.as_view(), name='payment_sandbox_pay'),
]
