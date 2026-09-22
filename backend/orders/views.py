import random
import time
import io
import os
import arabic_reshaper
from bidi.algorithm import get_display

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Order
from .serializers import OrderSerializer, CreateOrderSerializer
from recommendation.models import InsurancePlan

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Tahoma TrueType Font for 100% Persian PDF Rendering
FONT_PATH = 'C:/Windows/Fonts/tahoma.ttf'
FONT_NAME = 'PersianTahoma'

if os.path.exists(FONT_PATH):
    try:
        pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
    except Exception as e:
        print(f"Font registration warning: {e}")
        FONT_NAME = 'Helvetica'
else:
    FONT_NAME = 'Helvetica'

def fa(text: str) -> str:
    """Helper to reshape Persian text and apply BIDI algorithm for ReportLab"""
    if not text:
        return ""
    if FONT_NAME == 'Helvetica':
        return str(text)
    reshaped = arabic_reshaper.reshape(str(text))
    return get_display(reshaped)

class CreateOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if serializer.is_valid():
            plan_id = serializer.validated_data['plan_id']
            total_price = serializer.validated_data['total_price']
            session_id = serializer.validated_data.get('session_id', '')
            collected_info = serializer.validated_data.get('collected_info', {})
            payment_type = serializer.validated_data.get('payment_type', 'cash')

            try:
                plan = InsurancePlan.objects.select_related('company').get(id=plan_id)
            except InsurancePlan.DoesNotExist:
                return Response({'detail': 'طرح بیمه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

            down_payment_amount = 0
            installment_count = 0
            installment_amount = 0

            # 100% Backend calculation for installment vs cash
            if payment_type in ['installment_3', 'installment_6']:
                if not plan.is_installment_enabled:
                    return Response({'detail': 'امکان پرداخت اقساطی برای این طرح فعال نیست.'}, status=status.HTTP_400_BAD_REQUEST)
                if payment_type == 'installment_3' and not plan.allow_3_months:
                    return Response({'detail': 'امکان اقساط ۳ ماهه برای این طرح فعال نیست.'}, status=status.HTTP_400_BAD_REQUEST)
                if payment_type == 'installment_6' and not plan.allow_6_months:
                    return Response({'detail': 'امکان اقساط ۶ ماهه برای این طرح فعال نیست.'}, status=status.HTTP_400_BAD_REQUEST)

                percent = plan.down_payment_percent if plan.down_payment_percent and plan.down_payment_percent > 0 else 20
                count = 3 if payment_type == 'installment_3' else 6

                down_payment_amount = round(float(total_price) * (percent / 100.0))
                remaining = float(total_price) - down_payment_amount
                installment_count = count
                installment_amount = round(remaining / count)
            else:
                payment_type = 'cash'
                down_payment_amount = total_price
                installment_count = 0
                installment_amount = 0

            order_number = f"INS-{int(time.time())}-{random.randint(100, 999)}"
            user = request.user if request.user.is_authenticated else None

            order = Order.objects.create(
                order_number=order_number,
                session_id=session_id,
                user=user,
                plan=plan,
                total_price=total_price,
                payment_type=payment_type,
                down_payment_amount=down_payment_amount,
                installment_count=installment_count,
                installment_amount=installment_amount,
                status='pending_payment',
                collected_info=collected_info
            )

            order_data = OrderSerializer(order).data
            return Response(order_data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            order = Order.objects.select_related('plan', 'plan__company', 'user').get(pk=pk)
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({'detail': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

class DownloadPolicyPDFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            order = Order.objects.select_related('plan', 'plan__company', 'user').get(pk=pk)
            info = order.collected_info or {}
            
            # Personal details
            insured_name = info.get('full_name') or (order.user.full_name if order.user else 'نامشخص')
            national_code = info.get('national_code') or (order.user.national_code if order.user else 'نامشخص')
            phone_number = info.get('phone_number') or (order.user.phone_number if order.user else 'نامشخص')
            plate_number = info.get('plate_number', 'ایران ۷۷ - ۳۲۱ ج ۵۵')
            postal_code = info.get('postal_code', '۱۹۸۷۶۵۴۳۲۱')

            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # Draw outer decorative double frame border
            p.setStrokeColor(colors.HexColor('#2563eb'))
            p.setLineWidth(3)
            p.rect(20, 20, width - 40, height - 40)
            
            p.setStrokeColor(colors.HexColor('#1e293b'))
            p.setLineWidth(1)
            p.rect(25, 25, width - 50, height - 50)

            # Draw Header Banner
            p.setFillColor(colors.HexColor('#0c1322'))
            p.rect(30, height - 125, width - 60, 90, fill=1, stroke=0)

            p.setFillColor(colors.white)
            p.setFont(FONT_NAME, 17)
            p.drawCentredString(width / 2.0, height - 65, fa("پیش‌نمایش رسمی بیمه‌نامه الکترونیکی"))
            p.setFont(FONT_NAME, 10.5)
            p.setFillColor(colors.HexColor('#93c5fd'))
            p.drawCentredString(width / 2.0, height - 95, fa(f"سامانه هوشمند صدور بیمه - شرکت بیمه‌گر: {order.plan.company.name}"))


            # Section 1: Insured Personal Info Container
            p.setFillColor(colors.HexColor('#eff6ff'))
            p.roundRect(40, height - 280, width - 80, 140, 8, fill=1, stroke=1)

            p.setFillColor(colors.HexColor('#1e3a8a'))
            p.setFont(FONT_NAME, 12)
            p.drawRightString(width - 60, height - 160, fa("مشخصات فردی و موضوع بیمه‌نامه:"))

            ins_type = order.plan.insurance_type
            if ins_type == 'fire':
                personal_lines = [
                    ("نام و نام خانوادگی متقاضی:", insured_name),
                    ("کد ملی مالک / مستاجر:", national_code),
                    ("شماره تلفن همراه:", phone_number),
                    ("آدرس ملک مورد بیمه:", str(info.get('property_address') or 'تهران')[:45]),
                    ("کد پستی ۱۰ رقمی ملک:", str(info.get('postal_code') or postal_code)),
                ]
            elif ins_type == 'travel':
                personal_lines = [
                    ("نام و نام خانوادگی مسافر:", insured_name),
                    ("کد ملی مسافر:", national_code),
                    ("شماره تماس همراه:", phone_number),
                    ("شماره گذرنامه / پاسپورت:", str(info.get('passport_number') or 'A12345678')),
                    ("مقصد و تاریخ سفر:", f"{info.get('destination', 'شینگن')} ({info.get('travel_start_date', 'آغاز سفر')})"),
                ]
            elif ins_type == 'life':
                personal_lines = [
                    ("نام و نام خانوادگی بیمه‌شده:", insured_name),
                    ("کد ملی بیمه‌شده:", national_code),
                    ("شغل و حرفه متقاضی:", str(info.get('insured_job') or 'کارمند')),
                    ("نام و نسبت ذینفعان:", str(info.get('beneficiary_name') or 'وراث قانونی')),
                    ("سن متقاضی / کد پستی:", f"{info.get('insured_age', '۳۰')} سال - {info.get('postal_code') or postal_code}"),
                ]
            else:
                personal_lines = [
                    ("نام و نام خانوادگی بیمه‌گذار:", insured_name),
                    ("کد ملی بیمه‌گذار:", national_code),
                    ("شماره تلفن همراه:", phone_number),
                    ("شماره پلاک انتظامی خودرو:", str(info.get('plate_number') or plate_number)),
                    ("کد پستی محل سکونت:", str(info.get('postal_code') or postal_code)),
                ]

            y_p = height - 185
            for label, val in personal_lines:
                p.setFillColor(colors.HexColor('#1e293b'))
                p.setFont(FONT_NAME, 10)
                p.drawRightString(width - 60, y_p, fa(label))
                
                p.setFillColor(colors.HexColor('#1d4ed8'))
                p.setFont(FONT_NAME, 10)
                p.drawRightString(width - 220, y_p, fa(str(val)))
                y_p -= 18


            # Section 2: Policy Details Container
            p.setFillColor(colors.HexColor('#f8fafc'))
            p.roundRect(40, height - 510, width - 80, 215, 8, fill=1, stroke=1)

            p.setFillColor(colors.HexColor('#0f172a'))
            p.setFont(FONT_NAME, 12)
            p.drawRightString(width - 60, height - 310, fa("مشخصات فنی و مالی بیمه‌نامه:"))

            covs_list = order.selected_coverages or []
            covs_display = "، ".join(covs_list) if covs_list else "پوشش‌های پایه قانونی"

            policy_lines = [
                ("شماره سفارش اختصاصی:", str(order.order_number)),
                ("نوع بیمه‌نامه:", order.plan.get_insurance_type_display()),
                ("عنوان طرح بیمه:", order.plan.title),
                ("شرکت بیمه‌گر رسمی:", order.plan.company.name),
                ("پوشش‌های انتخابی:", covs_display[:45] + ('...' if len(covs_display) > 45 else '')),
                ("سقف تعهد مالی/جانی:", f"{int(order.plan.coverage_amount):,} تومان"),
                ("مبلغ کل حق بیمه:", f"{int(order.total_price):,} تومان"),
                ("تاریخ و زمان صدور:", order.created_at.strftime('%Y/%m/%d - %H:%M')),
            ]

            y_pos = height - 335
            for label, val in policy_lines:
                p.setFillColor(colors.HexColor('#1e293b'))
                p.setFont(FONT_NAME, 9.5)
                p.drawRightString(width - 60, y_pos, fa(label))
                
                p.setFillColor(colors.HexColor('#0284c7'))
                p.setFont(FONT_NAME, 9.5)
                p.drawRightString(width - 220, y_pos, fa(str(val)))
                y_pos -= 20

            # Stamp & Official Electronic Verification Notice Box
            p.setStrokeColor(colors.HexColor('#10b981'))
            p.setFillColor(colors.HexColor('#ecfdf5'))
            p.roundRect(40, height - 600, width - 80, 75, 8, fill=1, stroke=1)

            p.setFillColor(colors.HexColor('#047857'))
            p.setFont(FONT_NAME, 11)
            p.drawRightString(width - 60, height - 555, fa("✓ تاییدیه و اصالت صدور بیمه‌نامه الکترونیکی"))
            p.setFont(FONT_NAME, 9)
            p.setFillColor(colors.HexColor('#065f46'))
            p.drawRightString(width - 60, height - 580, fa("این بیمه‌نامه به صورت برخط از طریق سامانه هوشمند صادر گردیده و دارای اعتبار رسمی است."))

            # Bottom Confidential / Security Note
            p.setFillColor(colors.HexColor('#64748b'))
            p.setFont(FONT_NAME, 8.5)
            p.drawCentredString(width / 2.0, 45, fa("کلیه حقوق این سند الکترونیکی متعلق به سامانه رسمی صدور بیمه می‌باشد."))


            p.showPage()
            p.save()

            buffer.seek(0)
            pdf_data = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Insurance-Policy-{order.order_number}.pdf"'
            response['Content-Length'] = str(len(pdf_data))
            return response

        except Order.DoesNotExist:
            return Response({'detail': 'بیمه‌نامه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


class PayNextInstallmentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            order = Order.objects.select_related('plan', 'plan__company').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'سفارش یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_type == 'cash':
            return Response({'detail': 'این سفارش به صورت نقدی پرداخت شده و فاقد قسط است.'}, status=status.HTTP_400_BAD_REQUEST)

        total_installments = order.installment_count or 1
        current_paid = order.paid_installments_count or 1

        if current_paid >= total_installments:
            return Response({'detail': 'تمامی اقساط این بیمه‌نامه پیش‌تر تسویه شده‌اند.'}, status=status.HTTP_400_BAD_REQUEST)

        import uuid
        from django.utils import timezone
        from payments.models import Payment

        new_paid_count = current_paid + 1
        order.paid_installments_count = new_paid_count
        order.save()

        # Log installment transaction
        Payment.objects.create(
            order=order,
            transaction_id=f"TRX-INST-{uuid.uuid4().hex[:10].upper()}",
            amount=order.installment_amount,
            status='success',
            payment_gateway='درگاه آزمایشی بیمه هوشمند (پرداخت قسط)',
            paid_at=timezone.now()
        )

        serializer = OrderSerializer(order)
        return Response({
            'message': f'قسط شماره {new_paid_count} از {total_installments} با موفقیت پرداخت گردید.',
            'order': serializer.data
        }, status=status.HTTP_200_OK)
