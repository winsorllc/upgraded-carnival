import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createTestPdf() {
  const pdfDoc = await PDFDocument.create();
  
  // Page 1
  const page1 = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  page1.drawText('Sample PDF Document', {
    x: 50,
    y: 350,
    size: 24,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page1.drawText('This is a test document for nano-pdf skill.', {
    x: 50,
    y: 300,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page1.drawText('Title: Old Title', {
    x: 50,
    y: 250,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page1.drawText('Date: 2024', {
    x: 50,
    y: 230,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Page 2
  const page2 = pdfDoc.addPage([600, 400]);
  
  page2.drawText('Page 2', {
    x: 50,
    y: 350,
    size: 24,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page2.drawText('Company A - Headquarters', {
    x: 50,
    y: 300,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page2.drawText('Contact: John Doe', {
    x: 50,
    y: 280,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Save
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('/tmp/test.pdf', pdfBytes);
  console.log('Created test PDF: /tmp/test.pdf');
}

createTestPdf().catch(console.error);
