'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NDAPayload, renderPreviewDocument } from '@/utils/templateEngine';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DisclaimerBanner from './DisclaimerBanner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Template {
  id: string;
  name: string;
  name_zh?: string;
  description: string;
  description_zh?: string;
  priority: number;
}

interface RecommendedTemplate {
  id: string;
  name_en: string;
  name_zh: string;
  confidence: number;
  reason_en: string;
  reason_zh: string;
}

interface IntentResponse {
  matched: boolean;
  requested_template: string;
  similar_templates: RecommendedTemplate[];
  response_en: string;
  response_zh: string;
  supported_templates: { id: string; name: string }[];
}

interface ChatResponse {
  reply: string;
  fields: Record<string, string>;
  missingFields?: string[];
  templateType?: string;
}

export default function ChatInterface() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string>('nda');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [intentResult, setIntentResult] = useState<IntentResponse | null>(null);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [leftWidth, setLeftWidth] = useState<number>(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Critical fields mapping based on backend services/chat_service.py
  const CRITICAL_FIELDS_CONFIG: Record<string, string[]> = {
    nda: [
      "purpose", "effectiveDate", "mndaTermValue", "governingLaw", "jurisdiction",
      "party1Name", "party1Company", "party1Address", "party2Name", "party2Company", "party2Address"
    ],
    csa: [
      "purpose", "effectiveDate", "serviceProvider", "serviceProviderContact",
      "customer", "customerContact", "serviceDescription", "serviceTerm",
      "governingLaw", "paymentTerms"
    ],
    dpa: [
      "purpose", "effectiveDate", "dataExporter", "dataExporterContact",
      "dataImporter", "dataImporterContact", "dataCategories", "processingPurpose",
      "dataTransfers", "governingLaw"
    ]
  };

  const getCriticalFields = () => {
    return CRITICAL_FIELDS_CONFIG[currentTemplate] || CRITICAL_FIELDS_CONFIG.nda;
  };

  const CRITICAL_FIELDS = getCriticalFields();

  const [formData, setFormData] = useState<NDAPayload>({
    purpose: '',
    effectiveDate: '',
    mndaTerm: '1year',
    mndaTermValue: '',
    confidentialityTerm: '1year',
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
  const [saveLoading, setSaveLoading] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_messages');
    const savedFormData = localStorage.getItem('chat_formData');
    const savedTemplate = localStorage.getItem('chat_currentTemplate');

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedFormData) setFormData(JSON.parse(savedFormData));
    if (savedTemplate) setCurrentTemplate(savedTemplate);
    
    setIsInitialized(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('chat_messages', JSON.stringify(messages));
      localStorage.setItem('chat_formData', JSON.stringify(formData));
      localStorage.setItem('chat_currentTemplate', currentTemplate);
    }
  }, [messages, formData, currentTemplate, isInitialized]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load available templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Initialize with greeting message
  useEffect(() => {
    if (isInitialized && messages.length === 0) {
      const greeting = getInitialGreeting();
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [isInitialized, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Focus input when loading finishes
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [loading]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const getInitialGreeting = () => {
    const templates = [
      { id: 'nda', name_zh: '相互保密协议' },
      { id: 'csa', name_zh: '云服务协议' },
      { id: 'dpa', name_zh: '数据处理协议' },
    ];
    const list = templates.map((t, i) => `${i + 1}. ${t.name_zh}`).join('\n');
    return `你好！我可以帮您起草法律文件：\n${list}\n\n您需要什么文件？`;
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          currentFields: formData,
          templateType: currentTemplate
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data: ChatResponse = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.fields && Object.keys(data.fields).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...data.fields
        }));
      }

      // Update template type if changed by backend
      if (data.templateType) {
        setCurrentTemplate(data.templateType);
      }

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，我遇到了错误。请重试。'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle intent detection for unsupported templates
  const handleIntentDetection = async (userRequest: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequest }),
      });

      if (!response.ok) throw new Error('Intent detection failed');

      const result: IntentResponse = await response.json();
      setIntentResult(result);
      setShowIntentModal(true);
    } catch (error) {
      console.error('Intent detection error:', error);
    }
  };

  const handleSwitchTemplate = (templateId: string) => {
    setCurrentTemplate(templateId);
    setShowIntentModal(false);
    setFormData({
      purpose: '',
      effectiveDate: '',
      mndaTerm: '1year',
      mndaTermValue: '',
      confidentialityTerm: '1year',
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

    const template = templates.find(t => t.id === templateId);
    const templateName = template?.name_zh || template?.name || templateId;

    const newGreeting = `好的，让我帮您起草${templateName}。请先告诉我商业目的。`;

    setMessages(prev => [...prev, { role: 'assistant', content: newGreeting }]);
  };

  const getMissingFieldsWarning = (fields: string[]): string => {
    const fieldNames: Record<string, string> = {
      purpose: '商业目的',
      effectiveDate: '生效日期',
      mndaTermValue: '协议期限',
      governingLaw: '管辖法律',
      jurisdiction: '管辖法院',
      party1Name: '甲方姓名',
      party1Company: '甲方公司',
      party1Address: '甲方地址',
      party2Name: '乙方姓名',
      party2Company: '乙方公司',
      party2Address: '乙方地址',
      serviceProvider: '服务提供商',
      customer: '客户',
      serviceDescription: '服务描述',
      serviceTerm: '服务期限',
      paymentTerms: '付款条款',
      dataExporter: '数据出口方',
      dataImporter: '数据进口方',
      dataCategories: '数据类别',
      processingPurpose: '处理目的',
      dataTransfers: '数据转移',
    };

    const missing = fields.map(f => fieldNames[f] || f);
    const missingList = missing.join('\n- ');

    return `请提供缺失的信息:\n- ${missingList}\n\n请补充完整信息后下载。`;
  };

  // Handle resizing
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleDownloadPDF = async () => {
    const criticalFields = getCriticalFields();
    const isReady = criticalFields.every(f => formData[f as keyof NDAPayload]?.trim());

    if (!isReady) {
      const missingFields = criticalFields.filter(f => !formData[f as keyof NDAPayload]?.trim());
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
      a.download = `${currentTemplate}_${Date.now()}.pdf`;
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

  const handleSaveDocument = async () => {
    setSaveLoading(true);
    try {
      if (!token) {
        router.push('/login');
        return;
      }

      // Generate a title based on parties or template
      const template = templates.find(t => t.id === currentTemplate);
      const templateName = template?.name_zh || template?.name || currentTemplate;
      
      // Determine party names based on template type
      let party1 = '未命名甲方';
      let party2 = '未命名乙方';
      
      if (currentTemplate === 'nda') {
        party1 = formData.party1Name || formData.party1Company || party1;
        party2 = formData.party2Name || formData.party2Company || party2;
      } else if (currentTemplate === 'csa') {
        party1 = (formData as any).serviceProvider || party1;
        party2 = (formData as any).customer || party2;
      } else if (currentTemplate === 'dpa') {
        party1 = (formData as any).dataExporter || party1;
        party2 = (formData as any).dataImporter || party2;
      }
      
      const title = `${templateName} - ${party1} vs ${party2}`;

      const response = await fetch('http://localhost:8000/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: currentTemplate,
          title: title,
          fields: formData
        }),
      });

      if (!response.ok) throw new Error('Failed to save document');
      
      // Clear cache on successful save to prevent confusion
      localStorage.removeItem('chat_messages');
      localStorage.removeItem('chat_formData');
      localStorage.removeItem('chat_currentTemplate');

      setWarningMessages(['文档已成功保存！正在前往我的文档... / Document saved! Redirecting...']);
      
      // Delay redirect slightly to ensure user sees success message
      setTimeout(() => {
        router.push('/documents');
      }, 1500);
    } catch (err) {
      console.error('Save error:', err);
      setWarningMessages(['保存文档失败。 / Failed to save document.']);
    } finally {
      setSaveLoading(false);
    }
  };

  // Check if all critical fields are filled
  const isReadyForDownload = CRITICAL_FIELDS.every(f => formData[f as keyof NDAPayload]?.trim());

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
            <p className="text-xs text-slate-500 flex items-center gap-2">
              当前模板：
              {templates.find(t => t.id === currentTemplate)?.[navigator.language.startsWith('zh') ? 'name_zh' : 'name']
                || templates.find(t => t.id === currentTemplate)?.name
                || currentTemplate.toUpperCase()}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isReadyForDownload ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {isReadyForDownload ? '准备就绪' : '信息缺失'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/documents')}
            className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            我的文档
          </button>
          <button
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            切换模板
          </button>
          <span className="text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
          <button
            onClick={logout}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      {/* Template Selector Dropdown */}
      {showTemplateSelector && (
        <div className="bg-white border-b px-6 py-4 shadow-sm z-20">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">选择模板</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templates.slice(0, 3).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSwitchTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    currentTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-slate-800">
                    {template.name_zh || template.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {template.description_zh || template.description}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateSelector(false)}
              className="mt-3 text-xs text-slate-500 hover:text-slate-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 flex overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        {/* Left: Chat Area */}
        <div 
          className="flex flex-col bg-white border-r h-full overflow-hidden"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${leftWidth}%` : '100%' }}
        >
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
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="请输入您的回答..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                disabled={loading}
              />
              <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-blue-700 transition-all disabled:bg-slate-300 shadow-md"
          >
            发送
          </button>
        </form>
        {warningMessages.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            {warningMessages.map((msg, idx) => (
              <p key={idx} className="text-sm text-yellow-700 whitespace-pre-wrap">{msg}</p>
            ))}
            <button
              onClick={() => setWarningMessages([])}
              className="mt-2 text-xs font-bold text-yellow-800 hover:underline"
            >
              关闭
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={startResizing}
        className={`hidden lg:flex w-1 hover:w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-all z-30 items-center justify-center group ${isResizing ? 'bg-blue-600 w-1.5' : 'bg-slate-200'}`}
      >
        <div className="h-8 w-0.5 bg-slate-400 group-hover:bg-white rounded-full"></div>
      </div>

      {/* Right: Preview Area */}
      <div 
        className="hidden lg:flex flex-col bg-slate-50 h-full overflow-hidden"
        style={{ width: `${100 - leftWidth}%` }}
      >
          <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Document Preview
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDocument}
                disabled={saveLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  saveLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {saveLoading ? 'Saving...' : '保存到我的文档'}
              </button>
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
          </div>
          <div className="flex-1 overflow-y-scroll p-4 md:p-8 bg-[#E5E7EB] [scrollbar-width:thin] [scrollbar-color:#94a3b8_#e2e8f0]">
            <div className="max-w-[800px] mx-auto">
              <div className="bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-slate-200 min-h-[1056px] w-full px-8 py-12 md:px-16 md:py-20 mb-8 mx-auto relative">
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

              {/* Disclaimer Banner */}
              <DisclaimerBanner />
            </div>
          </div>
        </div>
      </main>

      {/* Intent Recognition Modal */}
      {showIntentModal && intentResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-slate-800">
                {intentResult.matched ? '模板已匹配 / Template Matched' : '未找到匹配的模板 / No Exact Match Found'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!intentResult.matched && (
                <p className="text-slate-700 whitespace-pre-wrap">
                  {intentResult.response_zh}\n{intentResult.response_en}
                </p>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-700">推荐模板 / Recommended Templates</h4>
                {intentResult.similar_templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSwitchTemplate(tpl.id)}
                    className="w-full text-left p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {tpl.name_zh} ({tpl.name_en})
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {tpl.reason_zh}\n{tpl.reason_en}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {(tpl.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowIntentModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                取消 Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
