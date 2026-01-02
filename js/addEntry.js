// Add/Entry Management System
class AddEntryManager {
    constructor() {
        this.currentEntry = null;
        this.isEditing = false;
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
        
        modal.style.display = 'block';
        
        // Show/hide payment details based on current value
        const paymentByUs = document.getElementById('payment-by-us').value;
        this.togglePaymentDetails(paymentByUs);
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('entry-modal');
        if (modal) {
            modal.style.display = 'none';
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
        document.getElementById('payment-by-us').value = entry.paymentByUs || 'No';
        
        // Populate payment details if they exist
        if (entry.paymentDetails) {
            document.getElementById('mode-of-transfer').value = entry.paymentDetails.mode || '';
            document.getElementById('paid-to').value = entry.paymentDetails.paidTo || '';
            document.getElementById('amount-paid').value = entry.paymentDetails.amountPaid !== undefined && entry.paymentDetails.amountPaid !== null ? entry.paymentDetails.amountPaid.toString() : '0';
            document.getElementById('payment-status').value = entry.paymentDetails.paymentStatus || 'Pending';
        }
        
        // Show/hide payment details based on paymentByUs value
        this.togglePaymentDetails(entry.paymentByUs);
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
        document.getElementById('mode-of-transfer').value = '';
        document.getElementById('paid-to').value = '';
        document.getElementById('amount-paid').value = '0';
        document.getElementById('payment-status').value = 'Pending';
        
        // Hide payment details section
        document.getElementById('payment-details-section').style.display = 'none';
    }

    // Toggle payment details section based on "Payment By Us" selection
    togglePaymentDetails(value) {
        const paymentDetailsSection = document.getElementById('payment-details-section');
        
        if (value === 'Yes') {
            paymentDetailsSection.style.display = 'block';
        } else {
            paymentDetailsSection.style.display = 'none';
        }
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
            const modeOfTransfer = document.getElementById('mode-of-transfer').value;
            const paidTo = document.getElementById('paid-to').value;
            
            if (!modeOfTransfer || !paidTo || amountPaid === '') {
                alert('Please fill in all payment details when "Payment By Us" is selected');
                return false;
            }
            
            if (isNaN(parseFloat(amountPaid))) {
                alert('Amount Paid must be a valid number');
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
            
            // Add payment details if payment by us is Yes
            if (document.getElementById('payment-by-us').value === 'Yes') {
                entryData.paymentDetails = {
                    mode: document.getElementById('mode-of-transfer').value,
                    paidTo: document.getElementById('paid-to').value,
                    amountPaid: this.parseNumericValue(document.getElementById('amount-paid').value),
                    paymentStatus: document.getElementById('payment-status').value
                };
            } else {
                entryData.paymentDetails = null;
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
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('btn-delete')) {
        const entryId = e.target.getAttribute('data-entry-id');
        if (entryId) {
            window.addEntryManager.deleteEntry(entryId);
        }
    }
});