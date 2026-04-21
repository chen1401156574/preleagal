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
          <div className="bg-white p-6 rounded-lg shadow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Live Preview</h2>

            {/* Cover Page */}
            <div className="border-2 border-gray-300 p-6 bg-white shadow-lg mb-6">
              <div dangerouslySetInnerHTML={{
                __html: coverPageTerms
                  .replace(/\n/g, '<br/>')
                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  .replace(/\*(.*?)\*/g, '<i>$1</i>')
                  .replace(/`(`([^`]+)`)/g, '<code class="bg-gray-100 px-2 rounded">$2</code>')
                  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
              }} />
            </div>

            {/* Standard Terms */}
            <div className="border-2 border-gray-300 p-6 bg-white shadow-lg">
              <div className="prose max-w-none text-sm text-gray-800">
                {previewDocument.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-semibold mb-3">{line.substring(3)}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-medium mb-2">{line.substring(4)}</h3>;
                  }
                  if (line.startsWith('`')) {
                    return <pre key={index} className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap my-2">{line}</pre>;
                  }
                  if (line.startsWith('- [x]') || line.startsWith('- [ ]')) {
                    return <p key={index} className="my-2">{line}</p>;
                  }
                  if (line.startsWith('```')) {
                    return null;
                  }
                  if (line.trim() === '') {
                    return <div key={index} className="h-2"></div>;
                  }
                  if (line.includes('**')) {
                    const parts = line.split(/(\*\*.+?\*\*)/g);
                    return (
                      <p key={index} className="my-2">
                        {parts.map((part, i) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <b key={i}>{part.slice(2, -2)}</b>
                            : part
                        )}
                      </p>
                    );
                  }
                  if (line.includes(': ')) {
                    const [key, value] = line.split(': ');
                    return (
                      <p key={index} className="my-2">
                        <strong>{key}:</strong> {value}
                      </p>
                    );
                  }
                  return <p key={index} className="my-2">{line}</p>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
