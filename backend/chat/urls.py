from django.urls import path
from .views import (
    CreateSessionView,
    SessionListView,
    SessionDetailView,
    SendMessageView,
    SelectPlanView,
    SubmitVehicleAndPreviewView,
    TextToSpeechView,
    SpeechToTextView
)

urlpatterns = [
    path('sessions/', SessionListView.as_view(), name='chat_session_list'),
    path('sessions/create/', CreateSessionView.as_view(), name='chat_create_session'),
    path('sessions/<uuid:session_id>/', SessionDetailView.as_view(), name='chat_session_detail'),
    path('messages/send/', SendMessageView.as_view(), name='chat_send_message'),
    path('select-plan/', SelectPlanView.as_view(), name='chat_select_plan'),
    path('submit-vehicle/', SubmitVehicleAndPreviewView.as_view(), name='chat_submit_vehicle'),
    path('tts/', TextToSpeechView.as_view(), name='chat_text_to_speech'),
    path('stt/', SpeechToTextView.as_view(), name='chat_speech_to_text'),
]

