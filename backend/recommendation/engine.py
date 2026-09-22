import decimal
from .models import InsurancePlan, Recommendation

def calculate_best_recommendation(insurance_type: str, collected_data: dict, user=None, session_id: str = "") -> Recommendation:
    """
    Django Business Logic Engine for calculating optimal insurance plan,
    exact pricing, selected optional coverages, discounts, and rationale.
    Formula: Final Price = Base Price + Selected Optional Coverages - Discount
    """
    # Target plan, company or title matching
    target_plan_id = collected_data.get('plan_id')
    preferred_company = collected_data.get('preferred_company') or collected_data.get('company')
    preferred_plan_title = collected_data.get('preferred_plan_title') or collected_data.get('plan_title')
    excluded_companies = collected_data.get('excluded_companies', [])

    base_plans = InsurancePlan.objects.filter(is_active=True).select_related('company').prefetch_related('coverages')

    # Apply company exclusions
    for exc in excluded_companies:
        if exc:
            base_plans = base_plans.exclude(company__name__icontains=exc)
            if preferred_company and exc in preferred_company:
                preferred_company = None

    if target_plan_id:
        matched = base_plans.filter(id=target_plan_id)
        if matched.exists():
            plans = matched
        else:
            plans = base_plans.filter(insurance_type=insurance_type) or base_plans
    elif preferred_company:
        matched = base_plans.filter(company__name__icontains=preferred_company, insurance_type=insurance_type)
        if not matched.exists():
            matched = base_plans.filter(company__name__icontains=preferred_company)
        if matched.exists():
            plans = matched
        else:
            plans = base_plans.filter(insurance_type=insurance_type) or base_plans
    elif preferred_plan_title:
        matched = base_plans.filter(title__icontains=preferred_plan_title)
        if matched.exists():
            plans = matched
        else:
            plans = base_plans.filter(insurance_type=insurance_type) or base_plans
    else:
        plans = base_plans.filter(insurance_type=insurance_type)
        if not plans.exists():
            plans = base_plans


    best_plan = None
    lowest_calculated_price = float('inf')
    best_discount = 0
    best_original_price = 0
    best_reason = ""

    # Parse parameters from user's collected input
    discount_years = int(collected_data.get('no_damage_years', collected_data.get('discount_years', 0)) or 0)
    build_year = int(collected_data.get('build_year', 1400) or 1400)
    city = str(collected_data.get('city', 'تهران'))
    selected_coverage_names = collected_data.get('selected_coverages', [])

    for plan in plans:
        base_price = float(plan.base_price)

        # Calculate optional coverages price
        optional_coverages_price = 0.0
        active_coverages = plan.coverages.filter(is_active=True)
        if selected_coverage_names:
            for cov in active_coverages.filter(coverage_type='OPTIONAL'):
                if cov.name in selected_coverage_names or str(cov.id) in selected_coverage_names:
                    optional_coverages_price += float(cov.additional_price)

        # Calculate discount based on no-damage years
        discount_percent = min(discount_years * 5, plan.max_discount_percent) / 100.0
        discount_amount = round(base_price * discount_percent, -3)

        # Final Price = Base Price + Selected Optional Coverages - Discount
        raw_final_price = (base_price + optional_coverages_price) - discount_amount
        final_price = max(100000.0, round(raw_final_price, -4))

        original_price = base_price + optional_coverages_price

        if final_price < lowest_calculated_price:
            lowest_calculated_price = final_price
            best_plan = plan
            best_discount = discount_amount
            best_original_price = original_price

            # Construct human-readable justification in Persian with English numbers
            best_reason = (
                f"طرح «{plan.title}» بر اساس سابقه {discount_years} سال عدم خسارت، "
                f"رتبه رضایتمندی {plan.company.rating} از 5 و پرداخت خسارت {plan.company.complaint_satisfaction_rate}٪ "
                f"شرکت {plan.company.name} به‌عنوان مناسب‌ترین و کامل‌ترین پوشش برای شما انتخاب شد."
            )

    if not best_plan:
        best_plan = plans.first()
        lowest_calculated_price = float(best_plan.base_price)
        best_original_price = float(best_plan.base_price)
        best_reason = f"طرح «{best_plan.title}» پیشنهادی ویژه ما برای شماست."

    recommendation = Recommendation.objects.create(
        user=user,
        session_id=session_id,
        plan=best_plan,
        calculated_price=decimal.Decimal(str(lowest_calculated_price)),
        original_price=decimal.Decimal(str(best_original_price)),
        discount_amount=decimal.Decimal(str(best_discount)),
        recommendation_reason=best_reason,
        collected_data=collected_data
    )

    return recommendation


