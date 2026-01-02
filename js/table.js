// Table Management System
class TableManager {
    constructor() {
        this.entries = [];
        this.filteredEntries = [];
        this.currentSort = { column: null, direction: 'asc' };
        this.initTable();
    }

    // Initialize table
    initTable() {
        // The table is already in the HTML, we just need to populate it
    }

    // Update table with entries
    updateTable(entries) {
        this.entries = entries;
        this.renderTable();
    }

    // Render table with entries
    renderTable() {
        const tableBody = document.getElementById('entries-table-body');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add rows for each entry
        this.entries.forEach(entry => {
            const row = this.createTableRow(entry);
            tableBody.appendChild(row);
        });
        
        // Add event listeners for edit buttons
        this.addEventListeners();
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
        const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';
        
        // Get service name
        const serviceName = this.getServiceNameById(entry.serviceTypeId);
        
        row.innerHTML = `
            <td>${entry.slNo || ''}</td>
            <td>${dateStr}</td>
            <td>${entry.memberName || ''}</td>
            <td>${entry.ahid || ''}</td>
            <td>${serviceName}</td>
            <td>${entry.packageType || ''}</td>
            <td>${entry.hcpName || ''}</td>
            <td>${totalBillAmount}</td>
            <td>${discountGiven}</td>
            <td>${referralAmount}</td>
            <td>${entry.referralStatus || ''}</td>
            <td>${entry.paymentByUs || ''}</td>
            <td>${entry.paymentDetails ? entry.paymentDetails.mode || '' : ''}</td>
            <td>${entry.paymentDetails ? entry.paymentDetails.paidTo || '' : ''}</td>
            <td>${amountPaid}</td>
            <td>${entry.paymentDetails ? entry.paymentDetails.paymentStatus || '' : ''}</td>
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
document.addEventListener('DOMContentLoaded', function() {
    const tableHeaders = document.querySelectorAll('#entries-table th');
    
    tableHeaders.forEach((header, index) => {
        // Map column index to field name
        const columnMap = [
            'slNo', 'date', 'memberName', 'ahid', 'serviceTypeId', 'packageType', 
            'hcpName', 'totalBillAmount', 'discountGiven', 'referralAmount', 
            'referralStatus', 'paymentByUs', 'paymentDetails', 'paymentDetails', 
            'paymentDetails', 'paymentDetails'
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