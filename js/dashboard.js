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
        
        this.initDashboard();
    }

    // Initialize dashboard
    initDashboard() {
        // Set up event listeners for dashboard UI
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
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
    }

    // Update sidebar navigation based on role
    updateSidebarNavigation(role) {
        const sidebarNav = document.getElementById('sidebar-nav');
        let navItems = '';
        
        if (role === 'admin') {
            navItems = `
                <li class="active">Dashboard</li>
                <li id="manage-employees">Manage Employees</li>
                <li id="manage-services">Manage Services</li>
            `;
        } else if (role === 'navigator') {
            navItems = `
                <li class="active">Dashboard</li>
                <li id="manage-services">Manage Services</li>
            `;
        }
        
        sidebarNav.innerHTML = navItems;
        
        // Add event listeners to new navigation items
        if (role === 'admin') {
            document.getElementById('manage-employees').addEventListener('click', () => {
                this.showManageEmployees();
            });
        }
        
        // Both admin and navigator can manage services
        document.getElementById('manage-services').addEventListener('click', () => {
            this.showManageServices();
        });
    }

    // Show manage employees section (admin only)
    showManageEmployees() {
        // Create modal for managing employees if it doesn't exist
        if (!document.getElementById('manage-employees-modal')) {
            this.createManageEmployeesModal();
        }
        
        document.getElementById('manage-employees-modal').style.display = 'block';
        
        // Load and display employees
        this.loadAndDisplayEmployees();
    }

    // Create manage employees modal
    createManageEmployeesModal() {
        const modalHTML = `
            <div id="manage-employees-modal" class="modal" style="display: none;">
                <div class="modal-content" style="width: 90%; max-width: 1000px;">
                    <div class="modal-header">
                        <h3>Manage Employees</h3>
                        <span class="close" id="close-employees-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <button id="add-employee-btn" class="btn-primary" style="margin-bottom: 1rem;">
                            <i class="fas fa-plus"></i> Add Employee
                        </button>
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
        
        // Add event listeners
        document.getElementById('close-employees-modal').addEventListener('click', () => {
            document.getElementById('manage-employees-modal').style.display = 'none';
        });
        
        document.getElementById('add-employee-btn').addEventListener('click', async () => {
            await window.userManagement.showAddEmployeeModal();
        });
    }

    // Load and display employees
    async loadAndDisplayEmployees() {
        try {
            const navigators = await window.userManagement.getNavigators();
            const tableBody = document.getElementById('employees-table-body');
            
            if (!tableBody) return;
            
            tableBody.innerHTML = '';
            
            navigators.forEach(navigator => {
                const row = document.createElement('tr');
                
                // Format date
                const createdAt = navigator.createdAt ? 
                    navigator.createdAt.toDate().toLocaleDateString() : 
                    'N/A';
                
                row.innerHTML = `
                    <td>${navigator.name || 'N/A'}</td>
                    <td>${navigator.email || 'N/A'}</td>
                    <td>${navigator.role || 'N/A'}</td>
                    <td>${navigator.status || 'N/A'}</td>
                    <td>${createdAt}</td>
                `;
                
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    // Show manage services section (admin and navigator)
    showManageServices() {
        // Create modal for managing services if it doesn't exist
        if (!document.getElementById('manage-services-modal')) {
            this.createManageServicesModal();
        }
        
        document.getElementById('manage-services-modal').style.display = 'block';
        
        // Load and display services
        this.loadAndDisplayServices();
    }

    // Create manage services modal
    createManageServicesModal() {
        const modalHTML = `
            <div id="manage-services-modal" class="modal" style="display: none;">
                <div class="modal-content" style="width: 90%; max-width: 1000px;">
                    <div class="modal-header">
                        <h3>Manage Services</h3>
                        <span class="close" id="close-services-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label for="new-service-name">Add New Service</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="new-service-name" placeholder="Enter service name">
                                <button id="add-service-btn" class="btn-primary">Add Service</button>
                            </div>
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
            document.getElementById('manage-services-modal').style.display = 'none';
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
            }
        });
    }

    // Load and display services
    async loadAndDisplayServices() {
        try {
            const services = await window.userManagement.getServices();
            const tableBody = document.getElementById('services-table-body');
            
            if (!tableBody) return;
            
            tableBody.innerHTML = '';
            
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
    populateFilterDropdowns() {
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
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        const serviceType = Array.from(document.getElementById('filter-service-type').selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');
        const packageType = document.getElementById('filter-package-type').value;
        const referralStatus = document.getElementById('filter-referral-status').value;
        const paymentStatus = document.getElementById('filter-payment-status').value;
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
            if (serviceType.length > 0 && !serviceType.includes(entry.serviceTypeId)) {
                return false;
            }
            
            // Package type filter
            if (packageType && entry.packageType !== packageType) {
                return false;
            }
            
            // Referral status filter
            if (referralStatus && entry.referralStatus !== referralStatus) {
                return false;
            }
            
            // Payment status filter
            if (paymentStatus && entry.paymentDetails && entry.paymentDetails.paymentStatus !== paymentStatus) {
                return false;
            }
            
            // Navigator filter (admin only)
            if (this.currentUserRole === 'admin' && navigatorFilter && entry.navigatorId !== navigatorFilter) {
                return false;
            }
            
            return true;
        });
        
        // Update dashboard
        this.updateDashboard();
    }

    // Update dashboard with filtered data
    updateDashboard() {
        // Update summary cards
        this.updateSummaryCards();
        
        // Update charts
        this.updateCharts();
        
        // Update table
        window.tableManager.updateTable(this.filteredEntries);
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
        
        // Update card values
        document.getElementById('total-bill-amount-display').textContent = `₹${totalBillAmount.toLocaleString()}`;
        document.getElementById('total-discount').textContent = `₹${totalDiscount.toLocaleString()}`;
        document.getElementById('referral-received').textContent = `₹${referralReceived.toLocaleString()}`;
        document.getElementById('total-paid').textContent = `₹${totalPaid.toLocaleString()}`;
        document.getElementById('pending-payment').textContent = `₹${pendingPayment.toLocaleString()}`;
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
    }

    // Render bar chart (Service Type vs Amount)
    renderBarChart() {
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
    }

    // Render referral pie chart
    renderReferralPieChart() {
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
    }

    // Render payment pie chart
    renderPaymentPieChart() {
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
}

// Initialize dashboard manager
window.dashboardManager = new DashboardManager();