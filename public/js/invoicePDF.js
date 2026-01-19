/**
 * AssistHealth Invoice PDF Generator - High-Quality Branding
 * Improved logo rendering using AH1.png
 * Professional aspect ratio and loading logic
 */

class InvoicePDFManager {

  constructor() {
    this.logoBase64 = null;
  }

  // Load and convert logo to base64
  async loadLogo() {
    if (this.logoBase64) return this.logoBase64;

    try {
      // Try to load the logo
      const img = new Image();
      img.crossOrigin = 'anonymous';

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Create canvas to convert to base64
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          this.logoBase64 = canvas.toDataURL('image/png');
          resolve(this.logoBase64);
        };

        img.onerror = () => {
          console.warn('Logo not found at images/AH1.png');
          resolve(null);
        };

        img.src = 'images/AH1.png';
      });
    } catch (error) {
      console.warn('Logo loading failed:', error);
      return null;
    }
  }

  async downloadInvoice(invoiceId) {
    try {
      if (!invoiceId) {
        alert('Invoice ID required');
        return;
      }

      // Show loading message
      const loadingMsg = document.createElement('div');
      loadingMsg.textContent = 'Generating PDF...';
      loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#2f9e75;color:white;padding:20px 40px;border-radius:8px;z-index:10000;font-family:Arial;font-size:16px;';
      document.body.appendChild(loadingMsg);

      // Load logo first
      await this.loadLogo();

      // Fetch invoice
      const invoice = await this.getInvoiceData(invoiceId);
      if (!invoice) {
        document.body.removeChild(loadingMsg);
        alert('Invoice not found');
        return;
      }

      // Create DOM container
      const wrapper = document.createElement('div');
      wrapper.id = 'invoice-pdf-root';
      wrapper.innerHTML = this.generateInvoiceHTML(invoice);

      Object.assign(wrapper.style, {
        position: 'absolute',
        top: '-10000px',
        left: '-10000px',
        width: '210mm',
        background: '#ffffff'
      });

      document.body.appendChild(wrapper);

      // Wait for complete render
      await new Promise(r => setTimeout(r, 1000));

      const invoiceElement = wrapper.querySelector('.invoice-container');
      if (!invoiceElement) {
        document.body.removeChild(wrapper);
        document.body.removeChild(loadingMsg);
        throw new Error('Invoice did not render');
      }

      // Generate PDF
      const opt = {
        margin: [25, 10, 25, 10],
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.no-break', 'tr']
        }
      };

      await html2pdf()
        .set(opt)
        .from(invoiceElement)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          const totalPages = pdf.internal.getNumberOfPages();

          // Add header and footer to each page
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            this.addHeader(pdf, invoice);
            this.addFooter(pdf, i, totalPages);
          }

          return pdf;
        })
        .save();

      // Cleanup
      document.body.removeChild(wrapper);
      document.body.removeChild(loadingMsg);

    } catch (err) {
      console.error('PDF Error:', err);
      alert('PDF generation failed. Please check console for details.');

      // Cleanup on error
      const wrapper = document.getElementById('invoice-pdf-root');
      if (wrapper) document.body.removeChild(wrapper);
    }
  }

  addHeader(pdf, invoice) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add logo on the left - AH1.png is square-ish, use 15x15 size
    if (this.logoBase64) {
      try {
        // AH1.png looks better when larger and square
        pdf.addImage(this.logoBase64, 'PNG', 10, 4, 15, 15);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    // Company info in center
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(47, 158, 117);
    pdf.text('AssistHealth', pageWidth / 2, 11, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Health. Assured. Always.', pageWidth / 2, 16, { align: 'center' });

    // Header line
    pdf.setDrawColor(47, 158, 117);
    pdf.setLineWidth(0.8);
    pdf.line(10, 20, pageWidth - 10, 20);
  }

  addFooter(pdf, currentPage, totalPages) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.4);
    pdf.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);

    // Footer text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);

    const addressText = 'Address: 3rd Floor, #850, D Block, Above Chaayos, Sahakar Nagar, Bangalore 560092';
    pdf.text(addressText, pageWidth / 2, pageHeight - 16, { align: 'center' });

    const contactText = 'Email: admin@assisthealth.in | Phone: 9611232569 / 9611232519';
    pdf.text(contactText, pageWidth / 2, pageHeight - 12, { align: 'center' });

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  }

  async getInvoiceData(invoiceId) {
    const doc = await window.firestore
      .collection('invoices')
      .doc(invoiceId)
      .get();

    if (!doc.exists) return null;

    const d = doc.data();
    return {
      invoiceNumber: d.invoiceNumber || '',
      invoiceDate: d.invoiceDate || '',
      invoiceTo: d.invoiceTo || {},
      items: d.items || [],
      subtotal: d.subtotal || 0,
      grandTotal: d.grandTotal || 0,
      modeOfPayment: d.modeOfPayment || 'G PAY'
    };
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  generateInvoiceHTML(invoice) {
    const itemsHTML = invoice.items && invoice.items.length
      ? invoice.items.map((item, i) => `
        <tr class="item-row no-break">
          <td class="center-text">${i + 1}</td>
          <td>${item.description || ''}</td>
          <td class="center-text">${item.qty || 0}</td>
          <td class="right-text">₹${(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="right-text">₹${((item.qty || 0) * (item.price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `).join('')
      : '<tr class="no-break"><td class="center-text">1</td><td style="height:60px;"></td><td></td><td></td><td></td></tr>';

    return `
<style>
* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body { 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.invoice-container {
  width: 190mm;
  padding: 0 10mm;
  background: #ffffff;
  color: #333;
}

.no-break {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}

/* INVOICE INFO */
.info-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  margin-top: 20px;
  padding: 18px;
  background: #f9fafb;
  border-radius: 6px;
  border-left: 4px solid #2f9e75;
}

.info-left, .info-right {
  font-size: 13px;
  line-height: 1.8;
}

.info-right {
  text-align: right;
}

.label {
  font-weight: 700;
  color: #2f9e75;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.customer-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 4px 0;
}

.customer-detail {
  color: #555;
  font-size: 12px;
}

.invoice-number {
  font-size: 16px;
  font-weight: 700;
  color: #2f9e75;
}

/* TABLE */
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: 6px;
  overflow: hidden;
}

.items-table thead th {
  background: linear-gradient(135deg, #2f9e75 0%, #259872 100%);
  color: #ffffff;
  padding: 14px 12px;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  border: none;
}

.items-table tbody td {
  padding: 13px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  color: #374151;
}

.item-row:nth-child(odd) {
  background: #ffffff;
}

.item-row:nth-child(even) {
  background: #f9fafb;
}

.center-text {
  text-align: center;
}

.right-text {
  text-align: right;
  font-weight: 600;
}

.items-table tfoot td {
  background: linear-gradient(135deg, #2f9e75 0%, #259872 100%);
  color: #ffffff;
  font-weight: 700;
  padding: 16px 12px;
  font-size: 15px;
  border: none;
}

.total-label {
  text-align: right;
  padding-right: 20px !important;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.total-amount {
  text-align: right;
  font-size: 17px !important;
  letter-spacing: 0.5px;
}

/* ACCOUNT DETAILS */
.account-section {
  margin-bottom: 20px;
  padding: 18px;
  background: linear-gradient(135deg, #f8fffe 0%, #ffffff 100%);
  border-radius: 6px;
  border: 1px solid #d1fae5;
  border-left: 4px solid #2f9e75;
}

.account-title {
  font-weight: 700;
  font-size: 14px;
  color: #2f9e75;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 25px;
  font-size: 12px;
  line-height: 1.9;
}

.account-item {
  color: #374151;
}

.account-label {
  font-weight: 600;
  color: #2f9e75;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* FOOTER NOTE */
.footer-note {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  padding: 15px 0;
  font-style: italic;
  border-top: 1px solid #e5e7eb;
  margin-top: 15px;
}
</style>

<div class="invoice-container">

  <!-- INVOICE INFO -->
  <div class="info-section no-break">
    <div class="info-left">
      <div class="label">Invoice To:</div>
      <div class="customer-name">${invoice.invoiceTo.name || ''}</div>
      ${invoice.invoiceTo.address ? `<div class="customer-detail">${invoice.invoiceTo.address}</div>` : ''}
      ${invoice.invoiceTo.email ? `<div class="customer-detail">${invoice.invoiceTo.email}</div>` : ''}
      ${invoice.invoiceTo.phone ? `<div class="customer-detail">${invoice.invoiceTo.phone}</div>` : ''}
    </div>
    <div class="info-right">
      <div class="label">Invoice Number</div>
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div style="margin-top:10px;">
        <div class="label">Invoice Date</div>
        <div style="font-weight:600;color:#374151;margin-top:2px;">${this.formatDate(invoice.invoiceDate)}</div>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:8%;">No</th>
        <th style="width:42%;">Description</th>
        <th style="width:12%;text-align:center;">Qty</th>
        <th style="width:19%;text-align:right;">Price</th>
        <th style="width:19%;text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
    <tfoot class="no-break">
      <tr>
        <td colspan="4" class="total-label">Grand Total</td>
        <td class="total-amount">₹${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  <!-- ACCOUNT DETAILS -->
  <div class="account-section no-break">
    <div class="account-title">Account Details</div>
    <div class="account-grid">
      <div class="account-item"><span class="account-label">Mode:</span> ${invoice.modeOfPayment}</div>
      <div class="account-item"><span class="account-label">G PAY:</span> 9611232569</div>
      <div class="account-item"><span class="account-label">Bank:</span> AXIS BANK LTD</div>
      <div class="account-item"><span class="account-label">Account Number:</span> 925020009464421</div>
      <div class="account-item"><span class="account-label">Account Name:</span> AssistHealth</div>
      <div class="account-item"><span class="account-label">IFSC Code:</span> UTIB0000094</div>
    </div>
  </div>

  <!-- FOOTER NOTE -->
  <div class="footer-note no-break">
    GST not applicable. This is a system-generated invoice and does not require a signature.
  </div>

</div>
`;
  }
}

window.invoicePDFManager = new InvoicePDFManager();