import os
import sys
import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from recommendation.models import InsuranceCompany, InsurancePlan, InsuranceCoverage

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

class Command(BaseCommand):

    help = 'Seeds Iranian insurance companies and plans data directly from insurance_companies.json'

    def handle(self, *args, **options):
        self.stdout.write("در حال ایجاد و به‌روزرسانی اطلاعات ۵ شرکت بیمه و محصولات آنها...")

        json_path = Path(settings.BASE_DIR).parent / "insurance_companies.json"
        if not json_path.exists():
            json_path = Path(settings.BASE_DIR) / "insurance_companies.json"

        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f"فایل {json_path} یافت نشد."))
            return

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Default pricing mapping per insurance type
        type_defaults = {
            "third_party": {"base_price": 6200000, "coverage_amount": 700000000, "max_discount": 70},
            "body": {"base_price": 4800000, "coverage_amount": 1000000000, "max_discount": 70},
            "fire": {"base_price": 1800000, "coverage_amount": 1500000000, "max_discount": 50},
            "travel": {"base_price": 1200000, "coverage_amount": 500000000, "max_discount": 30},
            "life": {"base_price": 5000000, "coverage_amount": 2000000000, "max_discount": 50},
        }

        # Additional coverage price defaults
        addon_prices = {
            "سرقت درجا قطعات": 750000,
            "بلایای طبیعی": 450000,
            "شکست شیشه": 300000,
            "مواد شیمیایی و اسیدی": 250000,
            "ایاب و ذهاب": 350000,
            "نوسان قیمت": 600000,
            "افزایش تعهد مالی مازاد": 500000,
            "زلزله و آتشفشان": 400000,
            "سیل و طغیان آب": 350000,
            "ترکیدگی لوله آب": 250000,
            "سرقت با شکست حرز": 500000,
            "نوسانات برق": 300000,
        }

        created_companies = 0
        created_plans = 0
        created_coverages = 0

        for comp_data in data.get("companies", []):
            code = comp_data.get("id")
            name = comp_data.get("name")
            rating = comp_data.get("customer_ratings", {}).get("overall_rating", 4.5)
            wealth_level = 1
            complaint_satisfaction_rate = 95

            company, _ = InsuranceCompany.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "rating": rating,
                    "wealth_level": wealth_level,
                    "complaint_satisfaction_rate": complaint_satisfaction_rate
                }
            )
            created_companies += 1

            for prod in comp_data.get("insurance_products", []):
                p_type = prod.get("type", "third_party")
                p_name = prod.get("name")
                defaults = type_defaults.get(p_type, type_defaults["third_party"])

                # Compile main coverage details text
                cov_details = []
                for c in prod.get("coverage", []):
                    cov_details.append(f"{c.get('name')}: {c.get('description', '')}")

                plan, _ = InsurancePlan.objects.update_or_create(
                    company=company,
                    title=p_name,
                    defaults={
                        "insurance_type": p_type,
                        "description": f"محصول رسمی {p_name} با پوشش‌های کامل جانی، مالی و تکمیلی شرکت {name}.",
                        "base_price": defaults["base_price"],
                        "coverage_amount": defaults["coverage_amount"],
                        "coverage_details": cov_details,
                        "max_discount_percent": defaults["max_discount"],
                        "is_active": True
                    }
                )
                created_plans += 1

                # Clean existing coverages for this plan
                plan.coverages.all().delete()

                # Create Base Coverages
                for c in prod.get("coverage", []):
                    c_name = c.get("name")
                    c_desc = c.get("description", "")
                    InsuranceCoverage.objects.create(
                        plan=plan,
                        name=c_name,
                        description=c_desc,
                        coverage_type='BASE',
                        additional_price=0,
                        is_active=True
                    )
                    created_coverages += 1

                # Create Optional Coverages
                for ac in prod.get("additional_coverage", []):
                    ac_name = ac.get("name")
                    ac_desc = ac.get("description", "")
                    add_price = addon_prices.get(ac_name, 350000)
                    InsuranceCoverage.objects.create(
                        plan=plan,
                        name=ac_name,
                        description=ac_desc,
                        coverage_type='OPTIONAL',
                        additional_price=add_price,
                        is_active=True
                    )
                    created_coverages += 1


        self.stdout.write(self.style.SUCCESS(
            f"همگام‌سازی کامل شد: {created_companies} شرکت، {created_plans} طرح بیمه، و {created_coverages} پوشش ایجاد گردید."
        ))
