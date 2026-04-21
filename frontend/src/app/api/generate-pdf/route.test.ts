import { describe, it, expect, jest } from '@jest/globals';

describe('PDF Generation API', () => {
  it('should generate correct document structure', async () => {
    const { generateNDADocument } = await import('@/utils/templateEngine');

    const mockData = {
      purpose: 'Test purpose',
      effectiveDate: '2026-01-01',
      mndaTerm: '1year',
      mndaTermValue: '1',
      confidentialityTerm: '1year',
      confidentialityTermValue: '1',
      governingLaw: 'Delaware',
      jurisdiction: 'New Castle, DE',
      party1Name: 'John Doe',
      party1Signature: '',
      party1Title: 'CEO',
      party1Company: 'Company A',
      party1Address: '123 Main St',
      party2Name: 'Jane Smith',
      party2Signature: '',
      party2Title: 'CTO',
      party2Company: 'Company B',
      party2Address: '456 Oak Ave',
    };

    const doc = generateNDADocument(mockData);
    expect(typeof doc).toBe('string');
    expect(doc.length).toBeGreaterThan(1000);
  });

  it('should include all standard terms', async () => {
    const { generateNDADocument } = await import('@/utils/templateEngine');

    const mockData = {
      purpose: 'Testing',
      effectiveDate: '2026-01-01',
      mndaTerm: '1year',
      mndaTermValue: '1',
      confidentialityTerm: '1year',
      confidentialityTermValue: '1',
      governingLaw: 'Delaware',
      jurisdiction: 'New Castle, DE',
      party1Name: 'John',
      party1Signature: '',
      party1Title: 'CEO',
      party1Company: 'Company A',
      party1Address: '123 Main St',
      party2Name: 'Jane',
      party2Signature: '',
      party2Title: 'CTO',
      party2Company: 'Company B',
      party2Address: '456 Oak Ave',
    };

    const doc = generateNDADocument(mockData);

    // Check for all 11 standard terms
    expect(doc).toContain('Introduction');
    expect(doc).toContain('Use and Protection');
    expect(doc).toContain('Exceptions');
    expect(doc).toContain('Disclosures Required');
    expect(doc).toContain('Term and Termination');
    expect(doc).toContain('Return or Destruction');
    expect(doc).toContain('Proprietary Rights');
    expect(doc).toContain('Disclaimer');
    expect(doc).toContain('Governing Law and Jurisdiction');
    expect(doc).toContain('Equitable Relief');
    expect(doc).toContain('General');

    // Check for numbered terms
    expect(doc).toMatch(/1\.\s*\*\*Introduction\*\*/);
    expect(doc).toMatch(/2\.\s*\*\*Use and Protection/);
    expect(doc).toMatch(/11\.\s*\*\*General\*\*/);
  });

  it('should replace custom values correctly', async () => {
    const { generateNDADocument } = await import('@/utils/templateEngine');

    const mockData = {
      purpose: 'Merger evaluation',
      effectiveDate: '2026-06-15',
      mndaTerm: '1year',
      mndaTermValue: '1',
      confidentialityTerm: '1year',
      confidentialityTermValue: '1',
      governingLaw: 'California',
      jurisdiction: 'San Francisco, CA',
      party1Name: 'Alice',
      party1Signature: 'Alice Signature',
      party1Title: 'Director',
      party1Company: 'Tech Corp',
      party1Address: '100 Main St',
      party2Name: 'Bob',
      party2Signature: 'Bob Signature',
      party2Title: 'VP',
      party2Company: 'Innovation LLC',
      party2Address: '200 Tech Ave',
    };

    const doc = generateNDADocument(mockData);

    // Check custom values
    expect(doc).toContain('Merger evaluation');
    expect(doc).toContain('2026-06-15');
    expect(doc).toContain('Alice Signature');
    expect(doc).toContain('Bob Signature');
    expect(doc).toContain('Tech Corp');
    expect(doc).toContain('Innovation LLC');
    expect(doc).toContain('California');
    expect(doc).toContain('San Francisco, CA');
  });
});
