from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import InsuranceCompany, InsurancePlan, Recommendation
from .serializers import InsuranceCompanySerializer, InsurancePlanSerializer, RecommendationSerializer
from .engine import calculate_best_recommendation

class InsuranceCompanyListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        companies = InsuranceCompany.objects.all().order_by('name')
        serializer = InsuranceCompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class InsurancePlanListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        insurance_type = request.query_params.get('type')
        plans = InsurancePlan.objects.filter(is_active=True).select_related('company')
        if insurance_type:
            plans = plans.filter(insurance_type=insurance_type)
        serializer = InsurancePlanSerializer(plans, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CalculateRecommendationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        insurance_type = request.data.get('insurance_type', 'third_party')
        collected_data = request.data.get('collected_data', {})
        session_id = request.data.get('session_id', '')

        user = request.user if request.user.is_authenticated else None

        recommendation = calculate_best_recommendation(
            insurance_type=insurance_type,
            collected_data=collected_data,
            user=user,
            session_id=session_id
        )

        serializer = RecommendationSerializer(recommendation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
