// Add/Entry Management System
class AddEntryManager {
    constructor() {
        this.currentEntry = null;
        this.isEditing = false;
        this.currentPayments = []; // Track payments for current entry
        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        // Form submission
        const entryForm = document.getElementById('entry-form');
        if (entryForm) {
            entryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEntry();
            });
        }

        // Payment by us change listener
        const paymentByUsSelect = document.getElementById('payment-by-us');
        if (paymentByUsSelect) {
            paymentByUsSelect.addEventListener('change', (e) => {
                this.togglePaymentDetails(e.target.value);
            });
        }

        // Collected by change listener
        const collectedBySelect = document.getElementById('collected-by');
        if (collectedBySelect) {
            collectedBySelect.addEventListener('change', (e) => {
                this.toggleCollectionDetails(e.target.value);
            });
        }

        // Mode of transaction change listener
        const modeOfTransactionSelect = document.getElementById('mode-of-transaction');
        if (modeOfTransactionSelect) {
            modeOfTransactionSelect.addEventListener('change', (e) => {
                this.toggleTransactionIdField(e.target.value);
            });
        }

        // Note: The add-new-hcp-btn was removed from the HTML form, so this functionality is now available in the Manage Healthcare Providers section only

        // Referral status change listener
        const referralStatusSelect = document.getElementById('referral-status');
        if (referralStatusSelect) {
            referralStatusSelect.addEventListener('change', (e) => {
                this.toggleReferralPaymentDetails(e.target.value);
            });
        }

        // Referral payment mode change listener
        const referralPaymentModeSelect = document.getElementById('referral-payment-mode');
        if (referralPaymentModeSelect) {
            referralPaymentModeSelect.addEventListener('change', (e) => {
                this.toggleReferralTransactionIdField(e.target.value);
            });
        }

        // Initialize payment event listeners
        this.initPaymentEventListeners();
    }

    // Open add entry modal
    async openAddEntryModal(entry = null) {
        this.currentEntry = entry;
        this.isEditing = !!entry;

        const modal = document.getElementById('entry-modal');
        const modalTitle = document.getElementById('modal-title');

        if (this.isEditing) {
            modalTitle.textContent = 'Edit Service Entry';
            this.populateFormWithEntry(entry);
        } else {
            modalTitle.textContent = 'Add Service Entry';
            this.clearForm();
        }

        // Load services dropdown
        if (window.servicesManager && typeof window.servicesManager.loadServicesDropdown === 'function') {
            await window.servicesManager.loadServicesDropdown();
        }

        // Load HCP dropdown
        await this.populateHCPDropdown();

        // Show the modal with animation
        modal.style.display = 'flex';
        // Trigger reflow and add show class for animation
        void modal.offsetWidth; // Force reflow
        modal.classList.add('show');

        // Show/hide payment details based on current value
        const paymentByUs = document.getElementById('payment-by-us').value;
        this.togglePaymentDetails(paymentByUs);

        // Show/hide collection details based on current value
        const collectedBy = document.getElementById('collected-by').value;
        this.toggleCollectionDetails(collectedBy);

        // Show/hide transaction ID field based on current mode
        const modeOfTransaction = document.getElementById('mode-of-transaction').value;
        this.toggleTransactionIdField(modeOfTransaction);

        // Show/hide referral payment details based on current referral status
        const referralStatus = document.getElementById('referral-status').value;
        this.toggleReferralPaymentDetails(referralStatus);

        // Show/hide referral transaction ID field based on current referral payment mode
        const referralPaymentMode = document.getElementById('referral-payment-mode').value;
        this.toggleReferralTransactionIdField(referralPaymentMode);
    }

    // Populate HCP dropdown with active providers
    async populateHCPDropdown() {
        try {
            // Get active healthcare providers
            const providers = await window.healthcareProviderManager.getActiveProviders();

            const hcpSelect = document.getElementById('hcp-name');
            if (!hcpSelect) return;

            // Clear existing options except the first placeholder
            hcpSelect.innerHTML = '<option value="">Select Healthcare Provider</option>';

            // Add providers to dropdown
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.name;
                option.textContent = provider.name;
                hcpSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading healthcare providers:', error);
        }
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('entry-modal');
        if (modal) {
            // Remove show class to trigger close animation
            modal.classList.remove('show');

            // Wait for animation to complete before hiding
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        this.currentEntry = null;
        this.isEditing = false;
    }

    // Populate form with entry data (for editing)
    populateFormWithEntry(entry) {
        document.getElementById('entry-id').value = entry.id;
        document.getElementById('date').value = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';
        document.getElementById('member-name').value = entry.memberName || '';
        document.getElementById('ahid').value = entry.ahid || '';
        document.getElementById('service-type').value = entry.serviceTypeId || '';
        document.getElementById('package-type').value = entry.packageType || '';
        document.getElementById('hcp-name').value = entry.hcpName || '';
        document.getElementById('total-bill-amount').value = entry.totalBillAmount !== undefined && entry.totalBillAmount !== null ? entry.totalBillAmount.toString() : '0';
        document.getElementById('discount-given').value = entry.discountGiven !== undefined && entry.discountGiven !== null ? entry.discountGiven.toString() : '0';
        document.getElementById('referral-amount').value = entry.referralAmount !== undefined && entry.referralAmount !== null ? entry.referralAmount.toString() : '0';
        document.getElementById('referral-status').value = entry.referralStatus || 'Pending';

        // Populate Payment By Us
        if (entry.paymentByUs && entry.paymentByUs.enabled) {
            document.getElementById('payment-by-us').value = 'Yes';
            document.getElementById('whom-to-pay').value = entry.paymentByUs.whomToPay || '';
            document.getElementById('total-amount-to-pay').value = entry.paymentByUs.totalAmount || 0;

            this.currentPayments = entry.paymentByUs.payments || [];
            this.renderPaymentsTable();
            this.updatePaymentCalculations();

            this.togglePaymentDetails('Yes');
        } else {
            document.getElementById('payment-by-us').value = 'No';
            this.togglePaymentDetails('No');
        }
        // Show/hide payment details based on paymentByUs value
        this.togglePaymentDetails(entry.paymentByUs);

        // Populate collection details if they exist
        if (entry.collectionDetails) {
            document.getElementById('collected-by').value = entry.collectionDetails.collectedBy || '';

            // Show collection details section if collectedBy is set
            if (entry.collectionDetails.collectedBy) {
                document.getElementById('collection-details').style.display = 'block';

                // Set mode of transaction
                if (entry.collectionDetails.modeOfTransaction) {
                    document.getElementById('mode-of-transaction').value = entry.collectionDetails.modeOfTransaction;

                    // Show transaction ID field if mode is UPI or Bank Transfer
                    if (entry.collectionDetails.modeOfTransaction === 'UPI' || entry.collectionDetails.modeOfTransaction === 'Bank Transfer') {
                        document.getElementById('transaction-id-group').style.display = 'block';

                        // Set transaction ID if available
                        if (entry.collectionDetails.transactionId) {
                            document.getElementById('transaction-id').value = entry.collectionDetails.transactionId;
                        }
                    }
                }
            }
        } else {
            // Clear collection details fields if no collection details
            document.getElementById('collected-by').value = '';
            document.getElementById('collection-details').style.display = 'none';
            document.getElementById('mode-of-transaction').value = '';
            document.getElementById('transaction-id-group').style.display = 'none';
            document.getElementById('transaction-id').value = '';
        }

        // Populate referral payment details if they exist
        if (entry.referralPaymentDetails) {
            // Show referral payment details section
            document.getElementById('referral-payment-details').style.display = 'block';

            // Set referral payment mode
            document.getElementById('referral-payment-mode').value = entry.referralPaymentDetails.paymentMode || '';

            // Show transaction ID field if mode is UPI or Bank Transfer
            if (entry.referralPaymentDetails.paymentMode === 'UPI' || entry.referralPaymentDetails.paymentMode === 'Bank Transfer') {
                document.getElementById('referral-transaction-id-group').style.display = 'block';

                // Set referral transaction ID if available
                if (entry.referralPaymentDetails.transactionId) {
                    document.getElementById('referral-transaction-id').value = entry.referralPaymentDetails.transactionId;
                }
            }
        } else {
            // Clear referral payment fields if no referral payment details
            document.getElementById('referral-payment-mode').value = '';
            document.getElementById('referral-transaction-id-group').style.display = 'none';
            document.getElementById('referral-transaction-id').value = '';

            // Only show referral payment details if referral status is Received
            if (entry.referralStatus === 'Received') {
                document.getElementById('referral-payment-details').style.display = 'block';
            } else {
                document.getElementById('referral-payment-details').style.display = 'none';
            }
        }
    }

    // Clear form for new entry
    clearForm() {
        document.getElementById('entry-id').value = '';
        document.getElementById('date').value = '';
        document.getElementById('member-name').value = '';
        document.getElementById('ahid').value = '';
        document.getElementById('service-type').value = '';
        document.getElementById('package-type').value = '';
        document.getElementById('hcp-name').value = '';
        document.getElementById('total-bill-amount').value = '0';
        document.getElementById('discount-given').value = '0';
        document.getElementById('referral-amount').value = '0';
        document.getElementById('referral-status').value = 'Pending';
        document.getElementById('payment-by-us').value = 'No';

        // Clear payment by us fields
        document.getElementById('whom-to-pay').value = '';
        document.getElementById('total-amount-to-pay').value = '0';
        this.currentPayments = [];
        this.renderPaymentsTable();
        this.updatePaymentCalculations();

        // Hide payment details section
        document.getElementById('payment-details-section').style.display = 'none';

        // Clear and hide collection details section
        document.getElementById('collected-by').value = '';
        document.getElementById('collection-details').style.display = 'none';
        document.getElementById('mode-of-transaction').value = '';
        document.getElementById('transaction-id-group').style.display = 'none';
        document.getElementById('transaction-id').value = '';

        // Clear and hide referral payment details section
        document.getElementById('referral-payment-mode').value = '';
        document.getElementById('referral-transaction-id-group').style.display = 'none';
        document.getElementById('referral-transaction-id').value = '';
        document.getElementById('referral-payment-details').style.display = 'none';
    }

    // Toggle payment details section based on "Payment By Us" selection
    togglePaymentDetails(value) {
        const paymentDetailsSection = document.getElementById('payment-details-section');

        if (value === 'Yes') {
            paymentDetailsSection.style.display = 'block';
            // Reset if starting fresh
            if (!this.isEditing) {
                this.currentPayments = [];
                this.renderPaymentsTable();
                this.updatePaymentCalculations();
            }
        } else {
            paymentDetailsSection.style.display = 'none';
            this.currentPayments = [];
        }
    }

    // Toggle collection details section based on "Collected By" selection
    toggleCollectionDetails(value) {
        const collectionDetailsSection = document.getElementById('collection-details');

        if (value === 'Collected by AssistHealth') {
            collectionDetailsSection.style.display = 'block';
        } else {
            collectionDetailsSection.style.display = 'none';
            // Clear dependent fields when switching to other option
            document.getElementById('mode-of-transaction').value = '';
            document.getElementById('transaction-id-group').style.display = 'none';
            document.getElementById('transaction-id').value = '';
        }
    }

    // Toggle transaction ID field based on mode of transaction
    toggleTransactionIdField(mode) {
        const transactionIdGroup = document.getElementById('transaction-id-group');

        if (mode === 'UPI' || mode === 'Bank Transfer') {
            transactionIdGroup.style.display = 'block';
        } else {
            transactionIdGroup.style.display = 'none';
            document.getElementById('transaction-id').value = '';
        }
    }

    // Toggle referral payment details section based on referral status
    toggleReferralPaymentDetails(status) {
        const referralPaymentDetailsSection = document.getElementById('referral-payment-details');

        if (status === 'Received') {
            referralPaymentDetailsSection.style.display = 'block';
        } else {
            referralPaymentDetailsSection.style.display = 'none';
            // Clear dependent fields when switching to other option
            document.getElementById('referral-payment-mode').value = '';
            document.getElementById('referral-transaction-id-group').style.display = 'none';
            document.getElementById('referral-transaction-id').value = '';
        }
    }

    // Toggle referral transaction ID field based on referral payment mode
    toggleReferralTransactionIdField(mode) {
        const referralTransactionIdGroup = document.getElementById('referral-transaction-id-group');

        if (mode === 'UPI' || mode === 'Bank Transfer') {
            referralTransactionIdGroup.style.display = 'block';
        } else {
            referralTransactionIdGroup.style.display = 'none';
            document.getElementById('referral-transaction-id').value = '';
        }
    }

    // Initialize payment-related event listeners
    initPaymentEventListeners() {
        // Total amount change listener
        const totalAmountInput = document.getElementById('total-amount-to-pay');
        if (totalAmountInput) {
            totalAmountInput.addEventListener('input', () => {
                this.updatePaymentCalculations();
            });
        }

        // Add Payment button
        const addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) {
            addPaymentBtn.addEventListener('click', () => {
                this.showAddPaymentModal();
            });
        }

        // Close payment modal
        const closePaymentModal = document.getElementById('close-payment-modal');
        if (closePaymentModal) {
            closePaymentModal.addEventListener('click', () => {
                this.closeAddPaymentModal();
            });
        }

        const cancelPaymentModal = document.getElementById('cancel-payment-modal');
        if (cancelPaymentModal) {
            cancelPaymentModal.addEventListener('click', () => {
                this.closeAddPaymentModal();
            });
        }

        // Payment mode change listener (for transaction ID visibility)
        const paymentModeSelect = document.getElementById('payment-mode');
        if (paymentModeSelect) {
            paymentModeSelect.addEventListener('change', (e) => {
                const transactionIdGroup = document.getElementById('payment-transaction-id-group');
                if (e.target.value === 'UPI' || e.target.value === 'Bank Transfer') {
                    transactionIdGroup.style.display = 'block';
                } else {
                    transactionIdGroup.style.display = 'none';
                    document.getElementById('payment-transaction-id').value = '';
                }
            });
        }

        // Form submission
        const addPaymentForm = document.getElementById('add-payment-form');
        if (addPaymentForm) {
            addPaymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addPaymentEntry();
            });
        }
    }

    // Show add payment modal
    showAddPaymentModal() {
        const totalAmount = parseFloat(document.getElementById('total-amount-to-pay').value) || 0;
        const paidAmount = this.calculateTotalPaid();
        const balance = totalAmount - paidAmount;

        // Validation: Check if balance is already 0
        if (balance <= 0) {
            alert('Payment is already complete. No further payments can be added.');
            return;
        }

        // Validation: Check if total amount is set
        if (totalAmount <= 0) {
            alert('Please enter the Total Amount to Pay first.');
            return;
        }

        // Show balance hint
        const balanceHint = document.getElementById('balance-hint');
        if (balanceHint) {
            balanceHint.textContent = `Remaining balance: ₹${balance.toLocaleString()}`;
        }

        // Show modal
        const modal = document.getElementById('add-payment-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        // Set today's date as default
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    }

    // Close add payment modal
    closeAddPaymentModal() {
        const modal = document.getElementById('add-payment-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
        // Clear form
        document.getElementById('add-payment-form').reset();
        document.getElementById('payment-transaction-id-group').style.display = 'none';
    }

    // Add payment entry
    addPaymentEntry() {
        const date = document.getElementById('payment-date').value;
        const mode = document.getElementById('payment-mode').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const transactionId = document.getElementById('payment-transaction-id').value;

        // Validations
        if (!date || !mode || !amount || amount <= 0) {
            alert('Please fill in all required fields with valid values.');
            return;
        }

        const totalAmount = parseFloat(document.getElementById('total-amount-to-pay').value) || 0;
        const currentPaid = this.calculateTotalPaid();
        const balance = totalAmount - currentPaid;

        // Validation: Amount cannot exceed balance
        if (amount > balance) {
            alert(`Payment amount (₹${amount.toLocaleString()}) cannot exceed remaining balance (₹${balance.toLocaleString()}).`);
            return;
        }

        // Validation: Transaction ID required for UPI/Bank Transfer
        if ((mode === 'UPI' || mode === 'Bank Transfer') && !transactionId) {
            alert('Transaction ID is required for UPI and Bank Transfer payments.');
            return;
        }

        // Create payment object
        const payment = {
            paymentId: `pay_${Date.now()}`,
            paymentDate: date,
            modeOfTransaction: mode,
            amountPaid: amount,
            transactionId: (mode === 'UPI' || mode === 'Bank Transfer') ? transactionId : '',
            addedAt: new Date(),
            addedBy: window.authService.getCurrentUser().uid
        };

        // Add to payments array
        this.currentPayments.push(payment);

        // Update UI
        this.renderPaymentsTable();
        this.updatePaymentCalculations();

        // Close modal
        this.closeAddPaymentModal();
    }

    // Calculate total paid amount
    calculateTotalPaid() {
        return this.currentPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    }

    // Update payment calculations
    updatePaymentCalculations() {
        const totalAmount = parseFloat(document.getElementById('total-amount-to-pay').value) || 0;
        const paidAmount = this.calculateTotalPaid();
        const balanceAmount = totalAmount - paidAmount;

        // Determine payment status
        let status = 'Not Started';
        if (paidAmount > 0 && balanceAmount > 0) {
            status = 'Partially Paid';
        } else if (balanceAmount === 0 && paidAmount > 0) {
            status = 'Completed';
        }

        // Update display fields
        document.getElementById('paid-amount-display').value = `₹${paidAmount.toLocaleString()}`;
        document.getElementById('balance-amount-display').value = `₹${balanceAmount.toLocaleString()}`;
        document.getElementById('payment-status-display').value = status;

        // Disable/enable Add Payment button based on completion
        const addPaymentBtn = document.getElementById('add-payment-btn');
        if (addPaymentBtn) {
            if (balanceAmount === 0 && totalAmount > 0) {
                addPaymentBtn.disabled = true;
                addPaymentBtn.innerHTML = '<i class="fas fa-check"></i> Payment Completed';
            } else {
                addPaymentBtn.disabled = false;
                addPaymentBtn.innerHTML = '<i class="fas fa-plus"></i> Add Payment';
            }
        }
    }

    // Render payments table
    renderPaymentsTable() {
        const tbody = document.getElementById('payments-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.currentPayments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">No payments added yet</td></tr>';
            return;
        }

        this.currentPayments.forEach((payment, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(payment.paymentDate).toLocaleDateString()}</td>
                <td>${payment.modeOfTransaction}</td>
                <td>₹${payment.amountPaid.toLocaleString()}</td>
                <td>${payment.transactionId || '-'}</td>
                <td>
                    <button type="button" class="btn-action btn-delete remove-payment-btn" data-index="${index}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-payment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removePayment(index);
            });
        });
    }

    // Remove payment
    removePayment(index) {
        if (confirm('Are you sure you want to remove this payment?')) {
            this.currentPayments.splice(index, 1);
            this.renderPaymentsTable();
            this.updatePaymentCalculations();
        }
    }

    // Validate payment by us data
    validatePaymentByUs() {
        const totalAmount = parseFloat(document.getElementById('total-amount-to-pay').value) || 0;
        const whomToPay = document.getElementById('whom-to-pay').value.trim();

        if (totalAmount <= 0) {
            alert('Total Amount to Pay must be greater than 0');
            return false;
        }

        if (!whomToPay) {
            alert('Please enter whom to pay');
            return false;
        }

        // Ensure all payments have required fields
        for (const payment of this.currentPayments) {
            if (!payment.paymentDate || !payment.modeOfTransaction || payment.amountPaid <= 0) {
                alert('Invalid payment entry detected. Please check all payments.');
                return false;
            }

            if ((payment.modeOfTransaction === 'UPI' || payment.modeOfTransaction === 'Bank Transfer')
                && !payment.transactionId) {
                alert('Transaction ID is required for UPI and Bank Transfer payments');
                return false;
            }
        }

        return true;
    }

    // Validate form
    validateForm() {
        const date = document.getElementById('date').value;
        const memberName = document.getElementById('member-name').value;
        const serviceType = document.getElementById('service-type').value;
        const packageType = document.getElementById('package-type').value;
        const hcpName = document.getElementById('hcp-name').value;
        const totalBillAmount = document.getElementById('total-bill-amount').value;

        // Check if services dropdown is populated
        const serviceSelect = document.getElementById('service-type');
        const hasOptions = serviceSelect.options.length > 1; // More than just placeholder

        if (!hasOptions) {
            alert('Services are still loading or unavailable. Please wait or refresh the page.');
            return false;
        }

        // Validate service selection
        if (!serviceType || serviceType === '') {
            alert('Please select a Service Type (*)');
            return false;
        }

        // Validate mandatory text fields
        if (!date || !memberName || !packageType || !hcpName) {
            alert('Please fill in all mandatory fields: Date, Member Name, Package Type, and HCP Name');
            return false;
        }

        // Validate collected by field
        const collectedBy = document.getElementById('collected-by').value;
        if (!collectedBy) {
            alert('Please select how the payment was collected');
            return false;
        }

        // If collected by AssistHealth, validate dependent fields
        if (collectedBy === 'Collected by AssistHealth') {
            const modeOfTransaction = document.getElementById('mode-of-transaction').value;
            if (!modeOfTransaction) {
                alert('Please select the mode of transaction');
                return false;
            }

            // If mode is UPI or Bank Transfer, validate transaction ID
            if ((modeOfTransaction === 'UPI' || modeOfTransaction === 'Bank Transfer')) {
                const transactionId = document.getElementById('transaction-id').value;
                if (!transactionId) {
                    alert('Please enter the transaction ID for UPI or Bank Transfer');
                    return false;
                }
            }
        }

        // If referral status is Received, validate referral payment details
        const referralStatus = document.getElementById('referral-status').value;
        if (referralStatus === 'Received') {
            const referralPaymentMode = document.getElementById('referral-payment-mode').value;
            if (!referralPaymentMode) {
                alert('Please select the referral payment mode');
                return false;
            }

            // If referral payment mode is UPI or Bank Transfer, validate referral transaction ID
            if ((referralPaymentMode === 'UPI' || referralPaymentMode === 'Bank Transfer')) {
                const referralTransactionId = document.getElementById('referral-transaction-id').value;
                if (!referralTransactionId) {
                    alert('Please enter the referral transaction ID for UPI or Bank Transfer');
                    return false;
                }
            }
        }

        // Validate total bill amount (must be a number, can be 0)
        if (totalBillAmount === null || totalBillAmount === undefined || totalBillAmount === '') {
            alert('Please enter Total Bill Amount (can be 0 if needed)');
            return false;
        }

        // Validate numeric fields
        const discountGiven = document.getElementById('discount-given').value;
        const referralAmount = document.getElementById('referral-amount').value;
        const amountPaid = document.getElementById('amount-paid').value;

        if (isNaN(parseFloat(totalBillAmount))) {
            alert('Total Bill Amount must be a valid number');
            return false;
        }

        if (discountGiven !== '' && isNaN(parseFloat(discountGiven))) {
            alert('Discount must be a valid number');
            return false;
        }

        if (referralAmount !== '' && isNaN(parseFloat(referralAmount))) {
            alert('Referral Amount must be a valid number');
            return false;
        }

        // If payment by us is Yes, validate payment details
        if (document.getElementById('payment-by-us').value === 'Yes') {
            if (!this.validatePaymentByUs()) {
                return false;
            }
        }

        return true;
    }

    // Save entry (create or update)
    async saveEntry() {
        if (!this.validateForm()) {
            return;
        }

        try {
            const entryData = {
                date: document.getElementById('date').value,
                memberName: document.getElementById('member-name').value,
                ahid: document.getElementById('ahid').value,
                serviceTypeId: document.getElementById('service-type').value,
                serviceTypeName: this.getServiceNameById(document.getElementById('service-type').value),
                packageType: document.getElementById('package-type').value,
                hcpName: document.getElementById('hcp-name').value,
                totalBillAmount: this.parseNumericValue(document.getElementById('total-bill-amount').value),
                discountGiven: this.parseNumericValue(document.getElementById('discount-given').value),
                referralAmount: this.parseNumericValue(document.getElementById('referral-amount').value),
                referralStatus: document.getElementById('referral-status').value,
                paymentByUs: document.getElementById('payment-by-us').value,
                navigatorId: window.authService.getCurrentUser().uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add collection details
            const collectedBy = document.getElementById('collected-by').value;
            if (collectedBy) {
                entryData.collectionDetails = {
                    collectedBy: collectedBy
                };

                if (collectedBy === 'Collected by AssistHealth') {
                    const modeOfTransaction = document.getElementById('mode-of-transaction').value;
                    if (modeOfTransaction) {
                        entryData.collectionDetails.modeOfTransaction = modeOfTransaction;

                        // Add transaction ID if mode is UPI or Bank Transfer
                        if (modeOfTransaction === 'UPI' || modeOfTransaction === 'Bank Transfer') {
                            const transactionId = document.getElementById('transaction-id').value;
                            if (transactionId) {
                                entryData.collectionDetails.transactionId = transactionId;
                            }
                        }
                    }
                }
            } else {
                entryData.collectionDetails = null;
            }

            // Add referral payment details
            const referralStatus = document.getElementById('referral-status').value;
            if (referralStatus === 'Received') {
                const referralPaymentMode = document.getElementById('referral-payment-mode').value;
                if (referralPaymentMode) {
                    entryData.referralPaymentDetails = {
                        paymentMode: referralPaymentMode,
                        paidDate: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Add referral transaction ID if mode is UPI or Bank Transfer
                    if (referralPaymentMode === 'UPI' || referralPaymentMode === 'Bank Transfer') {
                        const referralTransactionId = document.getElementById('referral-transaction-id').value;
                        if (referralTransactionId) {
                            entryData.referralPaymentDetails.transactionId = referralTransactionId;
                        }
                    }
                }
            } else {
                entryData.referralPaymentDetails = null;
            }

            // Handle Payment By Us
            const paymentByUs = document.getElementById('payment-by-us').value;
            if (paymentByUs === 'Yes') {
                const whomToPay = document.getElementById('whom-to-pay').value;
                const totalAmount = parseFloat(document.getElementById('total-amount-to-pay').value) || 0;

                if (!whomToPay || totalAmount <= 0) {
                    alert('Please fill in all payment details: Whom to Pay and Total Amount.');
                    return;
                }

                const paidAmount = this.calculateTotalPaid();
                const balanceAmount = totalAmount - paidAmount;

                let status = 'Not Started';
                if (paidAmount > 0 && balanceAmount > 0) {
                    status = 'Partially Paid';
                } else if (balanceAmount === 0 && paidAmount > 0) {
                    status = 'Completed';
                }

                entryData.paymentByUs = {
                    enabled: true,
                    whomToPay: whomToPay,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    balanceAmount: balanceAmount,
                    paymentStatus: status,
                    payments: this.currentPayments
                };
            } else {
                entryData.paymentByUs = {
                    enabled: false
                };
            }

            let entryRef;

            if (this.isEditing) {
                // Update existing entry
                entryRef = firestore.collection('service_entries').doc(this.currentEntry.id);
                await entryRef.update(entryData);
                console.log('Entry updated successfully');
            } else {
                // Create new entry with auto-incremented SL No
                const slNo = await firebaseUtils.getNextServiceEntryNumber();
                entryData.slNo = slNo;
                entryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

                entryRef = firestore.collection('service_entries').doc();
                await entryRef.set(entryData);
                console.log('Entry created successfully');
            }

            // Close modal and refresh dashboard
            this.closeModal();

            // Refresh dashboard data
            if (window.dashboardManager) {
                window.dashboardManager.loadData();
            }

            alert(this.isEditing ? 'Entry updated successfully!' : 'Entry added successfully!');
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry: ' + error.message);
        }
    }

    // Get service name by ID
    getServiceNameById(serviceId) {
        if (!window.userManagement || !window.userManagement.services) {
            return '';
        }

        const service = window.userManagement.services.find(s => s.id === serviceId);
        return service ? service.name : '';
    }

    // Parse numeric value, treating 0 as valid
    parseNumericValue(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Delete entry
    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) {
            return;
        }

        try {
            await firestore.collection('service_entries').doc(entryId).delete();
            console.log('Entry deleted successfully');

            // Refresh dashboard data
            if (window.dashboardManager) {
                window.dashboardManager.loadData();
            }

            alert('Entry deleted successfully!');
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Error deleting entry: ' + error.message);
        }
    }
}

// Initialize add entry manager
window.addEntryManager = new AddEntryManager();

// Add event listener for delete buttons (delegated event listener)
document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('btn-delete')) {
        const entryId = e.target.getAttribute('data-entry-id');
        if (entryId) {
            window.addEntryManager.deleteEntry(entryId);
        }
    }
});