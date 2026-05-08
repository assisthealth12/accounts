// Table Management System
class TableManager {
    constructor() {
        this.entries = [];
        this.filteredEntries = [];
        this.currentSort = { column: null, direction: 'asc' };
        this.currentPage = 1;
        this.pageSize = 25;
        this.initTable();
    }

    // Initialize table
    initTable() {
        // The table is already in the HTML, we just need to populate it
    }

    // Update table with entries
    updateTable(entries) {
        this.entries = entries;
        this.currentPage = 1;
        this.renderTable();
    }

    // Render table with entries
    renderTable() {
        const tableBody = document.getElementById('entries-table-body');
        if (!tableBody) return;

        // Clear existing rows
        tableBody.innerHTML = '';

        const totalPages = this.getTotalPages();
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const pageEntries = this.getPaginatedEntries();

        if (pageEntries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="24" class="empty-table-message">No entries found</td>';
            tableBody.appendChild(row);
            this.renderPagination();
            return;
        }

        // Add rows for each entry
        pageEntries.forEach(entry => {
            const row = this.createTableRow(entry);
            tableBody.appendChild(row);
        });

        // Add event listeners for edit buttons
        this.addEventListeners();
        this.renderPagination();
    }

    getTotalPages() {
        return Math.max(1, Math.ceil(this.entries.length / this.pageSize));
    }

    getPaginatedEntries() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        return this.entries.slice(startIndex, startIndex + this.pageSize);
    }

    renderPagination() {
        const table = document.getElementById('entries-table');
        if (!table || !table.parentElement) return;

        let pagination = document.getElementById('entries-pagination');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.id = 'entries-pagination';
            pagination.className = 'pagination-controls';
            table.parentElement.insertAdjacentElement('afterend', pagination);
        }

        const totalPages = this.getTotalPages();
        const totalEntries = this.entries.length;
        const startEntry = totalEntries === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
        const endEntry = Math.min(this.currentPage * this.pageSize, totalEntries);

        pagination.innerHTML = `
            <div class="pagination-info">Showing ${startEntry}-${endEntry} of ${totalEntries}</div>
            <div class="pagination-actions">
                <button type="button" class="btn-secondary pagination-btn" data-page-action="prev" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span class="pagination-page">Page ${this.currentPage} of ${totalPages}</span>
                <button type="button" class="btn-secondary pagination-btn" data-page-action="next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;

        pagination.querySelectorAll('.pagination-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-page-action');
                if (action === 'prev' && this.currentPage > 1) {
                    this.currentPage -= 1;
                } else if (action === 'next' && this.currentPage < totalPages) {
                    this.currentPage += 1;
                }

                this.renderTable();
            });
        });
    }

    // Create a table row for an entry
    createTableRow(entry) {
        const row = document.createElement('tr');
        row.setAttribute('data-entry-id', entry.id);

        // Format values for display - handle 0 as valid number
        const totalBillAmount = (entry.totalBillAmount !== null && entry.totalBillAmount !== undefined)
            ? `₹${entry.totalBillAmount.toLocaleString()}` : '';
        const discountGiven = (entry.discountGiven !== null && entry.discountGiven !== undefined)
            ? `₹${entry.discountGiven.toLocaleString()}` : '';
        const referralAmount = (entry.referralAmount !== null && entry.referralAmount !== undefined)
            ? `₹${entry.referralAmount.toLocaleString()}` : '';
        const amountPaid = (entry.paymentDetails && entry.paymentDetails.amountPaid !== null && entry.paymentDetails.amountPaid !== undefined)
            ? `₹${entry.paymentDetails.amountPaid.toLocaleString()}` : '';

        // Format date
        const dateStr = formatDateDDMMYYYY(entry.date);

        // Get service name
        const serviceName = this.getServiceNameById(entry.serviceTypeId);

        // Format collection details
        const collectionDetails = entry.collectionDetails || {};
        const collectedBy = collectionDetails.collectedBy || '';
        const modeOfTransaction = collectionDetails.modeOfTransaction || '';
        const transactionId = collectionDetails.transactionId || '';

        // Format referral payment details
        const referralPaymentDetails = entry.referralPaymentDetails || {};
        const referralPaymentMode = referralPaymentDetails.paymentMode || '';
        const referralTransactionId = referralPaymentDetails.transactionId || '';

        // Format payment by us details
        let paymentByUsText = 'No';
        let whomToPay = '-';
        let totalPaymentAmount = '-';
        let paidPaymentAmount = '-';
        let balancePaymentAmount = '-';
        let paymentStatusText = '-';
        let paymentsCount = '0';

        if (entry.paymentByUs && entry.paymentByUs.enabled) {
            paymentByUsText = 'Yes';
            whomToPay = entry.paymentByUs.whomToPay || '-';
            totalPaymentAmount = `₹${(entry.paymentByUs.totalAmount || 0).toLocaleString()}`;
            paidPaymentAmount = `₹${(entry.paymentByUs.paidAmount || 0).toLocaleString()}`;
            balancePaymentAmount = `₹${(entry.paymentByUs.balanceAmount || 0).toLocaleString()}`;
            paymentStatusText = entry.paymentByUs.paymentStatus || '-';
            paymentsCount = (entry.paymentByUs.payments || []).length;
        }

        row.innerHTML = `
            <td>${entry.slNo || ''}</td>
            <td>${dateStr}</td>
            <td>${entry.memberName || ''}</td>
            <td>${entry.ahid || ''}</td>
            <td>${serviceName}</td>
            <td>${entry.packageType || ''}</td>
            <td>${entry.hcpName || ''}</td>
            <td>${collectedBy}</td>
            <td>${modeOfTransaction}</td>
            <td>${transactionId}</td>
            <td>${totalBillAmount}</td>
            <td>${discountGiven}</td>
            <td>${referralAmount}</td>
            <td>${entry.referralStatus || ''}</td>
            <td>${referralPaymentMode}</td>
            <td>${referralTransactionId}</td>
            <td>${paymentByUsText}</td>
            <td>${whomToPay}</td>
            <td>${totalPaymentAmount}</td>
            <td>${paidPaymentAmount}</td>
            <td>${balancePaymentAmount}</td>
            <td><span class="status status-${paymentStatusText.replace(/ /g, '-').toLowerCase()}">${paymentStatusText}</span></td>
            <td>${paymentsCount}</td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" data-entry-id="${entry.id}">Edit</button>
                <button class="btn-action btn-delete" data-entry-id="${entry.id}">Delete</button>
            </td>
        `;

        return row;
    }

    // Get service name by ID
    getServiceNameById(serviceId) {
        if (!window.userManagement || !window.userManagement.services) {
            return serviceId || 'Unknown';
        }

        const service = window.userManagement.services.find(s => s.id === serviceId);
        return service ? service.name : serviceId || 'Unknown';
    }

    // Add event listeners to table elements
    addEventListeners() {
        // Add event listeners for edit buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                this.editEntry(entryId);
            });
        });

        // Add event listeners for delete buttons are handled in addEntry.js
    }

    // Edit entry
    editEntry(entryId) {
        // Find the entry to edit
        const entry = this.entries.find(e => e.id === entryId);
        if (entry) {
            window.addEntryManager.openAddEntryModal(entry);
        }
    }

    // Sort table by column
    sortTable(column) {
        if (this.currentSort.column === column) {
            // If clicking the same column, toggle direction
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // If clicking a new column, sort ascending
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        this.currentPage = 1;

        // Sort the entries
        this.entries.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            // Handle special cases for sorting
            if (column === 'date') {
                valA = new Date(valA);
                valB = new Date(valB);
            } else if (column === 'totalBillAmount' || column === 'discountGiven' || column === 'referralAmount') {
                valA = valA || 0;
                valB = valB || 0;
            } else if (column === 'paymentDetails') {
                // Sort by payment status if payment details exist
                valA = valA && valA.paymentStatus ? valA.paymentStatus : '';
                valB = valB && valB.paymentStatus ? valB.paymentStatus : '';
            } else if (column === 'collectionMethod' || column === 'collectedBy') {
                // Get collection method from collectionDetails
                valA = a.collectionDetails ? a.collectionDetails.collectedBy || '' : '';
                valB = b.collectionDetails ? b.collectionDetails.collectedBy || '' : '';
            } else if (column === 'transactionMode' || column === 'modeOfTransaction') {
                // Get transaction mode from collectionDetails
                valA = a.collectionDetails ? a.collectionDetails.modeOfTransaction || '' : '';
                valB = b.collectionDetails ? b.collectionDetails.modeOfTransaction || '' : '';
            } else if (column === 'transactionId') {
                // Get transaction ID from collectionDetails
                valA = a.collectionDetails ? a.collectionDetails.transactionId || '' : '';
                valB = b.collectionDetails ? b.collectionDetails.transactionId || '' : '';
            } else if (column === 'referralPaymentMode') {
                // Get referral payment mode from referralPaymentDetails
                valA = a.referralPaymentDetails ? a.referralPaymentDetails.paymentMode || '' : '';
                valB = b.referralPaymentDetails ? b.referralPaymentDetails.paymentMode || '' : '';
            } else if (column === 'referralTransactionId') {
                // Get referral transaction ID from referralPaymentDetails
                valA = a.referralPaymentDetails ? a.referralPaymentDetails.transactionId || '' : '';
                valB = b.referralPaymentDetails ? b.referralPaymentDetails.transactionId || '' : '';
            } else {
                valA = valA || '';
                valB = valB || '';
            }

            // Handle null/undefined values
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            let comparison = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
            } else {
                if (valA < valB) {
                    comparison = -1;
                } else if (valA > valB) {
                    comparison = 1;
                }
            }

            return this.currentSort.direction === 'asc' ? comparison : -comparison;
        });

        // Re-render the table
        this.renderTable();
    }

    // Filter table (this is now handled in dashboard.js, but keeping for reference)
    filterTable(filters) {
        this.filteredEntries = this.entries.filter(entry => {
            // Apply filters here if needed
            return true;
        });

        this.renderTable();
    }
}

// Initialize table manager
window.tableManager = new TableManager();

// Add sorting functionality to table headers
document.addEventListener('DOMContentLoaded', function () {
    const tableHeaders = document.querySelectorAll('#entries-table th');

    tableHeaders.forEach((header, index) => {
        // Map column index to field name
        const columnMap = [
            'slNo', 'date', 'memberName', 'ahid', 'serviceTypeId', 'packageType',
            'hcpName', 'collectedBy', 'modeOfTransaction', 'transactionId',
            'totalBillAmount', 'discountGiven', 'referralAmount', 'referralStatus',
            'referralPaymentMode', 'referralTransactionId', 'paymentByUs', 'modeOfTransfer',
            'paidTo', 'amountPaid', 'paymentStatus'
        ];

        const column = columnMap[index];

        if (column && column !== 'paymentDetails') { // Skip payment details columns for now
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                window.tableManager.sortTable(column);
            });
        }
    });
});
