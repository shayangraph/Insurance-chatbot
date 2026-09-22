from rest_framework import serializers
from .models import InsuranceCompany, InsurancePlan, Recommendation, InsuranceCoverage

class InsuranceCoverageSerializer(serializers.ModelSerializer):
    coverage_type_display = serializers.CharField(source='get_coverage_type_display', read_only=True)

    class Meta:
        model = InsuranceCoverage
        fields = (
            'id', 'plan', 'name', 'description',
            'coverage_type', 'coverage_type_display',
            'additional_price', 'is_active', 'created_at'
        )

class InsuranceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = '__all__'

class InsurancePlanSerializer(serializers.ModelSerializer):
    company = InsuranceCompanySerializer(read_only=True)
    coverages = InsuranceCoverageSerializer(many=True, read_only=True)
    insurance_type_display = serializers.CharField(source='get_insurance_type_display', read_only=True)

    class Meta:
        model = InsurancePlan
        fields = '__all__'

class RecommendationSerializer(serializers.ModelSerializer):
    plan = InsurancePlanSerializer(read_only=True)

    class Meta:
        model = Recommendation
        fields = '__all__'
