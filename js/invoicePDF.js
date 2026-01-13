/**
 * AssistHealth Invoice PDF Generator - Header/Footer on Every Page
 * Header and footer appear on all pages
 * Updated bank account details
 * Logo path: images/AH1.png
 */

class InvoicePDFManager {

  async downloadInvoice(invoiceId) {
    try {
      if (!invoiceId) {
        alert('Invoice ID required');
        return;
      }

      // Fetch invoice
      const invoice = await this.getInvoiceData(invoiceId);
      if (!invoice) {
        alert('Invoice not found');
        return;
      }

      // Create DOM container (must be visible)
      const wrapper = document.createElement('div');
      wrapper.id = 'invoice-pdf-root';
      wrapper.innerHTML = this.generateInvoiceHTML(invoice);

      Object.assign(wrapper.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '210mm',
        background: '#ffffff',
        zIndex: '9999'
      });

      document.body.appendChild(wrapper);

      // Wait for render
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 500));

      const invoiceElement = wrapper.querySelector('.invoice-container');
      if (!invoiceElement || invoiceElement.offsetHeight === 0) {
        document.body.removeChild(wrapper);
        throw new Error('Invoice did not render');
      }

      // Generate PDF with header/footer on every page
      const pdf = await html2pdf()
        .set({
          margin: [20, 10, 20, 10], // top, right, bottom, left - space for header/footer
          filename: `Invoice_${invoice.invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: { 
            mode: ['css', 'legacy'],
            avoid: '.no-break'
          }
        })
        .from(invoiceElement)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          const totalPages = pdf.internal.getNumberOfPages();
          
          // Add header and footer to each page
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            
            // Add header
            this.addHeader(pdf, invoice);
            
            // Add footer
            this.addFooter(pdf, i, totalPages);
          }
          
          return pdf;
        })
        .save();

      document.body.removeChild(wrapper);

    } catch (err) {
      console.error(err);
      alert('PDF generation failed: ' + err.message);
    }
  }

  // Add header to PDF page
  addHeader(pdf, invoice) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Add logo
    try {
      pdf.addImage('images/AH1.png', 'PNG', 10, 5, 30, 10);
    } catch (e) {
      console.warn('Logo not found:', e);
    }
    
    // Company name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(47, 158, 117); // Green color
    pdf.text('AssistHealth', pageWidth / 2, 12, { align: 'center' });
    
    // Tagline
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Health. Assured. Always.', pageWidth / 2, 16, { align: 'center' });
    
    // Line under header
    pdf.setDrawColor(47, 158, 117);
    pdf.setLineWidth(0.5);
    pdf.line(10, 18, pageWidth - 10, 18);
  }

  // Add footer to PDF page
  addFooter(pdf, currentPage, totalPages) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Line above footer
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    
    // Address
    pdf.text('Address: 3rd Floor, #850, D Block, Above Chaayos, Sahakar Nagar, Bangalore 560092', pageWidth / 2, pageHeight - 14, { align: 'center' });
    
    // Contact
    pdf.text('Email: admin@assisthealth.in | Phone: 9611232569 / 9611232519', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Page number
    pdf.setFontSize(8);
    pdf.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 15, pageHeight - 6, { align: 'right' });
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

  // Format date as DD/MM/YYYY
  formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  generateInvoiceHTML(invoice) {
    // Show ALL items - no limit
    const displayItems = invoice.items;
    
    const itemsHTML = displayItems.length
      ? displayItems.map((item, i) => `
        <tr class="no-break">
          <td style="text-align: center;">${i + 1}</td>
          <td>${item.description}</td>
          <td style="text-align: center;">${item.qty}</td>
          <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
          <td style="text-align: right;">₹${(item.qty * item.price).toLocaleString('en-IN')}</td>
        </tr>
      `).join('')
      : `
        <tr class="no-break">
          <td style="text-align: center;">1</td>
          <td style="height:60px;"></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;

    return `
<style>
${this.getStyles()}
</style>

<div class="invoice-container">

  <!-- LOGO AND COMPANY INFO -->
  <div class="header-section no-break">
    <div style="text-align: center; margin-bottom: 15px;">
      <img src="images/AH1.png" alt="AssistHealth Logo" style="height: 40px; margin-bottom: 5px;">
      <div class="company-name">AssistHealth</div>
      <div class="tagline">Health. Assured. Always.</div>
      <hr style="margin: 8px 0; border: none; border-top: 1px solid #2f9e75; width: 100%;">
    </div>
  </div>

  <!-- INVOICE INFO (First page only) -->
  <div class="info-section no-break">
    <div class="info-row">
      <div class="info-col">
        <div class="info-label">Invoice To:</div>
        <div>${invoice.invoiceTo.name || ''}</div>
        ${invoice.invoiceTo.address ? `<div>${invoice.invoiceTo.address}</div>` : ''}
        ${invoice.invoiceTo.email ? `<div>${invoice.invoiceTo.email}</div>` : ''}
        ${invoice.invoiceTo.phone ? `<div>${invoice.invoiceTo.phone}</div>` : ''}
      </div>
      <div class="info-col info-right">
        <div><span class="info-label">Invoice Number:</span> ${invoice.invoiceNumber}</div>
        <div><span class="info-label">Invoice Date:</span> ${this.formatDate(invoice.invoiceDate)}</div>
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <table class="items">
    <thead>
      <tr>
        <th style="width: 8%;">NO</th>
        <th style="width: 42%;">DESCRIPTION</th>
        <th style="width: 12%;">QTY</th>
        <th style="width: 19%;">PRICE</th>
        <th style="width: 19%;">SUBTOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
    <tfoot class="no-break">
      <tr>
        <td colspan="4" class="total-label">GRAND TOTAL</td>
        <td class="total-value">₹${invoice.grandTotal.toLocaleString('en-IN')}</td>
      </tr>
    </tfoot>
  </table>

  <!-- ACCOUNT DETAILS - UPDATED -->
  <div class="account no-break">
    <div class="account-title">Account Details</div>
    <div class="account-grid">
      <div><span class="acc-label">Mode:</span> ${invoice.modeOfPayment}</div>
      <div><span class="acc-label">G PAY:</span> 9611232569</div>
      <div><span class="acc-label">Bank:</span> AXIS BANK LTD</div>
      <div><span class="acc-label">Account Number:</span> 925020009464421</div>
      <div><span class="acc-label">Account Name:</span> AssistHealth</div>
      <div><span class="acc-label">IFSC Code:</span> UTIB0000094</div>
    </div>
  </div>

  <!-- GST Note -->
  <div class="gst-note no-break">
    GST not applicable. This is a system-generated invoice and does not require a signature.
  </div>

</div>
`;
  }

  getStyles() {
    return `
* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body { 
  font-family: Arial, sans-serif; 
}

.invoice-container {
  width: 190mm;
  padding: 0 10mm;
  background: #ffffff;
}

/* Prevent breaking inside important sections */
.no-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* INFO SECTION */
.info-section {
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ddd;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  line-height: 1.6;
}

.info-col {
  flex: 1;
}

.info-right {
  text-align: right;
  flex: 0 0 220px;
}

.info-label {
  font-weight: bold;
  color: #333;
}

/* TABLE */
.items {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.items thead th {
  background: #2f9e75;
  color: white;
  padding: 10px 8px;
  border: 1px solid #2f9e75;
  text-align: left;
  font-weight: bold;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.items tbody td {
  border: 1px solid #2f9e75;
  padding: 10px 8px;
  vertical-align: top;
  font-size: 12px;
  line-height: 1.4;
}

.items tfoot td {
  background: #2f9e75;
  color: white;
  font-weight: bold;
  padding: 10px 8px;
  border: 1px solid #2f9e75;
  font-size: 14px;
}

.total-label {
  text-align: right;
  padding-right: 15px !important;
  letter-spacing: 0.5px;
}

.total-value {
  text-align: right;
  font-size: 15px !important;
  letter-spacing: 0.5px;
}

/* ACCOUNT DETAILS */
.account {
  margin-bottom: 12px;
  padding: 10px;
  background: #f9f9f9;
  border-left: 3px solid #2f9e75;
  font-size: 11px;
}

.account-title {
  font-weight: bold;
  font-size: 12px;
  color: #2f9e75;
  margin-bottom: 8px;
}

.account-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 15px;
  line-height: 1.7;
}

.acc-label {
  font-weight: bold;
  color: #333;
}

/* GST NOTE */
.header-section {
  text-align: center;
  margin-bottom: 15px;
}

.header-section img {
  height: 40px;
  margin-bottom: 5px;
}

.header-section div {
  line-height: 1.2;
}

.header-section .company-name {
  font-size: 18px;
  font-weight: bold;
  color: #2f9e75;
}

.header-section .tagline {
  font-size: 10px;
  color: #666;
}

.gst-note {
  text-align: center;
  font-size: 10px;
  color: #666;
  padding: 8px 0;
  font-style: italic;
}
`;
  }
}

window.invoicePDFManager = new InvoicePDFManager();