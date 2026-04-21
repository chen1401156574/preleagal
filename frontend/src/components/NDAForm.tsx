'use client';

import React, { useState, FormEvent } from 'react';
import { renderPreviewDocument, renderTable, NDAPayload } from '@/utils/templateEngine';

export default function NDAForm() {
  const [formData, setFormData] = useState<NDAPayload>({
    purpose: 'Evaluating a potential business collaboration',
    effectiveDate: new Date().toISOString().split('T')[0],
    mndaTerm: '1year',
    mndaTermValue: '1',
    confidentialityTerm: '1year',
    confidentialityTermValue: '1',
    governingLaw: 'Delaware',
    jurisdiction: 'New Castle, DE',
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
  const [showTable, setShowTable] = useState(false);

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

  const getTermOption = (term: '1year' | 'continues' | 'perpetuity', checked: boolean) => (
    `
- [${checked ? 'x' : ' '}] ${
      term === '1year' ? 'Expires [1 year(s)] from Effective Date.' :
      term === 'continues' ? 'Continues until terminated in accordance with the terms of the MNDA.' :
      'In perpetuity.'
    }
`
  );

  const previewDocument = renderPreviewDocument(formData, showTable);
  const partyTable = renderTable(formData);
  const coverPageTerms = `
# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

> This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("Standard Terms") identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

### Purpose

${formData.purpose || '______'}

### Effective Date

${formData.effectiveDate || '______'}

### MNDA Term

${formData.mndaTerm === '1year' ? '1 year' : 'Indefinite'}

### Term of Confidentiality

${formData.confidentialityTerm === '1year' ? '1 year' : 'In perpetuity'}

### Governing Law & Jurisdiction

- **Governing Law**: ${formData.governingLaw || '______'}
- **Jurisdiction**: ${formData.jurisdiction || '______'}

### MNDA Modifications

*None*

---

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.

${showTable ? partyTable : ''}

---

*Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-2">Mutual NDA Generator</h1>
        <p className="text-gray-600 text-center mb-6">Fill out the form to generate your Mutual Non-Disclosure Agreement</p>

        {/* Preview Toggle */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowTable(!showTable)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          >
            {showTable ? 'Hide Party Table' : 'Show Party Table'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            {/* Agreement Terms */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Agreement Terms</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the purpose for using confidential information"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveDate}
                    onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MNDA Term
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mndaTerm"
                        value="1year"
                        checked={formData.mndaTerm === '1year'}
                        onChange={() => toggleMndaTerm('1year')}
                        className="mr-2"
                      />
                      Expires 1 year(s) from Effective Date
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="mndaTerm"
                        value="continues"
                        checked={formData.mndaTerm === 'continues'}
                        onChange={() => toggleMndaTerm('continues')}
                        className="mr-2"
                      />
                      Continues until terminated in accordance with the terms of the MNDA
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term of Confidentiality
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="confidentialityTerm"
                        value="1year"
                        checked={formData.confidentialityTerm === '1year'}
                        onChange={() => toggleConfidentialityTerm('1year')}
                        className="mr-2"
                      />
                      1 year(s) from Effective Date (trade secrets protected indefinitely)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="confidentialityTerm"
                        value="perpetuity"
                        checked={formData.confidentialityTerm === 'perpetuity'}
                        onChange={() => toggleConfidentialityTerm('perpetuity')}
                        className="mr-2"
                      />
                      In perpetuity
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Governing Law *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.governingLaw}
                      onChange={(e) => handleInputChange('governingLaw', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Delaware"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jurisdiction *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.jurisdiction}
                      onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., New Castle, DE"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Party 1 */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Party 1</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.party1Company}
                    onChange={(e) => handleInputChange('party1Company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Representative Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.party1Name}
                    onChange={(e) => handleInputChange('party1Name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.party1Title}
                    onChange={(e) => handleInputChange('party1Title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature Line</label>
                  <input
                    type="text"
                    value={formData.party1Signature}
                    onChange={(e) => handleInputChange('party1Signature', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(To be signed)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.party1Address}
                    onChange={(e) => handleInputChange('party1Address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email or postal address"
                  />
                </div>
              </div>
            </section>

            {/* Party 2 */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Party 2</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.party2Company}
                    onChange={(e) => handleInputChange('party2Company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Representative Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.party2Name}
                    onChange={(e) => handleInputChange('party2Name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.party2Title}
                    onChange={(e) => handleInputChange('party2Title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature Line</label>
                  <input
                    type="text"
                    value={formData.party2Signature}
                    onChange={(e) => handleInputChange('party2Signature', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(To be signed)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.party2Address}
                    onChange={(e) => handleInputChange('party2Address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email or postal address"
                  />
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className={`px-8 py-3 rounded-md font-semibold text-white transition-colors ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Generating PDF...' : 'Download NDA'}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="bg-white p-6 rounded-lg shadow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Live Preview
            </h2>

            {/* Document Preview Container */}
            <div className="border border-gray-200 bg-white shadow-sm">
              <div className="p-6 space-y-6 overflow-x-hidden">
                {/* Cover Page Header */}
                <div className="border-b-2 border-gray-800 pb-4">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Mutual Non-Disclosure Agreement</h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    This Mutual Non-Disclosure Agreement consists of the Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.
                  </p>
                </div>

                {/* Key Terms Section */}
                <section className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Agreement Terms</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Purpose</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1">{formData.purpose || <span className="text-gray-400 italic">Not specified</span>}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Effective Date</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1">{formData.effectiveDate || <span className="text-gray-400 italic">Not specified</span>}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">MNDA Term</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1 capitalize">{formData.mndaTerm === '1year' ? '1 year' : 'Indefinite'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Term of Confidentiality</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1 capitalize">{formData.confidentialityTerm === '1year' ? '1 year' : 'In perpetuity'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Governing Law</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1">{formData.governingLaw || <span className="text-gray-400 italic">Not specified</span>}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Jurisdiction</label>
                      <p className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-1">{formData.jurisdiction || <span className="text-gray-400 italic">Not specified</span>}</p>
                    </div>
                  </div>
                </section>

                {/* Party Information Table */}
                {showTable && (
                  <section className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Party Information</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-700 w-1/3">Field</th>
                            <th className="text-center px-4 py-2 font-medium text-gray-700">Party 1</th>
                            <th className="text-center px-4 py-2 font-medium text-gray-700">Party 2</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-2 text-gray-500">Company</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party1Company || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party2Company || <span className="text-gray-300">—</span>}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-gray-500">Representative</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party1Name || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party2Name || <span className="text-gray-300">—</span>}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-gray-500">Title</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party1Title || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900">{formData.party2Title || <span className="text-gray-300">—</span>}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-gray-500">Notice Address</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900 text-xs break-words">{formData.party1Address || <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-2 text-center font-medium text-gray-900 text-xs break-words">{formData.party2Address || <span className="text-gray-300">—</span>}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Signatures Section */}
                <section className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Signatures
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-4">By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.</p>

                    <div className="grid grid-cols-2 gap-8">
                      {/* Party 1 */}
                      <div className="border-t-2 border-dashed border-gray-300 pt-4">
                        <h4 className="font-bold text-gray-900 text-sm mb-4">PARTY 1</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Signature</label>
                            <div className="border-b border-gray-400 h-8"></div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Print Name</label>
                            <div className="border-b border-gray-400 h-6">{formData.party1Name || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Title</label>
                            <div className="border-b border-gray-400 h-6">{formData.party1Title || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Company</label>
                            <div className="border-b border-gray-400 h-6">{formData.party1Company || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Notice Address</label>
                            <div className="border-b border-gray-400 h-6 text-xs break-words">{formData.party1Address || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Date</label>
                            <div className="border-b border-gray-400 h-6">{formData.effectiveDate || <span className="text-gray-300">____________</span>}</div>
                          </div>
                        </div>
                      </div>

                      {/* Party 2 */}
                      <div className="border-t-2 border-dashed border-gray-300 pt-4">
                        <h4 className="font-bold text-gray-900 text-sm mb-4">PARTY 2</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Signature</label>
                            <div className="border-b border-gray-400 h-8"></div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Print Name</label>
                            <div className="border-b border-gray-400 h-6">{formData.party2Name || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Title</label>
                            <div className="border-b border-gray-400 h-6">{formData.party2Title || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Company</label>
                            <div className="border-b border-gray-400 h-6">{formData.party2Company || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Notice Address</label>
                            <div className="border-b border-gray-400 h-6 text-xs break-words">{formData.party2Address || <span className="text-gray-300">____________</span>}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Date</label>
                            <div className="border-b border-gray-400 h-6">{formData.effectiveDate || <span className="text-gray-300">____________</span>}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Standard Terms - Full Content */}
                <section className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Standard Terms (Full Text)
                  </h3>
                  <div className="prose prose-sm max-w-none text-sm text-gray-800 bg-gray-50 rounded-lg p-4 whitespace-pre-line">
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">1. Introduction.</span> This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page) ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with the <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.purpose || '______'}</span> which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information"). Each party's Confidential Information also includes the existence and status of the parties' discussions and information on the Cover Page. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. To use this MNDA, the parties must complete and sign a cover page incorporating these Standard Terms ("Cover Page"). Each party is identified on the Cover Page and capitalized terms have the meanings given herein or on the Cover Page.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">2. Use and Protection of Confidential Information.</span> The Receiving Party shall: (a) use Confidential Information solely for the <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.purpose || '______'}</span>; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for the <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.purpose || '______'}</span>, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">3. Exceptions.</span> The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">4. Disclosures Required by Law.</span> The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain confidential treatment for the Confidential Information.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">5. Term and Termination.</span> This MNDA commences on the <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.effectiveDate || '______'}</span> and expires at the end of the MNDA Term (<span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.mndaTerm === '1year' ? '1 year' : 'Indefinite'}</span>). Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party's obligations relating to Confidential Information will survive for the Term of Confidentiality (<span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded capitalize">{formData.confidentialityTerm === '1year' ? '1 year' : 'In perpetuity'}</span>), despite any expiration or termination of this MNDA.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">6. Return or Destruction of Confidential Information.</span> Upon expiration or termination of this MNDA or upon the Disclosing Party's earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party's written request, destroy all Confidential Information in the Receiving Party's possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">7. Proprietary Rights.</span> The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">8. Disclaimer.</span> ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">9. Governing Law and Jurisdiction.</span> This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.governingLaw || '______'}</span>, without regard to the conflict of laws provisions of such <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.governingLaw || '______'}</span>. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.jurisdiction || '______'}</span>. Each party irrevocably submits to the exclusive jurisdiction of such <span className="font-medium text-gray-900 bg-yellow-100 px-1 rounded">{formData.jurisdiction || '______'}</span> in any such suit, action, or proceeding.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">10. Equitable Relief.</span> A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.</p>
                      </div>

                      <div>
                        <p className="font-bold mb-2"><span className="font-sans">11. General.</span> Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be signed by the waiving party's authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.</p>
                      </div>

                      <div className="pt-4 border-t border-gray-300 mt-4">
                        <p className="text-xs text-gray-500">Common Paper Mutual Non-Disclosure Agreement [Version 1.0](https://commonpaper.com/standards/mutual-nda/1.0/) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs text-gray-500 text-center">
                    Mutual Non-Disclosure Agreement (Version 1.0) — Common Paper free to use under <a href="https://creativecommons.org/licenses/by/4.0/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
