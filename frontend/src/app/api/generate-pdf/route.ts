import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autotable from 'jspdf-autotable';
import { renderPreviewDocument, NDAPayload } from '@/utils/templateEngine';

// Markdown to PDF converter
function markdownToPDF(markdown: string): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 15;
  const maxWidth = pageWidth - margins * 2;
  let y = margins;

  const lines = markdown.split('\n');

  const addHeader = (level: 1 | 2 | 3, text: string, yOffset: number) => {
    const fontSize = level === 1 ? 20 : level === 2 ? 16 : 14;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    const splitText = doc.splitTextToSize(text, maxWidth);
    doc.text(splitText, margins, yOffset);
    return yOffset + splitText.length * 6 + 3;
  };

  const addParagraph = (text: string, yOffset: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(text, maxWidth);
    doc.text(splitText, margins, yOffset);
    return yOffset + splitText.length * 6 + 3;
  };

  const addTable = (tableLines: string[], yOffset: number) => {
    const headers: string[][] = [];
    const data: string[][] = [];

    let i = 0;
    if (i < tableLines.length) {
      headers.push(tableLines[i].split('|').filter(s => s.trim()).map(s => s.trim()));
      i++;
    }

    if (i < tableLines.length) i++;

    while (i < tableLines.length) {
      data.push(tableLines[i].split('|').filter(s => s.trim()).map(s => s.trim()));
      i++;
    }

    if (headers.length > 0 && data.length > 0) {
      autotable(doc, {
        head: headers,
        body: data,
        startY: yOffset,
        margin: { left: margins, right: margins },
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 220, 220] },
      });
      y = yOffset + 50;
    }

    return y;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      if (y > 270) {
        doc.addPage();
        y = margins;
      }
      continue;
    }

    if (line.includes('|') && line.includes(':---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      y = addTable(tableLines, y);
      i--;
      continue;
    }

    if (line.startsWith('## ')) {
      y = addHeader(2, line.substring(3), y);
    } else if (line.startsWith('# ')) {
      y = addHeader(1, line.substring(2), y);
    } else {
      y = addParagraph(line, y);
    }

    if (y > 270) {
      doc.addPage();
      y = margins;
    }
  }

  return doc.output('arraybuffer');
}

// Add disclaimer to PDF content
function addDisclaimerToContent(content: string, templateType: string): string {
  const disclaimer = `
---

> **⚖️ 法律免责声明**
>
> 本文档由 AI 助手生成，仅供参考，不构成法律建议。请在签署前咨询专业律师进行审核。
>
> ---
>
> *${templateType} - PreLegal AI Document Generator*`;

  return content + disclaimer;
}

// API route handler
export async function POST(request: NextRequest) {
  try {
    const formData: NDAPayload = await request.json();

    // Determine template type based on data
    const hasServiceFields = formData.serviceProvider || formData.customer;
    const hasDataFields = formData.dataExporter || formData.dataImporter;

    let documentContent: string;
    let templateType = 'NDA';
    let filename = 'Mutual_NDA';

    if (hasServiceFields) {
      documentContent = renderPreviewDocument(formData, true);
      templateType = 'CSA';
      filename = 'Cloud_Service_Agreement';
    } else if (hasDataFields) {
      documentContent = renderPreviewDocument(formData, true);
      templateType = 'DPA';
      filename = 'Data_Processing_Agreement';
    } else {
      documentContent = renderPreviewDocument(formData, true);
      templateType = 'NDA';
      filename = 'Mutual_NDA';
    }

    // Add legal disclaimer
    documentContent = addDisclaimerToContent(documentContent, templateType);

    // Convert to PDF
    const pdfBytes = markdownToPDF(documentContent);

    return new NextResponse(pdfBytes as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
