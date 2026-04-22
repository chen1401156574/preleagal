'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NDAPayload, renderPreviewDocument } from '@/utils/templateEngine';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Critical fields needed before PDF download
const CRITICAL_FIELDS = [
  'purpose',
  'effectiveDate',
  'mndaTermValue',
  'governingLaw',
  'jurisdiction',
  'party1Name',
  'party1Company',
  'party1Address',
  'party2Name',
  'party2Company',
  'party2Address'
];

interface ChatResponse {
  reply: string;
  fields: Record<string, string>;
  missingFields?: string[];
}

interface StepTemplate {
  label: string;
  template: string;
}

export default function ChatInterface() {
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NDAPayload>({
    purpose: '',
    effectiveDate: '',
    mndaTerm: '1year', // Keeping type compatibility but value is driven by mndaTermValue
    mndaTermValue: '',
    confidentialityTerm: '1year', // Keeping type compatibility
    confidentialityTermValue: '',
    governingLaw: '',
    jurisdiction: '',
    party1Name: '',
    party1Signature: '',
    party1Title: '',
    party1Company: '',
    party1Address: '',
    party2Name: '',
    party2Signature: '',
    party2Title: '',
    party2Company: '',
    party2Address: '',
  });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'ll help you create a Mutual NDA. What\'s the business purpose?\n你好！我来帮你起草相互保密协议。请问商业目的是什么？'
      }]);
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, warningMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    // Keep chat guidance conversational; don't keep old bulk warnings while user is answering.
    setWarningMessages([]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          currentFields: formData
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data: ChatResponse = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      // Update form data with extracted fields
      if (data.fields && Object.keys(data.fields).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...data.fields
        }));
      }

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. / 抱歉，我遇到了错误。请重试。'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getMissingFieldsWarning = (fields: string[]): string => {
    const fieldNames: Record<string, string> = {
      purpose: 'business purpose (商业目的)',
      effectiveDate: 'effective date (生效日期)',
      mndaTermValue: 'MNDA term in years (生效时段/年限)',
      governingLaw: 'governing law (管辖法律)',
      jurisdiction: 'jurisdiction (管辖法院)',
      party1Name: 'Party 1 name (甲方姓名)',
      party1Company: 'Party 1 company (甲方公司)',
      party1Address: 'Party 1 address (甲方地址)',
      party2Name: 'Party 2 name (乙方姓名)',
      party2Company: 'Party 2 company (乙方公司)',
      party2Address: 'Party 2 address (乙方地址)'
    };

    const missing = fields.map(f => fieldNames[f] || f);

    if (missing.length === 1) {
      return `Please provide the missing information: ${missing[0]}\n请提供缺失的信息：${missing[0]}`;
    }
    return `Please provide the missing information:\n- ${missing.join('\n- ')}\n\n请提供缺失的信息:\n- ${missing.join('\n- ')}`;
  };

  const getCurrentStepTemplate = (): StepTemplate | null => {
    const hasValue = (field: keyof NDAPayload) => Boolean(formData[field]?.trim());

    if (!hasValue('purpose')) {
      return {
        label: '当前步骤：商业目的',
        template: '商业目的：评估合作 / 技术交流 / 项目尽调'
      };
    }

    if (!hasValue('party1Company') || !hasValue('party1Name') || !hasValue('party2Company') || !hasValue('party2Name')) {
      return {
        label: '当前步骤：双方公司与姓名',
        template: '甲方公司：XXX；甲方姓名：XXX；乙方公司：XXX；乙方姓名：XXX'
      };
    }

    if (!hasValue('effectiveDate')) {
      return {
        label: '当前步骤：生效日期',
        template: '生效日期：2026-04-22（YYYY-MM-DD）'
      };
    }

    if (!hasValue('mndaTermValue')) {
      return {
        label: '当前步骤：生效时段',
        template: '生效时段：3 years（或 3 yrs / 3 年）'
      };
    }

    if (!hasValue('governingLaw') || !hasValue('jurisdiction')) {
      return {
        label: '当前步骤：管辖法与法院',
        template: '管辖法律：Delaware；管辖法院：New York County Court'
      };
    }

    if (!hasValue('party1Address') || !hasValue('party2Address')) {
      return {
        label: '当前步骤：双方地址',
        template: '甲方地址：XXX；乙方地址：XXX'
      };
    }

    return {
      label: '当前步骤：信息已完整',
      template: '可直接点击 Download PDF 下载文档'
    };
  };

  const handleDownloadPDF = async () => {
    const missingFields = CRITICAL_FIELDS.filter(f => !formData[f as keyof NDAPayload]?.trim());

    if (missingFields.length > 0) {
      setWarningMessages([getMissingFieldsWarning(missingFields)]);
      return;
    }

    setPdfLoading(true);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mutual_NDA_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF error:', err);
      setWarningMessages(['Failed to generate PDF. / 生成 PDF 失败。']);
    } finally {
      setPdfLoading(false);
    }
  };

  // Check if all critical fields are filled
  const isReadyForDownload = CRITICAL_FIELDS.every(f => formData[f as keyof NDAPayload]?.trim());
  const currentStepTemplate = getCurrentStepTemplate();
  const previewHighlights = [
    { label: '生效日期', value: formData.effectiveDate || '未填写' },
    { label: '生效时段', value: formData.mndaTermValue ? `${formData.mndaTermValue} year(s)` : '未填写' },
    { label: '管辖法', value: formData.governingLaw || '未填写' },
    { label: '管辖法院', value: formData.jurisdiction || '未填写' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">PreLegal AI Chat</h1>
            <p className="text-xs text-slate-500">Mutual NDA Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isReadyForDownload ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className={`text-xs font-medium ${isReadyForDownload ? 'text-green-600' : 'text-yellow-600'}`}>
              {isReadyForDownload ? 'Ready to download' : 'Fields missing'}
            </span>
          </div>
          <span className="text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Warning Banner */}
      {warningMessages.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="max-w-[1920px] mx-auto flex items-start gap-3">
            <svg width="20" height="20" className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-800 font-medium text-sm whitespace-pre-wrap">{warningMessages[warningMessages.length - 1]}</p>
            </div>
            <button
              onClick={() => setWarningMessages([])}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border-r">
          <div className="flex-1 overflow-y-scroll p-6 pr-3 space-y-6 [scrollbar-width:thin] [scrollbar-color:#94a3b8_#e2e8f0]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t bg-slate-50">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer... / 请输入您的回答..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-blue-700 transition-all disabled:bg-slate-300 shadow-md"
              >
                Send
              </button>
            </form>
            {currentStepTemplate && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-semibold text-slate-600">{currentStepTemplate.label}</p>
                <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{currentStepTemplate.template}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview Area */}
        <div className="hidden lg:flex lg:w-1/2 flex-col bg-slate-50">
          <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Document Preview
            </h2>
            <button
              onClick={handleDownloadPDF}
              disabled={!isReadyForDownload || pdfLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isReadyForDownload
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
          <div className="flex-1 overflow-y-scroll p-4 md:p-8 bg-[#E5E7EB] [scrollbar-width:thin] [scrollbar-color:#94a3b8_#e2e8f0]">
            <div className="max-w-[800px] mx-auto">
              <div className="bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-slate-200 min-h-[1056px] w-full px-8 py-12 md:px-16 md:py-20 mb-8 mx-auto relative group">
                {/* Visual "Paper" fold/binding effect on the left edge if desired, or just clean white */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-r from-slate-200 to-transparent opacity-50"></div>
                
                <div className="prose prose-slate prose-sm md:prose-base max-w-none 
                  prose-headings:font-bold prose-headings:text-slate-900 
                  prose-h1:text-center prose-h1:text-2xl prose-h1:mb-8 prose-h1:uppercase prose-h1:tracking-wide
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2
                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-justify
                  prose-li:text-slate-700
                  prose-table:w-full prose-table:border-collapse prose-table:mt-8 prose-table:mb-8
                  prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-slate-900
                  prose-td:border prose-td:border-slate-300 prose-td:px-4 prose-td:py-3 prose-td:text-slate-700
                  prose-strong:text-slate-900 prose-strong:font-bold
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:text-slate-700 prose-blockquote:not-italic prose-blockquote:rounded-r-lg
                  prose-hr:my-8 prose-hr:border-slate-300
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {renderPreviewDocument(formData, true)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
