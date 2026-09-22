import uuid
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Payment
from .serializers import PaymentSerializer, ProcessSandboxPaymentSerializer
from orders.models import Order
from chat.models import ChatSession, ChatMessage

class ProcessSandboxPaymentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ProcessSandboxPaymentSerializer(data=request.data)
        if serializer.is_valid():
            order_id = serializer.validated_data['order_id']
            status_action = serializer.validated_data['status_action']

            try:
                order = Order.objects.select_related('plan', 'plan__company').get(id=order_id)
            except Order.DoesNotExist:
                return Response({'detail': 'سفارش بیمه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

            transaction_id = f"TRX-SANDBOX-{uuid.uuid4().hex[:12].upper()}"

            if status_action == 'success':
                order.status = 'paid'
                order.save()

                payable_amount = order.initial_payable_amount

                payment = Payment.objects.create(
                    order=order,
                    transaction_id=transaction_id,
                    amount=payable_amount,
                    status='success',
                    payment_gateway='درگاه آزمایشی بیمه هوشمند',
                    paid_at=timezone.now()
                )

                # Send system message to session if exists
                if order.session_id:
                    try:
                        session = ChatSession.objects.get(id=order.session_id)
                        session.is_completed = True
                        session.save()

                        if order.payment_type in ['installment_3', 'installment_6']:
                            months = 3 if order.payment_type == 'installment_3' else 6
                            msg_text = (
                                f"🎉 تبریک! پیش‌پرداخت خرید اقساطی به مبلغ {int(payable_amount):,} تومان با موفقیت پرداخت شد.\n\n"
                                f"بیمه‌نامه **{order.plan.title}** با شماره سفارش `{order.order_number}` و کد پیگیری `{transaction_id}` برای شما صادر گردید.\n"
                                f"مابقی مبلغ در {months} قسط ماهانه به مبلغ {int(order.installment_amount):,} تومان تقسیط گردید."
                            )
                        else:
                            msg_text = f"🎉 تبریک! پرداخت نقدی مبلغ {int(payable_amount):,} تومان با موفقیت انجام شد.\n\nبیمه‌نامه **{order.plan.title}** با شماره سفارش `{order.order_number}` و کد پیگیری `{transaction_id}` برای شما صادر گردید."

                        ChatMessage.objects.create(
                            session=session,
                            role='assistant',
                            content=msg_text,
                            order=order,
                            metadata={'payment_completed': True}
                        )
                    except Exception:
                        pass

                return Response({
                    'message': 'پرداخت با موفقیت انجام شد و بیمه‌نامه صادر گردید.',
                    'payment': PaymentSerializer(payment).data,
                    'order_number': order.order_number,
                    'transaction_id': transaction_id,
                    'status': 'success'
                }, status=status.HTTP_200_OK)
            else:
                order.status = 'failed'
                order.save()

                payment = Payment.objects.create(
                    order=order,
                    transaction_id=transaction_id,
                    amount=order.total_price,
                    status='failed',
                    payment_gateway='درگاه آزمایشی بیمه هوشمند'
                )

                return Response({
                    'message': 'تراکنش ناموفق بود یا توسط کاربر لغو گردید.',
                    'payment': PaymentSerializer(payment).data,
                    'status': 'failed'
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
