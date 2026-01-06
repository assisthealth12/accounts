// User Management System
class UserManagement {
    constructor() {
        this.navigators = [];
        this.services = [];
        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        // Add employee form handling (will be added to admin dashboard)
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'add-employee-btn') {
                await this.showAddEmployeeModal();
            }
            
            if (e.target.id === 'save-employee-btn') {
                await this.addEmployee();
            }
            
            if (e.target.id === 'cancel-employee-btn') {
                this.closeAddEmployeeModal();
            }
        });
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
        
        document.getElementById('save-employee-btn').addEventListener('click', async () => {
            await this.addEmployee();
        });
        
        document.getElementById('cancel-employee-btn').addEventListener('click', () => {
            this.closeAddEmployeeModal();
        });
        
        // Also handle form submit (Enter key)
        document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addEmployee();
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
        const name = document.getElementById('employee-name').value;
        const email = document.getElementById('employee-email').value;

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

        try {
            // Create a new allowed user record in Firestore
            // This will allow the user to register later
            await firestore.collection("allowed_users").add({
                name,
                email,
                role: "navigator", // Default role for non-admin users
                status: "Pending", // New users start as pending
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`Employee ${name} with email ${email} has been added to the allowed users list. They can now register.`);
            this.closeAddEmployeeModal();

            // Refresh employees list in the Manage Employees modal if it's open
            if (window.dashboardManager) {
                // Refresh the employee list without reloading the entire dashboard
                if (document.getElementById('manage-employees-modal') && 
                    document.getElementById('manage-employees-modal').classList.contains('show')) {
                    window.dashboardManager.loadAndDisplayEmployees();
                }
            }
        } catch (error) {
            console.error('Error adding employee:', error);
            alert('Error adding employee: ' + error.message);
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
    

}
// Initialize user management
window.userManagement = new UserManagement();
