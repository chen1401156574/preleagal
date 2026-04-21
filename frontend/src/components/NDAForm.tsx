'use client';

import React, { useState, FormEvent } from 'react';
import { NDAPayload } from '@/utils/templateEngine';
import { useAuth } from '@/contexts/AuthContext';

interface NDAFormProps {
  token: string;
}

export default function NDAForm({ token }: NDAFormProps) {
  const { user, logout } = useAuth();

  const [formData, setFormData] = useState<NDAPayload>({
    purpose: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    mndaTerm: '1year',
    mndaTermValue: '1',
    confidentialityTerm: '1year',
    confidentialityTermValue: '1',
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(true);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);

  const handleInputChange = (field: keyof NDAPayload, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMndaTerm = (value: '1year' | 'continues') => {
    setFormData(prev => ({ ...prev, mndaTerm: value, mndaTermValue: '1' }));
  };

  const toggleConfidentialityTerm = (value: '1year' | 'perpetuity') => {
    setFormData(prev => ({ ...prev, confidentialityTerm: value, confidentialityTermValue: value === '1year' ? '1' : 'In perpetuity' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Memoized preview values
  const mndaTermText = formData.mndaTerm === '1year' ? '1 year' : 'Indefinite';
  const confidentialityText = formData.confidentialityTerm === '1year' ? '1 year' : 'In perpetuity';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <svg width="24" height="24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Mutual NDA Generator</h1>
                <p className="text-xs text-slate-500">Interactive Document Builder</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{user?.email}</p>
                  <p className="text-xs text-slate-500">Signed in</p>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-[1920px] mx-auto flex items-center gap-3">
            <svg width="20" height="20" className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-6">
            {/* Agreement Terms */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg width="20" height="20" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Agreement Terms
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Purpose <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Describe the purpose for using confidential information"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                        Effective Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.effectiveDate}
                        onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Governing Law</label>
                      <input
                        type="text"
                        value={formData.governingLaw}
                        onChange={(e) => handleInputChange('governingLaw', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="e.g., Delaware"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Jurisdiction <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.jurisdiction}
                      onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., New Castle, DE"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">MNDA Term</label>
                      <div className="space-y-2">
                        <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.mndaTerm === '1year'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <input
                            type="radio"
                            name="mndaTerm"
                            value="1year"
                            checked={formData.mndaTerm === '1year'}
                            onChange={() => toggleMndaTerm('1year')}
                            className="mt-1 mr-3 w-4 h-4 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">1 year</p>
                            <p className="text-xs text-slate-500">Expires 1 year from Effective Date</p>
                          </div>
                        </label>
                        <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.mndaTerm === 'continues'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <input
                            type="radio"
                            name="mndaTerm"
                            value="continues"
                            checked={formData.mndaTerm === 'continues'}
                            onChange={() => toggleMndaTerm('continues')}
                            className="mt-1 mr-3 w-4 h-4 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">Continues</p>
                            <p className="text-xs text-slate-500">Until terminated per MNDA terms</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Term of Confidentiality</label>
                      <div className="space-y-2">
                        <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.confidentialityTerm === '1year'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <input
                            type="radio"
                            name="confidentialityTerm"
                            value="1year"
                            checked={formData.confidentialityTerm === '1year'}
                            onChange={() => toggleConfidentialityTerm('1year')}
                            className="mt-1 mr-3 w-4 h-4 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">1 year</p>
                            <p className="text-xs text-slate-500">Trade secrets protected indefinitely</p>
                          </div>
                        </label>
                        <label className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.confidentialityTerm === 'perpetuity'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                          <input
                            type="radio"
                            name="confidentialityTerm"
                            value="perpetuity"
                            checked={formData.confidentialityTerm === 'perpetuity'}
                            onChange={() => toggleConfidentialityTerm('perpetuity')}
                            className="mt-1 mr-3 w-4 h-4 text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-800">In perpetuity</p>
                            <p className="text-xs text-slate-500">Indefinite protection</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Party 1 */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg width="20" height="20" className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Party 1
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.party1Company}
                      onChange={(e) => handleInputChange('party1Company', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Representative Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.party1Name}
                      onChange={(e) => handleInputChange('party1Name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.party1Title}
                      onChange={(e) => handleInputChange('party1Title', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notice Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.party1Address}
                      onChange={(e) => handleInputChange('party1Address', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Email or postal address"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Party 2 */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg width="20" height="20" className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Party 2
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.party2Company}
                      onChange={(e) => handleInputChange('party2Company', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      Representative Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.party2Name}
                      onChange={(e) => handleInputChange('party2Name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.party2Title}
                      onChange={(e) => handleInputChange('party2Title', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notice Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.party2Address}
                      onChange={(e) => handleInputChange('party2Address', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      placeholder="Email or postal address"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className={`px-12 py-4 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg width="20" height="20" className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4" />
                    </svg>
                    Generating PDF...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download NDA
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className={`space-y-4 transition-all ${isPreviewCollapsed ? 'xl:col-span-1' : ''}`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg width="20" height="20" className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Live Preview
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTable(!showTable)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showTable
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {showTable ? 'Hide Table' : 'Show Table'}
                  </button>
                  <button
                    onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                    className={`p-2 rounded-lg transition-all ${
                      isPreviewCollapsed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    <svg width="16" height="16" className={`w-4 h-4 transition-transform ${isPreviewCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Document Preview */}
              <div className="border-t border-b border-slate-200 bg-slate-100 p-4 md:p-8">
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto bg-white shadow-lg border border-slate-200 mx-auto max-w-4xl" style={{ minHeight: '800px' }}>
                  {/* Cover Page Section */}
                  <div className="p-8 md:p-12 border-b border-slate-200 font-serif">
                    <h1 className="text-2xl font-bold text-center text-slate-900 mb-8 uppercase tracking-wide">Mutual Non-Disclosure Agreement</h1>
                    <p className="text-slate-800 leading-relaxed text-justify mb-10">
                      This Mutual Non-Disclosure Agreement (the &quot;MNDA&quot;) consists of: (1) this Cover Page and (2) the Standard Terms.
                    </p>

                    <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-300 pb-2 uppercase">Cover Page Terms</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 mb-10">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</div>
                        <div className="text-slate-800 font-medium">{formData.purpose || '________________________'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Effective Date</div>
                        <div className="text-slate-800 font-medium">{formData.effectiveDate || '________________________'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">MNDA Term</div>
                        <div className="text-slate-800 font-medium">{mndaTermText}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Term of Confidentiality</div>
                        <div className="text-slate-800 font-medium">{confidentialityText}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Governing Law</div>
                        <div className="text-slate-800 font-medium">{formData.governingLaw || '________________________'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jurisdiction</div>
                        <div className="text-slate-800 font-medium">{formData.jurisdiction || '________________________'}</div>
                      </div>
                    </div>

                    <p className="text-slate-800 italic text-sm">
                      By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
                    </p>
                  </div>

                  {/* Signature Table Section */}
                  {showTable && (
                    <div className="p-8 md:p-12 border-b border-slate-200 font-serif">
                      <h2 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Party Signatures</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr>
                              <th className="border-b-2 border-slate-300 pb-3 font-bold text-slate-700 w-1/3"></th>
                              <th className="border-b-2 border-slate-300 pb-3 font-bold text-slate-900 w-1/3">PARTY 1</th>
                              <th className="border-b-2 border-slate-300 pb-3 font-bold text-slate-900 w-1/3">PARTY 2</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-sm">
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Signature</td>
                              <td className="py-4 text-slate-800 font-medium italic">{formData.party1Signature || '________________________'}</td>
                              <td className="py-4 text-slate-800 font-medium italic">{formData.party2Signature || '________________________'}</td>
                            </tr>
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Print Name</td>
                              <td className="py-4 text-slate-800">{formData.party1Name || '________________________'}</td>
                              <td className="py-4 text-slate-800">{formData.party2Name || '________________________'}</td>
                            </tr>
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Title</td>
                              <td className="py-4 text-slate-800">{formData.party1Title || '________________________'}</td>
                              <td className="py-4 text-slate-800">{formData.party2Title || '________________________'}</td>
                            </tr>
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Company</td>
                              <td className="py-4 text-slate-800">{formData.party1Company || '________________________'}</td>
                              <td className="py-4 text-slate-800">{formData.party2Company || '________________________'}</td>
                            </tr>
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Notice Address</td>
                              <td className="py-4 text-slate-800">{formData.party1Address || '________________________'}</td>
                              <td className="py-4 text-slate-800">{formData.party2Address || '________________________'}</td>
                            </tr>
                            <tr>
                              <td className="py-4 font-semibold text-slate-600">Date</td>
                              <td className="py-4 text-slate-800">{formData.effectiveDate}</td>
                              <td className="py-4 text-slate-800">{formData.effectiveDate}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Standard Terms Section */}
                  <div className="p-8 md:p-12 font-serif">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 text-center uppercase tracking-wide">Standard Terms</h2>
                    <div className="space-y-5 text-slate-800 text-sm leading-relaxed text-justify">
                      <p>
                        <strong>1. Introduction.</strong> This MNDA allows each party (&quot;Disclosing Party&quot;) to disclose Confidential Information in connection with the <strong>Purpose</strong> ({formData.purpose || '______'}). &quot;Confidential Information&quot; means technical or business information, product designs, requirements, pricing, security documentation, technology, inventions and know-how that the Disclosing Party identifies as confidential or should reasonably be understood as confidential.
                      </p>
                      <p>
                        <strong>2. Use and Protection.</strong> The Receiving Party shall: (a) use Confidential Information solely for the <strong>Purpose</strong> ({formData.purpose || '______'}); (b) not disclose Confidential Information to third parties without prior written approval, except to employees, advisors and representatives with a need to know; and (c) protect Confidential Information using at least reasonable standard of care.
                      </p>
                      <p>
                        <strong>3. Exceptions.</strong> Obligations do not apply to information that: (a) is or becomes publicly available; (b) was rightfully known prior to receipt; (c) was rightfully obtained from a third party; or (d) was independently developed.
                      </p>
                      <p>
                        <strong>4. Disclosures Required by Law.</strong> The Receiving Party may disclose Confidential Information if required by law, regulation or court order, provided it gives the Disclosing Party advance notice and reasonably cooperates with efforts to obtain confidential treatment.
                      </p>
                      <p>
                        <strong>5. Term and Termination.</strong> This MNDA commences on the <strong>Effective Date</strong> ({formData.effectiveDate || '______'}) and expires at the end of the <strong>MNDA Term</strong> ({mndaTermText}). Either party may terminate upon written notice. The Receiving Party&apos;s obligations for Confidential Information survive for the <strong>Term of Confidentiality</strong> ({confidentialityText}).
                      </p>
                      <p>
                        <strong>6. Return or Destruction.</strong> Upon expiration or termination, the Receiving Party will: (a) cease using Confidential Information; (b) promptly destroy or return all Confidential Information; and (c) if requested, confirm compliance in writing. The Receiving Party may retain copies as required by backup or retention policies or law.
                      </p>
                      <p>
                        <strong>7. Proprietary Rights.</strong> The Disclosing Party retains all intellectual property and other rights in its Confidential Information. No license is granted.
                      </p>
                      <p>
                        <strong>8. Disclaimer.</strong> ALL CONFIDENTIAL INFORMATION IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTIES OF ANY KIND.
                      </p>
                      <p>
                        <strong>9. Governing Law and Jurisdiction.</strong> This MNDA is governed by the laws of the State of <strong>{formData.governingLaw || '______'}</strong>. Any disputes must be resolved in courts located in <strong>{formData.jurisdiction || '______'}</strong>. Each party submits to the exclusive jurisdiction of such courts.
                      </p>
                      <p>
                        <strong>10. Equitable Relief.</strong> A breach may cause irreparable harm. The Disclosing Party is entitled to seek equitable relief, including injunction.
                      </p>
                      <p>
                        <strong>11. General.</strong> Neither party is obligated to disclose Confidential Information. Neither party may assign this MNDA without prior written consent, except in connection with a merger or acquisition. Waivers must be signed in writing. If any provision is held unenforceable, the remainder remains in effect. This MNDA constitutes the entire agreement and supersedes all prior agreements. This MNDA may only be amended by writing signed by both parties. Notices must be sent to the addresses on the Cover Page. This MNDA may be executed in counterparts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>Mutual Non-Disclosure Agreement (Version 1.0)</p>
            <a href="https://creativecommons.org/licenses/by/4.0/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              CC BY 4.0 License
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
