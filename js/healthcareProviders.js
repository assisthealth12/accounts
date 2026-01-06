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

            // Prepare provider data
            const providerToAdd = {
                name: providerData.name,
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

            // Prepare update data
            const providerToUpdate = {
                name: providerData.name,
                contact: providerData.contact,
                email: providerData.email,
                active: providerData.active,
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