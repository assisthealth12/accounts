// Dashboard Manager
class DashboardManager {
    constructor() {
        this.entries = [];
        this.filteredEntries = [];
        this.services = [];
        this.navigators = [];
        this.currentUser = null;
        this.currentUserRole = null;
        this.lineChart = null;
        this.barChart = null;
        this.referralPieChart = null;
        this.paymentPieChart = null;
        this.unsubscribeListeners = [];
        this.providersEventListenersAdded = false;
        this.originalDashboardContent = null;
        this.currentScreen = 'dashboard'; // Track current screen

        this.initDashboard();
    }

    // Initialize dashboard
    initDashboard() {
        // Set up event listeners for dashboard UI
        document.addEventListener('DOMContentLoaded', () => {
            try {
                // Create initial screens
                this.createScreen('dashboard');

                this.setupEventListeners();
            } catch (error) {
                console.error('Error in dashboard initialization:', error);
            }
        });
    }

    // Set up event listeners
    setupEventListeners() {
        // Add entry button
        const addEntryBtn = document.getElementById('add-entry-btn');
        if (addEntryBtn) {
            addEntryBtn.addEventListener('click', () => {
                window.addEntryManager.openAddEntryModal();
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Date preset buttons
        const presetButtons = document.querySelectorAll('.date-presets button');
        presetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.applyDatePreset(e.target.dataset.preset);
            });
        });

        // Download Excel button
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', () => {
                this.downloadExcel();
            });
        }

        // Close modal
        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                window.addEntryManager.closeModal();
            });
        }

        // Cancel modal
        const cancelModal = document.getElementById('cancel-modal');
        if (cancelModal) {
            cancelModal.addEventListener('click', () => {
                window.addEntryManager.closeModal();
            });
        }

        // Set today's date as default for date filters
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('filter-start-date');
        const endDateInput = document.getElementById('filter-end-date');

        if (startDateInput) startDateInput.value = today;
        if (endDateInput) endDateInput.value = today;

    }


    // Load admin dashboard
    async loadAdminDashboard() {
        this.currentUserRole = 'admin';
        document.getElementById('dashboard-title').textContent = 'Admin Dashboard';

        // Update sidebar navigation for admin
        this.updateSidebarNavigation('admin');

        // Load all data
        await this.loadData();
        await this.renderDashboard();

        // Set up Firestore listeners for real-time updates
        this.setupRealTimeListeners();

        // Set up network status monitoring
        this.setupNetworkMonitoring();
    }

    // Load navigator dashboard
    async loadNavigatorDashboard() {
        this.currentUserRole = 'navigator';
        document.getElementById('dashboard-title').textContent = 'Navigator Dashboard';

        // Update sidebar navigation for navigator
        this.updateSidebarNavigation('navigator');

        // Load navigator's data only
        await this.loadData();
        await this.renderDashboard();

        // Set up Firestore listeners for real-time updates
        this.setupRealTimeListeners();

        // Set up network status monitoring
        this.setupNetworkMonitoring();
    }

    // Setup network status monitoring
    setupNetworkMonitoring() {
        if (window.networkStatus) {
            window.networkStatus.addListener((isOnline) => {
                if (isOnline) {
                    console.log('Back online - refreshing dashboard data...');
                    // Refresh data when back online
                    setTimeout(() => {
                        this.loadData().then(() => {
                            this.renderDashboard();
                            console.log('Dashboard data refreshed');
                        });
                    }, 1000);
                } else {
                    console.warn('Offline - using cached data');
                }
            });
        }
    }

    // Update sidebar navigation based on role
    updateSidebarNavigation(role) {
        const sidebarNav = document.getElementById('sidebar-nav');
        let navItems = '';

        if (role === 'admin') {
            navItems = `
                <li class="active" id="dashboard-nav">Dashboard</li>
                <li id="invoice-generator">Invoice Generator</li>
                <li id="manage-employees">Manage Employees</li>
                <li id="manage-services">Manage Services</li>
                <li id="manage-providers">Manage Healthcare Providers</li>
                <li id="office-expenses">Office Expenses</li>
                <li id="manage-paid-by">Manage Paid By</li>
            `;
        } else if (role === 'navigator') {
            navItems = `
                <li class="active" id="dashboard-nav">Dashboard</li>
                <li id="invoice-generator">Invoice Generator</li>
            `;
        }

        sidebarNav.innerHTML = navItems;

        // Add event listeners to new navigation items
        document.getElementById('dashboard-nav').addEventListener('click', () => {
            // Close any open modals
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 300);
            });

            // Switch to dashboard screen
            this.switchToScreen('dashboard');

            // Update active nav
            this.updateActiveNav(null);

            // Refresh dashboard data
            this.updateDashboard();
        });

        if (role === 'admin') {
            const manageEmployeesEl = document.getElementById('manage-employees');
            if (manageEmployeesEl) {
                manageEmployeesEl.addEventListener('click', () => {
                    this.showManageEmployees();
                });
            }

            const manageProvidersEl = document.getElementById('manage-providers');
            if (manageProvidersEl) {
                manageProvidersEl.addEventListener('click', () => {
                    this.showManageProviders();
                });
            }
        }

        // Invoice generator navigation
        const invoiceGeneratorEl = document.getElementById('invoice-generator');
        if (invoiceGeneratorEl) {
            invoiceGeneratorEl.addEventListener('click', () => {
                this.showInvoiceGenerator();
            });
        }

        // Only admin can manage services
        if (role === 'admin') {
            const manageServicesEl = document.getElementById('manage-services');
            if (manageServicesEl) {
                manageServicesEl.addEventListener('click', () => {
                    this.showManageServices();
                });
            }

            // Office expenses navigation
            const officeExpensesEl = document.getElementById('office-expenses');
            if (officeExpensesEl) {
                officeExpensesEl.addEventListener('click', () => {
                    this.showOfficeExpenses();
                });
            }

            // Manage paid by navigation
            const managePaidByEl = document.getElementById('manage-paid-by');
            if (managePaidByEl) {
                managePaidByEl.addEventListener('click', () => {
                    window.paidByPersonsManager.showManagePersonsModal();
                });
            }
        }
    }

    // Show manage employees section (admin only)
    showManageEmployees() {
        // Check if user is admin
        if (this.currentUserRole !== 'admin') {
            alert('Access denied: Only admins can manage employees');
            return;
        }

        // Create modal for managing employees if it doesn't exist
        if (!document.getElementById('manage-employees-modal')) {
            this.createManageEmployeesModal();
        }

        const modal = document.getElementById('manage-employees-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        this.updateActiveNav('manage-employees');

        // Load and display employees
        this.loadAndDisplayEmployees();
    }

    // Create manage employees modal
    createManageEmployeesModal() {
        // ✅ FIX: Remove old modal if it exists to prevent duplicates
        const existingModal = document.getElementById('manage-employees-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="manage-employees-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Manage Employees</h3>
                        <span class="close" id="close-employees-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <button id="add-employee-btn" class="btn-primary">
                            <i class="fas fa-plus"></i> Add Employee
                        </button>
                        <div id="employees-loading" class="loading-state" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i> Loading employees...
                        </div>
                        <div id="employees-empty" class="empty-state" style="display: none;">
                            <i class="fas fa-users"></i>
                            <h4>No employees found</h4>
                            <p>Add your first employee to get started.</p>
                        </div>
                        <div class="table-container">
                            <table id="employees-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody id="employees-table-body">
                                    <!-- Employee rows will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Event listeners
        const modal = document.getElementById('manage-employees-modal');
        document.getElementById('close-employees-modal').addEventListener('click', () => {
            this.closeModalWithAnimation('manage-employees-modal');
            this.updateActiveNav(null);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModalWithAnimation('manage-employees-modal');
                this.updateActiveNav(null);
            }
        });

        document.getElementById('add-employee-btn').addEventListener('click', async () => {
            await window.userManagement.showAddEmployeeModal();
        });
    }

    // Load and display employees
    async loadAndDisplayEmployees() {
        try {
            const tableBody = document.getElementById('employees-table-body');
            const loadingDiv = document.getElementById('employees-loading');
            const emptyDiv = document.getElementById('employees-empty');

            if (!tableBody) return;

            // ✅ CRITICAL FIX: Clear table body FIRST to prevent duplicates
            tableBody.innerHTML = '';

            // Show loading state
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';

            // Get both active users AND pending allowed users
            const [activeUsers, allowedUsers] = await Promise.all([
                firestore.collection('users').where('role', '==', 'navigator').get(),
                firestore.collection('allowed_users').get()
            ]);

            // ✅ FIX: Use a Map to prevent duplicate emails
            const employeesMap = new Map();

            // Add active users (these take priority over pending)
            activeUsers.forEach(doc => {
                const data = doc.data();
                const email = (data.email || '').toLowerCase();

                if (email && !employeesMap.has(email)) {
                    employeesMap.set(email, {
                        id: doc.id,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        status: 'Active',
                        createdAt: data.createdAt,
                        isActive: true,
                        priority: 1 // Active users have higher priority
                    });
                }
            });

            // Add pending users (only if not already active)
            allowedUsers.forEach(doc => {
                const data = doc.data();
                const email = (data.email || '').toLowerCase();

                // Only add if not already in map (i.e., not already active)
                if (email && !employeesMap.has(email)) {
                    employeesMap.set(email, {
                        id: doc.id,
                        name: data.name,
                        email: data.email,
                        role: data.role || 'navigator',
                        status: 'Pending Activation',
                        createdAt: data.createdAt,
                        isActive: false,
                        priority: 2 // Pending users have lower priority
                    });
                }
            });

            // Convert Map to Array
            const allEmployees = Array.from(employeesMap.values());

            // Hide loading state
            if (loadingDiv) loadingDiv.style.display = 'none';

            if (allEmployees.length === 0) {
                if (emptyDiv) emptyDiv.style.display = 'block';
                return;
            }

            if (emptyDiv) emptyDiv.style.display = 'none';

            // Sort by priority (Active first), then by creation date (newest first)
            allEmployees.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                // Sort by date - newest first
                const aTime = a.createdAt?.toMillis() || 0;
                const bTime = b.createdAt?.toMillis() || 0;
                return bTime - aTime;
            });

            // Render table rows
            allEmployees.forEach(user => {
                const row = document.createElement('tr');

                const createdAt = user.createdAt ?
                    user.createdAt.toDate().toLocaleDateString() :
                    'N/A';

                const statusClass = user.isActive ? 'status-active' : 'status-pending';

                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.role || 'navigator'}</td>
                    <td><span class="status ${statusClass}">${user.status}</span></td>
                    <td>${createdAt}</td>
                `;

                tableBody.appendChild(row);
            });

            console.log(`✅ Loaded ${allEmployees.length} unique employees (${employeesMap.size} unique emails)`);

        } catch (error) {
            console.error('Error loading employees:', error);

            const loadingDiv = document.getElementById('employees-loading');
            const emptyDiv = document.getElementById('employees-empty');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading employees</h4><p>${error.message}</p>`;
                emptyDiv.style.display = 'block';
            }
        }
    }

    // Show invoice generator section (admin and navigator)
    showInvoiceGenerator() {
        // First create the screen if it doesn't exist
        if (!document.getElementById('invoice-generator-screen')) {
            if (window.invoiceGeneratorManager) {
                window.invoiceGeneratorManager.createInvoiceGeneratorScreen();
            }
        }

        // Switch to invoice screen
        this.switchToScreen('invoice-generator');

        // Update active nav
        this.updateActiveNav('invoice-generator');

        // Load invoices
        if (window.invoiceGeneratorManager) {
            // Small delay to ensure screen is properly displayed before loading invoices
            setTimeout(() => {
                window.invoiceGeneratorManager.loadInvoicesForDisplay();
            }, 100);
        }
    }

    // Show office expenses section (admin only)
    showOfficeExpenses() {
        // Check if user is admin
        if (this.currentUserRole !== 'admin') {
            alert('Access denied: Only admins can manage office expenses');
            return;
        }

        // Create screen if it doesn't exist
        if (!document.getElementById('office-expenses-screen')) {
            if (window.officeExpensesUI) {
                window.officeExpensesUI.createExpensesScreen();
            }
        }

        // Switch to office expenses screen
        this.switchToScreen('office-expenses');

        // Update active nav
        this.updateActiveNav('office-expenses');

        // Load expenses
        if (window.officeExpensesManager) {
            setTimeout(() => {
                window.officeExpensesManager.loadExpensesForDisplay();
            }, 100);
        }
    }

    // Show manage services section (admin only)
    showManageServices() {
        // Check if user is admin
        if (this.currentUserRole !== 'admin') {
            alert('Access denied: Only admins can manage services');
            return;
        }

        // Create modal if it doesn't exist
        if (!document.getElementById('manage-services-modal')) {
            this.createManageServicesModal();
        }

        const modal = document.getElementById('manage-services-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        this.updateActiveNav('manage-services');
        this.loadAndDisplayServices();
    }

    // Create manage services modal
    createManageServicesModal() {
        const modalHTML = `
            <div id="manage-services-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Manage Services</h3>
                        <span class="close" id="close-services-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="new-service-name">Add New Service</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="new-service-name" placeholder="Enter service name">
                                <button id="add-service-btn" class="btn-primary">Add Service</button>
                            </div>
                        </div>
                        <div id="services-loading" class="loading-state" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i> Loading services...
                        </div>
                        <div id="services-empty" class="empty-state" style="display: none;">
                            <i class="fas fa-concierge-bell"></i>
                            <h4>No services found</h4>
                            <p>Add your first service to get started.</p>
                        </div>
                        <div class="table-container">
                            <table id="services-table">
                                <thead>
                                    <tr>
                                        <th>Service Name</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="services-table-body">
                                    <!-- Service rows will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('close-services-modal').addEventListener('click', () => {
            this.closeModalWithAnimation('manage-services-modal');

            // Remove active state from navigation
            this.updateActiveNav(null);
        });

        // Close modal when clicking outside the content
        document.getElementById('manage-services-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('manage-services-modal')) {
                this.closeModalWithAnimation('manage-services-modal');
                this.updateActiveNav(null);
            }
        });

        document.getElementById('add-service-btn').addEventListener('click', async () => {
            const serviceName = document.getElementById('new-service-name').value.trim();
            if (serviceName) {
                try {
                    await window.userManagement.addService(serviceName);
                    document.getElementById('new-service-name').value = '';
                    this.loadAndDisplayServices(); // Refresh the list
                } catch (error) {
                    console.error('Error adding service:', error);
                    alert('Error adding service: ' + error.message);
                }
            } else {
                alert('Please enter a service name');
            }
        });

        // Also handle Enter key press in the input field
        document.getElementById('new-service-name').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await document.getElementById('add-service-btn').click();
            }
        });

        // Show modal with animation
        const modal = document.getElementById('manage-services-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Show manage healthcare providers section (admin only)
    showManageProviders() {
        if (this.currentUserRole !== 'admin') {
            alert('Access denied: Only admins can manage healthcare providers');
            return;
        }

        this.createManageProvidersModal();

        const modal = document.getElementById('manage-providers-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        this.updateActiveNav('manage-providers');
        this.loadAndDisplayProviders();
    }

    // Create manage healthcare providers modal
    createManageProvidersModal() {
        // Check if modal exists in HTML, if not create it
        if (!document.getElementById('manage-providers-modal')) {
            const modalHTML = `
                <div id="manage-providers-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Manage Healthcare Providers</h3>
                            <span class="close" id="close-providers-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="new-provider-name">Add New Provider</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" id="new-provider-name" placeholder="Enter provider name">
                                    <button id="add-provider-btn" class="btn-primary">Add Provider</button>
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
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Add event listeners if not already added
        if (!this.providersEventListenersAdded) {
            document.getElementById('close-providers-modal').addEventListener('click', () => {
                this.closeModalWithAnimation('manage-providers-modal');

                // Remove active state from navigation
                this.updateActiveNav(null);
            });

            // Close modal when clicking outside the content
            document.getElementById('manage-providers-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('manage-providers-modal')) {
                    this.closeModalWithAnimation('manage-providers-modal');
                    this.updateActiveNav(null);
                }
            });

            document.getElementById('add-provider-btn').addEventListener('click', async () => {
                const providerName = document.getElementById('new-provider-name').value.trim();
                if (providerName) {
                    try {
                        await window.healthcareProviderManager.addProvider({
                            name: providerName,
                            contact: '',
                            email: '',
                            active: true
                        });
                        document.getElementById('new-provider-name').value = '';
                        this.loadAndDisplayProviders(); // Refresh the list
                    } catch (error) {
                        console.error('Error adding provider:', error);
                        alert('Error adding healthcare provider: ' + error.message);
                    }
                } else {
                    alert('Please enter a provider name');
                }
            });

            // Also handle Enter key press in the input field
            document.getElementById('new-provider-name').addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    await document.getElementById('add-provider-btn').click();
                }
            });

            this.providersEventListenersAdded = true;
        }

        // Show modal with animation
        const modal = document.getElementById('manage-providers-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Load and display healthcare providers
    async loadAndDisplayProviders() {
        try {
            const tableBody = document.getElementById('providers-table-body');
            const loadingDiv = document.getElementById('providers-loading');
            const emptyDiv = document.getElementById('providers-empty');

            if (!tableBody) return;

            // Show loading state
            tableBody.innerHTML = '';
            loadingDiv.style.display = 'block';
            emptyDiv.style.display = 'none';

            const providers = await window.healthcareProviderManager.getProviders();

            // Hide loading state
            loadingDiv.style.display = 'none';

            if (providers.length === 0) {
                emptyDiv.style.display = 'block';
                return;
            }

            emptyDiv.style.display = 'none';

            providers.forEach(provider => {
                const row = document.createElement('tr');

                // Format date
                const createdAt = provider.createdAt ?
                    provider.createdAt.toDate().toLocaleDateString() :
                    'N/A';

                const statusText = provider.active ? 'Active' : 'Inactive';
                const statusClass = provider.active ? 'status-active' : 'status-inactive';

                row.innerHTML = `
                    <td>${provider.name || 'N/A'}</td>
                    <td>${provider.contact || 'N/A'}</td>
                    <td>${provider.email || 'N/A'}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>${createdAt}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-edit" data-provider-id="${provider.id}" data-active="${provider.active}">
                            ${provider.active ? 'Disable' : 'Enable'}
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Add event listeners to action buttons
            document.querySelectorAll('#providers-table-body .btn-edit').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const providerId = e.target.getAttribute('data-provider-id');
                    const currentActive = e.target.getAttribute('data-active') === 'true';

                    try {
                        await window.healthcareProviderManager.updateProviderStatus(providerId, !currentActive);
                        this.loadAndDisplayProviders(); // Refresh the list
                    } catch (error) {
                        console.error('Error updating provider status:', error);
                        alert('Error updating provider status: ' + error.message);
                    }
                });
            });
        } catch (error) {
            console.error('Error loading providers:', error);

            const loadingDiv = document.getElementById('providers-loading');
            const emptyDiv = document.getElementById('providers-empty');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading providers</h4><p>${error.message}</p>`;
                emptyDiv.style.display = 'block';
            }
        }
    }

    // Load and display services
    async loadAndDisplayServices() {
        try {
            const tableBody = document.getElementById('services-table-body');
            const loadingDiv = document.getElementById('services-loading');
            const emptyDiv = document.getElementById('services-empty');

            if (!tableBody) return;

            // Show loading state
            tableBody.innerHTML = '';
            loadingDiv.style.display = 'block';
            emptyDiv.style.display = 'none';

            const services = await window.userManagement.getServices();

            // Hide loading state
            loadingDiv.style.display = 'none';

            if (services.length === 0) {
                emptyDiv.style.display = 'block';
                return;
            }

            emptyDiv.style.display = 'none';

            services.forEach(service => {
                const row = document.createElement('tr');

                // Format date
                const createdAt = service.createdAt ?
                    service.createdAt.toDate().toLocaleDateString() :
                    'N/A';

                const statusText = service.active ? 'Active' : 'Inactive';
                const statusClass = service.active ? 'status-active' : 'status-inactive';

                // Check user role to determine if they can manage service status
                const canManageStatus = this.currentUserRole === 'admin';

                row.innerHTML = `
                    <td>${service.name || 'N/A'}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>${createdAt}</td>
                    <td class="actions-cell">
                        ${canManageStatus ? `
                        <button class="btn-action btn-edit" data-service-id="${service.id}" data-active="${service.active}">
                            ${service.active ? 'Disable' : 'Enable'}
                        </button>` : ''}
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Add event listeners to action buttons (only for admin)
            if (this.currentUserRole === 'admin') {
                document.querySelectorAll('#services-table-body .btn-edit').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const serviceId = e.target.getAttribute('data-service-id');
                        const currentActive = e.target.getAttribute('data-active') === 'true';

                        try {
                            await window.userManagement.updateServiceStatus(serviceId, !currentActive);
                            this.loadAndDisplayServices(); // Refresh the list
                        } catch (error) {
                            console.error('Error updating service status:', error);
                            alert('Error updating service status: ' + error.message);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error loading services:', error);

            const loadingDiv = document.getElementById('services-loading');
            const emptyDiv = document.getElementById('services-empty');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading services</h4><p>${error.message}</p>`;
                emptyDiv.style.display = 'block';
            }
        }
    }

    // Load all data
    async loadData() {
        try {
            // Get current user
            this.currentUser = window.authService.getCurrentUser();

            // Check if user is authenticated before loading services
            if (!this.currentUser) {
                console.warn('User not authenticated, cannot load data');
                return;
            }

            // Load services
            this.services = await window.userManagement.getServices();

            // Load navigators if admin
            if (this.currentUserRole === 'admin') {
                this.navigators = await window.userManagement.getNavigators();

                // Load all entries for admin
                const snapshot = await firestore.collection('service_entries').get();
                this.entries = [];
                snapshot.forEach(doc => {
                    this.entries.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            } else {
                // Load only navigator's entries
                const snapshot = await firestore
                    .collection('service_entries')
                    .where('navigatorId', '==', this.currentUser.uid)
                    .get();

                this.entries = [];
                snapshot.forEach(doc => {
                    this.entries.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            }

            // Populate filter dropdowns
            this.populateFilterDropdowns();

            // Apply initial filters
            this.applyFilters();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // Populate filter dropdowns
    async populateFilterDropdowns() {
        const serviceTypeFilter = document.getElementById('filter-service-type');
        if (serviceTypeFilter) {
            // Clear existing options except the first one
            serviceTypeFilter.innerHTML = '<option value="">All</option>';

            this.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                serviceTypeFilter.appendChild(option);
            });
        }

        // Populate healthcare providers filter
        const hcpFilter = document.getElementById('filter-hcp');
        if (hcpFilter) {
            try {
                // Get active healthcare providers
                const providers = await window.healthcareProviderManager.getActiveProviders();

                // Clear existing options except the first one
                hcpFilter.innerHTML = '<option value="">All</option>';

                providers.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.name;
                    option.textContent = provider.name;
                    hcpFilter.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading healthcare providers for filter:', error);
            }
        }

        // Show/hide navigator filter based on role
        const navigatorFilter = document.getElementById('navigator-filter');
        if (navigatorFilter) {
            if (this.currentUserRole === 'admin') {
                navigatorFilter.style.display = 'flex';

                const navigatorSelect = document.getElementById('filter-navigator');
                if (navigatorSelect) {
                    // Clear existing options except the first one
                    navigatorSelect.innerHTML = '<option value="">All</option>';

                    this.navigators.forEach(navigator => {
                        const option = document.createElement('option');
                        option.value = navigator.uid;
                        option.textContent = navigator.name;
                        navigatorSelect.appendChild(option);
                    });
                }
            } else {
                navigatorFilter.style.display = 'none';
            }
        }
    }

    // Apply filters
    applyFilters() {
        // Add visual feedback
        const applyBtn = document.getElementById('apply-filters-btn');
        const originalText = applyBtn.innerHTML;
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        applyBtn.disabled = true;

        try {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            const serviceType = document.getElementById('filter-service-type').value;
            const packageType = document.getElementById('filter-package-type').value;
            const hcpFilter = document.getElementById('filter-hcp').value;
            const collectedBy = document.getElementById('filter-collected-by').value;
            const referralStatus = document.getElementById('filter-referral-status').value;
            const paymentByUsFilter = document.getElementById('filter-payment-by-us').value;
            const searchTerm = document.getElementById('universal-search').value.toLowerCase().trim();
            const navigatorFilter = this.currentUserRole === 'admin' ?
                document.getElementById('filter-navigator').value : null;

            // Filter entries
            this.filteredEntries = this.entries.filter(entry => {
                // Date filter
                if (startDate && endDate) {
                    const entryDate = entry.date ? new Date(entry.date) : null;
                    if (entryDate) {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        if (entryDate < start || entryDate > end) {
                            return false;
                        }
                    }
                }

                // Service type filter
                if (serviceType && entry.serviceTypeId !== serviceType) {
                    return false;
                }

                // Package type filter
                if (packageType && entry.packageType !== packageType) {
                    return false;
                }

                // Healthcare provider filter
                if (hcpFilter && entry.hcpName !== hcpFilter) {
                    return false;
                }

                // Collected by filter
                if (collectedBy && (!entry.collectionDetails || entry.collectionDetails.collectedBy !== collectedBy)) {
                    return false;
                }

                // Referral status filter
                if (referralStatus && entry.referralStatus !== referralStatus) {
                    return false;
                }

                // Payment By Us filter
                if (paymentByUsFilter) {
                    const hasPayment = (entry.paymentByUs && entry.paymentByUs.enabled) ? 'Yes' : 'No';
                    if (hasPayment !== paymentByUsFilter) {
                        return false;
                    }
                }

                // Navigator filter (admin only)
                if (this.currentUserRole === 'admin' && navigatorFilter && entry.navigatorId !== navigatorFilter) {
                    return false;
                }

                // Universal search filter
                if (searchTerm) {
                    const memberName = (entry.memberName || '').toLowerCase();
                    const ahid = (entry.ahid || '').toLowerCase();
                    const hcpName = (entry.hcpName || '').toLowerCase();
                    const serviceName = this.getServiceNameById(entry.serviceTypeId).toLowerCase();
                    const transactionId = (entry.transactionId || '').toLowerCase();

                    if (!memberName.includes(searchTerm) &&
                        !ahid.includes(searchTerm) &&
                        !hcpName.includes(searchTerm) &&
                        !serviceName.includes(searchTerm) &&
                        !transactionId.includes(searchTerm)) {
                        return false;
                    }
                }

                return true;
            });

            // Update dashboard
            this.updateDashboard();

            // Show success feedback
            applyBtn.innerHTML = '<i class="fas fa-check"></i> Applied';
            setTimeout(() => {
                applyBtn.innerHTML = originalText;
                applyBtn.disabled = false;
            }, 1000);
        } catch (error) {
            console.error('Error applying filters:', error);
            applyBtn.innerHTML = originalText;
            applyBtn.disabled = false;
            alert('Error applying filters: ' + error.message);
        }
    }

    // Update dashboard with filtered data
    updateDashboard() {
        try {
            // Switch to dashboard screen
            this.switchToScreen('dashboard');

            // Update summary cards
            this.updateSummaryCards();

            // Update charts
            this.updateCharts();

            // Update table
            if (window.tableManager && typeof window.tableManager.updateTable === 'function') {
                window.tableManager.updateTable(this.filteredEntries);
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    // Get service name by ID
    getServiceNameById(serviceId) {
        if (!this.services || this.services.length === 0) {
            return '';
        }

        const service = this.services.find(s => s.id === serviceId);
        return service ? service.name : '';
    }

    // Reset all filters
    resetFilters() {
        // Add visual feedback
        const resetBtn = document.getElementById('reset-filters-btn');
        const originalText = resetBtn.innerHTML;
        resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        resetBtn.disabled = true;

        try {
            // Reset date filters to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('filter-start-date').value = today;
            document.getElementById('filter-end-date').value = today;

            // Reset service type
            document.getElementById('filter-service-type').value = '';

            // Reset other filters
            document.getElementById('filter-package-type').value = '';

            // Reset HCP
            document.getElementById('filter-hcp').value = '';

            // Reset collected by
            document.getElementById('filter-collected-by').value = '';

            // Reset referral status
            document.getElementById('filter-referral-status').value = '';

            // Reset Payment By Us filter
            document.getElementById('filter-payment-by-us').value = '';

            // Reset Universal Search
            document.getElementById('universal-search').value = '';

            // Reset navigator filter if it exists
            const navigatorFilter = document.getElementById('filter-navigator');
            if (navigatorFilter) {
                navigatorFilter.value = '';
            }

            // Apply the reset filters (which means no filters)
            this.applyFilters();

            // Show success feedback
            resetBtn.innerHTML = '<i class="fas fa-check"></i> Reset';
            setTimeout(() => {
                resetBtn.innerHTML = originalText;
                resetBtn.disabled = false;
            }, 1000);
        } catch (error) {
            console.error('Error resetting filters:', error);
            resetBtn.innerHTML = originalText;
            resetBtn.disabled = false;
            alert('Error resetting filters: ' + error.message);
        }
    }

    // Apply date preset
    applyDatePreset(preset) {
        const startDateInput = document.getElementById('filter-start-date');
        const endDateInput = document.getElementById('filter-end-date');

        if (!startDateInput || !endDateInput) return;

        const today = new Date();
        let startDate = new Date(today);

        switch (preset) {
            case 'today':
                // For today, both start and end date are today
                startDateInput.value = today.toISOString().split('T')[0];
                endDateInput.value = today.toISOString().split('T')[0];
                break;
            case '7days':
                // 7 days ago to today
                startDate.setDate(today.getDate() - 7);
                startDateInput.value = startDate.toISOString().split('T')[0];
                endDateInput.value = today.toISOString().split('T')[0];
                break;
            case '30days':
                // 30 days ago to today
                startDate.setDate(today.getDate() - 30);
                startDateInput.value = startDate.toISOString().split('T')[0];
                endDateInput.value = today.toISOString().split('T')[0];
                break;
            default:
                // For any other preset, default to today
                startDateInput.value = today.toISOString().split('T')[0];
                endDateInput.value = today.toISOString().split('T')[0];
        }

        // After setting the dates, apply the filters automatically
        this.applyFilters();
    }

    // Update summary cards
    updateSummaryCards() {
        let totalBillAmount = 0;
        let totalDiscount = 0;
        let referralReceived = 0;
        let totalPaid = 0;
        let pendingPayment = 0;

        this.filteredEntries.forEach(entry => {
            totalBillAmount += entry.totalBillAmount || 0;
            totalDiscount += entry.discountGiven || 0;

            if (entry.referralStatus === 'Received') {
                referralReceived += entry.referralAmount || 0;
            }

            if (entry.paymentByUs === 'Yes' && entry.paymentDetails) {
                totalPaid += entry.paymentDetails.amountPaid || 0;

                if (entry.paymentDetails.paymentStatus === 'Pending') {
                    pendingPayment += entry.paymentDetails.amountPaid || 0;
                }
            } else if (entry.paymentByUs === 'Yes' && (!entry.paymentDetails || !entry.paymentDetails.paymentStatus)) {
                // If paymentByUs is Yes but no payment details, consider it pending
                pendingPayment += entry.amountPaid || 0;
            }
        });

        // Update card values with null checks
        const totalBillElement = document.getElementById('total-bill-amount-display');
        if (totalBillElement) {
            totalBillElement.textContent = `₹${totalBillAmount.toLocaleString()}`;
        }

        const totalDiscountElement = document.getElementById('total-discount');
        if (totalDiscountElement) {
            totalDiscountElement.textContent = `₹${totalDiscount.toLocaleString()}`;
        }

        const referralReceivedElement = document.getElementById('referral-received');
        if (referralReceivedElement) {
            referralReceivedElement.textContent = `₹${referralReceived.toLocaleString()}`;
        }

        const totalPaidElement = document.getElementById('total-paid');
        if (totalPaidElement) {
            totalPaidElement.textContent = `₹${totalPaid.toLocaleString()}`;
        }

        const pendingPaymentElement = document.getElementById('pending-payment');
        if (pendingPaymentElement) {
            pendingPaymentElement.textContent = `₹${pendingPayment.toLocaleString()}`;
        }
    }

    // Switch between different screens
    switchToScreen(screenName) {
        // Hide the main dashboard content (summary cards, filters, charts, table)
        const mainDashboard = document.querySelector('.dashboard-content');
        const dashboardChildren = mainDashboard.children;

        // Hide all direct children of dashboard-content
        for (let child of dashboardChildren) {
            if (!child.id || !child.id.includes('-screen')) {
                child.style.display = 'none';
            }
        }

        // Hide all dashboard screens
        const allScreens = document.querySelectorAll('.dashboard-screen');
        allScreens.forEach(screen => {
            screen.style.display = 'none';
        });

        // Show requested screen or create it
        let targetScreen = document.getElementById(`${screenName}-screen`);
        if (!targetScreen) {
            this.createScreen(screenName);
            targetScreen = document.getElementById(`${screenName}-screen`);
        }

        if (targetScreen) {
            targetScreen.style.display = 'block';
        }

        // If returning to dashboard, show main dashboard content
        if (screenName === 'dashboard') {
            for (let child of dashboardChildren) {
                if (!child.id || !child.id.includes('-screen')) {
                    child.style.display = '';
                }
            }
        }

        this.currentScreen = screenName;
    }

    // Create screen element if it doesn't exist
    createScreen(screenName) {
        const dashboardContent = document.querySelector('.dashboard-content');
        if (!dashboardContent) return;

        // Create screen container
        const screenElement = document.createElement('div');
        screenElement.id = `${screenName}-screen`;
        screenElement.className = 'dashboard-screen';
        screenElement.style.display = 'none';

        // For dashboard screen, we need to create the original content
        if (screenName === 'dashboard') {
            // Create the dashboard content
            screenElement.innerHTML = `
                <div class="dashboard-header">
                    <h1 id="dashboard-title">Dashboard</h1>
                    <button id="add-entry-btn" class="btn-primary"><i class="fas fa-plus-circle"></i> Add Entry</button>
                </div>

                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="card">
                        <div class="card-icon bg-blue">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div class="card-content">
                            <h3>Total Bill Amount</h3>
                            <p id="total-bill-amount-display">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-green">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div class="card-content">
                            <h3>Total Discount</h3>
                            <p id="total-discount">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-purple">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                        <div class="card-content">
                            <h3>Referral Received</h3>
                            <p id="referral-received">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-orange">
                            <i class="fas fa-rupee-sign"></i>
                        </div>
                        <div class="card-content">
                            <h3>Total Paid</h3>
                            <p id="total-paid">₹0</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-icon bg-red">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="card-content">
                            <h3>Pending Payment</h3>
                            <p id="pending-payment">₹0</p>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filters">
                    <!-- Row 1: Date Range + Main Filters -->
                    <div class="filter-row">
                        <div class="filter-group date-range">
                            <label>Date Range</label>
                            <div class="date-range-inputs">
                                <div class="date-input-wrapper">
                                    <label for="filter-start-date">Start</label>
                                    <input type="date" id="filter-start-date" required>
                                </div>
                                <div class="date-input-wrapper">
                                    <label for="filter-end-date">End</label>
                                    <input type="date" id="filter-end-date" required>
                                </div>
                            </div>
                            <div class="date-presets">
                                <button type="button" class="btn-small" data-preset="today">Today</button>
                                <button type="button" class="btn-small" data-preset="7days">7 Days</button>
                                <button type="button" class="btn-small" data-preset="30days">30 Days</button>
                            </div>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-service-type">Service Type</label>
                            <select id="filter-service-type">
                                <option value="">All</option>
                                <!-- Options populated by JavaScript -->
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-package-type">Package Type</label>
                            <select id="filter-package-type">
                                <option value="">All</option>
                                <option value="Basic">Basic</option>
                                <option value="Premium">Premium</option>
                                <option value="Special">Special</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-hcp">Healthcare Provider</label>
                            <select id="filter-hcp">
                                <option value="">All</option>
                                <!-- Options populated by JavaScript -->
                            </select>
                        </div>
                    </div>
                    
                    <!-- Row 2: Additional Filters -->
                    <div class="filter-row">
                        <div class="filter-group">
                            <label for="filter-collected-by">Collected By</label>
                            <select id="filter-collected-by">
                                <option value="">All</option>
                                <option value="Collected by AssistHealth">Collected by AssistHealth</option>
                                <option value="Collected by Healthcare Provider">Collected by Healthcare Provider</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="filter-referral-status">Referral Status</label>
                            <select id="filter-referral-status">
                                <option value="">All</option>
                                <option value="Received">Received</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        
                        <!-- Navigator filter (admin only) -->
                        <div id="navigator-filter" class="filter-group" style="display: none;">
                            <label for="filter-navigator">Navigator</label>
                            <select id="filter-navigator">
                                <option value="">All</option>
                                <!-- Options populated by JavaScript -->
                            </select>
                        </div>
                    </div>
                    
                    <!-- Action Buttons Row -->
                    <div class="filter-actions">
                        <button id="apply-filters-btn" class="btn-primary">
                            <i class="fas fa-check"></i> Apply Filters
                        </button>
                        <button id="reset-filters-btn" class="btn-secondary">
                            <i class="fas fa-undo"></i> Reset Filters
                        </button>
                        <button id="download-excel-btn" class="btn-success">
                            <i class="fas fa-file-excel"></i> Download Excel
                        </button>
                    </div>
                </div>

                <!-- Charts -->
                <div class="charts-container">
                    <div class="chart">
                        <canvas id="line-chart"></canvas>
                    </div>
                    <div class="chart">
                        <canvas id="bar-chart"></canvas>
                    </div>
                    <div class="chart">
                        <canvas id="referral-pie-chart"></canvas>
                    </div>
                    <div class="chart">
                        <canvas id="payment-pie-chart"></canvas>
                    </div>
                </div>

                <!-- Table -->
                <div class="table-container">
                    <table id="entries-table">
                        <thead>
                            <tr>
                                <th>SL No</th>
                                <th>Date</th>
                                <th>Member Name</th>
                                <th>AHID</th>
                                <th>Service Type</th>
                                <th>Package Type</th>
                                <th>HCP Name</th>
                                <th>Collected By</th>
                                <th>Transaction Mode</th>
                                <th>Transaction ID</th>
                                <th>Total Bill</th>
                                <th>Discount</th>
                                <th>Referral Amount</th>
                                <th>Referral Status</th>
                                <th>Referral Payment Mode</th>
                                <th>Referral Transaction ID</th>
                                <th>Payment By Us</th>
                                <th>Mode of Transfer</th>
                                <th>Paid To</th>
                                <th>Amount Paid</th>
                                <th>Payment Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="entries-table-body">
                            <!-- Entries will be populated by JavaScript -->
                        </tbody>
                    </table>
                </div>
            `;
        }

        dashboardContent.appendChild(screenElement);

        // Setup event listeners for the dashboard screen
        if (screenName === 'dashboard') {
            this.setupDashboardEventListeners();
        }
    }

    // Setup dashboard event listeners
    setupDashboardEventListeners() {
        // Add entry button
        const addEntryBtn = document.getElementById('add-entry-btn');
        if (addEntryBtn) {
            addEntryBtn.addEventListener('click', () => {
                window.addEntryManager.openAddEntryModal();
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Download Excel button
        const downloadExcelBtn = document.getElementById('download-excel-btn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', () => {
                this.downloadExcel();
            });
        }

        // Date preset buttons
        const presetButtons = document.querySelectorAll('.date-presets button');
        presetButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.applyDatePreset(e.target.dataset.preset);
            });
        });
    }

    // Save original dashboard content
    saveOriginalDashboardContent() {
        // This method is no longer needed with the new approach
        // but keeping for compatibility
    }

    // Update charts
    updateCharts() {
        this.renderLineChart();
        this.renderBarChart();
        this.renderReferralPieChart();
        this.renderPaymentPieChart();
    }

    // Render line chart (Date vs Total Bill)
    renderLineChart() {
        try {
            const ctx = document.getElementById('line-chart');
            if (!ctx) return;

            // Destroy existing chart if it exists
            if (this.lineChart) {
                this.lineChart.destroy();
            }

            // Group entries by date
            const dateData = {};
            this.filteredEntries.forEach(entry => {
                const dateStr = entry.date ? new Date(entry.date).toISOString().split('T')[0] : 'Unknown';
                if (!dateData[dateStr]) {
                    dateData[dateStr] = 0;
                }
                dateData[dateStr] += entry.totalBillAmount || 0;
            });

            const dates = Object.keys(dateData).sort();
            const amounts = dates.map(date => dateData[date]);

            this.lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Total Bill Amount',
                        data: amounts,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Date vs Total Bill Amount'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering line chart:', error);
        }
    }

    // Render bar chart (Service Type vs Amount)
    renderBarChart() {
        try {
            const ctx = document.getElementById('bar-chart');
            if (!ctx) return;

            // Destroy existing chart if it exists
            if (this.barChart) {
                this.barChart.destroy();
            }

            // Group entries by service type
            const serviceData = {};
            this.filteredEntries.forEach(entry => {
                const serviceName = this.services.find(s => s.id === entry.serviceTypeId)?.name || 'Unknown';
                if (!serviceData[serviceName]) {
                    serviceData[serviceName] = 0;
                }
                serviceData[serviceName] += entry.totalBillAmount || 0;
            });

            const serviceNames = Object.keys(serviceData);
            const amounts = Object.values(serviceData);

            this.barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: serviceNames,
                    datasets: [{
                        label: 'Total Bill Amount',
                        data: amounts,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Service Type vs Total Bill Amount'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering bar chart:', error);
        }
    }

    // Render referral pie chart
    renderReferralPieChart() {
        try {
            const ctx = document.getElementById('referral-pie-chart');
            if (!ctx) return;

            // Destroy existing chart if it exists
            if (this.referralPieChart) {
                this.referralPieChart.destroy();
            }

            // Count referral statuses
            const referralCounts = { 'Pending': 0, 'Received': 0 };
            this.filteredEntries.forEach(entry => {
                const status = entry.referralStatus || 'Pending';
                if (referralCounts.hasOwnProperty(status)) {
                    referralCounts[status]++;
                }
            });

            const labels = Object.keys(referralCounts);
            const counts = Object.values(referralCounts);

            this.referralPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            'rgba(255, 205, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)'
                        ],
                        borderColor: [
                            'rgba(255, 205, 86, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Referral Status Distribution'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering referral pie chart:', error);
        }
    }

    // Render payment pie chart
    renderPaymentPieChart() {
        try {
            const ctx = document.getElementById('payment-pie-chart');
            if (!ctx) return;

            // Destroy existing chart if it exists
            if (this.paymentPieChart) {
                this.paymentPieChart.destroy();
            }

            // Count payment statuses
            const paymentCounts = { 'Pending': 0, 'Completed': 0 };
            this.filteredEntries.forEach(entry => {
                if (entry.paymentByUs === 'Yes' && entry.paymentDetails) {
                    const status = entry.paymentDetails.paymentStatus || 'Pending';
                    if (paymentCounts.hasOwnProperty(status)) {
                        paymentCounts[status]++;
                    }
                } else if (entry.paymentByUs === 'Yes') {
                    // If paymentByUs is Yes but no payment details, count as Pending
                    paymentCounts['Pending']++;
                }
            });

            const labels = Object.keys(paymentCounts);
            const counts = Object.values(paymentCounts);

            this.paymentPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Payment Status Distribution'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering payment pie chart:', error);
        }
    }

    // Render dashboard
    async renderDashboard() {
        // The dashboard is already rendered in the HTML
        // We just need to update the content based on filters
        this.updateDashboard();
    }

    // Set up real-time listeners
    setupRealTimeListeners() {
        // Clean up any existing listeners first
        this.cleanupListeners();

        // Check if user is properly authenticated before setting up listeners
        if (!window.currentUserContext || !this.currentUser || !this.currentUserRole) {
            console.warn('User not properly authenticated, skipping real-time listeners');
            return;
        }

        // Listen for changes to service entries
        let query = firestore.collection('service_entries');

        if (this.currentUserRole === 'navigator' && this.currentUser) {
            query = query.where('navigatorId', '==', this.currentUser.uid);
        }

        const unsubscribe1 = query.onSnapshot(
            (snapshot) => {
                console.log('Service entries updated');
                this.loadData();
            },
            (err) => {
                // Silently ignore permission-denied errors (happens during logout)
                if (err.code !== 'permission-denied') {
                    console.warn("Service entries listener error:", err.code);
                }
            }
        );

        // Store unsubscribe function
        this.unsubscribeListeners.push(unsubscribe1);

        // Listen for changes to services (admin only)
        if (this.currentUserRole === 'admin') {
            const unsubscribe2 = firestore.collection('services_master').onSnapshot(
                (snapshot) => {
                    console.log('Services updated');
                    this.loadData();
                },
                (err) => {
                    // Silently ignore permission-denied errors (happens during logout)
                    if (err.code !== 'permission-denied') {
                        console.warn("Services listener error:", err.code);
                    }
                }
            );

            // Store unsubscribe function
            this.unsubscribeListeners.push(unsubscribe2);
        }
    }

    // Update active navigation item
    updateActiveNav(activeId) {
        // Remove active class from all navigation items
        const navItems = document.querySelectorAll('#sidebar-nav li');
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to the clicked item, or to dashboard if null
        if (activeId) {
            const activeItem = document.getElementById(activeId);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        } else {
            // Set dashboard as active if no specific item is active
            const dashboardItem = document.getElementById('dashboard-nav');
            if (dashboardItem) {
                dashboardItem.classList.add('active');
            }
        }
    }

    // Close modal with animation
    closeModalWithAnimation(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // Download Excel file with filtered data
    downloadExcel() {
        if (!window.excelExportManager) {
            console.error('Excel export manager not available');
            alert('Excel export functionality is not available. Please ensure xlsx.full.min.js is included in your HTML.');
            return;
        }

        // Use filtered entries for export
        const entriesToExport = this.filteredEntries || this.entries;

        // Export to Excel
        window.excelExportManager.exportToExcel(entriesToExport);
    }

    // Add cleanup method (ADD THIS NEW FUNCTION after setupRealTimeListeners)
    cleanupListeners() {
        // Unsubscribe from all active listeners
        this.unsubscribeListeners.forEach(unsubscribe => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribeListeners = [];
        console.log('Dashboard listeners cleaned up');
    }

    // Load invoice generator screen
    loadInvoiceGeneratorScreen() {
        // Create invoice generator screen if it doesn't exist
        if (window.invoiceGeneratorManager) {
            window.invoiceGeneratorManager.createInvoiceGeneratorScreen();
        }

        // Update active state in sidebar
        this.updateActiveNav('invoice-generator');
    }
}

// Initialize dashboard manager
try {
    window.dashboardManager = new DashboardManager();
} catch (error) {
    console.error('Error initializing dashboard manager:', error);
    // Provide a fallback or alert to user if needed
    alert('There was an error initializing the dashboard. Please refresh the page or contact support if the issue persists.');
}