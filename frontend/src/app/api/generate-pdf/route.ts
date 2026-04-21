import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autotable from 'jspdf-autotable';
import { generateNDADocument, NDAPayload } from '@/utils/templateEngine';

// 将 Markdown 格式的 NDA 转换为 PDF
function markdownToPDF(markdown: string): ArrayBuffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 15;
  const maxWidth = pageWidth - margins * 2;
  let y = margins;

  const lines = markdown.split('\n');

  const addHeader = (level: 1 | 2 | 3, text: string, yOffset: number) => {
    doc.setFontSize(level === 1 ? 20 : level === 2 ? 16 : 14);
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

    if (i < tableLines.length) {
      i++;
    }

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
    }
    else {
      y = addParagraph(line, y);
    }

    if (y > 270) {
      doc.addPage();
      y = margins;
    }
  }

  return doc.output('arraybuffer');
}

// API 路由处理器
export async function POST(request: NextRequest) {
  try {
    const formData: NDAPayload = await request.json();

    // 生成完整文档
    const documentContent = generateNDADocument(formData);

    // 转换为 PDF
    const pdfBytes = markdownToPDF(documentContent);

    // 返回 PDF
    return new NextResponse(pdfBytes as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Mutual_NDA_${Date.now()}.pdf"`,
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
