import { api } from './api';
import type { ChatSession, ChatMessage } from '../types';

export const chatService = {
  async createSession(insurance_type?: string): Promise<ChatSession> {
    const response = await api.post('/chat/sessions/create/', { insurance_type });
    return response.data;
  },

  async getSessions(): Promise<ChatSession[]> {
    const response = await api.get('/chat/sessions/');
    return response.data;
  },

  async getSession(session_id: string): Promise<ChatSession> {
    const response = await api.get(`/chat/sessions/${session_id}/`);
    return response.data;
  },

  async renameSession(session_id: string, title: string): Promise<ChatSession> {
    const response = await api.patch(`/chat/sessions/${session_id}/`, { title });
    return response.data;
  },

  async deleteSession(session_id: string): Promise<void> {
    await api.delete(`/chat/sessions/${session_id}/`);
  },

  async sendMessage(session_id: string, message: string): Promise<{ user_message: ChatMessage; assistant_message: ChatMessage; session: ChatSession }> {
    const response = await api.post('/chat/messages/send/', { session_id, message });
    return response.data;
  },

  async getTTSAudio(text: string, message_id?: string): Promise<Blob> {
    const response = await api.post(
      '/chat/tts/',
      { text, message_id },
      { responseType: 'blob' }
    );
    return response.data;
  },

  async transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await api.post('/chat/stt/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

