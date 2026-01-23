// Office Expenses Excel Export Manager
class OfficeExpensesExport {
    constructor() {
        // Check if SheetJS library is available
        if (typeof XLSX === 'undefined') {
            console.error('SheetJS library not found. Please include xlsx.full.min.js in your HTML.');
        }
    }

    // Export expenses to Excel
    async exportToExcel(expenses) {
        try {
            if (!expenses || expenses.length === 0) {
                alert('No expenses to export');
                return;
            }

            // Show loading state
            this.showLoadingState();

            // Format expenses for Excel
            const formattedExpenses = expenses.map((expense) => {
                return this.formatExpenseForExcel(expense);
            });

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(formattedExpenses);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Office_Expenses');

            // Add auto-width columns
            const colWidths = this.calculateColumnWidths(formattedExpenses);
            ws['!cols'] = colWidths;

            // Add filters to header row
            const numCols = Object.keys(formattedExpenses[0]).length;
            ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + numCols)}1` };

            // Style header row
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!ws[address]) continue;

                // Bold and background color for headers
                if (!ws[address].s) ws[address].s = {};
                ws[address].s.font = { bold: true };
                ws[address].s.fill = {
                    fgColor: { rgb: "2f9e75" }, // AssistHealth green
                    bgColor: { rgb: "2f9e75" }
                };
                ws[address].s.alignment = { horizontal: "center" };
            }


            // Generate filename
            const fileName = this.generateFileName();

            // Write file with fallback for better compatibility
            try {
                XLSX.writeFile(wb, fileName);
                console.log('Excel file downloaded via XLSX.writeFile:', fileName);
            } catch (writeError) {
                console.warn('XLSX.writeFile failed, using fallback method:', writeError);
                // Fallback: Create blob and trigger download manually
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 100);
                console.log('Excel file downloaded via fallback method:', fileName);
            }

            // Hide loading state
            this.hideLoadingState();

            console.log('Excel export completed successfully');

        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.hideLoadingState();
            alert('Error exporting to Excel: ' + error.message);
        }
    }

    // Format single expense for Excel
    formatExpenseForExcel(expense) {
        // Format currency with ₹ symbol
        const amount = expense.amount ? `₹${expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00';

        // Format dates as DD/MM/YYYY
        const date = this.formatDate(expense.date);
        const createdDate = this.formatDate(expense.createdAt);

        return {
            'S.No': expense.slNo || '',
            'Date': date,
            'Category': expense.expenseCategory || '',
            'Details': expense.details || '',
            'Paid By': expense.paidBy || '',
            'Paid To': expense.paidTo || '',
            'Amount': amount,
            'Mode': expense.modeOfTransaction || '',
            'Transaction ID': expense.transactionId || '',
            'Created By': expense.createdByName || '',
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
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `Office_Expenses_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`;
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

// Initialize office expenses export manager
window.officeExpensesExport = new OfficeExpensesExport();
