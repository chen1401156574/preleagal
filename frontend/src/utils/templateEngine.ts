// Template Engine - NDA, CSA, DPA templates

export interface NDAPayload {
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
  // CSA fields
  serviceProvider?: string;
  serviceProviderContact?: string;
  customer?: string;
  customerContact?: string;
  serviceDescription?: string;
  serviceTerm?: string;
  paymentTerms?: string;
  serviceLevel?: string;
  // DPA fields
  dataExporter?: string;
  dataExporterContact?: string;
  dataImporter?: string;
  dataImporterContact?: string;
  dataCategories?: string;
  processingPurpose?: string;
  dataTransfers?: string;
  securityMeasures?: string;
}

// Render table for NDA
export function renderNDATable(data: NDAPayload): string {
  const emptyValue = '_';
  return `| | **PARTY 1** | **PARTY 2** |
|:---|:----:|:----:|
|Signature|${data.party1Signature || emptyValue}|${data.party2Signature || emptyValue}|
|Print Name|${data.party1Name || emptyValue}|${data.party2Name || emptyValue}|
|Title|${data.party1Title || emptyValue}|${data.party2Title || emptyValue}|
|Company|${data.party1Company || emptyValue}|${data.party2Company || emptyValue}|
|Notice Address|${data.party1Address || emptyValue}|${data.party2Address || emptyValue}|
|Date|${data.effectiveDate}|${data.effectiveDate}|`;
}

// Render table for CSA
export function renderCSATable(data: NDAPayload): string {
  const emptyValue = '_';
  return `| | **SERVICE PROVIDER** | **CUSTOMER** |
|:---|:----:|:----:|
|Company|${data.serviceProvider || emptyValue}|${data.customer || emptyValue}|
|Contact|${data.serviceProviderContact || emptyValue}|${data.customerContact || emptyValue}|
|Date|${data.effectiveDate}|${data.effectiveDate}|`;
}

// Render table for DPA
export function renderDPATable(data: NDAPayload): string {
  const emptyValue = '_';
  return `| | **DATA EXPORTER** | **DATA IMPORTER** |
|:---|:----:|:----:|
|Company|${data.dataExporter || emptyValue}|${data.dataImporter || emptyValue}|
|Contact|${data.dataExporterContact || emptyValue}|${data.dataImporterContact || emptyValue}|
|Date|${data.effectiveDate}|${data.effectiveDate}|`;
}

// Render NDA Cover Page
export function renderNDACoverPage(data: NDAPayload): string {
  const normalizedMndaTerm = (data.mndaTermValue || '').trim();
  const mndaTermText = normalizedMndaTerm ? (isNaN(Number(normalizedMndaTerm)) ? normalizedMndaTerm : `${normalizedMndaTerm} year(s)`) : '______';

  const normalizedConfTerm = (data.confidentialityTermValue || '').trim();
  const confidentialityText = normalizedConfTerm ? (isNaN(Number(normalizedConfTerm)) ? normalizedConfTerm : `${normalizedConfTerm} year(s)`) : '______';

  return `# Mutual Non-Disclosure Agreement

## USING THIS MUTUAL NON-DISCLOSURE AGREEMENT

> This Mutual Non-Disclosure Agreement (the "MNDA") consists of: (1) this Cover Page and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 ("Standard Terms") identical to those posted at [commonpaper.com/standards/mutual-nda/1.0](https://commonpaper.com/standards/mutual-nda/1.0). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.

---

| | |
|:---|:---|
| **Purpose** | ${data.purpose || '______'} |
| **Effective Date** | ${data.effectiveDate || '______'} |
| **MNDA Term** | ${mndaTermText} |
| **Term of Confidentiality** | ${confidentialityText} |
| **Governing Law** | ${data.governingLaw || '______'} |
| **Jurisdiction** | ${data.jurisdiction || '______'} |

---

By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.`;
}

// Render CSA Cover Page
export function renderCSACoverPage(data: NDAPayload): string {
  return `# Cloud Service Agreement

## USING THIS CLOUD SERVICE AGREEMENT

> This Cloud Service Agreement (the "CSA") defines the terms of engagement between the Service Provider and the Customer for cloud computing services.

---

| | |
|:---|:---|
| **Purpose** | ${data.purpose || '______'} |
| **Effective Date** | ${data.effectiveDate || '______'} |
| **Service Provider** | ${data.serviceProvider || '______'} |
| **Customer** | ${data.customer || '______'} |
| **Service Description** | ${data.serviceDescription || '______'} |
| **Service Term** | ${data.serviceTerm || '______'} |
| **Governing Law** | ${data.governingLaw || '______'} |
| **Payment Terms** | ${data.paymentTerms || '______'} |

---

This agreement binds both parties as of the Effective Date.`;
}

// Render DPA Cover Page
export function renderDPACoverPage(data: NDAPayload): string {
  return `# Data Processing Agreement (DPA)

## USING THIS DATA PROCESSING AGREEMENT

> This Data Processing Agreement (the "DPA") is entered into for compliance with GDPR and other data protection regulations governing the processing of personal data.

---

| | |
|:---|:---|
| **Purpose** | ${data.purpose || '______'} |
| **Effective Date** | ${data.effectiveDate || '______'} |
| **Data Exporter** | ${data.dataExporter || '______'} |
| **Data Importer** | ${data.dataImporter || '______'} |
| **Data Categories** | ${data.dataCategories || '______'} |
| **Processing Purpose** | ${data.processingPurpose || '______'} |
| **International Transfers** | ${data.dataTransfers || '______'} |
| **Governing Law** | ${data.governingLaw || '______'} |

---

This DPA is incorporated into a main processing agreement.`;
}

// NDA Standard Terms
export function renderNDASubjectTerms(): string {
  return `# Standard Terms

1. **Introduction**. This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page) ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with discussions that (1) the Disclosing Party identifies as "confidential" or (2) should be reasonably understood as confidential due to its nature and the circumstances of its disclosure ("Confidential Information").

2. **Use and Protection**. The Receiving Party shall: (a) use Confidential Information solely for the **Purpose** (${dataPurpose}__); (b) not disclose Confidential Information to third parties without prior written approval, except to employees, agents, advisors having a reasonable need to know; and (c) protect Confidential Information using at least reasonable standards of care.

3. **Exceptions**. Obligations do not apply to information that is: (a) publicly available; (b) rightfully known prior to receipt; (c) rightfully obtained from a third party; or (d) independently developed.

4. **Legal Disclosure**. Required disclosures to authorities may be made with reasonable advance notice to the Disclosing Party.

5. **Term and Termination**. This MNDA commences on the **Effective Date** (${data.effectiveDate__}) and expires at the end of the **MNDA Term** (${termText__}). Obligations survive for the **Term of Confidentiality** (${confText__}).

6. **Return or Destruction**. Upon termination, the Receiving Party will cease using Confidential Information and destroy or return it.

7. **Proprietary Rights**. The Disclosing Party retains all intellectual property rights.

8. **Disclaimer**. ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTIES.

9. **Governing Law**. This MNDA is governed by the laws of **${data.governingLaw__}**. Disputes must be brought in **${data.jurisdiction__}**.

---

*Common Paper Mutual Non-Disclosure Agreement [Version 1.0](https://commonpaper.com/standards/mutual-nda/1.0/) - CC BY 4.0*`;
}

// Generate document based on template type
export function renderPreviewDocument(data: NDAPayload, showTable: boolean = false): string {
  // Default to NDA if no template specified
  const hasServiceFields = data.serviceProvider || data.customer || data.serviceDescription;
  const hasDataFields = data.dataExporter || data.dataImporter || data.dataCategories;

  if (hasServiceFields) {
    // CSA Template
    const parts: string[] = [];
    parts.push(renderCSACoverPage(data));

    if (showTable) {
      parts.push(renderCSATable(data));
    }

    const serviceDesc = data.serviceDescription || '______';
    const termText = data.serviceTerm || '______';

    parts.push(`
---

# Standard Service Terms

1. **Services**. The Service Provider shall provide the following services: ${serviceDesc}

2. **Term**. This CSA shall commence on the Effective Date and continue for the Service Term of ${termText}.

3. **Payment**. Customer shall pay according to the following Payment Terms: ${data.paymentTerms || '______'}

4. **Service Level**. Service Provider warrants the following Service Level: ${data.serviceLevel || '______'}

5. **Data Location**. All data shall be stored at: ${data.dataLocation || '______'}

6. **Security**. Service Provider maintains the following Security Standards: ${data.securityStandards || '______'}

7. **Governing Law**. This agreement is governed by the laws of **${data.governingLaw || '______'}**. Disputes shall be resolved in **${data.jurisdiction || '______'}**.

---

*Cloud Service Agreement - CC BY 4.0*`);

    return parts.join('\n\n');
  }

  if (hasDataFields) {
    // DPA Template
    const parts: string[] = [];
    parts.push(renderDPACoverPage(data));

    if (showTable) {
      parts.push(renderDPATable(data));
    }

    parts.push(`
---

# Standard DPA Terms

1. **Data Processing**. The Data Importer shall process personal data as follows:
   - Categories of data: ${data.dataCategories || '______'}
   - Purpose of processing: ${data.processingPurpose || '______'}
   - Type of data subjects: ${data.dataSubjects || '______'}

2. **International Transfers**. Data transfers outside EEA: ${data.dataTransfers || '______'}

3. **Security Measures**. Data Importer implements: ${data.securityMeasures || '______'}

4. **Sub-processors**. Use of subprocessors: ${data.subProcessors || 'No subprocessors'}

5. **Data Retention**. Data shall be retained for: ${data.dataRetention || '______'}

6. **Data Subject Rights**. Data Importer shall assist Data Exporter in fulfilling data subject rights requests.

7. **Breach Notification**. Data Importer shall notify Data Exporter of any breach within 24 hours.

8. **Governing Law**. This DPA is governed by **${data.governingLaw || '______'}** law.

---

*Data Processing Agreement - GDPR Compliant*`);

    return parts.join('\n\n');
  }

  // Default: NDA
  const parts: string[] = [];
  parts.push(renderNDACoverPage(data));

  const normalizedMndaTerm = (data.mndaTermValue || '').trim();
  const mndaTermText = normalizedMndaTerm ? (isNaN(Number(normalizedMndaTerm)) ? normalizedMndaTerm : `${normalizedMndaTerm} year(s)`) : '______';
  const normalizedConfTerm = (data.confidentialityTermValue || '').trim();
  const confText = normalizedConfTerm ? (isNaN(Number(normalizedConfTerm)) ? normalizedConfTerm : `${normalizedConfTerm} year(s)`) : '______';

  if (showTable) {
    parts.push(renderNDATable(data));
  }

  parts.push(`
---

# Standard NDA Terms

1. **Introduction**. This Mutual Non-Disclosure Agreement allows each party to disclose Confidential Information in connection with the **Purpose** (${data.purpose || '______'}). Each party's Confidential Information also includes the existence of discussions.

2. **Use and Protection**. The Receiving Party shall: (a) use Confidential Information solely for the **Purpose** (${data.purpose || '______'}); (b) not disclose to third parties except to employees, agents, advisors with reasonable need to know who are bound by confidentiality obligations; and (c) protect Confidential Information using at least reasonable standards of care.

3. **Exceptions**. Obligations do not apply to information that is: (a) publicly available; (b) rightfully known prior; (c) rightfully obtained from third party; or (d) independently developed.

4. **Legal Disclosure**. Required disclosures may be made with advance notice.

5. **Term and Termination**. This MNDA commences on the **Effective Date** (${data.effectiveDate || '______'}) and expires at the end of the **MNDA Term** (${mndaTermText}). Obligations survive for the **Term of Confidentiality** (${confText}).

6. **Return or Destruction**. Upon expiration, cease using Confidential Information and destroy or return it.

7. **Proprietary Rights**. The Disclosing Party retains all intellectual property rights.

8. **Disclaimer**. ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTIES.

9. **Governing Law**. This MNDA is governed by ${data.governingLaw || '______'} law. Disputes in **${data.jurisdiction || '______'}**.

10. **Equitable Relief**. Breach may cause irreparable harm; injunctive relief is available.

11. **General**. No assignment without consent. This MNDA constitutes entire agreement. Notices must be in writing. May be executed in counterparts.

---

*Common Paper Mutual Non-Disclosure Agreement [Version 1.0](https://commonpaper.com/standards/mutual-nda/1.0/) - CC BY 4.0*`);

  return parts.join('\n\n');
}
