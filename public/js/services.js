// Services Management System
class ServicesManager {
    constructor() {
        this.services = [];
        // Don't initialize services in constructor - wait for authentication
    }

    // Initialize services - only call this after user is authenticated
    async initServices() {
        // Check if user is authenticated before attempting to load services
        if (!window.authService || !window.authService.getCurrentUser()) {
            console.warn('User not authenticated, skipping services initialization');
            return;
        }
        
        try {
            this.services = await window.userManagement.getServices();
            this.populateServiceDropdowns();
        } catch (error) {
            console.error('Error initializing services:', error);
        }
    }

    // Populate service dropdowns throughout the application
    populateServiceDropdowns() {
        // Populate the main service type dropdown in the form
        const serviceTypeSelect = document.getElementById('service-type');
        if (serviceTypeSelect) {
            // Clear existing options except the first one
            serviceTypeSelect.innerHTML = '<option value="">Select Service Type</option>';
            
            this.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                serviceTypeSelect.appendChild(option);
            });
        }
        
        // Also populate any other service type dropdowns that might exist
        const otherServiceDropdowns = document.querySelectorAll('select[data-service-dropdown]');
        otherServiceDropdowns.forEach(dropdown => {
            // Clear existing options except the first one
            dropdown.innerHTML = '<option value="">Select Service Type</option>';
            
            this.services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                dropdown.appendChild(option);
            });
        });
    }

    // Get service name by ID
    getServiceNameById(serviceId) {
        if (!this.services) return serviceId || 'Unknown';
        
        const service = this.services.find(s => s.id === serviceId);
        return service ? service.name : serviceId || 'Unknown';
    }

    // Get all active services
    getActiveServices() {
        return this.services.filter(service => service.active);
    }

    // Refresh services list
    async refreshServices() {
        // Check if user is authenticated before attempting to refresh services
        if (!window.authService || !window.authService.getCurrentUser()) {
            console.warn('User not authenticated, skipping services refresh');
            return;
        }
        
        try {
            this.services = await window.userManagement.getServices();
            this.populateServiceDropdowns();
        } catch (error) {
            console.error('Error refreshing services:', error);
        }
    }
    
    // Load services dropdown directly from Firestore (for async loading)
    async loadServicesDropdown() {
        const select = document.getElementById("service-type");
        if (!select) {
            console.warn('Service dropdown not found');
            return;
        }
        
        select.innerHTML = '<option value="">Loading services...</option>';
        select.disabled = true;
        
        try {
            // Ensure default services exist
            if (window.seedDefaultServices) {
                await window.seedDefaultServices();
            }
            
            const snapshot = await firestore.collection("services_master")
                .where('active', '==', true)
                .get();
            
            if (snapshot.empty) {
                console.error('No active services found in Firestore');
                select.innerHTML = '<option value="">No services available</option>';
                window.servicesLoaded = false;
                select.disabled = false;
                return;
            }
            
            select.innerHTML = '<option value="">Select Service Type</option>';
            
            snapshot.forEach(doc => {
                const option = document.createElement("option");
                option.value = doc.id;  // MUST have doc ID as value
                option.textContent = doc.data().name;
                select.appendChild(option);
            });
            
            window.servicesLoaded = true;
            select.disabled = false;
            console.log(`Loaded ${snapshot.size} services successfully`);
            
        } catch (error) {
            console.error('Error loading services dropdown:', error);
            select.innerHTML = '<option value="">Error loading services</option>';
            select.disabled = false;
            window.servicesLoaded = false;
            
            // Show user-friendly error
            if (error.code === 'permission-denied') {
                alert('Permission denied. Please contact admin.');
            }
        }
    }
}

// Initialize services manager but don't auto-initialize
window.servicesManager = new ServicesManager();

// DO NOT auto-load services - they will be loaded after authentication
// Update services when they change in the application
window.addEventListener('servicesUpdated', async function() {
    await window.servicesManager.refreshServices();
});

// Function to be called after user authentication is complete
window.initServicesAfterAuth = async function() {
    if (window.servicesManager) {
        await window.servicesManager.initServices();
    }
};