'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Document {
  id: number;
  user_email: string;
  template_id: string;
  title: string;
  fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  name_zh?: string;
}

export default function DocumentsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token) {
      fetchDocuments();
      fetchTemplates();
    }
  }, [user, token]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此文档吗？此操作不可恢复。')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== id));
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (doc: Document) => {
    setSelectedDoc(doc);
  };

  const handleEdit = (doc: Document) => {
    // Save to localStorage so ChatInterface can pick it up
    localStorage.setItem('chat_currentTemplate', doc.template_id);
    localStorage.setItem('chat_formData', JSON.stringify(doc.fields));
    
    // Create a resume message
    const resumeMessage = [
      { role: 'assistant', content: `正在为您重新加载文档：${doc.title}。您可以继续修改或完善信息。` }
    ];
    localStorage.setItem('chat_messages', JSON.stringify(resumeMessage));
    
    // Redirect to chat
    router.push('/');
  };

  const handleNewDocument = () => {
    // Clear all chat storage
    localStorage.removeItem('chat_messages');
    localStorage.removeItem('chat_formData');
    localStorage.removeItem('chat_currentTemplate');
    router.push('/');
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name_zh || template?.name || templateId.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFields = (fields: Record<string, any>) => {
    return JSON.stringify(fields, null, 2);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">我的文档</h1>
            <p className="text-sm text-slate-500">管理您之前生成和保存的法律文档</p>
          </div>
          <button
            onClick={handleNewDocument}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新建文档
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {selectedDoc ? (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-600 hover:text-slate-800 flex items-center gap-2"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回列表
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(selectedDoc)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  重新编辑
                </button>
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  disabled={deletingId === selectedDoc.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingId === selectedDoc.id ? '删除中...' : '删除'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-slate-600">模板</label>
                <p className="text-slate-800 font-medium">{getTemplateName(selectedDoc.template_id)}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">标题</label>
                <p className="text-slate-800 font-medium">{selectedDoc.title}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">创建时间</label>
                <p className="text-slate-800">{formatDate(selectedDoc.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">更新时间</label>
                <p className="text-slate-800">{formatDate(selectedDoc.updated_at)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">字段数据</label>
              <pre className="bg-slate-100 p-4 rounded-lg text-sm overflow-auto max-h-64">
                {formatFields(selectedDoc.fields)}
              </pre>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">暂无文档</h3>
                <p className="text-slate-500 mb-6">您还没有保存任何文档，开始创建您的第一个法律文档吧！</p>
                <button
                  onClick={handleNewDocument}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建文档
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
                    onClick={() => handleView(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {getTemplateName(doc.template_id)}
                          </span>
                          <span className="text-sm text-slate-500">{formatDate(doc.created_at)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{doc.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {JSON.stringify(doc.fields).substring(0, 200)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(doc); }}
                          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                        >
                          重新编辑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          disabled={deletingId === doc.id}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? '删除中...' : '删除'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
