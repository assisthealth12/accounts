// Invoice Generator Manager
class InvoiceGeneratorManager {
    constructor() {
        this.invoices = [];
        this.filteredInvoices = [];
        this.currentUser = null;
        this.currentUserRole = null;
        this.invoiceCounterRef = null;
        this.eventListenersAdded = false; // NEW
        
        // Initialize the invoice generator when needed
        this.initializeWhenReady();
    }

    // Initialize invoice generator when authService is ready
    initializeWhenReady() {
        // Check if authService is available
        if (window.authService) {
            this.updateCurrentUser();
        } else {
            // Wait for authService to be available
            const checkAuthService = () => {
                if (window.authService) {
                    this.updateCurrentUser();
                } else {
                    setTimeout(checkAuthService, 100);
                }
            };
            checkAuthService();
        }
    }
    
    // Update current user info
    updateCurrentUser() {
        this.currentUser = window.authService ? window.authService.getCurrentUser() : null;
        this.currentUserRole = window.authService ? window.authService.getUserRole() : null;
        
        console.log('Invoice Generator initialized with user:', this.currentUser, 'Role:', this.currentUserRole);
    }
    
    // Ensure user info is loaded before proceeding
    async ensureUserLoaded() {
        // If user info is already available, return immediately
        if (this.currentUser) {
            return;
        }
        
        // Try to load user info
        this.updateCurrentUser();
        
        // If still not available, wait a bit and try again
        let attempts = 0;
        while (!this.currentUser && attempts < 10) { // Max 10 attempts
            await new Promise(resolve => setTimeout(resolve, 100));
            this.updateCurrentUser();
            attempts++;
        }
    }

    // Get next invoice number using Firestore transaction
    async getNextInvoiceNumber() {
        try {
            // Use the firebase utility function if available
            if (window.firebaseUtils && window.firebaseUtils.getNextInvoiceNumber) {
                return await window.firebaseUtils.getNextInvoiceNumber();
            } else {
                // Fallback to direct implementation
                const counterRef = window.firestore.collection('counters').doc('invoiceLastNo');
                
                const result = await window.firestore.runTransaction(async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    
                    if (!counterDoc.exists) {
                        // If counter doesn't exist, initialize it
                        transaction.set(counterRef, { value: 1 });
                        return 1;
                    } else {
                        const newValue = counterDoc.data().value + 1;
                        transaction.update(counterRef, { value: newValue });
                        return newValue;
                    }
                });
                return result;
            }
        } catch (error) {
            console.error('Error getting next invoice number:', error);
            throw error;
        }
    }

    // Create a new invoice
    async createInvoice(invoiceData) {
        try {
            // Ensure user info is loaded
            await this.ensureUserLoaded();
            
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            // Get next invoice number
            const invoiceNumber = await this.getNextInvoiceNumber();

            // Prepare invoice data
            const invoiceToSave = {
                invoiceNumber: invoiceNumber,
                invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
                invoiceTo: {
                    name: invoiceData.invoiceTo.name || '',
                    address: invoiceData.invoiceTo.address || '',
                    email: invoiceData.invoiceTo.email || '',
                    phone: invoiceData.invoiceTo.phone || ''
                },
                items: invoiceData.items || [],
                subtotal: invoiceData.subtotal || 0,
                grandTotal: invoiceData.grandTotal || 0,
                modeOfPayment: invoiceData.modeOfPayment || '',
                createdBy: this.currentUser.uid,
                createdByName: this.currentUser.displayName || this.currentUser.email || 'Unknown',
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save to Firestore
            const docRef = await window.firestore.collection('invoices').add(invoiceToSave);
            
            console.log('Invoice created successfully with ID:', docRef.id);
            return { id: docRef.id, ...invoiceToSave };
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    // Update an existing invoice
    async updateInvoice(invoiceId, invoiceData) {
        try {
            // Ensure user info is loaded
            await this.ensureUserLoaded();
            
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            // Verify user has permission to update this invoice
            const invoiceDoc = await window.firestore.collection('invoices').doc(invoiceId).get();
            if (!invoiceDoc.exists) {
                throw new Error('Invoice not found');
            }

            const existingInvoice = invoiceDoc.data();
            if (this.currentUserRole !== 'admin' && existingInvoice.createdBy !== this.currentUser.uid) {
                throw new Error('Permission denied: You can only update your own invoices');
            }

            // Prepare updated invoice data
            const invoiceToUpdate = {
                invoiceDate: invoiceData.invoiceDate,
                invoiceTo: {
                    name: invoiceData.invoiceTo.name || '',
                    address: invoiceData.invoiceTo.address || '',
                    email: invoiceData.invoiceTo.email || '',
                    phone: invoiceData.invoiceTo.phone || ''
                },
                items: invoiceData.items || [],
                subtotal: invoiceData.subtotal || 0,
                grandTotal: invoiceData.grandTotal || 0,
                modeOfPayment: invoiceData.modeOfPayment || '',
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            // Update in Firestore
            await window.firestore.collection('invoices').doc(invoiceId).update(invoiceToUpdate);
            
            console.log('Invoice updated successfully with ID:', invoiceId);
            return { id: invoiceId, ...invoiceToUpdate };
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    // Delete an invoice
    async deleteInvoice(invoiceId) {
        try {
            // Ensure user info is loaded
            await this.ensureUserLoaded();
            
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            if (this.currentUserRole !== 'admin') {
                throw new Error('Permission denied: Only admin can delete invoices');
            }

            // Delete from Firestore
            await window.firestore.collection('invoices').doc(invoiceId).delete();
            
            console.log('Invoice deleted successfully with ID:', invoiceId);
            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    // Get all invoices for the current user (or all for admin)
    async getInvoices() {
        try {
            // Ensure user info is loaded
            await this.ensureUserLoaded();
            
            // Check if user is authenticated
            if (!this.currentUser) {
                console.warn('User not authenticated, cannot load invoices');
                return [];
            }
            
            // Use the firebase utility function if available
            if (window.firebaseUtils && window.firebaseUtils.getInvoices) {
                const invoices = await window.firebaseUtils.getInvoices(this.currentUser.uid, this.currentUserRole);
                this.invoices = invoices;
                this.filteredInvoices = invoices;
                
                console.log('Invoices loaded:', invoices.length);
                return invoices;
            } else {
                // Fallback to direct implementation
                let query = window.firestore.collection('invoices');
                
                if (this.currentUserRole === 'navigator') {
                    // Navigator can only see their own invoices
                    query = query.where('createdBy', '==', this.currentUser.uid);
                }
                
                const snapshot = await query.get();
                const invoices = [];
                
                snapshot.forEach(doc => {
                    invoices.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                this.invoices = invoices;
                this.filteredInvoices = invoices;
                
                console.log('Invoices loaded:', invoices.length);
                return invoices;
            }
        } catch (error) {
            console.error('Error getting invoices:', error);
            throw error;
        }
    }

    // Get a specific invoice by ID
    async getInvoiceById(invoiceId) {
        try {
            // Use the firebase utility function if available
            if (window.firebaseUtils && window.firebaseUtils.getInvoiceById) {
                const invoice = await window.firebaseUtils.getInvoiceById(invoiceId);
                if (!invoice) {
                    throw new Error('Invoice not found');
                }
                return invoice;
            } else {
                // Fallback to direct implementation
                const doc = await window.firestore.collection('invoices').doc(invoiceId).get();
                
                if (!doc.exists) {
                    throw new Error('Invoice not found');
                }
                
                const invoice = {
                    id: doc.id,
                    ...doc.data()
                };
                
                return invoice;
            }
        } catch (error) {
            console.error('Error getting invoice by ID:', error);
            throw error;
        }
    }

    // Create invoice form modal
    createInvoiceFormModal(isEdit = false, invoiceData = null) {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('invoice-form-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="invoice-form-modal" class="modal">
                <div class="modal-content" style="width: 90%; max-width: 1000px;">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Invoice' : 'Add Invoice'}</h3>
                        <span class="close" id="close-invoice-form-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="invoice-form">
                            <input type="hidden" id="invoice-id" name="invoice-id" value="${invoiceData?.id || ''}">
                            
                            <!-- Invoice To Section -->
                            <div class="form-section">
                                <h4><i class="fas fa-user"></i> Invoice To</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="invoice-to-name" class="required">Name</label>
                                        <input type="text" id="invoice-to-name" name="invoice-to-name" placeholder="Enter customer name" value="${invoiceData?.invoiceTo?.name || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="invoice-to-email">Email</label>
                                        <input type="email" id="invoice-to-email" name="invoice-to-email" placeholder="Enter customer email" value="${invoiceData?.invoiceTo?.email || ''}">
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="invoice-to-phone">Phone</label>
                                        <input type="tel" id="invoice-to-phone" name="invoice-to-phone" placeholder="Enter customer phone" value="${invoiceData?.invoiceTo?.phone || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label for="invoice-to-address">Address</label>
                                        <textarea id="invoice-to-address" name="invoice-to-address" placeholder="Enter customer address" rows="2">${invoiceData?.invoiceTo?.address || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Invoice Details Section -->
                            <div class="form-section">
                                <h4><i class="fas fa-file-invoice"></i> Invoice Details</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="invoice-date">Invoice Date</label>
                                        <input type="date" id="invoice-date" name="invoice-date" value="${invoiceData?.invoiceDate || new Date().toISOString().split('T')[0]}">
                                    </div>
                                    <div class="form-group">
                                        <label for="mode-of-payment">Mode of Payment</label>
                                        <select id="mode-of-payment" name="mode-of-payment">
                                            <option value="">Select Payment Mode</option>
                                            <option value="G PAY" ${invoiceData?.modeOfPayment === 'G PAY' ? 'selected' : ''}>G PAY</option>
                                            <option value="Bank Transfer" ${invoiceData?.modeOfPayment === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                                            <option value="Cash" ${invoiceData?.modeOfPayment === 'Cash' ? 'selected' : ''}>Cash</option>
                                            <option value="Credit Card" ${invoiceData?.modeOfPayment === 'Credit Card' ? 'selected' : ''}>Credit Card</option>
                                            <option value="Debit Card" ${invoiceData?.modeOfPayment === 'Debit Card' ? 'selected' : ''}>Debit Card</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Items Section -->
                            <div class="form-section">
                                <h4><i class="fas fa-boxes"></i> Items</h4>
                                <div class="table-container">
                                    <table id="invoice-items-table">
                                        <thead>
                                            <tr>
                                                <th>No.</th>
                                                <th>Description</th>
                                                <th>Qty</th>
                                                <th>Price</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="invoice-items-body">
                                            ${invoiceData?.items?.map((item, index) => `
                                                <tr data-item-index="${index}">
                                                    <td>${index + 1}</td>
                                                    <td><input type="text" class="item-description" name="item-description-${index}" value="${item.description || ''}" placeholder="Item description"></td>
                                                    <td><input type="number" class="item-qty" name="item-qty-${index}" value="${item.qty || 1}" min="1" placeholder="Qty"></td>
                                                    <td><input type="number" class="item-price" name="item-price-${index}" value="${item.price || 0}" min="0" placeholder="Price"></td>
                                                    <td><button type="button" class="btn-danger btn-small remove-item-btn">Remove</button></td>
                                                </tr>
                                            `).join('') || `
                                                <tr data-item-index="0">
                                                    <td>1</td>
                                                    <td><input type="text" class="item-description" name="item-description-0" placeholder="Item description"></td>
                                                    <td><input type="number" class="item-qty" name="item-qty-0" value="1" min="1" placeholder="Qty"></td>
                                                    <td><input type="number" class="item-price" name="item-price-0" value="0" min="0" placeholder="Price"></td>
                                                    <td><button type="button" class="btn-danger btn-small remove-item-btn">Remove</button></td>
                                                </tr>
                                            `}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="button" id="add-item-btn" class="btn-secondary" style="margin-top: 10px;">
                                    <i class="fas fa-plus"></i> Add Item
                                </button>
                            </div>
                            
                            <!-- Totals Section -->
                            <div class="form-section">
                                <h4><i class="fas fa-calculator"></i> Totals</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Subtotal</label>
                                        <input type="text" id="invoice-subtotal" name="invoice-subtotal" value="₹0" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
                                    </div>
                                    <div class="form-group">
                                        <label>Grand Total</label>
                                        <input type="text" id="invoice-grand-total" name="invoice-grand-total" value="₹0" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save"></i> ${isEdit ? 'Update Invoice' : 'Save Invoice'}
                                </button>
                                <button type="button" id="cancel-invoice-form-modal" class="btn-secondary">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners to the modal
        this.addInvoiceFormEventListeners(isEdit, invoiceData);
        
        // Calculate initial totals if editing
        if (isEdit && invoiceData) {
            this.calculateTotals();
        }
        
        // Show modal with animation
        const modal = document.getElementById('invoice-form-modal');
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        // Force reflow
        void modal.offsetWidth;
        // Trigger animation
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.classList.add('show');
        }, 10);
    }

    // Add event listeners to invoice form
    addInvoiceFormEventListeners(isEdit, invoiceData) {
        const modal = document.getElementById('invoice-form-modal');
        const form = document.getElementById('invoice-form');
        const closeModal = document.getElementById('close-invoice-form-modal');
        const cancelModal = document.getElementById('cancel-invoice-form-modal');
        const addItemBtn = document.getElementById('add-item-btn');

        // Close modal event listeners
        closeModal.addEventListener('click', () => {
            modal.remove();
        });

        cancelModal.addEventListener('click', () => {
            modal.remove();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add item button
        addItemBtn.addEventListener('click', () => {
            this.addItemRow();
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleInvoiceFormSubmit(isEdit, invoiceData);
        });

        // Add event listeners to existing item rows
        this.addEventListenersToItemRows();

        // Calculate totals when item fields change
        this.addItemChangeListeners();
    }

    // Add event listeners to item rows
    addEventListenersToItemRows() {
        const removeButtons = document.querySelectorAll('.remove-item-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                if (row) {
                    row.remove();
                    this.updateItemNumbers();
                    this.calculateTotals();
                }
            });
        });
    }

    // Add change listeners to item fields
    addItemChangeListeners() {
        const itemsContainer = document.getElementById('invoice-items-body');
        
        // Use event delegation for dynamic elements
        itemsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
                this.calculateTotals();
            }
        });
    }

    // Add a new item row
    addItemRow() {
        const tbody = document.getElementById('invoice-items-body');
        const rowCount = tbody.children.length + 1;
        
        const rowHTML = `
            <tr data-item-index="${rowCount}">
                <td>${rowCount}</td>
                <td><input type="text" class="item-description" name="item-description-${rowCount}" placeholder="Item description"></td>
                <td><input type="number" class="item-qty" name="item-qty-${rowCount}" value="1" min="1" placeholder="Qty"></td>
                <td><input type="number" class="item-price" name="item-price-${rowCount}" value="0" min="0" placeholder="Price"></td>
                <td><button type="button" class="btn-danger btn-small remove-item-btn">Remove</button></td>
            </tr>
        `;
        
        tbody.insertAdjacentHTML('beforeend', rowHTML);
        
        // Add event listeners to the new row
        const newRow = tbody.lastElementChild;
        newRow.querySelector('.remove-item-btn').addEventListener('click', (e) => {
            e.target.closest('tr').remove();
            this.updateItemNumbers();
            this.calculateTotals();
        });
        
        // Add input listener to the new row
        newRow.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
                this.calculateTotals();
            }
        });
    }

    // Calculate item subtotal
    calculateItemSubtotal(row) {
        // This function is kept for compatibility but we'll calculate without displaying
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const subtotal = qty * price;
        
        // Return the calculated subtotal without displaying it in the form
        return subtotal;
    }

    // Update item numbers after removal
    updateItemNumbers() {
        const rows = document.querySelectorAll('#invoice-items-body tr');
        rows.forEach((row, index) => {
            row.cells[0].textContent = index + 1;
            row.setAttribute('data-item-index', index);
        });
    }

    // Calculate totals
    calculateTotals() {
        let subtotal = 0;
        const rows = document.querySelectorAll('#invoice-items-body tr');
        
        rows.forEach(row => {
            const qtyInput = row.querySelector('.item-qty');
            const priceInput = row.querySelector('.item-price');
            
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const itemTotal = qty * price;
            
            subtotal += itemTotal;
        });
        
        const grandTotal = subtotal; // For now, grand total is same as subtotal (no GST)
        
        document.getElementById('invoice-subtotal').value = `₹${subtotal.toLocaleString()}`;
        document.getElementById('invoice-grand-total').value = `₹${grandTotal.toLocaleString()}`;
        
        return { subtotal, grandTotal };
    }

    // Handle invoice form submission
    async handleInvoiceFormSubmit(isEdit, originalInvoiceData) {
        // Show loading state - define originalText outside try block
        const submitBtn = document.querySelector('#invoice-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Get form data
            const invoiceToName = document.getElementById('invoice-to-name').value.trim();
            const invoiceToEmail = document.getElementById('invoice-to-email').value.trim();
            const invoiceToPhone = document.getElementById('invoice-to-phone').value.trim();
            const invoiceToAddress = document.getElementById('invoice-to-address').value.trim();
            const invoiceDate = document.getElementById('invoice-date').value;
            const modeOfPayment = document.getElementById('mode-of-payment').value;
            
            // Validate required fields
            if (!invoiceToName) {
                alert('Please enter customer name');
                return;
            }
            
            // Get items data
            const items = [];
            const rows = document.querySelectorAll('#invoice-items-body tr');
            let hasEmptyDescription = false;
            
            rows.forEach((row, index) => {
                const description = row.querySelector('.item-description').value.trim();
                const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                const subtotal = qty * price;
                
                if (!description) {
                    hasEmptyDescription = true;
                }
                
                items.push({
                    no: index + 1,
                    description,
                    qty,
                    price,
                    subtotal
                });
            });
            
            if (hasEmptyDescription) {
                alert('Please enter descriptions for all items');
                return;
            }
            
            if (items.length === 0) {
                alert('Please add at least one item');
                return;
            }
            
            // Calculate totals
            const totals = this.calculateTotals();
            
            // Prepare invoice data
            const invoiceData = {
                invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
                invoiceTo: {
                    name: invoiceToName,
                    email: invoiceToEmail,
                    phone: invoiceToPhone,
                    address: invoiceToAddress
                },
                items,
                subtotal: totals.subtotal,
                grandTotal: totals.grandTotal,
                modeOfPayment: modeOfPayment
            };
            
            // Update button state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
            
            // Save invoice
            let result;
            if (isEdit) {
                const invoiceId = document.getElementById('invoice-id').value;
                result = await this.updateInvoice(invoiceId, invoiceData);
            } else {
                result = await this.createInvoice(invoiceData);
            }
            
            // Success feedback
            alert(isEdit ? 'Invoice updated successfully!' : 'Invoice created successfully!');
            
            // Close modal and refresh invoice list
            const modal = document.getElementById('invoice-form-modal');
            if (modal) {
                modal.remove();
            }
            
            // Small delay to ensure modal is fully removed before refreshing
            setTimeout(() => {
                this.loadInvoicesForDisplay();
            }, 100);
            
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error saving invoice: ' + error.message);
        } finally {
            // Restore submit button
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    // Create invoice generator screen
    createInvoiceGeneratorScreen() {
        let invoiceScreen = document.getElementById('invoice-generator-screen');
        
        if (!invoiceScreen) {
            // Create screen HTML (same as before)
            invoiceScreen = document.createElement('div');
            invoiceScreen.id = 'invoice-generator-screen';
            invoiceScreen.className = 'dashboard-screen invoice-generator-screen';
            invoiceScreen.style.display = 'none';
            
            invoiceScreen.innerHTML = `
                <div class="dashboard-header">
                    <h1>Invoice Generator</h1>
                    <button id="add-invoice-btn" class="btn-primary"><i class="fas fa-file-invoice"></i> Add Invoice</button>
                </div>
                
                <div class="table-container">
                    <table id="invoices-table">
                        <thead>
                            <tr>
                                <th>Invoice Number</th>
                                <th>Invoice Date</th>
                                <th>Invoice To</th>
                                <th>Mode of Payment</th>
                                <th>Grand Total</th>
                                <th>Created By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-table-body">
                            <!-- Invoice rows will be populated here -->
                        </tbody>
                    </table>
                </div>
                
                <div id="invoices-loading" class="loading-state" style="display: none;">
                    <i class="fas fa-spinner fa-spin"></i> Loading invoices...
                </div>
                
                <div id="invoices-empty" class="empty-state" style="display: none;">
                    <i class="fas fa-file-invoice"></i>
                    <h4>No invoices found</h4>
                    <p>Create your first invoice to get started.</p>
                </div>
            `;
            
            // Insert the screen into the main dashboard content area
            const dashboardContent = document.querySelector('.dashboard-content');
            if (dashboardContent) {
                dashboardContent.appendChild(invoiceScreen);
            }
        } else {
            // If screen already exists, make sure it's properly updated
            invoiceScreen.style.display = 'block';
        }
        
        // Only add event listeners ONCE
        if (!this.eventListenersAdded) {
            this.addInvoiceScreenEventListeners();
            this.eventListenersAdded = true;
        }
        
        // Clear and reload invoices
        this.loadInvoicesForDisplay();
    }

    // Add event listeners to invoice screen
    addInvoiceScreenEventListeners() {
        const addInvoiceBtn = document.getElementById('add-invoice-btn');
        if (addInvoiceBtn) {
            // Use onclick instead of addEventListener to avoid duplicates
            addInvoiceBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.createInvoiceFormModal(false);
            };
        }
    }
    
    // Load invoices for display

    async loadInvoicesForDisplay() {
        try {
            const loadingDiv = document.getElementById('invoices-loading');
            const emptyDiv = document.getElementById('invoices-empty');
            const tableBody = document.getElementById('invoices-table-body');
            
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';
            
            // Clear existing table content to prevent duplicates
            if (tableBody) {
                tableBody.innerHTML = '';
            }
            
            // Load invoices
            const invoices = await this.getInvoices();
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            
            if (invoices.length === 0) {
                if (emptyDiv) emptyDiv.style.display = 'block';
                return;
            }
            
            if (emptyDiv) emptyDiv.style.display = 'none';
            
            // Clear existing table content to prevent duplicates
            if (tableBody) {
                tableBody.innerHTML = '';
            }
            
            // Populate table
            invoices.forEach(invoice => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${invoice.invoiceNumber}</td>
                    <td>${invoice.invoiceDate}</td>
                    <td>${invoice.invoiceTo?.name || 'N/A'}</td>
                    <td>${invoice.modeOfPayment || 'N/A'}</td>
                    <td>₹${(invoice.grandTotal || 0).toLocaleString()}</td>
                    <td>${invoice.createdByName || 'N/A'}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-edit" onclick="window.invoiceGeneratorManager.handleEditInvoice('${invoice.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action btn-download" onclick="window.invoiceGeneratorManager.handleDownloadInvoice('${invoice.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        ${this.currentUserRole === 'admin' ? `
                            <button class="btn-action btn-danger btn-delete" onclick="window.invoiceGeneratorManager.handleDeleteInvoice('${invoice.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </td>
                `;
                
                if (tableBody) tableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Error loading invoices for display:', error);
            
            const loadingDiv = document.getElementById('invoices-loading');
            const emptyDiv = document.getElementById('invoices-empty');
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading invoices</h4><p>${error.message}</p>`;
                emptyDiv.style.display = 'block';
            }
        }
    }


    
    // Handle edit invoice
    async handleEditInvoice(invoiceId) {
        try {
            const invoice = await this.getInvoiceById(invoiceId);
            this.createInvoiceFormModal(true, invoice);
        } catch (error) {
            console.error('Error loading invoice for edit:', error);
            alert('Error loading invoice: ' + error.message);
        }
    }
    
    // Handle download invoice
    handleDownloadInvoice(invoiceId) {
        if (window.invoicePDFManager) {
            window.invoicePDFManager.downloadInvoice(invoiceId);
        } else {
            alert('PDF generation functionality is not available');
        }
    }
    
    // Handle delete invoice
    async handleDeleteInvoice(invoiceId) {
        if (confirm('Are you sure you want to delete this invoice?')) {
            try {
                await this.deleteInvoice(invoiceId);
                alert('Invoice deleted successfully!');
                this.loadInvoicesForDisplay(); // Refresh the list
            } catch (error) {
                console.error('Error deleting invoice:', error);
                alert('Error deleting invoice: ' + error.message);
            }
        }
    }
}

// Initialize invoice generator manager
window.invoiceGeneratorManager = new InvoiceGeneratorManager();

// ADD debugging helper:
window.debugInvoices = async function() {
    try {
        console.log('Debug: Starting invoice fetch...');
        const invoices = await window.invoiceGeneratorManager.getInvoices();
        console.log('Debug: Fetched invoices:', invoices);
        console.log('Debug: Invoice count:', invoices.length);
        
        // Check for duplicates
        const invoiceIds = invoices.map(inv => inv.id);
        const uniqueIds = [...new Set(invoiceIds)];
        console.log('Debug: Unique invoice IDs:', uniqueIds.length, 'vs Total:', invoiceIds.length);
        
        if (invoiceIds.length !== uniqueIds.length) {
            console.warn('Debug: Duplicate invoices detected!');
        }
        
        return invoices;
    } catch (error) {
        console.error('Debug: Error fetching invoices:', error);
    }
};

console.log('Invoice debugging helper available: window.debugInvoices()');