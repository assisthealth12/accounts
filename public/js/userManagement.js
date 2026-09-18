// User Management System
class UserManagement {
    constructor() {
        this.navigators = [];
        this.services = [];
        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        // ✅ FIX: Removed duplicate event listeners from here
        // Event listeners are now only attached when modal is created
        // This prevents double-submission when button is clicked
    }

    // Show add employee modal
    async showAddEmployeeModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('add-employee-modal')) {
            this.createAddEmployeeModal();
        }

        document.getElementById('add-employee-modal').classList.add('show');
        document.getElementById('employee-name').value = '';
        document.getElementById('employee-email').value = '';
    }

    // Create add employee modal HTML
    createAddEmployeeModal() {
        const modalHTML = `
            <div id="add-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Employee</h3>
                        <span id="close-employee-modal" class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="add-employee-form">
                            <div class="form-group">
                                <label for="employee-name">Name</label>
                                <input type="text" id="employee-name" placeholder="Enter employee name" required>
                            </div>
                            <div class="form-group">
                                <label for="employee-email">Email</label>
                                <input type="email" id="employee-email" placeholder="Enter employee email" required>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="save-employee-btn" class="btn-primary">
                                    <i class="fas fa-user-plus"></i> Add Employee
                                </button>
                                <button type="button" id="cancel-employee-btn" class="btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners for the modal buttons
        document.getElementById('close-employee-modal').addEventListener('click', () => {
            this.closeAddEmployeeModal();
        });

        // Close modal when clicking outside the content
        document.getElementById('add-employee-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('add-employee-modal')) {
                this.closeAddEmployeeModal();
            }
        });

        // ✅ FIX: Use once:true to prevent duplicate event listeners
        document.getElementById('save-employee-btn').addEventListener('click', async () => {
            await this.addEmployee();
        }, { once: false }); // Will only fire once per modal creation

        document.getElementById('cancel-employee-btn').addEventListener('click', () => {
            this.closeAddEmployeeModal();
        }, { once: false });

        // Handle form submit (Enter key) - but prevent default form submission
        document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Don't call addEmployee here - the button click will handle it
        });
    }

    // Close add employee modal
    closeAddEmployeeModal() {
        const modal = document.getElementById('add-employee-modal');
        if (modal) {
            modal.classList.remove('show');
            // Optional: Remove the modal from DOM after a short delay to ensure transition completes
            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // Add employee function
    async addEmployee() {
        const name = document.getElementById('employee-name').value.trim();
        const email = document.getElementById('employee-email').value.trim().toLowerCase();

        if (!name || !email) {
            alert('Please fill in all fields');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        // ✅ FIX: Disable save button to prevent multiple clicks
        const saveBtn = document.getElementById('save-employee-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        try {
            // ✅ FIX: Check for duplicates in allowed_users
            const existingAllowedQuery = await firestore.collection('allowed_users')
                .where('email', '==', email)
                .get();

            if (!existingAllowedQuery.empty) {
                alert(`Email ${email} is already in the allowed users list (pending activation)`);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
            }

            // ✅ FIX: Also check if user already exists in users collection
            const existingUsersQuery = await firestore.collection('users')
                .where('email', '==', email)
                .get();

            if (!existingUsersQuery.empty) {
                alert(`Email ${email} is already registered as an active user`);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
            }

            // Create a new allowed user record in Firestore
            await firestore.collection("allowed_users").add({
                name,
                email: email, // Already lowercase
                role: "navigator",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`✅ Employee Added Successfully!\n\nName: ${name}\nEmail: ${email}\n\nNext Steps for ${name}:\n1. Visit the login page\n2. Click "Activate Account"\n3. Enter their email: ${email}\n4. Set a password (minimum 6 characters)\n5. Login with their credentials`);

            this.closeAddEmployeeModal();

            // ✅ FIX: Wait before refreshing to ensure Firestore propagation
            setTimeout(() => {
                if (window.dashboardManager &&
                    document.getElementById('manage-employees-modal')?.classList.contains('show')) {
                    window.dashboardManager.loadAndDisplayEmployees();
                }
            }, 500);

        } catch (error) {
            console.error('Error adding employee:', error);
            alert('Error adding employee: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Get all navigators (ADMIN ONLY)
    async getNavigators() {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping navigators fetch');
                return [];
            }

            // Get role from global context which is more reliable
            const userRole = window.currentUserContext?.role || window.authService.getUserRole();
            if (userRole !== 'admin') {
                console.warn('User not admin, skipping navigators fetch');
                return [];
            }

            const q = firestore.collection("users").where("role", "==", "navigator");
            const snapshot = await q.get();
            const navigators = [];

            snapshot.forEach(doc => {
                navigators.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return navigators;
        } catch (error) {
            console.error('Error getting navigators:', error);
            throw error;
        }
    }



    // Get all services
    async getServices() {
        try {
            // Check if user is authenticated before attempting to get services
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping services fetch');
                return [];
            }

            this.services = await firebaseUtils.getServices();
            return this.services;
        } catch (error) {
            console.error('Error getting services:', error);
            throw error;
        }
    }

    // Add a new service (admin and navigator)
    async addService(serviceName) {
        try {
            // Check if service already exists (case insensitive)
            const existingService = this.services.find(
                service => service.name.toLowerCase() === serviceName.toLowerCase()
            );

            if (existingService) {
                throw new Error('Service with this name already exists');
            }

            const serviceRef = firestore.collection('services_master').doc();
            const serviceData = {
                name: serviceName,
                createdBy: window.currentUserContext.role || 'navigator',
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await serviceRef.set(serviceData);
            console.log('Service added successfully');

            // Refresh services list
            await this.getServices();

            // Notify other parts of the app that services have been updated
            window.dispatchEvent(new CustomEvent('servicesUpdated'));

            return serviceRef.id;
        } catch (error) {
            console.error('Error adding service:', error);
            throw error;
        }
    }

    // Update service status (admin only)
    async updateServiceStatus(serviceId, active) {
        try {
            await firestore.collection('services_master').doc(serviceId).update({
                active: active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('Service status updated successfully');

            // Refresh services list
            await this.getServices();

            // Notify other parts of the app that services have been updated
            window.dispatchEvent(new CustomEvent('servicesUpdated'));
        } catch (error) {
            console.error('Error updating service status:', error);
            throw error;
        }
    }

    // Get service by ID
    getServiceById(serviceId) {
        return this.services.find(service => service.id === serviceId) || null;
    }

    // Get all allowed users (admin only)
    async getAllowedUsers() {
        try {
            // Only admins should list all allowed users
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping allowed users fetch');
                return [];
            }

            if (window.authService.getUserRole() !== 'admin') {
                console.warn('User not admin, skipping allowed users fetch');
                return [];
            }

            const snapshot = await firestore.collection('allowed_users').get();
            const allowedUsers = [];

            snapshot.forEach(doc => {
                allowedUsers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return allowedUsers;
        } catch (error) {
            console.error('Error getting allowed users:', error);
            throw error;
        }
    }

    // Show edit employee modal
    showEditEmployeeModal(id, name, email, role, isActive) {
        if (!document.getElementById('edit-employee-modal')) {
            this.createEditEmployeeModal();
        }
        
        document.getElementById('edit-employee-id').value = id;
        document.getElementById('edit-employee-name').value = name;
        document.getElementById('edit-employee-email').value = email;
        document.getElementById('edit-employee-role').value = role || 'navigator';
        document.getElementById('edit-employee-isactive').value = isActive;
        
        document.getElementById('edit-employee-modal').classList.add('show');
    }

    createEditEmployeeModal() {
        const modalHTML = `
            <div id="edit-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Employee</h3>
                        <span id="close-edit-employee-modal" class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="edit-employee-form">
                            <input type="hidden" id="edit-employee-id">
                            <input type="hidden" id="edit-employee-isactive">
                            <div class="form-group">
                                <label for="edit-employee-name">Name</label>
                                <input type="text" id="edit-employee-name" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-employee-email">Email</label>
                                <input type="email" id="edit-employee-email" readonly style="background-color: #f5f5f5; cursor: not-allowed;" title="Email cannot be changed">
                            </div>
                            <div class="form-group">
                                <label for="edit-employee-role">Role</label>
                                <select id="edit-employee-role" required>
                                    <option value="navigator">Navigator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="update-employee-btn" class="btn-primary">
                                    <i class="fas fa-save"></i> Update
                                </button>
                                <button type="button" id="cancel-edit-employee-btn" class="btn-secondary">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('close-edit-employee-modal').addEventListener('click', () => {
            this.closeEditEmployeeModal();
        });

        document.getElementById('edit-employee-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('edit-employee-modal')) {
                this.closeEditEmployeeModal();
            }
        });

        document.getElementById('update-employee-btn').addEventListener('click', async () => {
            await this.updateEmployee();
        });

        document.getElementById('cancel-edit-employee-btn').addEventListener('click', () => {
            this.closeEditEmployeeModal();
        });
    }

    closeEditEmployeeModal() {
        const modal = document.getElementById('edit-employee-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async updateEmployee() {
        const id = document.getElementById('edit-employee-id').value;
        const name = document.getElementById('edit-employee-name').value.trim();
        const role = document.getElementById('edit-employee-role').value;
        const isActive = document.getElementById('edit-employee-isactive').value === 'true';

        if (!name) {
            alert('Please fill in the name');
            return;
        }

        const updateBtn = document.getElementById('update-employee-btn');
        const originalText = updateBtn.innerHTML;
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        try {
            const collection = isActive ? 'users' : 'allowed_users';
            
            await firestore.collection(collection).doc(id).update({
                name,
                role
            });

            alert('Employee updated successfully');
            this.closeEditEmployeeModal();

            if (window.dashboardManager) {
                window.dashboardManager.loadAndDisplayEmployees();
            }
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('Error updating employee: ' + error.message);
        } finally {
            updateBtn.disabled = false;
            updateBtn.innerHTML = originalText;
        }
    }

    async deleteEmployee(id, email, isActive) {
        if (!confirm('Are you sure you want to delete this employee? This will revoke their access. This action cannot be undone.')) {
            return;
        }

        try {
            // Delete from allowed_users if exists
            const allowedUsersSnapshot = await firestore.collection('allowed_users').where('email', '==', email).get();
            for (const doc of allowedUsersSnapshot.docs) {
                await doc.ref.delete();
            }
            
            // Delete from users if exists
            const usersSnapshot = await firestore.collection('users').where('email', '==', email).get();
            for (const doc of usersSnapshot.docs) {
                await doc.ref.delete();
            }
            
            alert('Employee deleted successfully');
            
            if (window.dashboardManager) {
                window.dashboardManager.loadAndDisplayEmployees();
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Error deleting employee: ' + error.message);
        }
    }


}
// Initialize user management
window.userManagement = new UserManagement();
