import re
import time
import random
from datetime import datetime, timezone, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from services.gemini_service import GeminiService
from recommendation.models import InsurancePlan, Recommendation
from recommendation.serializers import InsurancePlanSerializer

from recommendation.engine import calculate_best_recommendation
from orders.models import Order
from orders.serializers import OrderSerializer

def get_insurance_question_prompt(insurance_type: str, preferred_company: str = None) -> str:
    company_phrase = f"شرکت {preferred_company}" if preferred_company else "سامانه"

    if insurance_type == 'body':
        return (
            f"برای محاسبه و صدور بهترین بیمه بدنه خودرو از {company_phrase}، لطفاً اطلاعات زیر را بفرمایید:\n\n"
            f"• مدل و تیپ دقیق خودرو (مثال: دنا پلاس، پژو ۲۰۷ دنده‌ای، هایما S7)\n"
            f"• سال ساخت خودرو (مثال: ۱۴۰۱)\n"
            f"• ارزش روز تقریبی خودرو در بازار (مثال: ۸۰۰ میلیون تومان)\n"
            f"• سابقه تخفیف عدم خسارت بیمه بدنه (مثال: ۲ سال)\n\n"
            f"راهنما: لطفاً اطلاعات فوق را به صورت تفکیک‌شده (در سطرهای جداگانه یا با کاما) ارسال بفرمایید تا دقیق‌ترین نرخ محاسبه شود."
        )
    elif insurance_type == 'fire':
        return (
            f"برای استعلام و صدور بهترین بیمه آتش‌سوزی و زلزله از {company_phrase}، لطفاً مشخصات ملک را بفرمایید:\n\n"
            f"• متراژ بنا و نوع کاربری ملک (مثال: آپارتمان مسکونی ۱۰۰ متری، مغازه، انبار)\n"
            f"• نوع اسکلت سازه ساختمان (اسکلت فلزی، بتنی، سنتی/آجری)\n"
            f"• ارزش تقریبی لوازم و اثاثیه (مثال: ۵۰۰ میلیون تومان)\n"
            f"• شهر و منطقه استقرار ملک\n\n"
            f"راهنما: لطفاً اطلاعات فوق را به صورت تفکیک‌شده (در سطرهای جداگانه یا با کاما) ارسال بفرمایید."
        )
    elif insurance_type == 'travel':
        return (
            f"برای استعلام و دریافت بهترین بیمه مسافرتی خارج از کشور از {company_phrase}، لطفاً اطلاعات سفر را بفرمایید:\n\n"
            f"• کشور یا حوزه مقصد سفر (مثال: کشورهای حوزه شینگن، ترکیه، گرجستان، دبی)\n"
            f"• مدت زمان سفر و اقامت (مثال: ۱۵ روزه، ۱ ماهه، ۳ ماهه یا شش ماهه)\n"
            f"• سن مسافر یا مسافران (مثال: ۳۲ سال)\n"
            f"• سقف تعهد مالی درخواستی (مثال: ۳۰,۰۰۰ یورو یا ۵۰,۰۰۰ یورو)\n\n"
            f"راهنما: لطفاً اطلاعات سفر را به صورت تفکیک‌شده (در سطرهای جداگانه یا با کاما) ارسال فرمایید."
        )
    elif insurance_type == 'life':
        return (
            f"برای محاسبه و انتخاب بهترین طرح بیمه عمر، بازنشستگی و سرمایه‌گذاری از {company_phrase}، لطفاً مشخصات زیر را بفرمایید:\n\n"
            f"• سن فرد متقاضی یا بیمه‌شده (مثال: ۳۰ سال)\n"
            f"• مدت زمان قرارداد بیمه‌نامه (مثال: ۱۰ ساله، ۲۰ ساله یا ۳۰ ساله)\n"
            f"• توان پرداخت حق‌بیمه (مثال: ماهانه ۱ میلیون یا سالانه ۱۲ میلیون تومان)\n"
            f"• اولویت شما (پس‌انداز و بازنشستگی یا پوشش امراض خاص و ازکارافتادگی)\n\n"
            f"راهنما: جهت بررسی و صدور دقیق‌تر، لطفاً مشخصات فوق را به صورت تفکیک‌شده (در سطرهای جداگانه یا با کاما) وارد نمایید و از نوشتن پیوسته و خطی خودداری فرمایید."
        )
    else:  # default 'third_party'
        return (
            f"برای استعلام و انتخاب بهترین طرح بیمه شخص ثالث از {company_phrase}، لطفاً مشخصات خودروی خود را بفرمایید تا دقیق‌ترین نرخ محاسبه شود:\n\n"
            f"• مدل و نوع خودرو (مثال: پراید ۱۳۱، پژو ۲۰۶، دنا و...)\n"
            f"• سال ساخت خودرو (مثال: ۱۳۹۸)\n"
            f"• شهر محل سکونت/پلاک (مثال: تهران)\n"
            f"• سابقه تخفیف عدم خسارت (مثال: ۳ سال)\n\n"
            f"راهنما: لطفاً اطلاعات خودرو را به صورت تفکیک‌شده (در سطرهای جداگانه یا با کاما) ارسال بفرمایید."
        )



def check_has_sufficient_info(target_type: str, data: dict) -> bool:
    if target_type == 'body':
        return bool(data.get('vehicle_type') or data.get('build_year') or data.get('vehicle_value'))
    elif target_type == 'fire':
        return bool(data.get('property_type') or data.get('building_area') or data.get('property_value') or data.get('structure_type') or data.get('city'))
    elif target_type == 'travel':
        return bool(data.get('destination') or data.get('travel_duration') or data.get('traveler_age'))
    elif target_type == 'life':
        return bool(data.get('insured_age') or data.get('contract_years') or data.get('payment_ability'))
    else:  # third_party or other
        return bool(data.get('vehicle_type') or data.get('build_year'))


def extract_insurance_parameters(text: str, current_data: dict = None) -> tuple:
    data = current_data.copy() if current_data else {}
    current_type = data.get('insurance_type')

    # 1. Insurance Type Detection
    if 'بدنه' in text:
        current_type = 'body'
    elif any(k in text for k in ['شخص ثالث', 'ثالث']):
        current_type = 'third_party'
    elif any(k in text for k in ['آتش سوزی', 'آتش‌سوزی', 'آتش', 'زلزله', 'منزل', 'آپارتمان', 'ساختمان', 'ویلا', 'مغازه', 'ملک']):
        current_type = 'fire'
    elif any(k in text for k in ['مسافرتی', 'مسافرت', 'شینگن', 'سفر', 'خارج از کشور']):
        current_type = 'travel'
    elif any(k in text for k in ['عمر', 'بازنشستگی', 'سرمایه‌گذاری', 'سرمایه گذاری', 'پس انداز', 'پس‌انداز', 'آتیه']):
        current_type = 'life'
    elif 'درمان' in text or 'تکمیلی' in text:
        current_type = 'health'

    # 2. Preferred & Excluded Company Detection
    company_keywords = [
        'ایران', 'دانا', 'آسیا', 'معلم', 'سامان',
        'رازی', 'نوین', 'پاسارگاد', 'البرز', 'کوثر', 'پارسیان', 'سینا', 'دی', 'کارآفرین', 'بیمه ما', 'ملت'
    ]

    comparison_keywords = [
        'مقایسه', 'مقایسه‌', 'مقایسه کن', 'مقایسشون', 'مقایسه‌شون',
        'کدوم بهتره', 'کدام بهتر است', 'کدوم شرکت بهتره', 'کدام شرکت بهتر است',
        'تفاوت', 'فرق', 'برتری', 'کدوم رو انتخاب کنم', 'کدوم رو پیشنهاد',
        'کدام رو پیشنهاد', 'پیشنهاد میکنی', 'پیشنهاد می‌کنی', 'نظرت چیه',
        'بین', 'کدومش بهتره', 'کدامش بهتره'
    ]
    is_comparison_query = any(ck in text for ck in comparison_keywords)

    excluded_list = list(data.get('excluded_companies', []))
    for ck in company_keywords:
        negation_match = re.search(rf'(?:به\s*جز|به\s*غیر\s*از|بجز|غیر\s*از|بدون)\s*(?:شرکت\s*)?(?:بیمه\s*)?{ck}\b', text) or \
                         re.search(rf'\b{ck}\s*(?:رو\s*)?(?:نمی\s*خوام|نمیخوام|نمی\s*خواهم|نمیخواهم|نباشه|نباشد|دوست\s*ندارم)\b', text) or \
                         re.search(rf'(?:شرکت\s*)?{ck}\s*(?:نمی\s*خوام|نمیخوام|نمی\s*خواهم|نمیخواهم)\b', text)
        if negation_match:
            clean_ck = ck.replace('بیمه ', '')
            if clean_ck not in excluded_list:
                excluded_list.append(clean_ck)
            if data.get('preferred_company') == clean_ck:
                data.pop('preferred_company', None)

    mentioned_comps = [
        ck.replace('بیمه ', '') for ck in company_keywords
        if re.search(rf'(?:بیمه\s+)?(?<![^\s،.!?]){re.escape(ck.replace("بیمه ", ""))}(?![^\s،.!?])', text)
        and ck.replace('بیمه ', '') not in excluded_list
    ]
    asks_rec_in_comp = is_comparison_query and any(rk in text for rk in [
        'کدوم رو پیشنهاد', 'کدام رو پیشنهاد', 'پیشنهاد میکنی', 'پیشنهاد می‌کنی', 'پیشنهاد میدی',
        'می‌خوام بیمه', 'میخوام بیمه', 'بگیرم', 'بخرم', 'کارت خرید', 'کارت پیشنهاد', 'کدوم رو بخرم'
    ])
    if is_comparison_query or len(mentioned_comps) >= 2:
        if mentioned_comps:
            data['comparison_companies'] = mentioned_comps
        if asks_rec_in_comp:
            data['preferred_company'] = 'دانا' if 'دانا' in mentioned_comps else (mentioned_comps[0] if mentioned_comps else None)
        else:
            data.pop('preferred_company', None)
    elif mentioned_comps:
        data['preferred_company'] = mentioned_comps[0]

    if any(phrase in text for phrase in ['شرکت دیگه', 'شرکت دیگری', 'گزینه دیگه', 'یه شرکت دیگه', 'یک شرکت دیگر']):
        current_pref = data.get('preferred_company')
        if current_pref and current_pref not in excluded_list:
            excluded_list.append(current_pref)
            data.pop('preferred_company', None)

    data['excluded_companies'] = excluded_list

    # Helper for converting Persian digits to English
    fa_digits = '۰۱۲۳۴۵۶۷۸۹'
    en_digits = '0123456789'
    trans_table = str.maketrans(''.join(fa_digits), ''.join(en_digits))
    normalized_text = text.translate(trans_table)

    # 3. Vehicle Value Extraction (e.g. ۵۰۰ میلیون تومان، 1 میلیارد)
    val_match = re.search(r'(?:قیمت|ارزش|مبلغ)?\s*(\d+)\s*(میلیارد|میلیون|همت)', normalized_text)
    if val_match:
        num = int(val_match.group(1))
        unit = val_match.group(2)
        if unit in ['میلیارد', 'همت']:
            data['vehicle_value'] = num * 1_000_000_000
        else:
            data['vehicle_value'] = num * 1_000_000

    # 4. Vehicle Model Extraction
    vehicles = [
        'پراید ۱۳۱', 'پراید 131', 'پراید ۱۱۱', 'پراید 111', 'پراید ۱۳۲', 'پراید 132', 'پراید ۱۴۱', 'پراید 141', 'پراید ۱۵۱', 'پراید 151', 'پراید',
        'پژو ۲۰۶', 'پژو 206', 'پژو ۲۰۷', 'پژو 207', 'پژو پارس', 'پژو ۴۰۵', 'پژو 405', 'پژو روآ', 'پژو آردی',
        'سمند سورن', 'سمند lx', 'سمند', 'دنا پلاس', 'دنا', 'تارا', 'رانا', 'کوییک', 'کوییک r', 'تیبا ۲', 'تیبا 2', 'تیبا', 'ساینا', 'شاهین',
        'چانگان', 'جک s5', 'هایما s7', 'ام وی ام', 'فونیکس', 'فیدلیتی', 'دیگنیتی', 'لاماری',
        'تویوتا کمری', 'تویوتا کرولا', 'هیوندای سانتافه', 'هیوندای سوناتا', 'کیا اپتیما', 'کیا سراتو', 'بنز', 'بی ام و', 'رنو ال ۹۰', 'تندر ۹۰', 'ساندرو'
    ]
    for v in vehicles:
        if v in text:
            data['vehicle_type'] = v
            break

    # 4. Build Year Extraction
    clean_text = normalized_text
    if data.get('vehicle_type'):
        clean_text = clean_text.replace(data['vehicle_type'], '')

    year_match = re.search(r'\b(13\d{2}|14\d{2})\b', clean_text)
    if year_match:
        data['build_year'] = int(year_match.group(1))
    else:
        year_short_match = re.search(r'(?:مدل|سال)\s*(\d{2})\b', clean_text)
        if year_short_match:
            y = int(year_short_match.group(1))
            data['build_year'] = 1300 + y if y >= 50 else 1400 + y

    # 5. City Extraction
    cities = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم', 'کرمانشاه', 'ارومیه', 'رشت', 'زاهدان', 'همدان', 'کرمان', 'یزد', 'اردبیل', 'بندرعباس', 'قزوین', 'زنجان', 'ساری', 'گرگان', 'خرم‌آباد', 'سنندج', 'بوشهر', 'اراک', 'بیرجند', 'سمنان']
    for c in cities:
        if c in text:
            data['city'] = c
            break

    # 6. Discount Years Extraction (0 to 20)
    text_for_discount = clean_text
    if data.get('build_year'):
        text_for_discount = text_for_discount.replace(str(data['build_year']), '')
        text_for_discount = text_for_discount.replace(str(data['build_year'] % 100), '')

    for model_num in ['111', '131', '132', '141', '151', '206', '207', '405']:
        text_for_discount = text_for_discount.replace(model_num, '')

    discount_match = re.search(r'(\d{1,2})\s*(?:سال\s*(?:عدم\s*خسارت|تخفیف|سابقه)|سال\b)', text_for_discount)
    if discount_match:
        val = int(discount_match.group(1))
        if 0 <= val <= 20:
            data['no_damage_years'] = val
    elif 'صفر' in text or 'بدون تخفیف' in text or 'سال اول' in text:
        data['no_damage_years'] = 0

    # 7. Fire Insurance Extractions (Area, Value, Structure)
    area_match = re.search(r'(\d+)\s*(?:متر|متری|مترمربع)', text)
    if area_match:
        data['building_area'] = int(area_match.group(1))

    for p_type in ['آپارتمان', 'ویلایی', 'مغازه', 'تجاری', 'مسکونی', 'انبار', 'کارگاه']:
        if p_type in text:
            data['property_type'] = p_type
            break

    for s_type in ['اسکلت فلزی', 'بتنی', 'اسکلت بتنی', 'آجری', 'سنتی', 'سنگی']:
        if s_type in text:
            data['structure_type'] = s_type
            break

    # 8. Travel Insurance Extractions (Destination, Duration, Age)
    destinations = ['شینگن', 'اروپا', 'ترکیه', 'گرجستان', 'امارات', 'دبی', 'ارمنستان', 'کانادا', 'آلمان', 'فرانسه', 'ایتالیا', 'عراق', 'تایلند']
    for dest in destinations:
        if dest in text:
            data['destination'] = dest
            break

    travel_dur_match = re.search(r'(\d+)\s*(?:روزه|روز|ماهه|ماه)', text)
    if travel_dur_match:
        data['travel_duration'] = travel_dur_match.group(0)

    # 9. Life Insurance Extractions (Age, Duration)
    age_match = re.search(r'(?:سن|ساله|سنم)\s*(\d{1,2})', text) or re.search(r'(\d{1,2})\s*ساله', text)
    if age_match:
        data['insured_age'] = int(age_match.group(1))

    contract_match = re.search(r'(\d{1,2})\s*ساله', text)
    if contract_match and not data.get('insured_age'):
        data['contract_years'] = int(contract_match.group(1))

    return current_type, data




class CreateSessionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        insurance_type = request.data.get('insurance_type')
        session = ChatSession.objects.create(
            user=user,
            insurance_type=insurance_type,
            title="مشاوره و خرید بیمه هوشمند"
        )
        welcome_content = (
            "سلام.\n\n"
            "من دستیار هوشمند خرید و مشاوره بیمه هستم.\n"
            "می‌توانید سوالات مشاوره‌ای خود را بپرسید یا برای مشاهده بهترین پیشنهاد و خرید آنلاین بیمه‌نامه اقدام فرمایید."
        )

        ChatMessage.objects.create(
            session=session,
            role='assistant',
            content=welcome_content
        )
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SessionListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        if user:
            sessions = ChatSession.objects.filter(user=user, messages__role='user').distinct().order_by('-updated_at')
        else:
            sessions = ChatSession.objects.none()
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SessionDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.prefetch_related('messages').get(id=session_id)
            return Response(ChatSessionSerializer(session).data, status=status.HTTP_200_OK)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'نشست گفتگو یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id)
            new_title = request.data.get('title', '').strip()
            if new_title:
                session.title = new_title
                session.save()
            serializer = ChatSessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'نشست گفتگو یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id)
            session.delete()
            return Response({'detail': 'گفتگو با موفقیت حذف گردید.'}, status=status.HTTP_200_OK)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'نشست گفتگو یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)


class SendMessageView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        user_text = request.data.get('message', '').strip()

        if not user_text:
            return Response({'detail': 'متن پیام الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        if not session_id:
            session = ChatSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                title="گفتگوی هوشمند"
            )
        else:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                session = ChatSession.objects.create(
                    id=session_id,
                    user=request.user if request.user.is_authenticated else None,
                    title="گفتگوی هوشمند"
                )

        if request.user.is_authenticated and not session.user:
            session.user = request.user
            session.save()

        # 1. Save User Message
        user_message_obj = ChatMessage.objects.create(
            session=session,
            role='user',
            content=user_text
        )

        # 2. Extract any vehicle and company parameters into session
        ins_type, updated_data = extract_insurance_parameters(user_text, session.collected_data)
        if ins_type:
            session.insurance_type = ins_type
        session.collected_data = updated_data
        session.save()

        # Check if there is already a paid order in this session or for this user (for consultation context)
        session_paid_orders = Order.objects.filter(session_id=str(session.id), status='paid').select_related('plan', 'plan__company').order_by('-created_at')
        user_paid_orders = Order.objects.filter(user=request.user, status='paid').select_related('plan', 'plan__company').order_by('-created_at') if request.user.is_authenticated else Order.objects.none()

        last_paid_order = session_paid_orders.first() or user_paid_orders.first()

        # Check if user inquiry is about existing insurance or expiration date
        order_inquiry_keywords = [
            'خریدم', 'خریداری کردم', 'خریداری شده', 'بیمه من', 'بیمه‌نامه من', 'بیمه ام', 'بیمه‌ام',
            'سفارش من', 'چه بیمه‌ای خریدم', 'چه بیمه ای خریدم', 'ثبت شده',
            'ثبت شد', 'پرداخت کردم', 'پرداخت شده', 'وضعیت سفارش', 'وضعیت بیمه',
            'کی صادر میشه', 'چطور صادر میشه', 'شماره سفارش', 'رسید پرداخت',
            'انقضا', 'انقضای', 'تاریخ انقضا', 'تاریخ پایان', 'کی تموم میشه', 'کی تمام میشه',
            'کی منقضی میشه', 'تا کی اعتبار داره', 'اعتبار بیمه', 'انقضای بیمه',
            'چند ماه دیگه', 'چند ماه دیگر', 'چند ماه اعتبار داره', 'اعتبار داره'
        ]
        is_order_inquiry = any(ik in user_text.lower() for ik in order_inquiry_keywords)

        # 3. Detect Buy Intent vs Consultation vs Company Change Request
        is_buy, detected_type, is_comparison = GeminiService.detect_buy_intent(user_text)

        # Check if user query is asking for recommendation/purchase card directly in comparison
        asks_rec_card_in_comparison = is_comparison and any(rk in user_text for rk in [
            'کدوم رو پیشنهاد', 'کدام رو پیشنهاد', 'پیشنهاد میکنی', 'پیشنهاد می‌کنی', 'پیشنهاد میدی',
            'می‌خوام بیمه', 'میخوام بیمه', 'بگیرم', 'بخرم', 'کارت خرید', 'کارت پیشنهاد', 'کدوم رو بخرم'
        ])

        # Check if user query is an inquiry about prior vehicle specs or active policy recommendation
        is_prior_info_inquiry = any(pk in user_text for pk in [
            'اطلاعاتی که قبلاً', 'اطلاعاتی که قبلا', 'اطلاعات قبلی', 'درباره ماشینم بهت دادم',
            'درباره ماشینم قبلاً', 'ماشینم بهت گفتم', 'قبلاً گفتم', 'قبلا گفتم', 'اطلاعات ماشینم'
        ])
        is_asking_option = any(ok in user_text for ok in [
            'چه گزینه‌ای', 'چه گزینه ای', 'کدوم گزینه', 'کدام گزینه', 'چه بیمه‌ای', 'چه بیمه ای',
            'پیشنهاد می‌کنی', 'پیشنهاد میکنی', 'پیشنهاد میدی'
        ])

        # Active Policy Protection:
        user_wants_new_insurance = any(nk in user_text for nk in [
            'بیمه جدید', 'بیمه دیگر', 'بیمه دیگه', 'یک بیمه دیگه', 'یه بیمه دیگه', 'طرح دیگر', 'طرح دیگه', 'خرید مجدد'
        ])
        has_active_policy = False
        if last_paid_order:
            from datetime import timedelta
            order_exp = last_paid_order.created_at + timedelta(days=365)
            if order_exp > datetime.now(timezone.utc):
                has_active_policy = True

        is_active_policy_consultation = has_active_policy and not user_wants_new_insurance and (
            is_prior_info_inquiry or (is_asking_option and not asks_rec_card_in_comparison and not ('دنا' in user_text and 'ارزش' in user_text))
        )

        # Check if user is confirming or choosing a company after a previous comparison
        has_pending_comparison = bool(session.collected_data.get('pending_comparison'))
        confirmed_from_comparison = False

        if has_pending_comparison and not is_comparison and not is_order_inquiry and not is_active_policy_consultation:
            confirm_keywords = [
                'تایید', 'تأیید', 'اوکی', 'بله', 'همین', 'کارت', 'خرید', 'صدور',
                'بریم', 'انتخاب', 'میخوام', 'می‌خوام', 'صادر کن', 'همینو', 'خوبه',
                'پیشنهاد', 'کارت خرید', 'کارت پیشنهاد', 'می‌خوام بخرم', 'میخوام بخرم',
                'خریدارم', 'میخرم', 'می‌خرم', 'خریداری', 'باشه', 'حله'
            ]
            comparison_companies = session.collected_data.get('comparison_companies', [])

            # Check if user explicitly mentioned one of the compared companies (safe boundary matching)
            selected_comp = None
            for comp in comparison_companies:
                if re.search(rf'(?:بیمه\s+)?(?<![^\s،.!?]){re.escape(comp)}(?![^\s،.!?])', user_text):
                    selected_comp = comp
                    break

            if not selected_comp:
                known_comps = ['دانا', 'آسیا', 'ایران', 'معلم', 'سامان', 'رازی', 'نوین', 'پاسارگاد', 'البرز', 'کوثر', 'پارسیان', 'سینا', 'دی', 'کارآفرین', 'بیمه ما', 'ملت']
                for comp in known_comps:
                    if re.search(rf'(?:بیمه\s+)?(?<![^\s،.!?]){re.escape(comp)}(?![^\s،.!?])', user_text):
                        selected_comp = comp
                        break

            is_confirming = bool(selected_comp) or any(ck in user_text for ck in confirm_keywords)

            if is_confirming:
                is_buy = True
                confirmed_from_comparison = True
                if selected_comp:
                    session.collected_data['preferred_company'] = selected_comp
                elif comparison_companies and not session.collected_data.get('preferred_company'):
                    session.collected_data['preferred_company'] = comparison_companies[0]

                session.collected_data.pop('pending_comparison', None)
                session.save()
        elif is_comparison:
            if asks_rec_card_in_comparison:
                is_buy = True
                session.collected_data['pending_comparison'] = True
                comp_list = session.collected_data.get('comparison_companies', [])
                if not session.collected_data.get('preferred_company'):
                    session.collected_data['preferred_company'] = 'دانا' if 'دانا' in comp_list else (comp_list[0] if comp_list else None)
                session.save()
            else:
                is_buy = False
                session.collected_data['pending_comparison'] = True
                session.save()
        elif is_order_inquiry or is_active_policy_consultation:
            session.collected_data.pop('pending_comparison', None)
            session.save()

        # If user explicitly specifies a vehicle or insurance purchase request, keep is_buy True
        if any(w in user_text for w in ['خریدارم', 'میخرم', 'می‌خرم', 'بگیرم', 'بخرم']) and not is_comparison and not is_order_inquiry and not is_active_policy_consultation:
            is_buy = True

        # Suppress buy if active policy consultation or order inquiry or paid in this current session
        if is_order_inquiry or is_active_policy_consultation or (session_paid_orders.exists() and not user_wants_new_insurance):
            is_buy = False
            confirmed_from_comparison = False

        wants_company_change = any(
            phrase in user_text for phrase in [
                'شرکت دیگه', 'شرکت دیگری', 'بیمه دیگه', 'گزینه دیگه', 'گزینه دیگری',
                'طرح دیگه', 'طرح دیگری', 'پیشنهاد دیگه', 'پیشنهاد دیگری', 'عوض کن',
                'تغییر بده', 'یه شرکت دیگه', 'یک شرکت دیگر', 'به جز', 'بجز', 'غیر از', 'نمیخوام', 'نمی‌خوام'
            ]
        )

        if wants_company_change:
            last_rec = Recommendation.objects.filter(session_id=str(session.id)).order_by('-created_at').first()
            if last_rec and last_rec.plan and last_rec.plan.company:
                comp_name = last_rec.plan.company.name.replace('بیمه ', '').strip()
                ex_list = list(session.collected_data.get('excluded_companies', []))
                if comp_name not in ex_list:
                    ex_list.append(comp_name)
                session.collected_data['excluded_companies'] = ex_list
                if session.collected_data.get('preferred_company') == comp_name:
                    session.collected_data.pop('preferred_company', None)
                session.save()

        # Dynamic title assignment and insurance type resolution
        target_type = detected_type or ins_type or session.insurance_type
        if target_type:
            session.insurance_type = target_type
            session.save()

        # Update Session Title accurately based on current insurance topic
        new_title = None
        if target_type == 'life' or any(k in user_text for k in ['عمر', 'بازنشستگی', 'سرمایه‌گذاری', 'سرمایه گذاری']):
            new_title = 'بیمه عمر و سرمایه‌گذاری'
        elif target_type == 'fire' or any(k in user_text for k in ['آتش سوزی', 'آتش‌سوزی', 'زلزله']):
            new_title = 'بیمه آتش‌سوزی و زلزله'
        elif target_type == 'travel' or any(k in user_text for k in ['مسافرتی', 'مسافرت', 'شینگن']):
            dest = session.collected_data.get('destination')
            new_title = f"بیمه مسافرتی {dest}" if dest else "بیمه مسافرتی خارج از کشور"
        elif target_type == 'body' or 'بدنه' in user_text:
            veh = session.collected_data.get('vehicle_type')
            new_title = f"بیمه بدنه {veh}" if veh else "بیمه بدنه خودرو"
        elif target_type == 'third_party' or any(k in user_text for k in ['شخص ثالث', 'ثالث']):
            veh = session.collected_data.get('vehicle_type')
            new_title = f"بیمه شخص ثالث {veh}" if veh else "بیمه شخص ثالث خودرو"

        if new_title:
            default_titles = ["مشاوره و خرید بیمه هوشمند", "گفتگوی هوشمند", "بیمه شخص ثالث خودرو", "بیمه هوشمند"]
            # If current title is generic/default or user switched to a specific insurance type like life/fire/travel
            if session.title in default_titles or detected_type:
                session.title = new_title
                session.save()

        # Effective type for recommendation calculation
        calc_type = target_type or 'third_party'

        # Check if specifications are provided for this insurance type
        has_sufficient_info = check_has_sufficient_info(calc_type, session.collected_data)

        # Check if previous assistant message asked for info
        last_assistant_msg = session.messages.filter(role='assistant').order_by('-created_at').first()
        is_answering_info = last_assistant_msg and last_assistant_msg.metadata.get('step') == 'ASK_INFO' and has_sufficient_info

        is_requesting_company_change = wants_company_change or bool(session.collected_data.get('excluded_companies'))

        if is_buy or is_answering_info or is_requesting_company_change:
            if not has_sufficient_info and not is_requesting_company_change:
                # Ask tailored questions for the specific insurance type
                pref_company = session.collected_data.get('preferred_company')
                content_text = get_insurance_question_prompt(calc_type, pref_company)
                assistant_message_obj = ChatMessage.objects.create(
                    session=session,
                    role='assistant',
                    content=content_text,
                    metadata={'step': 'ASK_INFO', 'target_type': calc_type}
                )
            else:
                # Calculate single best recommendation (filtered by company if specified or excluding rejected companies)
                recommendation_obj = calculate_best_recommendation(
                    insurance_type=calc_type,
                    collected_data=session.collected_data,
                    user=request.user if request.user.is_authenticated else None,
                    session_id=str(session.id)
                )

                pref_company = session.collected_data.get('preferred_company')
                excluded_list = session.collected_data.get('excluded_companies', [])

                if asks_rec_card_in_comparison:
                    history_msgs = session.messages.all().order_by('created_at')
                    history_list = [{'role': m.role, 'content': m.content} for m in history_msgs]
                    user_id_str = str(request.user.id) if request.user.is_authenticated else None

                    content_text = GeminiService.generate_consultation_response(
                        messages_history=history_list,
                        user_message=user_text,
                        collected_data=session.collected_data,
                        user_id=user_id_str,
                        session_id=str(session.id),
                        order_context=None
                    )
                elif confirmed_from_comparison:
                    comp_name = recommendation_obj.plan.company.name
                    veh_name = session.collected_data.get('vehicle_type', 'خودروی شما')
                    content_text = f"بر اساس تایید و انتخاب شما، کارت پیشنهاد و خرید بیمه بدنه {comp_name} برای {veh_name} در زیر آماده گردید. لطفاً مشخصات را بررسی و جهت صدور بیمه‌نامه اقدام فرمایید:"
                elif is_requesting_company_change and excluded_list:
                    excl_str = ' و '.join(excluded_list)
                    content_text = f"بر اساس درخواست شما، شرکت {excl_str} کنار گذاشته شد و طرح «{recommendation_obj.plan.title}» متعلق به شرکت {recommendation_obj.plan.company.name} به عنوان گزینه جایگزین انتخاب گردید:"
                elif pref_company:
                    if calc_type == 'fire':
                        content_text = f"مشخصات ملک ثبت گردید. بر اساس درخواست شما برای شرکت بیمه {pref_company}، بهترین طرح بیمه آتش‌سوزی در کارت زیر انتخاب و محاسبه گردید:"
                    elif calc_type == 'travel':
                        dest = session.collected_data.get('destination', 'سفر شما')
                        content_text = f"اطلاعات سفر به {dest} ثبت گردید. بر اساس درخواست شما برای شرکت بیمه {pref_company}، بهترین طرح بیمه مسافرتی در کارت زیر انتخاب و محاسبه گردید:"
                    elif calc_type == 'life':
                        content_text = f"مشخصات بیمه‌شده ثبت گردید. بر اساس درخواست شما برای شرکت بیمه {pref_company}، بهترین طرح بیمه عمر در کارت زیر انتخاب و محاسبه گردید:"
                    else:
                        veh_name = session.collected_data.get('vehicle_type', 'خودروی شما')
                        content_text = f"مشخصات {veh_name} ثبت گردید. بر اساس درخواست شما برای شرکت بیمه {pref_company}، بهترین طرح متناسب با شرایط خودروی شما در کارت زیر انتخاب و محاسبه گردید:"
                else:
                    if calc_type == 'fire':
                        content_text = f"مشخصات ملک ثبت گردید. بهترین طرح بیمه آتش‌سوزی و زلزله متناسب با شرایط شما در کارت زیر انتخاب و محاسبه گردید:"
                    elif calc_type == 'travel':
                        dest = session.collected_data.get('destination', 'سفر شما')
                        content_text = f"اطلاعات مقصد {dest} ثبت گردید. مناسب‌ترین طرح بیمه مسافرتی در کارت زیر انتخاب و محاسبه گردید:"
                    elif calc_type == 'life':
                        content_text = f"مشخصات متقاضی ثبت گردید. بهترین طرح بیمه عمر و سرمایه‌گذاری متناسب با شرایط شما در کارت زیر انتخاب و محاسبه گردید:"
                    elif calc_type == 'body':
                        veh_name = session.collected_data.get('vehicle_type', 'خودروی شما')
                        content_text = f"مشخصات {veh_name} ثبت گردید. بهترین طرح بیمه بدنه خودرو در کارت زیر انتخاب و محاسبه گردید:"
                    else:
                        veh_name = session.collected_data.get('vehicle_type', 'خودروی شما')
                        content_text = f"مشخصات {veh_name} ثبت گردید. بهترین طرح بیمه شخص ثالث در کارت زیر انتخاب و محاسبه گردید:"

                assistant_message_obj = ChatMessage.objects.create(
                    session=session,
                    role='assistant',
                    content=content_text,
                    recommendation=recommendation_obj,
                    metadata={'step': 'RECOMMENDATION'}
                )

        else:
            # Route to Consultation: Graphiti / Neo4j + Gemini
            history_msgs = session.messages.all().order_by('created_at')
            history_list = [{'role': m.role, 'content': m.content} for m in history_msgs]
            user_id_str = str(request.user.id) if request.user.is_authenticated else None

            order_ctx_str = None
            if last_paid_order:
                from datetime import timedelta
                created_dt = last_paid_order.created_at
                expire_dt = created_dt + timedelta(days=365)
                now_dt = datetime.now(timezone.utc)
                rem_days = max(0, (expire_dt - now_dt).days)
                rem_months = rem_days // 30
                rem_str = f"حدود {rem_months} ماه ({rem_days} روز)" if rem_months > 0 else f"{rem_days} روز"
                order_ctx_str = (
                    f"شماره سفارش: {last_paid_order.order_number}\n"
                    f"طرح بیمه: {last_paid_order.plan.title}\n"
                    f"شرکت بیمه‌گر: {last_paid_order.plan.company.name}\n"
                    f"نوع بیمه: {last_paid_order.plan.get_insurance_type_display()}\n"
                    f"مبلغ پرداخت‌شده: {int(last_paid_order.total_price):,} تومان\n"
                    f"وضعیت: پرداخت موفق و معتبر\n"
                    f"سقف تعهد مالی: {int(last_paid_order.plan.coverage_amount):,} تومان\n"
                    f"تاریخ صدور (خرید): {created_dt.strftime('%Y/%m/%d')}\n"
                    f"تاریخ پایان اعتبار (انقضا): {expire_dt.strftime('%Y/%m/%d')}\n"
                    f"مدت زمان باقیمانده تا پایان اعتبار: {rem_str}"
                )

            ai_response = GeminiService.generate_consultation_response(
                messages_history=history_list,
                user_message=user_text,
                collected_data=session.collected_data,
                user_id=user_id_str,
                session_id=str(session.id),
                order_context=order_ctx_str
            )

            metadata_step = 'CONSULTATION' if (is_active_policy_consultation or is_order_inquiry) else ('COMPARISON' if is_comparison else 'CONSULTATION')
            assistant_message_obj = ChatMessage.objects.create(
                session=session,
                role='assistant',
                content=ai_response,
                metadata={'step': metadata_step}
            )

        return Response({
            'user_message': ChatMessageSerializer(user_message_obj).data,
            'assistant_message': ChatMessageSerializer(assistant_message_obj).data,
            'session': ChatSessionSerializer(session).data
        }, status=status.HTTP_200_OK)


class SelectPlanView(APIView):
    """
    Called when user selects a plan or proceeds from recommendation.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        plan_id = request.data.get('plan_id')

        if not plan_id:
            return Response({'detail': 'شناسه طرح بیمه الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = InsurancePlan.objects.select_related('company').prefetch_related('coverages').get(id=plan_id, is_active=True)
        except InsurancePlan.DoesNotExist:
            return Response({'detail': 'طرح بیمه مورد نظر یافت نشد یا غیرفعال است.'}, status=status.HTTP_404_NOT_FOUND)

        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                session = ChatSession.objects.create(id=session_id, user=request.user if request.user.is_authenticated else None)
        else:
            session = ChatSession.objects.create(user=request.user if request.user.is_authenticated else None)

        session.insurance_type = plan.insurance_type
        session.save()

        plan_data = InsurancePlanSerializer(plan).data
        msg_content = f"طرح «{plan.title}» متعلق به {plan.company.name} انتخاب شد. لطفاً مشخصات صدور را در فرم زیر تکمیل فرمایید:"

        assistant_message_obj = ChatMessage.objects.create(
            session=session,
            role='assistant',
            content=msg_content,
            metadata={
                'selected_plan': plan_data,
                'step': 'VEHICLE_INFORMATION'
            }
        )

        return Response({
            'assistant_message': ChatMessageSerializer(assistant_message_obj).data,
            'session': ChatSessionSerializer(session).data,
            'plan': plan_data
        }, status=status.HTTP_200_OK)


class SubmitVehicleAndPreviewView(APIView):
    """
    Calculates final price via Django Pricing Engine, saves Order, and provides policy preview.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_id = request.data.get('session_id')
        plan_id = request.data.get('plan_id')
        vehicle_info = request.data.get('vehicle_info', {})
        selected_coverage_ids = request.data.get('selected_coverage_ids', [])

        try:
            plan = InsurancePlan.objects.select_related('company').prefetch_related('coverages').get(id=plan_id, is_active=True)
        except InsurancePlan.DoesNotExist:
            return Response({'detail': 'طرح بیمه مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        session = None
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                session = ChatSession.objects.create(id=session_id, user=request.user if request.user.is_authenticated else None)

        # 1. Base Price
        base_price = float(plan.base_price)

        # 2. Selected Optional Coverages Price
        coverages_qs = plan.coverages.filter(id__in=selected_coverage_ids, is_active=True)
        optional_price = sum(float(c.additional_price) for c in coverages_qs if c.coverage_type == 'OPTIONAL')
        selected_coverage_names = [c.name for c in coverages_qs]

        # 3. Discount calculation
        no_damage_years = int(vehicle_info.get('no_damage_years') or 0)
        discount_percent = min(no_damage_years * 5, plan.max_discount_percent or 70)
        discount_amount = (base_price * discount_percent) / 100.0

        final_price = max(base_price + optional_price - discount_amount, 0)

        # 4. Create Order in Database
        order_number = f"INS-{int(time.time())}-{random.randint(100, 999)}"
        order = Order.objects.create(
            order_number=order_number,
            session_id=str(session.id) if session else '',
            user=request.user if request.user.is_authenticated else None,
            plan=plan,
            total_price=round(final_price),
            status='pending_payment',
            selected_coverages=selected_coverage_names,
            collected_info=vehicle_info
        )

        msg_content = f"مشخصات با شماره سفارش `{order.order_number}` ثبت گردید. پیش‌نمایش رسمی بیمه‌نامه در کارت زیر آماده است. می‌توانید فایل PDF را دانلود کرده و یا جهت صدور قطعی وارد درگاه پرداخت شوید:"

        assistant_message_obj = ChatMessage.objects.create(
            session=session,
            role='assistant',
            content=msg_content,
            order=order,
            metadata={'step': 'POLICY_PREVIEW', 'order_id': str(order.id)}
        )

        return Response({
            'assistant_message': ChatMessageSerializer(assistant_message_obj).data,
            'order': OrderSerializer(order).data,
            'session': ChatSessionSerializer(session).data if session else None
        }, status=status.HTTP_201_CREATED)


class TextToSpeechView(APIView):
    """
    Converts assistant text messages to speech using Gemini Text-to-Speech.
    Returns standard WAV audio stream.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.http import HttpResponse

        text = request.data.get('text', '').strip()
        message_id = request.data.get('message_id')

        if not text and message_id:
            try:
                msg = ChatMessage.objects.get(id=message_id)
                text = msg.content
            except (ChatMessage.DoesNotExist, ValueError):
                pass

        if not text:
            return Response({'detail': 'متن پیام برای تبدیل به صوت الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            audio_bytes = GeminiService.generate_tts_audio(text)
            is_wav = audio_bytes.startswith(b'RIFF')
            content_type = 'audio/wav' if is_wav else 'audio/mpeg'
            filename = 'speech.wav' if is_wav else 'speech.mp3'
            response = HttpResponse(audio_bytes, content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Content-Length'] = str(len(audio_bytes))
            return response
        except Exception as e:
            return Response({'detail': f'خطا در تولید صوت: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SpeechToTextView(APIView):
    """
    Transcribes audio to Persian text using Gemini Speech-to-Text.
    Accepts multipart/form-data with 'audio' file or raw audio body.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        mime_type = 'audio/webm'

        if audio_file:
            audio_bytes = audio_file.read()
            mime_type = audio_file.content_type or 'audio/webm'
        else:
            audio_bytes = request.body
            mime_type = request.content_type or 'audio/webm'

        if not audio_bytes:
            return Response({'detail': 'فایل صوتی ارسال نشده است.'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize mime type for Gemini
        if 'webm' in mime_type:
            mime_type = 'audio/webm'
        elif 'wav' in mime_type:
            mime_type = 'audio/wav'
        elif 'mp3' in mime_type or 'mpeg' in mime_type:
            mime_type = 'audio/mp3'
        elif 'ogg' in mime_type:
            mime_type = 'audio/ogg'
        elif 'm4a' in mime_type or 'mp4' in mime_type:
            mime_type = 'audio/mp4'

        try:
            transcript = GeminiService.transcribe_audio(audio_bytes, mime_type=mime_type)
            return Response({'text': transcript}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': f'خطا در تبدیل گفتار به متن: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

