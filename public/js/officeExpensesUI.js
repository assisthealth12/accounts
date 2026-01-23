// Office Expenses UI Manager
class OfficeExpensesUI {
    constructor() {
        this.currentFilters = {};
    }

    // Create office expenses screen
    createExpensesScreen() {
        const screenHTML = `
            <div id="office-expenses-screen" class="dashboard-screen" style="display: none;">
                <div class="dashboard-header">
                    <h1>Office Expenses</h1>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="add-office-expense-btn" class="btn-primary">
                            <i class="fas fa-plus-circle"></i> Add Expense
                        </button>
                        <button id="download-expenses-excel-btn" class="btn-success">
                            <i class="fas fa-file-excel"></i> Download Excel
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="card">
                        <div class="card-icon bg-blue">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="card-content">
                            <h3>Total Expenses</h3>
                            <p id="total-expenses-display">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-purple">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="card-content">
                            <h3>Salary Expenses</h3>
                            <p id="salary-expenses-display">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-orange">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="card-content">
                            <h3>Operational Costs</h3>
                            <p id="operational-costs-display">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-green">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="card-content">
                            <h3>This Month</h3>
                            <p id="this-month-expenses-display">₹0</p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filters">
                    <!-- Row 1: Date Range + Filters -->
                    <div class="filter-row">
                        <div class="filter-group date-range">
                            <label>Date Range</label>
                            <div class="date-range-inputs">
                                <div class="date-input-wrapper">
                                    <label for="expense-filter-start-date">Start</label>
                                    <input type="date" id="expense-filter-start-date">
                                </div>
                                <div class="date-input-wrapper">
                                    <label for="expense-filter-end-date">End</label>
                                    <input type="date" id="expense-filter-end-date">
                                </div>
                            </div>
                            <div class="date-presets">
                                <button type="button" class="btn-small" data-preset="today">Today</button>
                                <button type="button" class="btn-small" data-preset="7days">7 Days</button>
                                <button type="button" class="btn-small" data-preset="30days">30 Days</button>
                            </div>
                        </div>

                        <div class="filter-group">
                            <label for="expense-filter-category">Expense Category</label>
                            <select id="expense-filter-category">
                                <option value="">All</option>
                                <option value="Salary">Salary</option>
                                <option value="Incentives">Incentives</option>
                                <option value="Office Rent">Office Rent</option>
                                <option value="Utilities (Electricity, Water)">Utilities (Electricity, Water)</option>
                                <option value="Internet & Phone">Internet & Phone</option>
                                <option value="Office Supplies">Office Supplies</option>
                                <option value="Travel & Transport">Travel & Transport</option>
                                <option value="Marketing & Advertising">Marketing & Advertising</option>
                                <option value="Equipment & Maintenance">Equipment & Maintenance</option>
                                <option value="Professional Fees">Professional Fees</option>
                                <option value="Miscellaneous">Miscellaneous</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="expense-filter-paid-by">Paid By</label>
                            <select id="expense-filter-paid-by">
                                <option value="">All</option>
                                <!-- Populated dynamically -->
                            </select>
                        </div>
                    </div>

                    <!-- Row 2: Additional Filters -->
                    <div class="filter-row">
                        <div class="filter-group">
                            <label for="expense-filter-mode">Mode of Transaction</label>
                            <select id="expense-filter-mode">
                                <option value="">All</option>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Debit Card">Debit Card</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="expense-universal-search">
                                <i class="fas fa-search"></i> Universal Search
                            </label>
                            <input type="text" id="expense-universal-search" 
                                   placeholder="Search by Paid To, Details, Transaction ID...">
                        </div>
                    </div>

                    <!-- Action Buttons Row -->
                    <div class="filter-actions">
                        <button id="apply-expense-filters-btn" class="btn-primary">
                            <i class="fas fa-check"></i> Apply Filters
                        </button>
                        <button id="reset-expense-filters-btn" class="btn-secondary">
                            <i class="fas fa-undo"></i> Reset Filters
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <div class="table-container">
                    <table id="office-expenses-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Details</th>
                                <th>Paid By</th>
                                <th>Paid To</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>Transaction ID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="office-expenses-table-body">
                            <!-- Table rows will be populated by JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Insert screen into main dashboard area
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) {
            dashboardContent.insertAdjacentHTML('beforeend', screenHTML);
            this.setupFilterEventListeners();
        }
    }

    // Setup filter event listeners
    setupFilterEventListeners() {
        // Date preset buttons
        const presetButtons = document.querySelectorAll('#office-expenses-screen .date-presets button');
        presetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.applyDatePreset(e.target.dataset.preset);
            });
        });

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-expense-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-expense-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Add expense button
        const addExpenseBtn = document.getElementById('add-office-expense-btn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                window.officeExpensesManager.openExpenseModal();
            });
        }

        // Download Excel button
        const downloadExcelBtn = document.getElementById('download-expenses-excel-btn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', () => {
                if (window.officeExpensesExport) {
                    window.officeExpensesExport.exportToExcel(window.officeExpensesManager.filteredExpenses);
                }
            });
        }

        // Load paid-by filter options
        this.loadPaidByFilterOptions();
    }

    // Load paid-by filter options
    async loadPaidByFilterOptions() {
        try {
            const persons = await window.paidByPersonsManager.getActivePersons();
            const select = document.getElementById('expense-filter-paid-by');

            if (!select) return;

            // Clear existing options except first
            select.innerHTML = '<option value="">All</option>';

            persons.forEach(person => {
                const option = document.createElement('option');
                option.value = person.name;
                option.textContent = person.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading paid-by filter options:', error);
        }
    }

    // Apply date preset
    applyDatePreset(preset) {
        const today = new Date();
        const startDateInput = document.getElementById('expense-filter-start-date');
        const endDateInput = document.getElementById('expense-filter-end-date');

        if (!startDateInput || !endDateInput) return;

        endDateInput.value = today.toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                startDateInput.value = today.toISOString().split('T')[0];
                break;
            case '7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
                break;
            case '30days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
                break;
        }
    }

    // Apply filters
    applyFilters() {
        const startDate = document.getElementById('expense-filter-start-date').value;
        const endDate = document.getElementById('expense-filter-end-date').value;
        const category = document.getElementById('expense-filter-category').value;
        const paidBy = document.getElementById('expense-filter-paid-by').value;
        const mode = document.getElementById('expense-filter-mode').value;
        const searchTerm = document.getElementById('expense-universal-search').value.toLowerCase();

        this.currentFilters = {
            startDate,
            endDate,
            category,
            paidBy,
            mode,
            searchTerm
        };

        // Filter expenses
        let filtered = [...window.officeExpensesManager.expenses];

        // Date range filter
        if (startDate) {
            filtered = filtered.filter(expense => expense.date >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(expense => expense.date <= endDate);
        }

        // Category filter
        if (category) {
            filtered = filtered.filter(expense => expense.expenseCategory === category);
        }

        // Paid By filter
        if (paidBy) {
            filtered = filtered.filter(expense => expense.paidBy === paidBy);
        }

        // Mode filter
        if (mode) {
            filtered = filtered.filter(expense => expense.modeOfTransaction === mode);
        }

        // Universal search
        if (searchTerm) {
            filtered = filtered.filter(expense => {
                const paidTo = (expense.paidTo || '').toLowerCase();
                const details = (expense.details || '').toLowerCase();
                const transactionId = (expense.transactionId || '').toLowerCase();

                return paidTo.includes(searchTerm) ||
                    details.includes(searchTerm) ||
                    transactionId.includes(searchTerm);
            });
        }

        // Update filtered expenses
        window.officeExpensesManager.filteredExpenses = filtered;

        // Re-render
        this.renderExpensesTable(filtered);
        this.renderSummaryCards(filtered);
    }

    // Reset filters
    resetFilters() {
        document.getElementById('expense-filter-start-date').value = '';
        document.getElementById('expense-filter-end-date').value = '';
        document.getElementById('expense-filter-category').value = '';
        document.getElementById('expense-filter-paid-by').value = '';
        document.getElementById('expense-filter-mode').value = '';
        document.getElementById('expense-universal-search').value = '';

        this.currentFilters = {};

        // Reset to all expenses
        window.officeExpensesManager.filteredExpenses = [...window.officeExpensesManager.expenses];

        // Re-render
        this.renderExpensesTable(window.officeExpensesManager.expenses);
        this.renderSummaryCards(window.officeExpensesManager.expenses);
    }

    // Render summary cards
    renderSummaryCards(expenses) {
        // Calculate totals
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const salaryExpenses = expenses
            .filter(exp => exp.expenseCategory === 'Salary')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const operationalCosts = expenses
            .filter(exp => exp.expenseCategory !== 'Salary')
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // This month expenses
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const thisMonthExpenses = expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === thisMonth &&
                    expDate.getFullYear() === thisYear;
            })
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // Update displays
        this.updateCardDisplay('total-expenses-display', totalExpenses);
        this.updateCardDisplay('salary-expenses-display', salaryExpenses);
        this.updateCardDisplay('operational-costs-display', operationalCosts);
        this.updateCardDisplay('this-month-expenses-display', thisMonthExpenses);
    }

    // Update card display
    updateCardDisplay(elementId, amount) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatCurrency(amount);
        }
    }

    // Format currency
    formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Format date
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
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    // Render expenses table
    renderExpensesTable(expenses) {
        const tbody = document.getElementById('office-expenses-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (expenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p style="color: #999;">No expenses found</p>
                    </td>
                </tr>
            `;
            return;
        }

        expenses.forEach(expense => {
            const row = document.createElement('tr');

            // Use escapeHtml to prevent XSS attacks
            const escapeHtml = window.securityUtils.escapeHtml;

            row.innerHTML = `
                <td>${expense.slNo || ''}</td>
                <td>${this.formatDate(expense.date)}</td>
                <td>${escapeHtml(expense.expenseCategory)}</td>
                <td>${escapeHtml(expense.details)}</td>
                <td>${escapeHtml(expense.paidBy)}</td>
                <td>${escapeHtml(expense.paidTo)}</td>
                <td>${this.formatCurrency(expense.amount || 0)}</td>
                <td>${escapeHtml(expense.modeOfTransaction)}</td>
                <td>${escapeHtml(expense.transactionId) || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-action btn-edit" onclick="window.officeExpensesManager.openExpenseModal(${JSON.stringify(expense).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" onclick="window.officeExpensesManager.deleteExpense('${escapeHtml(expense.id)}').then(() => window.officeExpensesManager.loadExpensesForDisplay())">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }
}

// Initialize office expenses UI
window.officeExpensesUI = new OfficeExpensesUI();
