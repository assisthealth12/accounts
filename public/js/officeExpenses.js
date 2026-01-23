// Office Expenses Management System
class OfficeExpensesManager {
    constructor() {
        this.expenses = [];
        this.filteredExpenses = [];
        this.paidByPersons = [];
        this.currentExpense = null;
    }

    // Get next expense number using Firestore transaction
    async getNextExpenseNumber() {
        try {
            const counterRef = firestore.collection('counters').doc('officeExpenseCounter');

            const result = await firestore.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);

                let nextNumber = 1;
                if (counterDoc.exists) {
                    const currentNumber = counterDoc.data().officeExpenseLastNo || 0;
                    nextNumber = currentNumber + 1;
                    transaction.update(counterRef, { officeExpenseLastNo: nextNumber });
                } else {
                    transaction.set(counterRef, { officeExpenseLastNo: 1 });
                }

                return nextNumber;
            });

            return result;
        } catch (error) {
            console.error('Error getting next expense number:', error);
            throw error;
        }
    }

    // Load paid by persons
    async loadPaidByPersons() {
        try {
            this.paidByPersons = await window.paidByPersonsManager.getActivePersons();
            return this.paidByPersons;
        } catch (error) {
            console.error('Error loading paid-by persons:', error);
            return [];
        }
    }

    // Get all expenses
    async getExpenses() {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated');
                return [];
            }

            if (window.authService.getUserRole() !== 'admin') {
                console.warn('Only admins can view office expenses');
                return [];
            }

            const snapshot = await firestore.collection('office_expenses')
                .orderBy('date', 'desc')
                .get();

            const expenses = [];
            snapshot.forEach(doc => {
                expenses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.expenses = expenses;
            this.filteredExpenses = expenses;
            return expenses;
        } catch (error) {
            console.error('Error fetching expenses:', error);
            throw error;
        }
    }

    // Create new expense
    async createExpense(expenseData) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can create office expenses');
            }

            // Get next expense number
            const slNo = await this.getNextExpenseNumber();

            // Prepare expense data
            const expenseToAdd = {
                slNo: slNo,
                date: expenseData.date,
                expenseCategory: expenseData.expenseCategory,
                details: expenseData.details,
                paidBy: expenseData.paidBy,
                paidTo: expenseData.paidTo,
                amount: parseFloat(expenseData.amount),
                modeOfTransaction: expenseData.modeOfTransaction,
                transactionId: expenseData.transactionId || '',
                createdBy: window.authService.getCurrentUser().uid,
                createdByName: window.authService.getCurrentUser().email || window.authService.getCurrentUser().displayName || 'Admin',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            const expenseRef = await firestore.collection('office_expenses').add(expenseToAdd);

            console.log('Office expense created successfully with ID:', expenseRef.id);

            return expenseRef.id;
        } catch (error) {
            console.error('Error creating expense:', error);
            throw error;
        }
    }

    // Update existing expense
    async updateExpense(expenseId, expenseData) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can update office expenses');
            }

            // Prepare update data
            const expenseToUpdate = {
                date: expenseData.date,
                expenseCategory: expenseData.expenseCategory,
                details: expenseData.details,
                paidBy: expenseData.paidBy,
                paidTo: expenseData.paidTo,
                amount: parseFloat(expenseData.amount),
                modeOfTransaction: expenseData.modeOfTransaction,
                transactionId: expenseData.transactionId || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Update in Firestore
            await firestore.collection('office_expenses').doc(expenseId).update(expenseToUpdate);

            console.log('Office expense updated successfully');
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    }

    // Delete expense
    async deleteExpense(expenseId) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can delete office expenses');
            }

            const confirmed = confirm('Are you sure you want to delete this expense? This action cannot be undone.');

            if (!confirmed) {
                return false;
            }

            await firestore.collection('office_expenses').doc(expenseId).delete();

            console.log('Office expense deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    }

    // Open expense modal for add/edit
    async openExpenseModal(expense = null) {
        // Check if user is admin
        if (window.authService.getUserRole() !== 'admin') {
            alert('Access denied: Only admins can manage office expenses');
            return;
        }

        this.currentExpense = expense;

        // Create modal if it doesn't exist
        if (!document.getElementById('office-expense-modal')) {
            this.createExpenseModal();
        }

        const modal = document.getElementById('office-expense-modal');
        const modalTitle = document.getElementById('expense-modal-title');

        // Load paid by persons
        await this.loadPaidByPersons();
        this.populatePaidByDropdown();

        if (expense) {
            // Edit mode
            modalTitle.textContent = 'Edit Office Expense';
            this.populateExpenseForm(expense);
        } else {
            // Add mode
            modalTitle.textContent = 'Add Office Expense';
            this.resetExpenseForm();
        }

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Create expense modal
    createExpenseModal() {
        const modalHTML = `
            <div id="office-expense-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="expense-modal-title">Add Office Expense</h3>
                        <span class="close" id="close-expense-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="expense-form">
                            <input type="hidden" id="expense-id">

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expense-date" class="required">Date</label>
                                    <input type="date" id="expense-date" required>
                                </div>
                                <div class="form-group">
                                    <label for="expense-category" class="required">Expense Category</label>
                                    <select id="expense-category" required>
                                        <option value="">Select Category</option>
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
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expense-paid-by" class="required">Paid By</label>
                                    <select id="expense-paid-by" required>
                                        <option value="">Select Paid By</option>
                                        <!-- Populated dynamically -->
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="expense-paid-to" class="required">Paid To</label>
                                    <input type="text" id="expense-paid-to" placeholder="Enter recipient name" required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label for="expense-details" class="required">Details</label>
                                    <textarea id="expense-details" rows="3" placeholder="Enter expense details (min 10 characters)" required></textarea>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="expense-amount" class="required">Amount (₹)</label>
                                    <input type="number" id="expense-amount" min="0" step="0.01" placeholder="Enter amount" required>
                                </div>
                                <div class="form-group">
                                    <label for="expense-mode" class="required">Mode of Transaction</label>
                                    <select id="expense-mode" required>
                                        <option value="">Select Mode</option>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Debit Card">Debit Card</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row" id="transaction-id-row" style="display: none;">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label for="expense-transaction-id" class="required">Transaction ID</label>
                                    <input type="text" id="expense-transaction-id" placeholder="Enter transaction ID">
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn-primary">Save Expense</button>
                                <button type="button" id="cancel-expense-modal" class="btn-secondary">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('close-expense-modal').addEventListener('click', () => {
            this.closeExpenseModal();
        });

        document.getElementById('cancel-expense-modal').addEventListener('click', () => {
            this.closeExpenseModal();
        });

        document.getElementById('office-expense-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('office-expense-modal')) {
                this.closeExpenseModal();
            }
        });

        // Mode of transaction change listener
        document.getElementById('expense-mode').addEventListener('change', (e) => {
            this.toggleTransactionIdField(e.target.value);
        });

        // Form submit
        document.getElementById('expense-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveExpense();
        });

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
    }

    // Populate paid-by dropdown
    populatePaidByDropdown() {
        const select = document.getElementById('expense-paid-by');
        if (!select) return;

        // Clear existing options except first
        select.innerHTML = '<option value="">Select Paid By</option>';

        this.paidByPersons.forEach(person => {
            const option = document.createElement('option');
            option.value = person.name;
            option.textContent = person.name;
            select.appendChild(option);
        });
    }

    // Toggle transaction ID field based on mode
    toggleTransactionIdField(mode) {
        const row = document.getElementById('transaction-id-row');
        const input = document.getElementById('expense-transaction-id');

        if (mode === 'UPI' || mode === 'Bank Transfer') {
            row.style.display = 'flex';
            input.required = true;
        } else {
            row.style.display = 'none';
            input.required = false;
            input.value = '';
        }
    }

    // Populate expense form for editing
    populateExpenseForm(expense) {
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-date').value = expense.date;
        document.getElementById('expense-category').value = expense.expenseCategory;
        document.getElementById('expense-paid-by').value = expense.paidBy;
        document.getElementById('expense-paid-to').value = expense.paidTo;
        document.getElementById('expense-details').value = expense.details;
        document.getElementById('expense-amount').value = expense.amount;
        document.getElementById('expense-mode').value = expense.modeOfTransaction;
        document.getElementById('expense-transaction-id').value = expense.transactionId || '';

        // Trigger transaction ID field visibility
        this.toggleTransactionIdField(expense.modeOfTransaction);
    }

    // Reset expense form
    resetExpenseForm() {
        document.getElementById('expense-form').reset();
        document.getElementById('expense-id').value = '';

        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;

        // Hide transaction ID field
        document.getElementById('transaction-id-row').style.display = 'none';
        document.getElementById('expense-transaction-id').required = false;
    }

    // Validate expense form
    validateExpenseForm() {
        const date = document.getElementById('expense-date').value;
        const category = document.getElementById('expense-category').value;
        const paidBy = document.getElementById('expense-paid-by').value;
        const paidTo = document.getElementById('expense-paid-to').value.trim();
        const details = document.getElementById('expense-details').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const mode = document.getElementById('expense-mode').value;
        const transactionId = document.getElementById('expense-transaction-id').value.trim();

        if (!date) {
            alert('Please select a date');
            return false;
        }

        if (!category) {
            alert('Please select an expense category');
            return false;
        }

        if (!paidBy) {
            alert('Please select who paid');
            return false;
        }

        if (!paidTo || paidTo.length < 2) {
            alert('Please enter recipient name (min 2 characters)');
            return false;
        }

        if (!details || details.length < 10) {
            alert('Please provide expense details (min 10 characters)');
            return false;
        }

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return false;
        }

        if (!mode) {
            alert('Please select mode of transaction');
            return false;
        }

        if ((mode === 'UPI' || mode === 'Bank Transfer') && !transactionId) {
            alert('Transaction ID is required for UPI and Bank Transfer');
            return false;
        }

        return true;
    }

    // Save expense
    async saveExpense() {
        if (!this.validateExpenseForm()) {
            return;
        }

        try {
            const expenseId = document.getElementById('expense-id').value;

            const expenseData = {
                date: document.getElementById('expense-date').value,
                expenseCategory: document.getElementById('expense-category').value,
                paidBy: document.getElementById('expense-paid-by').value,
                paidTo: document.getElementById('expense-paid-to').value.trim(),
                details: document.getElementById('expense-details').value.trim(),
                amount: parseFloat(document.getElementById('expense-amount').value),
                modeOfTransaction: document.getElementById('expense-mode').value,
                transactionId: document.getElementById('expense-transaction-id').value.trim()
            };

            if (expenseId) {
                // Update existing expense
                await this.updateExpense(expenseId, expenseData);
                alert('Office expense updated successfully!');
            } else {
                // Create new expense
                await this.createExpense(expenseData);
                alert('Office expense added successfully!');
            }

            this.closeExpenseModal();

            // Reload expenses
            await this.loadExpensesForDisplay();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Error saving expense: ' + error.message);
        }
    }

    // Close expense modal
    closeExpenseModal() {
        const modal = document.getElementById('office-expense-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // Load expenses for display (called from UI)
    async loadExpensesForDisplay() {
        try {
            await this.getExpenses();

            // Update UI if officeExpensesUI is available
            if (window.officeExpensesUI) {
                window.officeExpensesUI.renderExpensesTable(this.filteredExpenses);
                window.officeExpensesUI.renderSummaryCards(this.filteredExpenses);
            }
        } catch (error) {
            console.error('Error loading expenses for display:', error);
        }
    }
}

// Initialize office expenses manager
window.officeExpensesManager = new OfficeExpensesManager();
