import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from django.conf import settings

from services.graphiti_service import GraphitiService, HAS_GRAPHITI

logger = logging.getLogger(__name__)

# Ensure UTF-8 output on Windows consoles if supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


class Command(BaseCommand):
    help = "Ingest Insurance Knowledge Base JSON files into Graphiti and Neo4j Knowledge Graph"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing graph database before ingestion'
        )
        parser.add_argument(
            '--group-id',
            type=str,
            default='insurance_kb',
            help='Graphiti group ID / partition (default: insurance_kb)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[START] Starting Knowledge Base ingestion into Graphiti & Neo4j..."))

        if not HAS_GRAPHITI:
            self.stdout.write(self.style.ERROR("[ERROR] 'graphiti-core' is not installed in the environment."))
            return

        api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            self.stdout.write(self.style.ERROR("[ERROR] GEMINI_API_KEY is missing in settings / .env file."))
            return


        # Find JSON files in project root or backend
        base_dir = Path(settings.BASE_DIR)
        possible_roots = [
            base_dir.parent,  # Project root
            base_dir,         # Backend root
        ]

        def find_json_file(filename: str) -> Path:
            for root in possible_roots:
                candidate = root / filename
                if candidate.exists():
                    return candidate
            raise FileNotFoundError(f"Knowledge JSON file '{filename}' was not found in project paths.")

        try:
            ins_knowledge_path = find_json_file("insurance_knowledge.json")
            ins_companies_path = find_json_file("insurance_companies.json")
            consultation_path = find_json_file("consultation_knowledge.json")
        except FileNotFoundError as e:
            self.stdout.write(self.style.ERROR(f"[ERROR] {e}"))
            return

        self.stdout.write(self.style.SUCCESS("[INFO] Found Knowledge JSON files:"))
        self.stdout.write(f"  * {ins_knowledge_path.name}")
        self.stdout.write(f"  * {ins_companies_path.name}")
        self.stdout.write(f"  * {consultation_path.name}")


        # Load JSON files (Dynamic source of truth, zero hardcoded facts)
        with open(ins_knowledge_path, "r", encoding="utf-8") as f:
            ins_knowledge_data = json.load(f)

        with open(ins_companies_path, "r", encoding="utf-8") as f:
            ins_companies_data = json.load(f)

        with open(consultation_path, "r", encoding="utf-8") as f:
            consultation_data = json.load(f)

        group_id = options.get('group_id', 'insurance_kb')
        clear_db = options.get('clear', False)

        asyncio.run(self.run_ingestion(
            ins_knowledge_data=ins_knowledge_data,
            ins_companies_data=ins_companies_data,
            consultation_data=consultation_data,
            group_id=group_id,
            clear_db=clear_db
        ))

    async def run_ingestion(
        self,
        ins_knowledge_data: dict,
        ins_companies_data: dict,
        consultation_data: dict,
        group_id: str,
        clear_db: bool
    ):
        # 1. Build indices and constraints on Neo4j
        self.stdout.write(self.style.NOTICE("[STEP 1] Configuring Neo4j indices and constraints..."))
        success = await GraphitiService.build_indices_and_constraints_async()
        if not success:
            self.stdout.write(self.style.WARNING("[WARNING] Unable to verify Neo4j indices. Proceeding with caution..."))

        # 2. Optionally clear graph database
        if clear_db:
            self.stdout.write(self.style.WARNING("[STEP 2] Clearing previous graph data for group..."))
            client = GraphitiService.get_client()
            if client and client.driver:
                try:
                    await client.driver.execute_query(
                        "MATCH (n {group_id: $group_id}) DETACH DELETE n",
                        group_id=group_id
                    )
                    self.stdout.write(self.style.SUCCESS("[OK] Previous group data cleared."))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"[WARNING] Could not clear group data: {e}"))
                finally:
                    await client.close()


        # 3. Construct exactly 3 Comprehensive Episodes from JSON data
        episodes_to_ingest = []

        # --- Episode 1: Insurance Types & Regulations (insurance_knowledge.json) ---
        ins_types_blocks = []
        for ins_type in ins_knowledge_data.get("insurance_types", []):
            name = ins_type.get("name", "نامشخص")
            type_id = ins_type.get("id", "unknown")
            description = ins_type.get("description", "")
            main_cov = "\n  * ".join(ins_type.get("main_coverage", []))
            add_cov = "\n  * ".join(ins_type.get("additional_coverage", []))
            pricing = "\n  * ".join(ins_type.get("pricing_factors", []))
            questions = "\n  * ".join(ins_type.get("consultation_questions", []))

            type_block = (
                f"عنوان نوع بیمه: {name} (شناسه سیستمی: {type_id})\n"
                f"تعریف و کارکرد اصلی: {description}\n"
                f"پوشش‌های اصلی و پایه:\n  * {main_cov}\n"
                f"پوشش‌های فرعی، اضافی و تکمیلی:\n  * {add_cov}\n"
                f"عوامل موثر بر محاسبه نرخ و حق بیمه:\n  * {pricing}\n"
                f"سوالات کلیدی مشاوره‌ای جهت صدور بیمه‌نامه:\n  * {questions}"
            )
            ins_types_blocks.append(type_block)

        episodes_to_ingest.append({
            "name": "پایگاه دانش انواع بیمه و پوشش‌ها",
            "body": "اطلاعات جامع انواع رشته‌های بیمه‌ای، پوشش‌های پایه و تکمیلی و قوانین قیمت‌گذاری:\n\n" + "\n\n====================\n\n".join(ins_types_blocks),
            "source_description": "insurance_knowledge.json (Insurance Types, Base Rules, Main & Additional Coverages)",
        })

        # --- Episode 2: Insurance Companies & Their Offered Products/Coverages (insurance_companies.json) ---
        companies_blocks = []
        for comp in ins_companies_data.get("companies", []):
            comp_id = comp.get("id", "unknown")
            comp_name = comp.get("name", "شرکت بیمه")
            comp_type = comp.get("type", "خصوصی")
            founded = comp.get("founded_year", "نامشخص")
            description = comp.get("description", "")
            advantages = "\n  * ".join(comp.get("advantages", []))
            ratings = comp.get("customer_ratings", {})

            # Products and their detailed coverages breakdown
            products_text = []
            for prod in comp.get("insurance_products", []):
                p_name = prod.get("name", "")
                p_type = prod.get("type", "")
                p_covs = []
                for c in prod.get("coverage", []):
                    p_covs.append(f"{c.get('name')}: {c.get('description')}")
                p_add_covs = []
                for ac in prod.get("additional_coverage", []):
                    p_add_covs.append(f"{ac.get('name')}: {ac.get('description')}")

                p_purchase = prod.get("purchase_options", {})
                purchase_desc = p_purchase.get("description", "خرید نقد و اقساط")
                installment_flag = "دارد" if p_purchase.get("installment") else "ندارد"

                p_text = (
                    f"نام محصول بیمه‌ای شرکت: {p_name} (نوع بیمه: {p_type})\n"
                    f"امکان خرید اقساطی: {installment_flag} ({purchase_desc})\n"
                    f"پوشش‌های تعهدشده این محصول:\n    - " + ("\n    - ".join(p_covs) if p_covs else "مطابق شرایط استاندارد") + "\n"
                    f"پوشش‌های اضافی و اختیاری این محصول:\n    - " + ("\n    - ".join(p_add_covs) if p_add_covs else "ندارد یا طبق توافق")
                )
                products_text.append(p_text)

            inst_info = comp.get("installment_information", {})
            inst_methods = ", ".join(inst_info.get("methods", []))
            inst_period = inst_info.get("installment_period_months", {})

            comp_block = (
                f"شرکت بیمه‌گر: {comp_name} (شناسه: {comp_id})\n"
                f"نوع مالکیت: {comp_type} | سال تاسیس: {founded}\n"
                f"معرفی شرکت: {description}\n"
                f"رتبه‌بندی و رضایت مشتریان: امتیاز کلی {ratings.get('overall_rating')}/5 (پرداخت خسارت: {ratings.get('categories', {}).get('claims_payment', '-')})\n"
                f"مزایای کلیدی و تمایز رقابتی:\n  * {advantages}\n"
                f"شرایط پرداخت اقساطی {comp_name}:\n"
                f"  * امکان اقساط: {'بله' if inst_info.get('available') else 'خیر'}\n"
                f"  * نیاز به چک: {'دارد' if inst_info.get('requires_check') else 'ندارد'}\n"
                f"  * نیاز به ضامن یا سفته: {'دارد' if inst_info.get('requires_guarantor') or inst_info.get('requires_promissory_note') else 'ندارد'}\n"
                f"  * روش‌های پرداخت: {inst_methods}\n"
                f"  * مدت اقساط: از {inst_period.get('min', 3)} تا {inst_period.get('max', 12)} ماه\n\n"
                f"محصولات بیمه‌ای و پوشش‌های تخصصی ارائه‌شده توسط {comp_name}:\n\n" + "\n\n".join(products_text)
            )
            companies_blocks.append(comp_block)

        episodes_to_ingest.append({
            "name": "پایگاه دانش شرکت‌های بیمه، پوشش‌ها و شرایط اقساط",
            "body": "اطلاعات تخصصی شرکت‌های بیمه‌گر، محصولات و پوشش‌های اختصاصی هر شرکت و شرایط اقساطی:\n\n" + "\n\n====================\n\n".join(companies_blocks),
            "source_description": "insurance_companies.json (Companies, Products, Coverages, Installment terms)",
        })

        # --- Episode 3: Consultation Guidelines & FAQs (consultation_knowledge.json) ---
        consultations_blocks = []
        for consult in consultation_data.get("consultations", []):
            c_name = consult.get("name", "مشاوره بیمه")
            c_id = consult.get("id", "unknown")
            c_desc = consult.get("description", "")

            faqs_text = []
            for faq in consult.get("faqs", []):
                q = faq.get("question", "")
                topic = faq.get("topic", "")
                consider = "\n    * ".join(faq.get("consider", []))
                guidelines = "\n    * ".join(faq.get("guidelines", []))
                faq_item = (
                    f"بخش: {topic}\n"
                    f"پرسش متداول: {q}\n"
                    f"نکات مهم قابل بررسی:\n    * {consider}\n"
                    f"راهنمای پاسخ‌دهی و مشاوره:\n    * {guidelines}"
                )
                faqs_text.append(faq_item)

            c_block = (
                f"دسته‌بندی مشاوره: {c_name} (شناسه: {c_id})\n"
                f"توضیحات: {c_desc}\n\n"
                f"پرسش‌های متداول و راهنمای پاسخ به مشتریان:\n\n" + "\n\n---\n\n".join(faqs_text)
            )
            consultations_blocks.append(c_block)

        episodes_to_ingest.append({
            "name": "راهنمای جامع مشاوره بیمه و پرسش‌های متداول",
            "body": "مجموعه سوالات متداول مشتریان، نکات مقایسه‌ای و سناریوهای مشاوره‌ای:\n\n" + "\n\n====================\n\n".join(consultations_blocks),
            "source_description": "consultation_knowledge.json (Consultation Guidelines, FAQs, Customer Scenarios)",
        })


        # 4. Ingest Episodes sequentially to Graphiti
        self.stdout.write(self.style.NOTICE(f"[STEP 3] Total Episodes prepared for ingestion: {len(episodes_to_ingest)}"))

        success_count = 0
        ref_time = datetime.now(timezone.utc)

        for i, ep in enumerate(episodes_to_ingest, 1):
            ep_name = ep["name"]
            ep_body = ep["body"]
            source_desc = ep["source_description"]

            self.stdout.write(f"[{i}/{len(episodes_to_ingest)}] Ingesting '{ep_name}'...")
            ingested = False
            for attempt in range(1, 4):
                try:
                    await GraphitiService.add_episode_async(
                        name=ep_name,
                        episode_body=ep_body,
                        source_description=source_desc,
                        group_id=group_id,
                        reference_time=ref_time
                    )
                    success_count += 1
                    ingested = True
                    self.stdout.write(self.style.SUCCESS(f"  [OK] Extracted entities & relations into Neo4j."))
                    break
                except Exception as e:
                    if attempt < 3:
                        self.stdout.write(self.style.WARNING(f"  [RETRY] Attempt {attempt} failed ({e}). Retrying in 6 seconds..."))
                        await asyncio.sleep(6)
                    else:
                        self.stdout.write(self.style.ERROR(f"  [FAIL] Failed to ingest '{ep_name}' after 3 attempts: {e}"))

            # Brief pause between episodes to protect rate limits
            if ingested and i < len(episodes_to_ingest):
                await asyncio.sleep(3)


        self.stdout.write(self.style.SUCCESS(
            f"\n[DONE] Ingestion Completed! Successfully processed {success_count}/{len(episodes_to_ingest)} episodes into Neo4j Knowledge Graph."
        ))

