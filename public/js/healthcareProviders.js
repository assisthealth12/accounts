// Healthcare Providers Management System
class HealthcareProviderManager {
    constructor() {
        this.providers = [];
        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        // Listen for providers update event to refresh dropdowns
        window.addEventListener('providersUpdated', () => {
            this.getProviders();
        });
    }

    // Get all healthcare providers
    async getProviders() {
        try {
            // Check if user is authenticated
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping providers fetch');
                return [];
            }

            const q = firestore.collection('healthcare_providers');
            const snapshot = await q.get();
            const providers = [];

            snapshot.forEach(doc => {
                providers.push({ 
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.providers = providers;
            return providers;
        } catch (error) {
            console.error('Error fetching healthcare providers:', error);
            throw error;
        }
    }

    // Get active healthcare providers only
    async getActiveProviders() {
        try {
            // Check if user is authenticated
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping providers fetch');
                return [];
            }

            const q = firestore.collection('healthcare_providers').where('active', '==', true);
            const snapshot = await q.get();
            const providers = [];

            snapshot.forEach(doc => {
                providers.push({ 
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.providers = providers;
            return providers;
        } catch (error) {
            console.error('Error fetching active healthcare providers:', error);
            throw error;
        }
    }

    // Get provider by ID
    getProviderById(providerId) {
        return this.providers.find(provider => provider.id === providerId) || null;
    }

    normalizeProviderName(name) {
        return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    }

    async ensureUniqueProviderName(name, excludeProviderId = null) {
        const normalizedName = this.normalizeProviderName(name);
        if (!normalizedName) {
            throw new Error('Provider name is required');
        }

        const providers = Array.isArray(this.providers) && this.providers.length > 0
            ? this.providers
            : await this.getProviders();

        const duplicate = providers.find(provider => {
            if (excludeProviderId && provider.id === excludeProviderId) {
                return false;
            }

            const existingName = provider.normalizedName || this.normalizeProviderName(provider.name);
            return existingName === normalizedName;
        });

        if (duplicate) {
            throw new Error('A healthcare provider with this name already exists');
        }

        return normalizedName;
    }

    // Add new healthcare provider
    async addProvider(providerData) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can add healthcare providers');
            }

            // Validate required fields
            if (!providerData.name) {
                throw new Error('Provider name is required');
            }

            const normalizedName = await this.ensureUniqueProviderName(providerData.name);

            // Prepare provider data
            const providerToAdd = {
                name: providerData.name.trim().replace(/\s+/g, ' '),
                normalizedName: normalizedName,
                contact: providerData.contact || '',
                email: providerData.email || '',
                active: providerData.active !== undefined ? providerData.active : true,
                createdBy: window.authService.getCurrentUser().uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            const providerRef = firestore.collection('healthcare_providers').doc();
            await providerRef.set(providerToAdd);

            console.log('Healthcare provider added successfully');
            
            // Refresh providers list
            await this.getProviders();
            
            // Notify other parts of the app that providers have been updated
            window.dispatchEvent(new CustomEvent('providersUpdated'));
            
            return providerRef.id;
        } catch (error) {
            console.error('Error adding healthcare provider:', error);
            throw error;
        }
    }

    // Update healthcare provider
    async updateProvider(providerId, providerData) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can update healthcare providers');
            }

            if (!providerData.name) {
                throw new Error('Provider name is required');
            }

            const normalizedName = await this.ensureUniqueProviderName(providerData.name, providerId);

            // Prepare update data
            const providerToUpdate = {
                name: providerData.name.trim().replace(/\s+/g, ' '),
                normalizedName: normalizedName,
                contact: providerData.contact || '',
                email: providerData.email || '',
                active: providerData.active !== undefined ? providerData.active : true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Update in Firestore
            await firestore.collection('healthcare_providers').doc(providerId).update(providerToUpdate);

            console.log('Healthcare provider updated successfully');
            
            // Refresh providers list
            await this.getProviders();
            
            // Notify other parts of the app that providers have been updated
            window.dispatchEvent(new CustomEvent('providersUpdated'));
        } catch (error) {
            console.error('Error updating healthcare provider:', error);
            throw error;
        }
    }

    // Update provider status (admin only)
    async updateProviderStatus(providerId, active) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can update provider status');
            }

            await firestore.collection('healthcare_providers').doc(providerId).update({
                active: active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('Healthcare provider status updated successfully');

            // Refresh providers list
            await this.getProviders();

            // Notify other parts of the app that providers have been updated
            window.dispatchEvent(new CustomEvent('providersUpdated'));
        } catch (error) {
            console.error('Error updating provider status:', error);
            throw error;
        }
    }

    // Get provider name by ID
    getProviderNameById(providerId) {
        if (!this.providers || !Array.isArray(this.providers)) {
            return '';
        }

        const provider = this.providers.find(p => p.id === providerId);
        return provider ? provider.name : '';
    }

    // Create add provider modal HTML
    createAddProviderModal() {
        const modalHTML = `
            <div id="add-provider-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Healthcare Provider</h3>
                        <span id="close-provider-modal" class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="add-provider-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="provider-name">Provider Name *</label>
                                    <input type="text" id="provider-name" placeholder="Enter provider name" required>
                                </div>
                                <div class="form-group">
                                    <label for="provider-contact">Contact Number</label>
                                    <input type="text" id="provider-contact" placeholder="Enter contact number">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="provider-email">Email</label>
                                    <input type="email" id="provider-email" placeholder="Enter email address">
                                </div>
                                <div class="form-group">
                                    <label for="provider-status">Status</label>
                                    <select id="provider-status">
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">Add Provider</button>
                                <button type="button" id="cancel-provider-modal" class="btn-secondary">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('close-provider-modal').addEventListener('click', () => {
            this.closeAddProviderModal();
        });

        document.getElementById('cancel-provider-modal').addEventListener('click', () => {
            this.closeAddProviderModal();
        });

        document.getElementById('add-provider-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addProviderFromForm();
        });
    }

    // Show add provider modal
    async showAddProviderModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('add-provider-modal')) {
            this.createAddProviderModal();
        }

        document.getElementById('add-provider-modal').classList.add('show');
        document.getElementById('provider-name').value = '';
        document.getElementById('provider-contact').value = '';
        document.getElementById('provider-email').value = '';
        document.getElementById('provider-status').value = 'true';
    }

    // Close add provider modal
    closeAddProviderModal() {
        const modal = document.getElementById('add-provider-modal');
        if (modal) {
            modal.classList.remove('show');
            // Remove the modal from DOM after transition completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Add provider from form
    async addProviderFromForm() {
        const name = document.getElementById('provider-name').value;
        const contact = document.getElementById('provider-contact').value;
        const email = document.getElementById('provider-email').value;
        const status = document.getElementById('provider-status').value === 'true';

        if (!name) {
            alert('Please enter provider name');
            return;
        }

        try {
            await this.addProvider({
                name,
                contact,
                email,
                active: status
            });

            this.closeAddProviderModal();
            alert('Healthcare provider added successfully!');

            // If called from the add entry form, update the dropdown
            if (window.addEntryManager) {
                window.addEntryManager.populateHCPDropdown();
            }
        } catch (error) {
            console.error('Error adding provider:', error);
            alert('Error adding healthcare provider: ' + error.message);
        }
    }
}

// Initialize healthcare provider manager
window.healthcareProviderManager = new HealthcareProviderManager();

class HealthcareProviderUI {
    constructor(providerManager) {
        this.providerManager = providerManager;
        this.editingProviderId = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.eventListenersAdded = false;
        this.pendingStatusChange = null;
        this.messageTimer = null;
    }

    show() {
        this.createScreen();
        this.resetForm();
        this.currentPage = 1;
        this.loadAndDisplayProviders();
    }

    createScreen() {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (!dashboardContent) return;

        if (!document.getElementById('manage-providers-screen')) {
            const screenElement = document.createElement('div');
            screenElement.id = 'manage-providers-screen';
            screenElement.className = 'dashboard-screen';
            screenElement.style.display = 'none';
            screenElement.innerHTML = `
                <div class="section-header">
                    <div>
                        <h1>Manage Healthcare Providers</h1>
                        <p>Maintain provider records, status, and duplicate-safe names.</p>
                    </div>
                    <button type="button" id="open-provider-modal-btn" class="btn-primary">Add Provider</button>
                </div>

                <div id="providers-screen-message" class="dashboard-message" aria-live="polite"></div>

                <div class="section-panel">
                    <div class="provider-toolbar">
                        <div class="filter-group">
                            <label for="provider-search">Search Providers</label>
                            <input type="text" id="provider-search" placeholder="Search name, contact, or email">
                        </div>
                        <div class="filter-group">
                            <label for="provider-status-filter">Status</label>
                            <select id="provider-status-filter">
                                <option value="">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div id="providers-loading" class="loading-state" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i> Loading providers...
                    </div>
                    <div id="providers-empty" class="empty-state" style="display: none;">
                        <i class="fas fa-hospital"></i>
                        <h4>No providers found</h4>
                        <p>Add your first healthcare provider to get started.</p>
                    </div>
                    <div class="table-container">
                        <table id="providers-table">
                            <thead>
                                <tr>
                                    <th>Provider Name</th>
                                    <th>Contact</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="providers-table-body">
                                <!-- Provider rows will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            dashboardContent.appendChild(screenElement);
        }

        this.createProviderModal();
        this.createProviderConfirmModal();
        this.addEventListeners();
    }

    createProviderModal() {
        if (document.getElementById('provider-form-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'provider-form-modal';
        modal.className = 'modal provider-modal';
        modal.innerHTML = `
            <div class="modal-content provider-modal-content">
                <div class="modal-header">
                    <h3 id="provider-modal-title">Add Healthcare Provider</h3>
                    <span class="close" id="close-provider-form-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="provider-form-message" class="dashboard-message" aria-live="polite"></div>
                    <form id="provider-form">
                        <div class="form-group">
                            <label for="new-provider-name">Provider Name *</label>
                            <input type="text" id="new-provider-name" placeholder="Enter provider name" required>
                        </div>
                        <div class="form-row provider-modal-row">
                            <div class="form-group">
                                <label for="new-provider-contact">Contact Number</label>
                                <input type="text" id="new-provider-contact" placeholder="Contact number">
                            </div>
                            <div class="form-group">
                                <label for="new-provider-email">Email Address</label>
                                <input type="email" id="new-provider-email" placeholder="Email address">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="new-provider-status">Status</label>
                            <select id="new-provider-status">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions provider-modal-actions">
                            <button type="button" id="cancel-provider-edit-btn" class="btn-secondary">Cancel</button>
                            <button type="submit" id="save-provider-btn" class="btn-primary">Add Provider</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    createProviderConfirmModal() {
        if (document.getElementById('provider-confirm-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'provider-confirm-modal';
        modal.className = 'modal provider-modal';
        modal.innerHTML = `
            <div class="modal-content provider-confirm-content">
                <div class="modal-header">
                    <h3>Confirm Status Change</h3>
                    <span class="close" id="close-provider-confirm-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p id="provider-confirm-message" class="provider-confirm-message"></p>
                    <div class="form-actions provider-modal-actions">
                        <button type="button" id="cancel-provider-status-btn" class="btn-secondary">Cancel</button>
                        <button type="button" id="confirm-provider-status-btn" class="btn-primary">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    addEventListeners() {
        if (this.eventListenersAdded) return;

        document.getElementById('open-provider-modal-btn')?.addEventListener('click', () => {
            this.openProviderModal();
        });

        document.getElementById('provider-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProviderFromForm();
        });

        document.getElementById('cancel-provider-edit-btn')?.addEventListener('click', () => {
            this.closeProviderModal();
        });

        document.getElementById('close-provider-form-modal')?.addEventListener('click', () => {
            this.closeProviderModal();
        });

        document.getElementById('provider-form-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'provider-form-modal') {
                this.closeProviderModal();
            }
        });

        document.getElementById('close-provider-confirm-modal')?.addEventListener('click', () => {
            this.closeProviderConfirmModal();
        });

        document.getElementById('cancel-provider-status-btn')?.addEventListener('click', () => {
            this.closeProviderConfirmModal();
        });

        document.getElementById('provider-confirm-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'provider-confirm-modal') {
                this.closeProviderConfirmModal();
            }
        });

        document.getElementById('confirm-provider-status-btn')?.addEventListener('click', async () => {
            await this.applyPendingStatusChange();
        });

        const providerSearch = document.getElementById('provider-search');
        if (providerSearch) {
            providerSearch.addEventListener('input', () => {
                this.currentPage = 1;
                this.loadAndDisplayProviders();
            });
        }

        const providerStatusFilter = document.getElementById('provider-status-filter');
        if (providerStatusFilter) {
            providerStatusFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadAndDisplayProviders();
            });
        }

        this.eventListenersAdded = true;
    }

    async saveProviderFromForm() {
        const providerName = document.getElementById('new-provider-name').value.trim();
        const providerContact = document.getElementById('new-provider-contact').value.trim();
        const providerEmail = document.getElementById('new-provider-email').value.trim();
        const providerStatus = document.getElementById('new-provider-status').value === 'true';
        const isEditing = Boolean(this.editingProviderId);

        if (!providerName) {
            this.showFormMessage('error', 'Please enter a provider name.');
            return;
        }

        if (providerEmail && typeof isValidEmail === 'function' && !isValidEmail(providerEmail)) {
            this.showFormMessage('error', 'Please enter a valid email address.');
            return;
        }

        try {
            this.setSavingState(true);

            if (isEditing) {
                const provider = this.providerManager.getProviderById(this.editingProviderId);
                await this.providerManager.updateProvider(this.editingProviderId, {
                    name: providerName,
                    contact: providerContact,
                    email: providerEmail,
                    active: provider ? providerStatus : true
                });
            } else {
                await this.providerManager.addProvider({
                    name: providerName,
                    contact: providerContact,
                    email: providerEmail,
                    active: providerStatus
                });
            }

            this.closeProviderModal();
            this.resetForm();
            await this.loadAndDisplayProviders();
            this.showScreenMessage('success', isEditing ? 'Healthcare provider updated successfully.' : 'Healthcare provider added successfully.');
        } catch (error) {
            console.error('Error saving provider:', error);
            this.showFormMessage('error', 'Error saving healthcare provider: ' + error.message);
        } finally {
            this.setSavingState(false);
        }
    }

    resetForm() {
        this.editingProviderId = null;

        const nameInput = document.getElementById('new-provider-name');
        const contactInput = document.getElementById('new-provider-contact');
        const emailInput = document.getElementById('new-provider-email');
        const statusInput = document.getElementById('new-provider-status');
        const saveButton = document.getElementById('save-provider-btn');
        const modalTitle = document.getElementById('provider-modal-title');

        if (nameInput) nameInput.value = '';
        if (contactInput) contactInput.value = '';
        if (emailInput) emailInput.value = '';
        if (statusInput) statusInput.value = 'true';
        if (saveButton) saveButton.textContent = 'Add Provider';
        if (modalTitle) modalTitle.textContent = 'Add Healthcare Provider';
        this.showFormMessage('', '');
    }

    openProviderModal(providerId = null) {
        this.resetForm();
        const modal = document.getElementById('provider-form-modal');
        if (!modal) return;

        if (providerId) {
            const provider = this.providerManager.getProviderById(providerId);
            if (!provider) {
                this.showScreenMessage('error', 'Unable to find that provider. Please refresh and try again.');
                return;
            }

            this.editingProviderId = providerId;
            document.getElementById('new-provider-name').value = provider.name || '';
            document.getElementById('new-provider-contact').value = provider.contact || '';
            document.getElementById('new-provider-email').value = provider.email || '';
            document.getElementById('new-provider-status').value = provider.active ? 'true' : 'false';
            document.getElementById('save-provider-btn').textContent = 'Update Provider';
            document.getElementById('provider-modal-title').textContent = 'Edit Healthcare Provider';
        }

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        setTimeout(() => document.getElementById('new-provider-name')?.focus(), 80);
    }

    closeProviderModal() {
        const modal = document.getElementById('provider-form-modal');
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    editProvider(providerId) {
        this.openProviderModal(providerId);
    }

    setSavingState(isSaving) {
        const saveButton = document.getElementById('save-provider-btn');
        if (!saveButton) return;

        saveButton.disabled = isSaving;
        saveButton.textContent = isSaving ? 'Saving...' : (this.editingProviderId ? 'Update Provider' : 'Add Provider');
    }

    showScreenMessage(type, message) {
        this.showMessage('providers-screen-message', type, message, true);
    }

    showFormMessage(type, message) {
        this.showMessage('provider-form-message', type, message, false);
    }

    showMessage(elementId, type, message, autoHide) {
        const messageElement = document.getElementById(elementId);
        if (!messageElement) return;

        clearTimeout(this.messageTimer);
        messageElement.className = 'dashboard-message';
        messageElement.textContent = '';

        if (!message) {
            return;
        }

        messageElement.textContent = message;
        messageElement.classList.add(type === 'success' ? 'success' : 'error');

        if (autoHide) {
            this.messageTimer = setTimeout(() => {
                messageElement.className = 'dashboard-message';
                messageElement.textContent = '';
            }, 4500);
        }
    }

    renderPagination(totalProviders) {
        const table = document.getElementById('providers-table');
        if (!table || !table.parentElement) return;

        let pagination = document.getElementById('providers-pagination');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.id = 'providers-pagination';
            pagination.className = 'pagination-controls';
            table.parentElement.insertAdjacentElement('afterend', pagination);
        }

        const totalPages = Math.max(1, Math.ceil(totalProviders / this.pageSize));
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        const start = totalProviders === 0 ? 0 : ((this.currentPage - 1) * this.pageSize) + 1;
        const end = Math.min(this.currentPage * this.pageSize, totalProviders);

        pagination.innerHTML = `
            <div class="pagination-info">Showing ${start}-${end} of ${totalProviders}</div>
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

                this.loadAndDisplayProviders();
            });
        });
    }

    async loadAndDisplayProviders() {
        try {
            const tableBody = document.getElementById('providers-table-body');
            const loadingDiv = document.getElementById('providers-loading');
            const emptyDiv = document.getElementById('providers-empty');

            if (!tableBody) return;

            tableBody.innerHTML = '';
            loadingDiv.style.display = 'block';
            emptyDiv.style.display = 'none';

            const providers = await this.providerManager.getProviders();
            const searchTerm = (document.getElementById('provider-search')?.value || '').toLowerCase().trim();
            const statusFilter = document.getElementById('provider-status-filter')?.value || '';
            const filteredProviders = providers.filter(provider => {
                if (statusFilter === 'active' && !provider.active) {
                    return false;
                }

                if (statusFilter === 'inactive' && provider.active) {
                    return false;
                }

                if (!searchTerm) {
                    return true;
                }

                const searchableText = [
                    provider.name || '',
                    provider.contact || '',
                    provider.email || ''
                ].join(' ').toLowerCase();

                return searchableText.includes(searchTerm);
            });

            loadingDiv.style.display = 'none';

            if (filteredProviders.length === 0) {
                emptyDiv.style.display = 'block';
                this.renderPagination(0);
                return;
            }

            emptyDiv.style.display = 'none';
            filteredProviders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const totalPages = Math.max(1, Math.ceil(filteredProviders.length / this.pageSize));
            if (this.currentPage > totalPages) {
                this.currentPage = totalPages;
            }

            const startIndex = (this.currentPage - 1) * this.pageSize;
            const pageProviders = filteredProviders.slice(startIndex, startIndex + this.pageSize);

            pageProviders.forEach(provider => {
                const row = document.createElement('tr');
                const createdAt = formatDateDDMMYYYY(provider.createdAt) || 'N/A';
                const statusText = provider.active ? 'Active' : 'Inactive';
                const statusClass = provider.active ? 'status-active' : 'status-inactive';
                const providerId = escapeHtml(provider.id);

                row.innerHTML = `
                    <td>${escapeHtml(provider.name) || 'N/A'}</td>
                    <td>${escapeHtml(provider.contact) || 'N/A'}</td>
                    <td>${escapeHtml(provider.email) || 'N/A'}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>${escapeHtml(createdAt)}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-provider-edit" data-provider-id="${providerId}">
                            Edit
                        </button>
                        <button class="btn-action btn-provider-status" data-provider-id="${providerId}" data-active="${provider.active}">
                            ${provider.active ? 'Disable' : 'Enable'}
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            document.querySelectorAll('#providers-table-body .btn-provider-edit').forEach(button => {
                button.addEventListener('click', (e) => {
                    const providerId = e.target.getAttribute('data-provider-id');
                    this.editProvider(providerId);
                });
            });

            document.querySelectorAll('#providers-table-body .btn-provider-status').forEach(button => {
                button.addEventListener('click', (e) => {
                    const providerId = e.target.getAttribute('data-provider-id');
                    const currentActive = e.target.getAttribute('data-active') === 'true';
                    this.openProviderConfirmModal(providerId, currentActive);
                });
            });

            this.renderPagination(filteredProviders.length);
        } catch (error) {
            console.error('Error loading providers:', error);

            const loadingDiv = document.getElementById('providers-loading');
            const emptyDiv = document.getElementById('providers-empty');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading providers</h4><p>${escapeHtml(error.message)}</p>`;
                emptyDiv.style.display = 'block';
            }

            this.showScreenMessage('error', 'Error loading providers: ' + error.message);
        }
    }

    openProviderConfirmModal(providerId, currentActive) {
        const provider = this.providerManager.getProviderById(providerId);
        if (!provider) {
            this.showScreenMessage('error', 'Unable to find that provider. Please refresh and try again.');
            return;
        }

        this.pendingStatusChange = {
            providerId,
            nextActive: !currentActive,
            providerName: provider.name || 'this provider'
        };

        const action = currentActive ? 'disable' : 'enable';
        const message = `Are you sure you want to ${action} ${this.pendingStatusChange.providerName}?`;
        const messageElement = document.getElementById('provider-confirm-message');
        const confirmButton = document.getElementById('confirm-provider-status-btn');
        const modal = document.getElementById('provider-confirm-modal');

        if (messageElement) messageElement.textContent = message;
        if (confirmButton) confirmButton.textContent = currentActive ? 'Disable Provider' : 'Enable Provider';
        if (!modal) return;

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeProviderConfirmModal() {
        const modal = document.getElementById('provider-confirm-modal');
        this.pendingStatusChange = null;

        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    async applyPendingStatusChange() {
        if (!this.pendingStatusChange) return;

        const confirmButton = document.getElementById('confirm-provider-status-btn');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Updating...';
        }

        try {
            const pendingChange = this.pendingStatusChange;
            await this.providerManager.updateProviderStatus(pendingChange.providerId, pendingChange.nextActive);
            this.closeProviderConfirmModal();
            await this.loadAndDisplayProviders();
            this.showScreenMessage(
                'success',
                `${pendingChange.providerName} ${pendingChange.nextActive ? 'enabled' : 'disabled'} successfully.`
            );
        } catch (error) {
            console.error('Error updating provider status:', error);
            this.showScreenMessage('error', 'Error updating provider status: ' + error.message);
        } finally {
            if (confirmButton) {
                confirmButton.disabled = false;
            }
        }
    }
}

window.healthcareProviderUI = new HealthcareProviderUI(window.healthcareProviderManager);
