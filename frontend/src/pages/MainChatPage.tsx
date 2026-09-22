import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { ChatBubble } from '../components/ChatBubble';
import { ChatInput } from '../components/ChatInput';
import { PurchasedPolicyCard } from '../components/PurchasedPolicyCard';
import type { ChatMessage, ChatSession, Recommendation, Order } from '../types';
import { chatService } from '../services/chatService';
import { insuranceService } from '../services/insuranceService';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const MainChatPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch all user chat sessions for sidebar
  const loadSessionsList = async () => {
    if (!isAuthenticated) {
      setSessions([]);
      return;
    }
    try {
      const data = await chatService.getSessions();
      setSessions(data || []);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  // Initialize or Reset Chat Session based on auth status
  useEffect(() => {
    const initSession = async () => {
      setIsInitializing(true);

      if (!isAuthenticated) {
        // User logged out: Reset all chat state back to the first welcome screen
        localStorage.removeItem('chat_session_id');
        setSessions([]);
        setMessages([]);
        setSessionId('');
        setIsInitializing(false);
        return;
      }

      // User logged in: Load user's past sessions
      await loadSessionsList();
      const currentSessionId = localStorage.getItem('chat_session_id');
      if (currentSessionId) {
        try {
          const sessionData = await chatService.getSession(currentSessionId);
          setSessionId(sessionData.id);
          setMessages(sessionData.messages || []);
        } catch {
          localStorage.removeItem('chat_session_id');
          setSessionId('');
          setMessages([]);
        }
      } else {
        setSessionId('');
        setMessages([]);
      }
      setIsInitializing(false);
    };

    initSession();
  }, [isAuthenticated]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectSession = async (id: string) => {
    if (id === sessionId) return;
    setIsInitializing(true);
    try {
      const data = await chatService.getSession(id);
      setSessionId(data.id);
      setMessages(data.messages || []);
      localStorage.setItem('chat_session_id', data.id);
    } catch (e) {
      console.error('Failed to switch session:', e);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const result = await chatService.sendMessage(sessionId, text);
      setSessionId(result.session.id);
      localStorage.setItem('chat_session_id', result.session.id);
      setMessages((prev) => {
        const filtered = prev.filter((m) => !String(m.id).startsWith('temp-'));
        return [...filtered, result.user_message, result.assistant_message];
      });
      await loadSessionsList();
    } catch (error) {
      console.error('Send message error:', error);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'متأسفانه مشکلی در ارتباط با سرور رخ داد. لطفاً مجدداً تلاش فرمایید.',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRecommendation = async (recommendation: Recommendation) => {
    setIsLoading(true);
    try {
      const paymentType = recommendation.collected_data?.payment_type || 'cash';
      const order = await insuranceService.createOrder(
        recommendation.plan.id,
        recommendation.calculated_price,
        sessionId,
        recommendation.collected_data || {},
        paymentType
      );

      const isInstallment = order.payment_type && order.payment_type !== 'cash';
      const orderContent = isInstallment
        ? `بسیار عالی! سفارش شما با شماره \`${order.order_number}\` با روش **${order.payment_type_display || 'اقساطی'}** جهت بیمه **${order.plan.title}** ثبت گردید. لطفاً جهت فعال‌سازی بیمه‌نامه، مبلغ پیش‌پرداخت را از طریق کارت زیر پرداخت فرمایید:`
        : `بسیار عالی! سفارش شما با شماره \`${order.order_number}\` با روش **پرداخت نقدی** جهت بیمه **${order.plan.title}** ثبت گردید. برای تکمیل صدور، لطفاً از کارت پرداخت زیر اقدام فرمایید:`;

      const confirmMsg: ChatMessage = {
        id: `order-msg-${Date.now()}`,
        role: 'assistant',
        content: orderContent,
        timestamp: new Date().toISOString(),
        order: order
      };

      setMessages((prev) => [...prev, confirmMsg]);
    } catch (e) {
      console.error('Order creation error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRecommendation = () => {
    const cancelMsg: ChatMessage = {
      id: `cancel-msg-${Date.now()}`,
      role: 'assistant',
      content: 'پیشنهاد متوقف شد. اگر به نوع دیگری از بیمه یا شرایط پوشش متفاوتی نیاز دارید، بفرمایید تا مجدداً بررسی کنم.',
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  const handleResetChat = () => {
    // Simply reset to welcome screen without hitting DB
    localStorage.removeItem('chat_session_id');
    setSessionId('');
    setMessages([]);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    try {
      await chatService.renameSession(id, newTitle);
      await loadSessionsList();
    } catch (e) {
      console.error('Failed to rename session:', e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await chatService.deleteSession(id);
      await loadSessionsList();
      if (id === sessionId) {
        handleResetChat();
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');

  const currentSession = sessions.find((s) => s.id === sessionId);
  const activePaidOrder: Order | null =
    messages.map((m) => m.order).filter((o): o is Order => Boolean(o && o.status === 'paid')).slice(-1)[0]
    || currentSession?.paid_order
    || null;

  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7] flex flex-col justify-between font-vazir relative" dir="rtl">
      
      {/* Desktop Left Purchased Policy Card */}
      {activePaidOrder && (
        <PurchasedPolicyCard order={activePaidOrder} isMobileBanner={false} />
      )}

      {/* ChatGPT-style Sidebar - Fixed Right in Desktop */}
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleResetChat}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area - Shifted for Sidebar on Desktop */}
      <div className="flex-1 md:pr-64 flex flex-col justify-between transition-all">
        
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Main Chat Thread Container */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-28">
          {/* Mobile Top Policy Banner */}
          {activePaidOrder && (
            <div className="block lg:hidden">
              <PurchasedPolicyCard order={activePaidOrder} isMobileBanner={true} />
            </div>
          )}

          {isInitializing ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-xs text-slate-400 font-medium">در حال راه‌اندازی دستیار بیمه...</span>
            </div>
          ) : !hasUserMessages ? (
            <WelcomeScreen onSelectOption={handleSendMessage} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onConfirmRecommendation={handleConfirmRecommendation}
                  onCancelRecommendation={handleCancelRecommendation}
                />
              ))}

              {/* AI Typing Indicator */}
              {isLoading && (
                <div className="flex justify-end my-3">
                  <div className="bg-[#191f2f] border border-[#2e3545] p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    دستیار هوشمند در حال پاسخگویی...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}
        </main>

        {/* Persistent Bottom Input Bar */}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

    </div>
  );
};
