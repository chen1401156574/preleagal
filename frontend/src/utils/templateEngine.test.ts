import { renderPreviewDocument, renderTable, generateNDADocument } from './templateEngine';

describe('Template Engine', () => {
  const defaultData = {
    purpose: 'Evaluating a business collaboration',
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

  describe('renderTable', () => {
    it('should render party table with correct data', () => {
      const result = renderTable(defaultData);
      expect(result).toContain('PARTY 1');
      expect(result).toContain('PARTY 2');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Company A');
      expect(result).toContain('Company B');
    });

    it('should use default value for empty names', () => {
      const emptyData = { ...defaultData, party1Name: '', party2Name: '' };
      const result = renderTable(emptyData);
      expect(result).toContain('______');
    });
  });

  describe('renderPreviewDocument', () => {
    it('should include purpose in rendered document', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('Evaluating a business collaboration');
    });

    it('should include effective date in rendered document', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('2026-01-01');
    });

    it('should show 1 year term when mndaTerm is 1year', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('1 year');
      expect(result).not.toContain('Indefinite');
    });

    it('should show indefinite term when mndaTerm is continues', () => {
      const data = { ...defaultData, mndaTerm: 'continues' };
      const result = renderPreviewDocument(data, true);
      expect(result).toContain('Indefinite');
    });

    it('should include governing law in document', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('Delaware');
    });

    it('should include jurisdiction in document', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('New Castle, DE');
    });

    it('should include all 11 standard terms', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toMatch(/1\.\s*\*\*Introduction\*\*/);
      expect(result).toMatch(/2\.\s*\*\*Use and Protection/);
      expect(result).toMatch(/3\.\s*\*\*Exceptions\*\*/);
      expect(result).toMatch(/4\.\s*\*\*Disclosures Required/);
      expect(result).toMatch(/5\.\s*\*\*Term and Termination\*\*/);
      expect(result).toMatch(/6\.\s*\*\*Return or Destruction/);
      expect(result).toMatch(/7\.\s*\*\*Proprietary Rights\*\*/);
      expect(result).toMatch(/8\.\s*\*\*Disclaimer\*\*/);
      expect(result).toMatch(/9\.\s*\*\*Governing Law and Jurisdiction\*\*/);
      expect(result).toMatch(/10\.\s*\*\*Equitable Relief\*\*/);
      expect(result).toMatch(/11\.\s*\*\*General\*\*/);
    });

    it('should include party names in document', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
    });

    it('should show cover page when showTable is true', () => {
      const result = renderPreviewDocument(defaultData, true);
      expect(result).toContain('Mutual Non-Disclosure Agreement');
      expect(result).toContain('## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT');
    });
  });

  describe('generateNDADocument', () => {
    it('should return a complete document string', () => {
      const result = generateNDADocument(defaultData);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should replace purpose placeholder correctly', () => {
      const result = generateNDADocument(defaultData);
      expect(result).toContain(defaultData.purpose);
    });

    it('should replace effective date placeholder correctly', () => {
      const result = generateNDADocument(defaultData);
      expect(result).toContain(defaultData.effectiveDate);
    });

    it('should replace governing law placeholder correctly', () => {
      const result = generateNDADocument(defaultData);
      expect(result).toContain(defaultData.governingLaw);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const emptyData = {
        ...defaultData,
        purpose: '',
        governingLaw: '',
        jurisdiction: '',
      };
      const result = renderPreviewDocument(emptyData, true);
      expect(result).toContain('______');
    });

    it('should handle special characters in input', () => {
      const specialData = {
        ...defaultData,
        purpose: 'Testing: special & characters < >',
      };
      const result = renderPreviewDocument(specialData, true);
      expect(result).toContain('Testing: special & characters < >');
    });

    it('should handle long text', () => {
      const longPurpose = 'A'.repeat(1000);
      const longData = { ...defaultData, purpose: longPurpose };
      const result = renderPreviewDocument(longData, true);
      expect(result).toContain(longPurpose);
    });
  });
});
