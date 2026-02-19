// PDF Export Utility using jsPDF
export async function exportCustomerPDF(customer, transactions, businessName = 'Udhaari App') {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const bal = customer.balance || 0;

  // ── Header ──
  doc.setFillColor(28, 8, 60);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(22);
  doc.setTextColor(163, 92, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('UDHAARI', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Khata App', 14, 25);
  doc.text(`Business: ${businessName}`, 14, 31);

  // Date right side
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Report Date: ${now}`, pageWidth - 14, 18, { align: 'right' });

  // ── Customer Info ──
  doc.setTextColor(30, 10, 50);
  doc.setFillColor(245, 240, 255);
  doc.roundedRect(10, 46, pageWidth - 20, 28, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setTextColor(60, 10, 100);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name, 16, 57);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 130);
  if (customer.phone) doc.text(`Phone: ${customer.phone}`, 16, 64);
  if (customer.tag) doc.text(`Tag: ${customer.tag.toUpperCase()}`, 16, 70);

  // Balance
  const balText = `${bal >= 0 ? '+' : ''}₹${Math.abs(bal).toLocaleString('en-IN')}`;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(bal >= 0 ? 5 : 200, bal >= 0 ? 150 : 30, bal >= 0 ? 90 : 30);
  doc.text(balText, pageWidth - 16, 57, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(120, 100, 140);
  doc.setFont('helvetica', 'normal');
  doc.text(bal > 0 ? 'To Receive' : bal < 0 ? 'To Give' : 'Settled', pageWidth - 16, 64, { align: 'right' });

  // ── Transactions Table ──
  const rows = transactions.map(tx => [
    tx.date || (tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('en-IN') : ''),
    tx.type === 'credit' ? 'Received (+)' : 'Paid (-)',
    `₹${tx.amount?.toLocaleString('en-IN') || 0}`,
    tx.note || '—'
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Date', 'Type', 'Amount', 'Note']],
    body: rows,
    headStyles: {
      fillColor: [28, 8, 60],
      textColor: [163, 92, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [40, 20, 70] },
    alternateRowStyles: { fillColor: [248, 244, 255] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 30 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 'auto' }
    },
    styles: { font: 'helvetica', overflow: 'linebreak' },
    margin: { left: 10, right: 10 },
  });

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 140, 170);
    doc.text(
      `Udhaari App — Smart Khata | Page ${i} of ${pageCount}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`udhaari_${customer.name.replace(/\s+/g, '_')}_report.pdf`);
}

export async function exportAllCustomersPDF(customers, businessName = 'Udhaari App') {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(28, 8, 60);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(22);
  doc.setTextColor(163, 92, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('UDHAARI — FULL REPORT', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(`Business: ${businessName}`, 14, 28);

  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${now}`, pageWidth - 14, 18, { align: 'right' });

  // Summary
  const totalLena = customers.reduce((s, c) => c.balance > 0 ? s + c.balance : s, 0);
  const totalDena = customers.reduce((s, c) => c.balance < 0 ? s + Math.abs(c.balance) : s, 0);

  doc.setFillColor(245, 240, 255);
  doc.roundedRect(10, 46, pageWidth - 20, 18, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(60, 10, 100);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total to Receive: ₹${totalLena.toLocaleString('en-IN')}`, 16, 55);
  doc.text(`Total to Give: ₹${totalDena.toLocaleString('en-IN')}`, pageWidth / 2, 55);
  doc.text(`Net: ₹${(totalLena - totalDena).toLocaleString('en-IN')}`, pageWidth - 16, 55, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(120, 100, 140);
  doc.text(`Total Customers: ${customers.length}`, 16, 61);

  // Table
  const rows = customers.map(c => [
    c.name,
    c.phone || '—',
    c.tag || '—',
    c.balance > 0 ? `+₹${c.balance.toLocaleString('en-IN')}` : `₹${Math.abs(c.balance || 0).toLocaleString('en-IN')}`,
    c.balance > 0 ? 'To Receive' : c.balance < 0 ? 'To Give' : 'Settled',
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Name', 'Phone', 'Tag', 'Balance', 'Status']],
    body: rows,
    headStyles: { fillColor: [28, 8, 60], textColor: [163, 92, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [40, 20, 70] },
    alternateRowStyles: { fillColor: [248, 244, 255] },
    styles: { font: 'helvetica' },
    margin: { left: 10, right: 10 },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.section === 'body') {
        const val = data.cell.raw;
        if (val.startsWith('+')) data.cell.styles.textColor = [5, 150, 90];
        else if (val !== '₹0') data.cell.styles.textColor = [200, 30, 30];
      }
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 140, 170);
    doc.text(
      `Udhaari App — Smart Khata | Page ${i} of ${pageCount}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`udhaari_all_customers_${now.replace(/\s/g, '_')}.pdf`);
}
