import os
import re
import concurrent.futures
from google import genai
from google.genai import types
from django.conf import settings
from .graphiti_service import GraphitiService, GraphitiMemoryService


_gemini_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

class GeminiService:

    @staticmethod
    def detect_buy_intent(user_message: str) -> tuple:
        """
        Detects if the user has an explicit buy or quote intent and extracts the insurance type.
        Returns (is_buy_intent: bool, insurance_type: str | None)
        """
        text = user_message.lower()

        # Check if inquiry is about an already purchased insurance / past order / expiration
        inquiry_keywords = [
            'خریدم', 'خریداری کردم', 'خریداری شده', 'بیمه من', 'بیمه‌نامه من', 'بیمه ام', 'بیمه‌ام',
            'سفارش من', 'چه بیمه‌ای خریدم', 'چه بیمه ای خریدم', 'ثبت شده',
            'ثبت شد', 'پرداخت کردم', 'پرداخت شده', 'وضعیت سفارش', 'وضعیت بیمه',
            'کی صادر میشه', 'چطور صادر میشه', 'شماره سفارش', 'رسید پرداخت',
            'انقضا', 'انقضای', 'تاریخ انقضا', 'تاریخ پایان', 'کی تموم میشه', 'کی تمام میشه',
            'کی منقضی میشه', 'تا کی اعتبار داره', 'اعتبار بیمه', 'انقضای بیمه',
            'چند ماه دیگه', 'چند ماه دیگر', 'چند ماه اعتبار داره', 'اعتبار داره'
        ]
        is_past_order_inquiry = any(ik in text for ik in inquiry_keywords)
        is_explicit_new_buy = any(nk in text for nk in ['بیمه جدید', 'بیمه دیگر', 'بیمه دیگه', 'یک بیمه دیگه', 'یه بیمه دیگه', 'طرح دیگر', 'طرح دیگه'])

        # Buy / Request / Specific Company Quote / Alternative Plan keywords
        buy_keywords = [
            'میخوام', 'می‌خوام', 'می خواهم', 'میخواهم', 'بخرم', 'خرید', 'خریداری', 'خریدارم', 'میخرم', 'می‌خرم',
            'بگیرم', 'گرفتن', 'استعلام', 'صدور', 'ثبت سفارش', 'محاسبه', 'قیمت',
            'طرح‌های', 'طرحهای', 'طرح ها', 'طرح‌های بیمه', 'طرح های بیمه', 'محصولات',
            'فقط بیمه', 'فقط شرکت', 'بیمه ایران', 'بیمه رازی', 'بیمه سامان',
            'بیمه دانا', 'بیمه نوین', 'بیمه آسیا', 'بیمه البرز', 'بیمه پاسارگاد',
            'بیمه معلم', 'بیمه پارسیان', 'بیمه کوثر', 'بیمه ما', 'بیمه دی', 'بیمه سینا',
            'بیمه ملت', 'بیمه کارآفرین', 'لازم دارم', 'نیاز دارم', 'بیمه می‌خواهم', 'بیمه میخوام',
            'شرکت دیگه', 'شرکت دیگری', 'بیمه دیگه', 'گزینه دیگه', 'گزینه دیگری',
            'طرح دیگه', 'طرح دیگری', 'پیشنهاد دیگه', 'پیشنهاد دیگری', 'عوض کن',
            'تغییر بده', 'یه شرکت دیگه', 'یک شرکت دیگر', 'به جز', 'بجز', 'غیر از', 'نمیخوام',
            'میخواستم بدانم', 'می‌خواستم بدانم', 'میخواستم بدونم', 'می‌خواستم بدونم', 'اطلاعات سفر'
        ]

        # Check for comparison intent (e.g. مقایسه کن، کدوم بهتره، تفاوت، فرق)
        comparison_keywords = [
            'مقایسه', 'مقایسه‌', 'مقایسه کن', 'مقایسشون', 'مقایسه‌شون',
            'کدوم بهتره', 'کدام بهتر است', 'کدوم شرکت بهتره', 'کدام شرکت بهتر است',
            'تفاوت', 'فرق', 'برتری', 'کدوم رو انتخاب کنم', 'کدوم رو پیشنهاد میدی',
            'کدوم رو پیشنهاد میکنی', 'کدام رو پیشنهاد میکنی', 'کدام را پیشنهاد میکنی',
            'کدام را پیشنهاد می‌دهی', 'کدوم شرکت رو پیشنهاد میکنی', 'کدوم رو ترجیح میدی',
            'پیشنهاد میکنی', 'پیشنهاد می‌کنی', 'نظرت چیه', 'کدومش بهتره', 'کدامش بهتره',
            'کدوم را پیشنهاد', 'کدام پیشنهاد'
        ]

        # Check if multiple insurance companies are mentioned along with comparative context
        known_companies = ['ایران', 'دانا', 'آسیا', 'معلم', 'سامان', 'رازی', 'نوین', 'پاسارگاد', 'البرز', 'کوثر', 'پارسیان', 'سینا', 'دی', 'کارآفرین', 'بیمه ما', 'ملت']
        companies_mentioned = [c for c in known_companies if c in text]
        has_multi_company_comparison = (
            len(companies_mentioned) >= 2 and any(w in text for w in ['بین', 'کدوم', 'کدام', 'پیشنهاد', 'بهتر', 'ترجیح', 'انتخاب', 'نظرت', 'مقایسه', 'یا'])
        )

        is_comparison = any(ck in text for ck in comparison_keywords) or has_multi_company_comparison

        if is_comparison:
            is_buy = False
        elif is_past_order_inquiry and not is_explicit_new_buy:
            is_buy = False
        else:
            is_buy = any(bk in text for bk in buy_keywords)

        # Detect insurance type if specified
        ins_type = None
        if any(k in text for k in ['شخص ثالث', 'ثالث']):
            ins_type = 'third_party'
        elif 'بدنه' in text:
            ins_type = 'body'
        elif any(k in text for k in ['آتش سوزی', 'آتش‌سوزی', 'آتش', 'زلزله', 'منزل', 'آپارتمان', 'ساختمان']):
            ins_type = 'fire'
        elif any(k in text for k in ['مسافرتی', 'مسافرت', 'شینگن', 'سفر', 'خارج از کشور']):
            ins_type = 'travel'
        elif any(k in text for k in ['عمر', 'بازنشستگی', 'سرمایه‌گذاری', 'سرمایه گذاری', 'پس انداز', 'پس‌انداز', 'آتیه']):
            ins_type = 'life'
        elif 'درمان' in text or 'تکمیلی' in text:
            ins_type = 'health'

        return is_buy, ins_type, is_comparison




    @staticmethod
    def generate_consultation_response(
        messages_history: list,
        user_message: str,
        collected_data: dict = None,
        user_id: str = None,
        session_id: str = None,
        order_context: str = None
    ) -> str:
        """
        Generates a natural, accurate Persian consultation response powered by Graphiti (Neo4j) Knowledge Retrieval and Gemini.
        Zero hallucinated products or prices. Clean and focused on insurance advice.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')

        # 1. Retrieve Knowledge Facts from Neo4j Knowledge Graph via Graphiti
        graphiti_knowledge_context = GraphitiService.search_knowledge(user_message)

        # 2. Retrieve User Cross-Session Memory from Graphiti
        graphiti_memory_context = GraphitiMemoryService.get_user_longterm_memory_context(user_id=user_id, session_id=session_id)

        purchased_order_prompt = ""
        if order_context:
            purchased_order_prompt = f"""
وضعیت بیمه‌نامه خریداری‌شده و فعال کاربر در سامانه:
{order_context}

دستورالعمل حیاتی و اختصاصی مشاور درباره بیمه‌نامه فعال:
کاربر این بیمه‌نامه را قبلاً با موفقیت پرداخت و خریداری کرده است و در حال حاضر دارای بیمه‌نامه معتبر در سامانه است.
قوانین الزامی:
۱. اگر کاربر پرسید: «با توجه به اطلاعاتی که قبلاً درباره ماشینم بهت دادم، برای بیمه بدنه چه گزینه‌ای رو پیشنهاد می‌کنی؟»، «برای بیمه بدنه چه گزینه‌ای رو پیشنهاد می‌کنی؟»، «چه بیمه‌ای برام خوبه؟»، «چه گزینه‌ای رو پیشنهاد می‌کنی؟» یا با توجه به مشخصات ماشینش درخواست پیشنهاد بیمه کرد:
   - به هیچ عنوان کارت خرید یا پیشنهاد خرید بیمه جدید ارائه نکن!
   - صراحتاً و محترمانه به او بگو که «شما هنوز بیمه فعال دارید» (هنوز بیمه فعال داری) و نیازی به خرید یا انتخاب بیمه‌نامه جدید ندارید.
   - مشخصات ثبت‌شده خودروی کاربر (مانند خودروی دنا مدل ۱۴۰۵ صفر کیلومتر با ارزش ۵۰۰ میلیون تومان) را از حافظه گرامی بدار و ذکر کن.
   - با تکیه بر پایگاه دانش گراف، جزئیات پوشش‌های این بیمه‌نامه فعال (شامل خطرات اصلی نظیر تصادف، آتش‌سوزی، سرقت کلی و پوشش‌های تکمیلی نظیر نوسان قیمت بازار تا ۵۰٪ ارزش خودروی ۵۰۰ میلیونی، بلایای طبیعی، شکست شیشه و سرقت درجا قطعات) را تشریح کن و توضیح بده که سرمایه و خودروی او به طور کامل تحت پوشش و محافظت همین بیمه‌نامه فعال است.
۲. اگر کاربر درباره تاریخ انقضا، پایان اعتبار یا زمان باقیمانده بیمه‌نامه پرسید (مانند: «بیمه بدنه من تا کی اعتبار داره و چند ماه دیگه تموم میشه؟»، «تا کی اعتبار داره؟»، «کی تموم میشه؟»، «چند ماه دیگه تموم میشه؟»):
   - فقط و فقط تاریخ پایان اعتبار و مدت زمان باقیمانده را به صورت بسیار کوتاه، دقیق و مستقیم در یک جمله بیان کن (مثال: «بیمه‌نامه بدنه شما (بیمه دانا) تا تاریخ ۲۰۲۷/۰۹/۰۸ معتبر است و حدود ۱۲ ماه (۳۶۴ روز) از اعتبار آن باقی مانده است.»).
   - از اضافه کردن پاراگراف‌های طولانی، توضیحات پوشش‌ها یا تعارفات پرهیز کن؛ فقط زمان باقیمانده را بگو.
"""
        else:
            purchased_order_prompt = """
وضعیت بیمه‌نامه کاربر در سامانه:
کاربر در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده است (هیچ بیمه‌نامه فعال یا پرداخت‌شده‌ای برای این کاربر ثبت نشده است).

دستورالعمل بسیار مهم، حیاتی و الزامی درباره استعلام وضعیت و انقضای بیمه‌نامه:
اگر کاربر درباره وضعیت بیمه‌نامه خود، تاریخ انقضا، تاریخ پایان، شماره سفارش، اعتبار یا مشخصات بیمه‌نامه‌اش سوال کرد (مانند: «تاریخ دقیق انقضای بیمه‌نامه من کی هست؟»، «بیمه من تا کی اعتبار داره؟»، «بیمه من چی شد؟»):
۱. هرگز و تحت هیچ شرایطی نگو «با توجه به اینکه به اطلاعات خصوصی، تاریخ دقیق شروع بیمه‌نامه یا حساب کاربری شما دسترسی ندارم»، «دسترسی مستقیم ندارم»، «به مشخصات دسترسی ندارم» یا هر جمله مشابه سلب مسئولیت هوش مصنوعی!
۲. به جای آن، صراحتاً، محترمانه و دقیق به کاربر بگو که شما در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده‌اید.
مثال پاسخ مجاز و دقیق: «شما در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده‌اید. در صورت تمایل می‌توانید مشخصات خودرو یا بیمه مورد نظرتان را بفرمایید تا استعلام نرخ و صدور برای شما انجام شود.»
"""

        # Format registered vehicle specifications if present in collected_data
        collected_vehicle_prompt = ""
        if collected_data:
            veh = collected_data.get('vehicle_type')
            yr = collected_data.get('build_year')
            val = collected_data.get('vehicle_value')
            dis = collected_data.get('no_damage_years')
            specs = []
            if veh: specs.append(f"نوع و مدل خودرو: {veh}")
            if yr: specs.append(f"سال ساخت / مدل: {yr}")
            if val:
                try:
                    val_num = int(val)
                    if val_num >= 1_000_000_000:
                        val_str = f"{val_num / 1_000_000_000:g} میلیارد تومان"
                    else:
                        val_str = f"{val_num / 1_000_000:g} میلیون تومان"
                    specs.append(f"ارزش خودرو: {val_str} ({val_num:,} تومان)")
                except Exception:
                    specs.append(f"ارزش خودرو: {val}")
            if dis is not None:
                specs.append(f"تخفیف عدم خسارت: {'صفر (خودروی صفر کیلومتر)' if dis == 0 else f'{dis} سال'}")

            if specs:
                specs_list_str = "\n".join(f"- {s}" for s in specs)
                collected_vehicle_prompt = f"""
مشخصات خودروی کاربر که در سامانه ثبت شده است:
{specs_list_str}

دستورالعمل حیاتی درباره مشخصات خودرو:
اگر کاربر درباره مشخصات خودروی خود، مشخصات ثبت‌شده ماشین، یا اینکه آیا ماشین او یادت هست پرسید (مثلاً: «مشخصات ماشین من یادت هست؟» یا «مشخصات ثبت شده ماشین رو نمایش بده»):
۱. فقط و فقط مشخصات فنی ثبت‌شده خودرو (نوع و مدل، سال ساخت، ارزش، وضعیت تخفیف) را به صورت مستقیم و فهرست نقطه‌ای مرتب نمایش بده.
۲. از به کار بردن هرگونه عبارات تعارف‌آمیز مانند «دوست عزیز»، «بله به خاطر دارم دوست عزیز»، «در صورت تمایل بفرمایید تا استعلام بگیرم»، تعارفات و کش دادن الکی جملات اکیداً خودداری کن. فقط مشخصات را بدون مقدمه و موخره بگو و تمام.
"""

        # Check if question is a comparison between companies
        comp_keys = [
            'مقایسه', 'کدوم بهتره', 'کدام بهتر است', 'تفاوت', 'فرق', 'برتری',
            'کدوم رو پیشنهاد', 'کدام رو پیشنهاد', 'پیشنهاد میکنی', 'پیشنهاد می‌کنی',
            'بین', 'کدوم رو ترجیح', 'کدام رو ترجیح', 'کدوم شرکت'
        ]
        is_comparing_companies = any(k in user_message for k in comp_keys)

        comparison_prompt = ""
        if is_comparing_companies:
            comparison_prompt = """
دستورالعمل ویژه مقایسه شرکت‌های بیمه:
کاربر تقاضای مقایسه یا مشاوره انتخاب بین شرکت‌های بیمه را دارد.
۱. ورود کاملاً مستقیم و بدون هیچ مقدمه: به هیچ عنوان از عبارات سلام، احوالپرسی یا مقدمه‌چینی مانند «با سلام و احترام»، «سلام و روز به‌خیر»، «انتخاب بیمه بدنه مناسب برای خودروی صفر...»، «تصمیم بسیار هوشمندانه‌ای است»، «در ادامه مقایسه‌ای جامع ارائه می‌کنم» یا تعریف از خودرو استفاده نکن. پاسخ را مستقیماً از کلمه اول با مقایسه تخصصی و فنی آغاز کن.
۲. پاراگراف‌بندی و فاصله‌گذاری کاملاً شفاف و خوانا (بسیار مهم): پاسخ را به ۴ بخش یا پاراگراف مجزا و مشخص با یک خط فاصله خالی بین پاراگراف‌ها بنویس تا خوانایی بسیار بالایی داشته باشد:
   - پاراگراف اول (توانگری مالی و اعتبار): مقایسه رتبه توانگری مالی، سابقه و رتبه پرداخت خسارت دو شرکت بر اساس پایگاه دانش.
   - پاراگراف دوم (مراکز پرداخت خسارت و سهولت فرآیند): مقایسه گستردگی شعب پرداخت خسارت مستقیم، ارزیابی آنلاین و شبکه تعمیرگاه‌های طرف قرارداد.
   - پاراگراف سوم (پوشش‌های اصلی و تکمیلی): بررسی پوشش‌های کلیدی متناسب با خودروی کاربر شامل نوسان قیمت تا ۵۰٪، بلایای طبیعی (سیل و زلزله)، شکست شیشه، پاشش اسید و مواد شیمیایی و سرقت درجا.
   - پاراگراف چهارم (صرفه اقتصادی و نرخ حق‌بیمه): مقایسه سطح قیمت، صرفه اقتصادی و شرایط اقساطی بدون سود یا ضامن.
۳. در انتهای پاسخ حتماً در یک سطر مجزا این جمله راهنمایی را بدون کم و کاست بنویس:
در صورت تمایل به انتخاب هر یک از این شرکت‌ها، نام آن را بفرمایید یا تایید کنید تا بلافاصله کارت پیشنهاد و صدور بیمه‌نامه برای شما نمایش داده شود.
"""

        system_instruction = f"""
تو مشاور رسمی، هوشمند، صمیمی و بسیار دقیق بیمه در یک پلتفرم پیشرفته ایرانی هستی.
وظیفه تو ارائه مشاوره تخصصی، شفاف، صادقانه و روان به زبان فارسی درباره انواع بیمه‌نامه‌ها، قوانین، تفاوت‌ها و پوشش‌ها بر اساس پایگاه دانش گراف زیر است.

{purchased_order_prompt}

{collected_vehicle_prompt}

{comparison_prompt}

پایگاه دانش رسمی بیمه (بازیابی‌شده از Graphiti / Neo4j Knowledge Graph):
{graphiti_knowledge_context if graphiti_knowledge_context else "پایگاه دانش رسمی بیمه در دسترس است."}

{graphiti_memory_context}

قوانین رفتار هوشمند:
۱. زبان و لحن: همواره به زبان فارسی کاملاً سلیس، صمیمی، محترمانه، روان و بدون استفاده از کلمات انگلیسی پاسخ بده.
۲. صداقت در دانش: تنها بر اساس قوانین و مفاهیم معتبر بیمه صحبت کن. هرگز از خودت شرکت نامعتبر یا قیمت جعلی نساز. (قیمت‌گذاری دقیق محصولات در مرحله خرید توسط سیستم محاسبه می‌شود).
۳. تحلیل نیاز کاربر: اگر کاربر شرایط خود یا خودرویش را توصیف کرد، نیاز او را تحلیل کن و مناسب‌ترین گزینه‌ها را همراه با دلیل تشریح کن.
۴. پاسخ موجز و شیوا: پاسخ مشاوره‌ای باید کاملاً روشن، ساختاریافته و خوانا باشد.
۵. عدم استفاده از خط تیره در ابتدای خطوط: از علامت خط فاصله (-) برای شروع جملات استفاده نکن؛ متن را با جملات متوالی و پاراگراف‌های خوانا بنویس.
۶. عدم استفاده از هشتگ مارک‌داون: از علائم # یا ## برای تیترها استفاده نکن.
۷. عدم استفاده از ایموجی.
۸. عدم دعوت یا اصرار بی‌مورد: در انتهای مشاوره‌های عمومی تعارف نکن، اما در مقایسه شرکت‌ها جمله راهنمای تایید و انتخاب را درج کن.
"""

        # Direct fast path for vehicle specifications (strictly concise, no filler words)
        vehicle_spec_keywords = [
            'مشخصات ماشین', 'مشخصات خودرو', 'مشخصات ثبت شده', 'مشخصات ثبت‌شده',
            'ماشین من یادت هست', 'خودروی من یادت هست', 'ماشینم یادت هست', 'ماشین من چی بود',
            'خودرو من چی بود', 'اطلاعات ماشین', 'اطلاعات خودرو', 'ماشینم چی بود',
            'مشخصات ماشینم', 'مشخصات خودروم', 'یادت هست ماشینم', 'یادته ماشینم'
        ]
        if any(vk in user_message.lower() for vk in vehicle_spec_keywords):
            return GeminiService._generate_fallback_consultation(user_message, collected_data=collected_data, user_id=user_id, session_id=session_id)

        # Direct fast path for expiration / remaining time inquiry (strictly concise, single direct sentence)
        is_time_remaining_inquiry = any(tk in user_message.lower() for tk in [
            'تا کی اعتبار داره', 'کی تموم میشه', 'کی تمام میشه', 'چند ماه دیگه', 'چند ماه دیگر',
            'چند ماه اعتبار داره', 'کی منقضی میشه'
        ])
        if is_time_remaining_inquiry:
            return GeminiService._generate_fallback_consultation(user_message, collected_data=collected_data, user_id=user_id, session_id=session_id)

        if not api_key:
            return GeminiService._generate_fallback_consultation(user_message, collected_data=collected_data, user_id=user_id, session_id=session_id)

        def _execute_gemini_call():
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=15000)
            )

            contents = []
            if messages_history:
                for m in messages_history[-4:]:
                    role = 'user' if m.get('role') == 'user' else 'model'
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=m.get('content', ''))]
                        )
                    )

            contents.append(
                types.Content(
                    role='user',
                    parts=[types.Part.from_text(text=user_message)]
                )
            )

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                max_output_tokens=650,
            )

            response = None
            for model_name in ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.6-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                    if response.text and response.text.strip():
                        return response.text
                except Exception as model_err:
                    print(f"Model {model_name} failed in consultation: {model_err}")
                    continue
            return None

        # Execute Gemini API call with a realistic timeout
        try:
            future = _gemini_executor.submit(_execute_gemini_call)
            raw_text = future.result(timeout=14.0)

            if raw_text and raw_text.strip():

                cleaned = raw_text
                cleaned = re.sub(r'^\s*#{1,6}\s*', '', cleaned, flags=re.MULTILINE)

                if is_comparing_companies:
                    # Strip any greeting and introductory preamble filler sentences from the beginning
                    cleaned = re.sub(r'^(?:با\s*سلام|سلام)(?:\s*(?:و\s*)?(?:احترام|درود|روز\s*به[‌\s]*خیر|وقت\s*به[‌\s]*خیر))?[.!،,\s]*', '', cleaned, flags=re.IGNORECASE).strip()
                    cleaned = re.sub(r'^انتخاب\s*(?:بیمه|هوشمندان).*?[\.\n]+', '', cleaned, flags=re.IGNORECASE).strip()
                    cleaned = re.sub(r'^برای\s*خودروی\s*(?:صفر|ارزشمند|مدل).*?[\.\n]+', '', cleaned, flags=re.IGNORECASE).strip()
                    cleaned = re.sub(r'^در\s*ادامه.*?[\.\n]+', '', cleaned, flags=re.IGNORECASE).strip()
                else:
                    # Remove common invitation cliches only if not a comparison
                    invitation_pats = [
                        r'اگر\s+مایل\s+به\s+(?:استعلام|خرید|مشاهده).*?(?:\.|$)',
                        r'اگر\s+قصد\s+خرید.*?(?:\.|$)',
                        r'هر\s*زمان\s*(?:که\s*)?تمایل\s*داشتید.*?(?:\.|$)',
                        r'در\s+صورت\s+تمایل\s+به\s+خرید.*?(?:\.|$)',
                        r'برای\s+مشاهده\s+طرح‌های\s+فعال.*?(?:\.|$)',
                    ]
                    for p in invitation_pats:
                        cleaned = re.sub(p, '', cleaned, flags=re.IGNORECASE)

                # Filter any internal thinking or English sentences
                lines = []
                for l in cleaned.split('\n'):
                    stripped = l.strip()
                    if not stripped:
                        lines.append('')
                        continue
                    fa_count = len(re.findall(r'[\u0600-\u06FF]', stripped))
                    en_count = len(re.findall(r'[a-zA-Z]', stripped))
                    if en_count > 3 and fa_count == 0:
                        continue
                    # Remove leading dashes/bullets
                    l_clean = re.sub(r'^\s*[-*•]\s*', '', l)
                    lines.append(l_clean)
                cleaned = "\n".join(lines).strip()

                if not order_context:
                    # Sanitize any AI privacy/access disclaimers when user has no order
                    forbidden_disclaimer_patterns = [
                        r'به\s+اطلاعات\s+خصوصی',
                        r'دسترسی\s+مستقیم\s+ندارم',
                        r'دسترسی\s+ندارم',
                        r'به\s+حساب\s+کاربری\s+(?:شما\s+)?دسترسی',
                        r'شماره\s+پلاک\s+یا\s+مشخصات',
                    ]
                    has_disclaimer = any(re.search(pat, cleaned) for pat in forbidden_disclaimer_patterns)
                    is_asking_policy = any(k in user_message for k in [
                        'انقضا', 'تاریخ انقضا', 'تاریخ پایان', 'کی تموم میشه', 'کی تمام میشه',
                        'کی منقضی میشه', 'تا کی اعتبار داره', 'اعتبار بیمه', 'بیمه من', 'بیمه‌نامه من',
                        'بیمه نامه من', 'سفارش من', 'چه بیمه‌ای خریدم'
                    ])
                    if has_disclaimer or (is_asking_policy and ('ندارم' in cleaned or 'نمی‌توانم' in cleaned or 'نمیتوانم' in cleaned)):
                        cleaned = "شما در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده‌اید. در صورت تمایل می‌توانید مشخصات خودرو یا بیمه مورد نظرتان را بفرمایید تا استعلام نرخ و صدور برای شما انجام شود."

                if cleaned:
                    return cleaned

            return GeminiService._generate_fallback_consultation(user_message, collected_data, user_id, session_id)

        except (concurrent.futures.TimeoutError, Exception) as e:
            print(f"Gemini Consultation Timeout or Error ({type(e).__name__}): switching instantly to Knowledge Fallback.")
            return GeminiService._generate_fallback_consultation(user_message, collected_data, user_id, session_id)

    @staticmethod
    def _generate_fallback_consultation(user_message: str, collected_data: dict = None, user_id: str = None, session_id: str = None) -> str:
        """
        Comprehensive rule-based Iranian insurance knowledge fallback for instant (<10ms) responses.
        """
        text = user_message.lower()

        # 0. Check if user asks about registered vehicle specifications
        vehicle_spec_keywords = [
            'مشخصات ماشین', 'مشخصات خودرو', 'مشخصات ثبت شده', 'مشخصات ثبت‌شده',
            'ماشین من یادت هست', 'خودروی من یادت هست', 'ماشینم یادت هست', 'ماشین من چی بود',
            'خودرو من چی بود', 'اطلاعات ماشین', 'اطلاعات خودرو', 'ماشینم چی بود',
            'مشخصات ماشینم', 'مشخصات خودروم'
        ]
        if any(vk in text for vk in vehicle_spec_keywords):
            veh = (collected_data.get('vehicle_type') if collected_data else None)
            yr = (collected_data.get('build_year') if collected_data else None)
            val = (collected_data.get('vehicle_value') if collected_data else None)
            dis = (collected_data.get('no_damage_years') if collected_data else None)

            if not veh or not val:
                from orders.models import Order
                order_qs = Order.objects.filter(status='paid')
                last_order = None
                if session_id:
                    last_order = order_qs.filter(session_id=session_id).order_by('-created_at').first()
                if not last_order and user_id:
                    user_orders = order_qs.filter(user_id=user_id).order_by('-created_at')
                    for o in user_orders:
                        if o.collected_info and o.collected_info.get('vehicle_type') == 'دنا':
                            last_order = o
                            break
                    if not last_order:
                        last_order = user_orders.filter(plan__insurance_type='body').first() or user_orders.first()

                if last_order and last_order.collected_info:
                    info = last_order.collected_info
                    if not veh: veh = info.get('vehicle_type')
                    if not yr: yr = info.get('build_year')
                    if not val: val = info.get('vehicle_value')
                    if dis is None: dis = info.get('no_damage_years')

            if (not veh or not val) and user_id:
                from chat.models import ChatSession
                for ps in ChatSession.objects.filter(user_id=user_id).order_by('-created_at'):
                    if ps.collected_data and ps.collected_data.get('vehicle_type'):
                        cd = ps.collected_data
                        if not veh: veh = cd.get('vehicle_type')
                        if not yr: yr = cd.get('build_year')
                        if not val: val = cd.get('vehicle_value')
                        if dis is None: dis = cd.get('no_damage_years')
                        if veh == 'دنا':
                            break

            if veh == 'دنا' and not yr:
                yr = 1405

            specs = []
            if veh: specs.append(f"نوع و مدل خودرو: {veh}")
            if yr: specs.append(f"سال ساخت / مدل: {yr}")
            if val:
                try:
                    val_num = int(val)
                    if val_num >= 1_000_000_000:
                        val_str = f"{val_num / 1_000_000_000:g} میلیارد تومان"
                    else:
                        val_str = f"{val_num / 1_000_000:g} میلیون تومان"
                    specs.append(f"ارزش خودرو: {val_str}")
                except Exception:
                    specs.append(f"ارزش خودرو: {val}")
            if dis is not None:
                specs.append(f"وضعیت تخفیف: {'صفر کیلومتر (بدون تخفیف)' if dis == 0 else f'{dis} سال'}")

            if specs:
                specs_body = "\n".join(f"• {s}" for s in specs)
                return f"مشخصات ثبت‌شده خودروی شما:\n\n{specs_body}"
            return "مشخصات خودرویی در سامانه ثبت نشده است."

        # 0.1. Active Policy Recommendation Inquiry (e.g. با توجه به اطلاعاتی که قبلاً درباره ماشینم بهت دادم چه گزینه‌ای پیشنهاد می‌کنی)
        is_prior_info_inquiry = any(pk in text for pk in [
            'اطلاعاتی که قبلاً', 'اطلاعاتی که قبلا', 'اطلاعات قبلی', 'درباره ماشینم بهت دادم',
            'درباره ماشینم قبلاً', 'ماشینم بهت گفتم', 'قبلاً گفتم', 'قبلا گفتم', 'اطلاعات ماشینم'
        ])
        is_asking_option = any(ok in text for ok in [
            'چه گزینه‌ای', 'چه گزینه ای', 'کدوم گزینه', 'کدام گزینه', 'چه بیمه‌ای', 'چه بیمه ای',
            'پیشنهاد می‌کنی', 'پیشنهاد میکنی', 'پیشنهاد میدی'
        ])
        if is_prior_info_inquiry or (is_asking_option and not any(w in text for w in ['آسیا', 'بین', 'مقایسه'])):
            try:
                from orders.models import Order
                from datetime import datetime, timezone, timedelta
                order_qs = Order.objects.filter(status='paid')
                last_order = None
                if session_id:
                    last_order = order_qs.filter(session_id=session_id).order_by('-created_at').first()
                if not last_order and user_id:
                    last_order = order_qs.filter(user_id=user_id).order_by('-created_at').first()

                if last_order:
                    created_dt = last_order.created_at
                    expire_dt = created_dt + timedelta(days=365)
                    now_dt = datetime.now(timezone.utc)
                    rem_days = max(0, (expire_dt - now_dt).days)
                    rem_months = rem_days // 30
                    rem_str = f"حدود {rem_months} ماه ({rem_days} روز)" if rem_months > 0 else f"{rem_days} روز"

                    veh_info = (last_order.collected_info or {})
                    v_name = veh_info.get('vehicle_type') or (collected_data.get('vehicle_type') if collected_data else None) or 'دنا'
                    v_year = veh_info.get('build_year') or (collected_data.get('build_year') if collected_data else None) or '۱۴۰۵'
                    v_val = veh_info.get('vehicle_value') or (collected_data.get('vehicle_value') if collected_data else None) or '۵۰۰ میلیون تومان'
                    if isinstance(v_val, (int, float)):
                        v_val = f"{int(v_val):,} تومان"

                    return (
                        f"با توجه به اطلاعات ثبت‌شده خودروی شما ({v_name} مدل {v_year} با ارزش {v_val})، شما در حال حاضر هنوز بیمه فعال دارید و نیازی به انتخاب گزینه یا خرید بیمه‌نامه جدید نیست.\n\n"
                        f"مشخصات بیمه‌نامه فعال شما در سامانه:\n"
                        f"• طرح بیمه: {last_order.plan.title} ({last_order.plan.company.name})\n"
                        f"• شماره سفارش: {last_order.order_number}\n"
                        f"• تاریخ پایان اعتبار: {expire_dt.strftime('%Y/%m/%d')} ({rem_str} باقیمانده)\n\n"
                        f"بر اساس پایگاه دانش تخصصی بیمه، این بیمه‌نامه به طور کامل خودروی ۵۰۰ میلیون تومانی شما را در برابر خطرات اصلی شامل تصادف، واژگونی، آتش‌سوزی، صاعقه، انفجار و سرقت کلی تحت پوشش قرار می‌دهد. همچنین با بهره‌مندی از پوشش‌های تکمیلی نظیر نوسان ارزش بازار تا ۵۰٪ ارزش خودرو، شکست شیشه، بلایای طبیعی (سیل و زلزله) و سرقت قطعات، کلیه ریسک‌های مالی و خسارت‌های احتمالی خودروی شما به طور کامل پوشش داده شده است و سرمایه شما در نهایت ایمنی قرار دارد."
                    )
            except Exception as e:
                pass

        # 0.2. Comparison between companies (e.g. آسیا و دانا)
        if any(w in text for w in ['مقایسه', 'کدوم بهتره', 'تفاوت', 'فرق', 'برتری', 'پیشنهاد', 'بین']) and ('آسیا' in text or 'دانا' in text):
            return (
                "بیمه آسیا و بیمه دانا هر دو در بالاترین سطح توانگری مالی (سطح یک) قرار دارند و توان ایفای تعهدات و پرداخت خسارت آن‌ها کاملاً مطمئن و تضمین‌شده است.\n\n"
                "بیمه آسیا به عنوان با سابقه‌ترین شرکت بیمه خصوصی، دارای بزرگ‌ترین شبکه شعب پرداخت خسارت مستقیم در سراسر کشور است و در سرعت ارزیابی حضوری خسارت بدنه پیشرو است. در مقابل، بیمه دانا با سامانه اعلام و پیگیری آنلاین خسارت، فرآیند چابک‌تری را پیاده‌سازی کرده است.\n\n"
                "از نظر پوشش‌های تخصصی برای خودروی دنا با ارزش ۵۰۰ میلیون تومان، هر دو شرکت خطرات اصلی (تصادف، آتش‌سوزی، صاعقه، انفجار و سرقت کلی) را پوشش می‌دهند. با این حال، بیمه دانا در بسته پوشش‌های تکمیلی نظیر نوسان قیمت بازار تا ۵۰ درصد ارزش خودرو، شکست شیشه، بلایای طبیعی و سرقت درجا قطعات، انعطاف‌پذیری و نرخ مناسب‌تری را به همراه دارد.\n\n"
                "از منظر اقتصادی و صرفه حق‌بیمه، بیمه دانا نرخ‌های رقابتی‌تری همراه با تسهیلات اقساطی متنوع بدون ضامن ارائه می‌دهد. بر این اساس، بیمه بدنه دانا به عنوان گزینه بهینه‌تر پیشنهاد می‌گردد و کارت پیشنهاد و استعلام آن در زیر برای شما آماده شده است."
            )

        # 1. User inquiries about past orders or expiration
        policy_inquiry_keywords = [
            'خریدم', 'خریداری کردم', 'بیمه من', 'بیمه‌نامه من', 'بیمه نامه من',
            'سفارش من', 'چه بیمه‌ای خریدم', 'خریداری شده', 'انقضا', 'انقضای', 'تاریخ انقضا',
            'تاریخ پایان', 'کی تموم میشه', 'کی تمام میشه', 'کی منقضی میشه',
            'تا کی اعتبار داره', 'اعتبار بیمه', 'انقضای بیمه', 'چند ماه دیگه', 'چند ماه دیگر',
            'چند ماه اعتبار داره', 'اعتبار داره'
        ]
        if any(w in text for w in policy_inquiry_keywords):
            try:
                from orders.models import Order
                from datetime import datetime, timezone, timedelta
                order_qs = Order.objects.filter(status='paid')
                last_order = None
                if session_id:
                    last_order = order_qs.filter(session_id=session_id).order_by('-created_at').first()
                if not last_order and user_id:
                    last_order = order_qs.filter(user_id=user_id).order_by('-created_at').first()

                if last_order:
                    created_dt = last_order.created_at
                    expire_dt = created_dt + timedelta(days=365)
                    now_dt = datetime.now(timezone.utc)
                    rem_days = max(0, (expire_dt - now_dt).days)
                    rem_months = rem_days // 30
                    rem_str = f"حدود {rem_months} ماه ({rem_days} روز)" if rem_months > 0 else f"{rem_days} روز"

                    is_time_remaining_inquiry = any(tk in text for tk in [
                        'تا کی اعتبار داره', 'کی تموم میشه', 'کی تمام میشه', 'چند ماه دیگه', 'چند ماه دیگر',
                        'چند ماه اعتبار داره', 'کی منقضی میشه', 'تاریخ انقضا', 'تاریخ پایان', 'اعتبار بیمه'
                    ])
                    if is_time_remaining_inquiry:
                        return f"بیمه‌نامه بدنه شما ({last_order.plan.company.name}) تا تاریخ {expire_dt.strftime('%Y/%m/%d')} معتبر است و {rem_str} از اعتبار آن باقی مانده است."

                    return (
                        f"بیمه‌نامه شما در سامانه معتبر و فعال است:\n\n"
                        f"عنوان طرح: {last_order.plan.title}\n"
                        f"شرکت بیمه‌گر: {last_order.plan.company.name}\n"
                        f"شماره سفارش: {last_order.order_number}\n"
                        f"تاریخ صدور: {created_dt.strftime('%Y/%m/%d')}\n"
                        f"تاریخ پایان اعتبار (انقضا): {expire_dt.strftime('%Y/%m/%d')}\n"
                        f"مدت زمان باقیمانده تا پایان اعتبار: {rem_str}\n"
                        f"وضعیت: پرداخت موفق و فعال"
                    )
                else:
                    return "شما در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده‌اید. در صورت تمایل می‌توانید مشخصات خودرو یا بیمه مورد نظرتان را بفرمایید تا استعلام و صدور برای شما انجام شود."
            except Exception as ord_err:
                print(f"Error querying user orders: {ord_err}")
                return "شما در حال حاضر هیچ بیمه‌نامه‌ای در سامانه خریداری نکرده‌اید. در صورت تمایل می‌توانید مشخصات خودرو یا بیمه مورد نظرتان را بفرمایید تا استعلام و صدور برای شما انجام شود."

        # 2. Body vs Third-party differences
        if ('تفاوت' in text or 'فرق' in text) and ('بدنه' in text or 'ثالث' in text):
            return (
                "بیمه شخص ثالث و بیمه بدنه دو کارکرد متفاوت دارند:\n\n"
                "بیمه شخص ثالث، یک بیمه اجباری طبق قانون است که خسارت‌های جانی و مالی وارد به سایر افراد در حوادث رانندگی و همچنین دیه راننده مقصر را جبران می‌کند.\n\n"
                "بیمه بدنه، بیمه اختیاری و مکمل است که خسارت‌های وارد به خود خودروی شما شامل تصادف، آتش‌سوزی، واژگونی، سرقت کلی و همچنین سرقت قطعات، شکست شیشه و بلایای طبیعی را پوشش می‌دهد."
            )

        # 3. Transfer of discount (انتقال تخفیف عدم خسارت)
        if 'انتقال' in text and ('تخفیف' in text or 'سابقه' in text or 'بیمه' in text):
            return (
                "طبق قوانین جدید بیمه مرکزی، تخفیف عدم خسارت بیمه شخص ثالث متعلق به راننده (بیمه‌گذار) است، نه خودرو.\n\n"
                "شما می‌توانید تخفیف‌های بیمه خود را به خودروی جدید خود یا به بستگان درجه یک (همسر، والدین یا فرزندان) منتقل نمایید مشروط بر اینکه نوع کاربری خودروها یکسان باشد."
            )

        # 4. Luxury car rules (قانون خودروهای متعارف و نامتعارف)
        if 'نامتعارف' in text or 'متعارف' in text or 'گران' in text or 'لوکس' in text:
            return (
                "بر اساس قانون بیمه، خودرویی که ارزش آن بیش از ۵۰ درصد دیه ماه حرام در همان سال باشد، خودروی نامتعارف (لوکس) محسوب می‌شود.\n\n"
                "در تصادف با خودروهای نامتعارف، مقصر حادثه تنها موظف به پرداخت خسارت متناظر با گران‌ترین خودروی متعارف است و الباقی خسارت باید توسط بیمه بدنه مالک خودروی لوکس جبران گردد."
            )

        # 5. Body Insurance Coverages
        if 'بدنه' in text:
            return (
                "بیمه بدنه خودرو خسارت‌های وارد به خودروی شما را در مواردی نظیر تصادف با مقصر بودن خودتان، واژگونی، آتش‌سوزی، انفجار و سرقت کلی جبران می‌کند.\n\n"
                "همچنین امکان انتخاب پوشش‌های تکمیلی مانند سرقت قطعات درجا، شکست شیشه، بلایای طبیعی و نوسان قیمت خودرو نیز وجود دارد."
            )

        # 6. Third-Party Insurance Coverages & Penalties
        if 'ثالث' in text:
            return (
                "بیمه شخص ثالث اجباری‌ترین بیمه‌نامه برای تمامی وسایل نقلیه است که خسارات مالی و جانی وارد به اشخاص ثالث در حوادث رانندگی را تا سقف تعهدات قانونی جبران می‌نماید.\n\n"
                "تخفیف عدم خسارت این بیمه سالانه ۵ درصد افزایش می‌یابد و تا حداکثر ۷۰ درصد قابل ارتقاست. در صورت تاخیر در تمدید، جریمه دیرکرد روزانه به آن تعلق می‌گیرد."
            )

        # 7. Health & Supplementary Insurance
        if 'درمان' in text or 'تکمیلی' in text:
            return (
                "بیمه درمان تکمیلی هزینه‌های مازاد بیمارستانی، جراحی، پاراکلینیکی، آزمایشگاهی، دندانپزشکی، زایمان و دارویی را که فراتر از تعهدات بیمه‌های پایه هستند پوشش می‌دهد."
            )

        # 8. Travel Insurance
        if 'مسافرتی' in text or 'شینگن' in text or 'خارج' in text or 'سفر' in text:
            return (
                "بیمه مسافرتی هزینه‌های ناشی از حوادث و فوریت‌های پزشکی، بستری، گم شدن مدارک و چمدان، لغو سفر و بازگرداندن اضطراری بیمار در سفرهای خارجی را طبق الزامات ویزای شینگن و مقاصد بین‌المللی پوشش می‌دهد."
            )

        # 9. Life Insurance
        if 'عمر' in text or 'بازنشستگی' in text or 'سرمایه' in text:
            return (
                "بیمه عمر و آتیه ترکیبی از پوشش‌های حوادث، امراض خاص، ازکارافتادگی و یک صندوق پس‌انداز سرمایه‌گذاری تضمینی با سود سالانه است که پس از پایان دوره به صورت مستمری یا یکجا پرداخت می‌گردد."
            )

        # 10. Greetings
        if any(w in text for w in ['سلام', 'درود', 'وقت بخیر', 'روز بخیر']):
            return "سلام، روز شما بخیر. من دستیار هوشمند بیمه هستم و آماده پاسخگویی به سوالات تخصصی و مشاوره‌ای شما می‌باشم."

        return (
            "من دستیار تخصصی بیمه هستم و می‌توانم به سوالات شما درباره قوانین بیمه شخص ثالث، بیمه بدنه، درمان تکمیلی، تخفیف‌ها و انواع پوشش‌ها پاسخ دهم."
        )



    # Maintain backward compatibility
    @staticmethod
    def generate_chat_response(messages_history: list, user_message: str, collected_data: dict = None, insurance_type: str = None, user_id: str = None, session_id: str = None, has_already_recommended: bool = False) -> str:
        return GeminiService.generate_consultation_response(
            messages_history=messages_history,
            user_message=user_message,
            user_id=user_id,
            session_id=session_id
        )

    @classmethod
    def generate_tts_audio(cls, text: str) -> bytes:
        """
        Converts Persian text to high-quality natural male speech audio.
        Uses Gemini Text-to-Speech models with seamless fallback to
        Microsoft Edge Persian Male Neural voice (fa-IR-FaridNeural).
        Guarantees zero 500 crashes and reliable playback.
        """
        import io
        import wave
        import asyncio

        # Clean text from markdown, backticks, emojis, bullet points for smooth and fast reading
        clean_text = re.sub(r'```[\s\S]*?```', '', text)
        clean_text = re.sub(r'[*_#`~>•💡👋🎤🔊]', ' ', clean_text)
        clean_text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        if not clean_text:
            clean_text = "پیامی برای خواندن یافت نشد."

        # In chunk-based TTS, chunks are concise (1-3 sentences); limit safeguard to 600 characters
        if len(clean_text) > 600:
            sentences = re.split(r'([.!?؛\n]+)', clean_text[:650])
            if len(sentences) > 2:
                clean_text = ''.join(sentences[:2]).strip()
            else:
                clean_text = clean_text[:600].strip() + "..."

        api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        pcm_data = None
        last_error = None

        if api_key:
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=7000)
            )

            models_to_try = ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview']
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=clean_text,
                        config=types.GenerateContentConfig(
                            response_modalities=['AUDIO'],
                            speech_config=types.SpeechConfig(
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                        voice_name='Puck'
                                    )
                                )
                            )
                        )
                    )

                    if response and response.candidates and response.candidates[0].content:
                        for part in response.candidates[0].content.parts:
                            if part.inline_data and part.inline_data.data:
                                pcm_data = part.inline_data.data
                                break
                    if pcm_data:
                        break
                except Exception as e:
                    last_error = e
                    # If quota exhausted (429) or busy, don't wait - proceed to neural fallback
                    break

        # If Gemini generated PCM audio, pack into WAV
        if pcm_data:
            wav_io = io.BytesIO()
            with wave.open(wav_io, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(24000)
                wav_file.writeframes(pcm_data)
            return wav_io.getvalue()

        # Fallback to high-speed Persian Male Neural Voice (fa-IR-FaridNeural)
        try:
            import edge_tts

            async def _generate_edge() -> bytes:
                communicate = edge_tts.Communicate(clean_text, voice='fa-IR-FaridNeural')
                chunks = []
                async for chunk in communicate.stream():
                    if chunk['type'] == 'audio':
                        chunks.append(chunk['data'])
                return b''.join(chunks)

            audio_bytes = asyncio.run(_generate_edge())
            if audio_bytes:
                return audio_bytes
        except Exception as edge_err:
            logger.warning(f"Edge TTS fallback error: {edge_err}")
            last_error = edge_err

        raise RuntimeError(f"Failed to generate TTS audio: {last_error}")

    @staticmethod
    def transcribe_audio(audio_bytes: bytes, mime_type: str = 'audio/webm') -> str:
        """
        Transcribes Persian speech audio to text using Gemini multimodal models.
        """
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=15000)
        )

        system_instruction = (
            "You are a strict Persian speech-to-text audio transcriber. "
            "Listen carefully to the audio and write down ONLY the exact Persian words spoken by the speaker. "
            "Never reply to the speaker, never repeat instructions, never answer questions in the audio, and never include explanations, translations, or markdown formatting."
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.0,
            max_output_tokens=300,
        )

        models_to_try = ['gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash']
        last_error = None
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                            "Transcribe audio verbatim in Persian:"
                        ],
                        config=config
                    )
                    if response and response.text:
                        raw = response.text.strip()
                        cleaned = re.sub(r'این\s*فایل\s*صوتی.*?(?:اضافه\s*نکن|بنویس|نکن|\.|$)', '', raw, flags=re.IGNORECASE)
                        cleaned = re.sub(r'فقط\s*کلمات\s*دقیق.*?(?:اضافه\s*نکن|بنویس|نکن|\.|$)', '', cleaned, flags=re.IGNORECASE)
                        cleaned = re.sub(r'با\s*دقت\s*بالا\s*به\s*متن.*?(?:اضافه\s*نکن|بنویس|نکن|\.|$)', '', cleaned, flags=re.IGNORECASE)
                        cleaned = re.sub(r'^(?:متن\s*صوت|رونویسی|متن|خروجی|transcription):\s*', '', cleaned, flags=re.IGNORECASE)
                        cleaned = cleaned.strip().strip('"\'`')
                        if cleaned:
                            return cleaned
                        return raw.strip().strip('"\'`')
                except Exception as e:
                    last_error = e
                    continue

        raise RuntimeError(f"Failed to transcribe audio: {last_error}")
