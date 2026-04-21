'use client';

import React, { useState, FormEvent } from 'react';

interface NDAPayload {
  purpose: string;
  effectiveDate: string;
  mndaTerm: '1year' | 'continues';
  mndaTermValue: string;
  confidentialityTerm: '1year' | 'perpetuity';
  confidentialityTermValue: string;
  governingLaw: string;
  jurisdiction: string;
  party1Name: string;
  party1Signature: string;
  party1Title: string;
  party1Company: string;
  party1Address: string;
  party2Name: string;
  party2Signature: string;
  party2Title: string;
  party2Company: string;
  party2Address: string;
}

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

  const handleInputChange = (field: keyof NDAPayload, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Mutual Non-Disclosure Agreement Generator</h1>
      <p className="text-gray-600 text-center mb-8">Fill out the form below to generate your NDA</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Agreement Terms */}
        <section className="bg-white p-6 rounded-lg shadow">
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
                    onChange={() => handleInputChange('mndaTerm', '1year')}
                    className="mr-2"
                  />
                  Expires {formData.mndaTermValue} year(s) from Effective Date
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mndaTerm"
                    value="continues"
                    checked={formData.mndaTerm === 'continues'}
                    onChange={() => handleInputChange('mndaTerm', 'continues')}
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
                    onChange={() => handleInputChange('confidentialityTerm', '1year')}
                    className="mr-2"
                  />
                  {formData.confidentialityTermValue} year(s) from Effective Date (trade secrets protected indefinitely)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="confidentialityTerm"
                    value="perpetuity"
                    checked={formData.confidentialityTerm === 'perpetuity'}
                    onChange={() => handleInputChange('confidentialityTerm', 'perpetuity')}
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
        <section className="bg-white p-6 rounded-lg shadow">
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
        <section className="bg-white p-6 rounded-lg shadow">
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
            className={`px-8 py-3 rounded-md font-semibold text-white transition-colors ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Generating PDF...' : 'Download NDA'}
          </button>
        </div>
      </form>
    </div>
  );
}
