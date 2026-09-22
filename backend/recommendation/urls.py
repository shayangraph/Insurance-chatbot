from django.urls import path
from .views import InsurancePlanListView, CalculateRecommendationView, InsuranceCompanyListView

urlpatterns = [
    path('companies/', InsuranceCompanyListView.as_view(), name='company_list'),
    path('plans/', InsurancePlanListView.as_view(), name='plan_list'),
    path('calculate/', CalculateRecommendationView.as_view(), name='recommendation_calculate'),
]
