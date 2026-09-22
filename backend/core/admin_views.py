from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .permissions import IsAdminUserRole, IsInsuranceExpertOrAdmin
from .admin_serializers import (
    AdminUserListSerializer,
    AdminUserDetailSerializer,
    AdminInsurancePlanSerializer,
    AdminInsuranceCoverageSerializer,
    AdminInsuranceCompanySerializer,
    AdminOrderSerializer,
    AdminTransactionSerializer,
)
from recommendation.models import InsuranceCompany, InsurancePlan, InsuranceCoverage
from orders.models import Order
from payments.models import Payment

User = get_user_model()

class AdminDashboardStatsView(APIView):
    permission_classes = [IsInsuranceExpertOrAdmin]

    def get(self, request):
        is_expert = (getattr(request.user, 'role', '') == 'EXPERT')
        company = request.user.assigned_company if is_expert else None

        if is_expert:
            total_products = InsurancePlan.objects.filter(company=company).count()
            active_products = InsurancePlan.objects.filter(company=company, is_active=True).count()
            company_orders = Order.objects.filter(plan__company=company)
            total_orders = company_orders.count()
            paid_orders = company_orders.filter(status='paid').count()
            pending_orders = company_orders.filter(status='pending_payment').count()

            company_payments = Payment.objects.filter(order__plan__company=company)
            successful_transactions = company_payments.filter(status='success').count()
            pending_transactions = company_payments.filter(status='pending').count()
            failed_transactions = company_payments.filter(status='failed').count()
            total_revenue_dict = company_payments.filter(status='success').aggregate(total=Sum('amount'))
            total_revenue = total_revenue_dict.get('total') or 0

            recent_orders = company_orders.select_related('user', 'plan', 'plan__company').order_by('-created_at')[:5]
            recent_transactions = company_payments.select_related('order', 'order__user', 'order__plan').order_by('-created_at')[:5]

            data = {
                'is_expert': True,
                'company_name': company.name if company else '',
                'metrics': {
                    'total_users': total_orders,
                    'total_products': total_products,
                    'active_products': active_products,
                    'total_orders': total_orders,
                    'paid_orders': paid_orders,
                    'pending_orders': pending_orders,
                    'successful_transactions': successful_transactions,
                    'pending_transactions': pending_transactions,
                    'failed_transactions': failed_transactions,
                    'total_revenue': total_revenue,
                },
                'recent_orders': AdminOrderSerializer(recent_orders, many=True).data,
                'recent_users': [],
                'recent_transactions': AdminTransactionSerializer(recent_transactions, many=True).data,
            }
            return Response(data, status=status.HTTP_200_OK)

        # ADMIN general stats
        total_users = User.objects.count()
        total_products = InsurancePlan.objects.count()
        active_products = InsurancePlan.objects.filter(is_active=True).count()
        total_orders = Order.objects.count()
        paid_orders = Order.objects.filter(status='paid').count()
        pending_orders = Order.objects.filter(status='pending_payment').count()

        successful_transactions = Payment.objects.filter(status='success').count()
        pending_transactions = Payment.objects.filter(status='pending').count()
        failed_transactions = Payment.objects.filter(status='failed').count()

        total_revenue_dict = Payment.objects.filter(status='success').aggregate(total=Sum('amount'))
        total_revenue = total_revenue_dict.get('total') or 0

        recent_orders = Order.objects.select_related('user', 'plan', 'plan__company').order_by('-created_at')[:5]
        recent_users = User.objects.order_by('-created_at')[:5]
        recent_transactions = Payment.objects.select_related('order', 'order__user', 'order__plan').order_by('-created_at')[:5]

        data = {
            'is_expert': False,
            'company_name': '',
            'metrics': {
                'total_users': total_users,
                'total_products': total_products,
                'active_products': active_products,
                'total_orders': total_orders,
                'paid_orders': paid_orders,
                'pending_orders': pending_orders,
                'successful_transactions': successful_transactions,
                'pending_transactions': pending_transactions,
                'failed_transactions': failed_transactions,
                'total_revenue': total_revenue,
            },
            'recent_orders': AdminOrderSerializer(recent_orders, many=True).data,
            'recent_users': AdminUserListSerializer(recent_users, many=True).data,
            'recent_transactions': AdminTransactionSerializer(recent_transactions, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)


class AdminUsersListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        search_query = request.query_params.get('search', '').strip()
        role_filter = request.query_params.get('role', '').strip()

        users = User.objects.all().order_by('-created_at')

        if search_query:
            users = users.filter(
                Q(phone_number__icontains=search_query) |
                Q(full_name__icontains=search_query)
            )

        if role_filter:
            users = users.filter(role=role_filter)

        serializer = AdminUserListSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request, user_id):
        try:
            user = User.objects.prefetch_related('orders', 'chat_sessions').get(id=user_id)
            serializer = AdminUserDetailSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            role = request.data.get('role')
            is_active = request.data.get('is_active')
            assigned_company_id = request.data.get('assigned_company') or request.data.get('assigned_company_id')
            is_approved_expert = request.data.get('is_approved_expert')

            if role in ['USER', 'ADMIN', 'EXPERT']:
                user.role = role
                user.is_staff = (role == 'ADMIN')

            if is_active is not None:
                user.is_active = bool(is_active)

            if role == 'EXPERT' or user.role == 'EXPERT':
                if assigned_company_id is not None:
                    user.assigned_company_id = int(assigned_company_id) if assigned_company_id != '' else None
                if is_approved_expert is not None:
                    user.is_approved_expert = bool(is_approved_expert)
            elif role in ['USER', 'ADMIN']:
                user.assigned_company = None
                user.is_approved_expert = False

            user.save()
            return Response(AdminUserDetailSerializer(user).data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'detail': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


class AdminProductsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        insurance_type = request.query_params.get('type')
        company_id = request.query_params.get('company_id')
        is_active = request.query_params.get('is_active')

        plans = InsurancePlan.objects.select_related('company').prefetch_related('coverages').order_by('-id')

        if insurance_type:
            plans = plans.filter(insurance_type=insurance_type)
        if company_id:
            plans = plans.filter(company_id=company_id)
        if is_active is not None:
            plans = plans.filter(is_active=(is_active.lower() == 'true'))

        serializer = AdminInsurancePlanSerializer(plans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminInsurancePlanSerializer(data=request.data)
        if serializer.is_valid():
            plan = serializer.save()
            return Response(AdminInsurancePlanSerializer(plan).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminProductDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def get_object(self, plan_id):
        try:
            return InsurancePlan.objects.select_related('company').prefetch_related('coverages').get(id=plan_id)
        except InsurancePlan.DoesNotExist:
            return None

    def get(self, request, plan_id):
        plan = self.get_object(plan_id)
        if not plan:
            return Response({'detail': 'طرح بیمه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminInsurancePlanSerializer(plan)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, plan_id):
        plan = self.get_object(plan_id)
        if not plan:
            return Response({'detail': 'طرح بیمه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminInsurancePlanSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            updated_plan = serializer.save()
            return Response(AdminInsurancePlanSerializer(updated_plan).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, plan_id):
        plan = self.get_object(plan_id)
        if not plan:
            return Response({'detail': 'طرح بیمه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Soft-delete by setting is_active=False or hard delete if no orders
        if plan.orders.exists():
            plan.is_active = False
            plan.save()
            return Response({'message': 'محصول بیمه به دلیل داشتن سابقه سفارش، غیرفعال گردید.'}, status=status.HTTP_200_OK)
        else:
            plan.delete()
            return Response({'message': 'محصول بیمه با موفقیت حذف شد.'}, status=status.HTTP_200_OK)


class AdminCoveragesView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        plan_id = request.query_params.get('plan_id')
        coverages = InsuranceCoverage.objects.select_related('plan').all().order_by('coverage_type', 'name')
        if plan_id:
            coverages = coverages.filter(plan_id=plan_id)
        serializer = AdminInsuranceCoverageSerializer(coverages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminInsuranceCoverageSerializer(data=request.data)
        if serializer.is_valid():
            coverage = serializer.save()
            return Response(AdminInsuranceCoverageSerializer(coverage).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCoverageDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def get_object(self, coverage_id):
        try:
            return InsuranceCoverage.objects.get(id=coverage_id)
        except InsuranceCoverage.DoesNotExist:
            return None

    def get(self, request, coverage_id):
        coverage = self.get_object(coverage_id)
        if not coverage:
            return Response({'detail': 'پوشش مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminInsuranceCoverageSerializer(coverage).data, status=status.HTTP_200_OK)

    def put(self, request, coverage_id):
        coverage = self.get_object(coverage_id)
        if not coverage:
            return Response({'detail': 'پوشش مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminInsuranceCoverageSerializer(coverage, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(AdminInsuranceCoverageSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, coverage_id):
        coverage = self.get_object(coverage_id)
        if not coverage:
            return Response({'detail': 'پوشش مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        coverage.delete()
        return Response({'message': 'پوشش با موفقیت حذف شد.'}, status=status.HTTP_200_OK)


class AdminCompaniesView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        companies = InsuranceCompany.objects.all().order_by('name')
        serializer = AdminInsuranceCompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminInsuranceCompanySerializer(data=request.data)
        if serializer.is_valid():
            company = serializer.save()
            return Response(AdminInsuranceCompanySerializer(company).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminTransactionsView(APIView):
    permission_classes = [IsInsuranceExpertOrAdmin]

    def get(self, request):
        status_filter = request.query_params.get('status')
        search_query = request.query_params.get('search', '').strip()

        payments = Payment.objects.select_related('order', 'order__user', 'order__plan', 'order__plan__company').order_by('-created_at')

        # Company-specific isolation for Insurance Expert
        if getattr(request.user, 'role', '') == 'EXPERT':
            payments = payments.filter(order__plan__company=request.user.assigned_company)

        if status_filter:
            payments = payments.filter(status=status_filter)

        if search_query:
            payments = payments.filter(
                Q(transaction_id__icontains=search_query) |
                Q(order__order_number__icontains=search_query) |
                Q(order__user__phone_number__icontains=search_query) |
                Q(order__user__full_name__icontains=search_query)
            )

        serializer = AdminTransactionSerializer(payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminOrdersView(APIView):
    permission_classes = [IsInsuranceExpertOrAdmin]

    def get(self, request):
        status_filter = request.query_params.get('status')
        search_query = request.query_params.get('search', '').strip()

        orders = Order.objects.select_related('user', 'plan', 'plan__company').order_by('-created_at')

        # Company-specific isolation for Insurance Expert:
        # Expert can ONLY view customer specifications and orders of their assigned company!
        if getattr(request.user, 'role', '') == 'EXPERT':
            orders = orders.filter(plan__company=request.user.assigned_company)

        if status_filter:
            orders = orders.filter(status=status_filter)

        if search_query:
            orders = orders.filter(
                Q(order_number__icontains=search_query) |
                Q(user__phone_number__icontains=search_query) |
                Q(user__full_name__icontains=search_query)
            )

        serializer = AdminOrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
