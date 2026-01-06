// Excel Export Manager
class ExcelExportManager {
    constructor() {
        // Check if SheetJS library is available
        if (typeof XLSX === 'undefined') {
            console.error('SheetJS library not found. Please include xlsx.full.min.js in your HTML.');
        }
    }

    // Export entries to Excel
    async exportToExcel(entries, filters = null) {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Format entries for Excel
            const formattedEntries = entries.map((entry, index) => {
                return this.formatEntryForExcel(entry, index + 1);
            });
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(formattedEntries);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Service_Entries');
            
            // Add auto-width columns
            const colWidths = this.calculateColumnWidths(formattedEntries);
            ws['!cols'] = colWidths;
            
            // Add filters to header row
            ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + Object.keys(formattedEntries[0]).length)}1` };
            
            // Style header row
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!ws[address]) continue;
                
                // Bold and background color for headers
                if (!ws[address].s) ws[address].s = {};
                ws[address].s.font = { bold: true };
                ws[address].s.fill = {
                    fgColor: { rgb: "E6E6E6" },
                    bgColor: { rgb: "E6E6E6" }
                };
                ws[address].s.alignment = { horizontal: "center" };
            }
            
            // Generate filename
            const fileName = this.generateFileName();
            
            // Write file
            XLSX.writeFile(wb, fileName);
            
            // Hide loading state
            this.hideLoadingState();
            
            console.log('Excel export completed successfully');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.hideLoadingState();
            alert('Error exporting to Excel: ' + error.message);
        }
    }

    // Format single entry for Excel
    formatEntryForExcel(entry, slNo) {
        // Format currency fields with ₹ symbol
        const totalBillAmount = entry.totalBillAmount ? `₹${entry.totalBillAmount.toLocaleString()}` : '';
        const discountGiven = entry.discountGiven ? `₹${entry.discountGiven.toLocaleString()}` : '';
        const referralAmount = entry.referralAmount ? `₹${entry.referralAmount.toLocaleString()}` : '';
        const amountPaid = entry.paymentDetails && entry.paymentDetails.amountPaid ? `₹${entry.paymentDetails.amountPaid.toLocaleString()}` : '';
        
        // Format date as DD/MM/YYYY
        const dateStr = entry.date ? this.formatDate(entry.date) : '';
        const createdDate = entry.createdAt ? this.formatDate(entry.createdAt) : '';
        
        return {
            'SL No': slNo,
            'Date': dateStr,
            'Member Name': entry.memberName || '',
            'AHID': entry.ahid || '',
            'Service Type': entry.serviceTypeName || entry.serviceTypeId || '',
            'Package Type': entry.packageType || '',
            'Healthcare Provider': entry.hcpName || '',
            'Total Bill Amount': totalBillAmount,
            'Discount Given': discountGiven,
            'Collection Method': entry.collectionDetails ? entry.collectionDetails.collectedBy || '' : '',
            'Transaction Mode': entry.collectionDetails ? entry.collectionDetails.modeOfTransaction || '' : '',
            'Transaction ID': entry.collectionDetails ? entry.collectionDetails.transactionId || '' : '',
            'Referral Amount': referralAmount,
            'Referral Status': entry.referralStatus || '',
            'Referral Payment Mode': entry.referralPaymentDetails ? entry.referralPaymentDetails.paymentMode || '' : '',
            'Referral Transaction ID': entry.referralPaymentDetails ? entry.referralPaymentDetails.transactionId || '' : '',
            'Payment By Us': entry.paymentByUs || '',
            'Mode of Transfer': entry.paymentDetails ? entry.paymentDetails.mode || '' : '',
            'Paid To': entry.paymentDetails ? entry.paymentDetails.paidTo || '' : '',
            'Amount Paid': amountPaid,
            'Payment Status': entry.paymentDetails ? entry.paymentDetails.paymentStatus || '' : '',
            'Navigator Name': this.getNavigatorName(entry.navigatorId),
            'Created Date': createdDate
        };
    }

    // Format date as DD/MM/YYYY
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        let date;
        if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else if (dateValue && dateValue.toDate) {
            // Firestore timestamp
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            return '';
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    // Get navigator name by ID
    getNavigatorName(navigatorId) {
        if (!window.userManagement || !window.userManagement.navigators) {
            return '';
        }
        
        const navigator = window.userManagement.navigators.find(nav => nav.uid === navigatorId);
        return navigator ? navigator.name : '';
    }

    // Calculate column widths based on content
    calculateColumnWidths(data) {
        if (!data || data.length === 0) {
            return [];
        }
        
        const headers = Object.keys(data[0]);
        const colWidths = headers.map(header => {
            // Start with header length
            let maxWidth = header.length;
            
            // Check data in each row for this column
            data.forEach(row => {
                const cellValue = row[header];
                const cellLength = cellValue ? String(cellValue).length : 0;
                if (cellLength > maxWidth) {
                    maxWidth = cellLength;
                }
            });
            
            // Add some padding and cap the width
            maxWidth = Math.min(maxWidth + 2, 50);
            
            return { wch: maxWidth };
        });
        
        return colWidths;
    }

    // Generate filename with timestamp
    generateFileName() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        
        return `Service_Entries_${dateStr}_${timeStr}.xlsx`;
    }

    // Show loading state during export
    showLoadingState() {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('excel-export-loading');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'excel-export-loading';
            loadingOverlay.innerHTML = `
                <div class="loading-overlay">
                    <div class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Generating Excel file...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.style.display = 'flex';
    }

    // Hide loading state
    hideLoadingState() {
        const loadingOverlay = document.getElementById('excel-export-loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Initialize excel export manager
window.excelExportManager = new ExcelExportManager();