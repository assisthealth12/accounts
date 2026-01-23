// Paid By Persons Management System
class PaidByPersonsManager {
    constructor() {
        this.persons = [];
        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        // Listen for persons update event to refresh dropdowns
        window.addEventListener('paidByPersonsUpdated', () => {
            this.getPersons();
        });
    }

    // Get all paid by persons
    async getPersons() {
        try {
            // Check if user is authenticated
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping paid-by persons fetch');
                return [];
            }

            const q = firestore.collection('paid_by_persons');
            const snapshot = await q.get();
            const persons = [];

            snapshot.forEach(doc => {
                persons.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.persons = persons;
            return persons;
        } catch (error) {
            console.error('Error fetching paid-by persons:', error);
            throw error;
        }
    }

    // Get active paid by persons only
    async getActivePersons() {
        try {
            // Check if user is authenticated
            if (!window.authService || !window.authService.getCurrentUser()) {
                console.warn('User not authenticated, skipping paid-by persons fetch');
                return [];
            }

            const q = firestore.collection('paid_by_persons').where('active', '==', true);
            const snapshot = await q.get();
            const persons = [];

            snapshot.forEach(doc => {
                persons.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.persons = persons;
            return persons;
        } catch (error) {
            console.error('Error fetching active paid-by persons:', error);
            throw error;
        }
    }

    // Get person by ID
    getPersonById(personId) {
        return this.persons.find(person => person.id === personId) || null;
    }

    // Add new paid by person
    async addPerson(name) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can add paid-by persons');
            }

            // Validate required fields
            if (!name || name.trim() === '') {
                throw new Error('Person name is required');
            }

            // Prepare person data
            const personToAdd = {
                name: name.trim(),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            const personRef = firestore.collection('paid_by_persons').doc();
            await personRef.set(personToAdd);

            console.log('Paid-by person added successfully');

            // Refresh persons list
            await this.getPersons();

            // Notify other parts of the app that persons have been updated
            window.dispatchEvent(new CustomEvent('paidByPersonsUpdated'));

            return personRef.id;
        } catch (error) {
            console.error('Error adding paid-by person:', error);
            throw error;
        }
    }

    // Update person status (admin only)
    async updatePersonStatus(personId, active) {
        try {
            // Check if user is authenticated and is admin
            if (!window.authService || !window.authService.getCurrentUser()) {
                throw new Error('User not authenticated');
            }

            if (window.authService.getUserRole() !== 'admin') {
                throw new Error('Only admins can update person status');
            }

            await firestore.collection('paid_by_persons').doc(personId).update({
                active: active
            });

            console.log('Paid-by person status updated successfully');

            // Refresh persons list
            await this.getPersons();

            // Notify other parts of the app that persons have been updated
            window.dispatchEvent(new CustomEvent('paidByPersonsUpdated'));
        } catch (error) {
            console.error('Error updating person status:', error);
            throw error;
        }
    }

    // Get person name by ID
    getPersonNameById(personId) {
        if (!this.persons || !Array.isArray(this.persons)) {
            return '';
        }

        const person = this.persons.find(p => p.id === personId);
        return person ? person.name : '';
    }

    // Show manage persons modal
    async showManagePersonsModal() {
        // Check if user is admin
        if (window.authService.getUserRole() !== 'admin') {
            alert('Access denied: Only admins can manage paid-by persons');
            return;
        }

        // Create modal if it doesn't exist
        if (!document.getElementById('manage-paid-by-modal')) {
            this.createManagePaidByModal();
        }

        const modal = document.getElementById('manage-paid-by-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        // Update active nav if dashboard manager exists
        if (window.dashboardManager) {
            window.dashboardManager.updateActiveNav('manage-paid-by');
        }

        this.loadAndDisplayPersons();
    }

    // Create manage paid-by persons modal
    createManagePaidByModal() {
        const modalHTML = `
            <div id="manage-paid-by-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Manage Paid By Persons</h3>
                        <span class="close" id="close-paid-by-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="new-paid-by-name">Add New Person</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="new-paid-by-name" placeholder="Enter person name">
                                <button id="add-paid-by-btn" class="btn-primary">Add Person</button>
                            </div>
                        </div>
                        <div id="paid-by-loading" class="loading-state" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i> Loading persons...
                        </div>
                        <div id="paid-by-empty" class="empty-state" style="display: none;">
                            <i class="fas fa-user-tag"></i>
                            <h4>No persons found</h4>
                            <p>Add your first paid-by person to get started.</p>
                        </div>
                        <div class="table-container">
                            <table id="paid-by-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="paid-by-table-body">
                                    <!-- Person rows will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('close-paid-by-modal').addEventListener('click', () => {
            this.closeModalWithAnimation('manage-paid-by-modal');
            if (window.dashboardManager) {
                window.dashboardManager.updateActiveNav(null);
            }
        });

        // Close modal when clicking outside the content
        document.getElementById('manage-paid-by-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('manage-paid-by-modal')) {
                this.closeModalWithAnimation('manage-paid-by-modal');
                if (window.dashboardManager) {
                    window.dashboardManager.updateActiveNav(null);
                }
            }
        });

        document.getElementById('add-paid-by-btn').addEventListener('click', async () => {
            const personName = document.getElementById('new-paid-by-name').value.trim();
            if (personName) {
                try {
                    await this.addPerson(personName);
                    document.getElementById('new-paid-by-name').value = '';
                    this.loadAndDisplayPersons(); // Refresh the list
                    alert('Paid-by person added successfully!');
                } catch (error) {
                    console.error('Error adding person:', error);
                    alert('Error adding paid-by person: ' + error.message);
                }
            } else {
                alert('Please enter a person name');
            }
        });

        // Also handle Enter key press in the input field
        document.getElementById('new-paid-by-name').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                document.getElementById('add-paid-by-btn').click();
            }
        });
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

    // Load and display paid-by persons
    async loadAndDisplayPersons() {
        try {
            const tableBody = document.getElementById('paid-by-table-body');
            const loadingDiv = document.getElementById('paid-by-loading');
            const emptyDiv = document.getElementById('paid-by-empty');

            if (!tableBody) return;

            // Show loading state
            tableBody.innerHTML = '';
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';

            const persons = await this.getPersons();

            // Hide loading state
            if (loadingDiv) loadingDiv.style.display = 'none';

            if (persons.length === 0) {
                if (emptyDiv) emptyDiv.style.display = 'block';
                return;
            }

            if (emptyDiv) emptyDiv.style.display = 'none';

            persons.forEach(person => {
                const row = document.createElement('tr');

                // Format date
                const createdAt = person.createdAt ?
                    person.createdAt.toDate().toLocaleDateString() :
                    'N/A';

                const statusText = person.active ? 'Active' : 'Inactive';
                const statusClass = person.active ? 'status-active' : 'status-inactive';

                row.innerHTML = `
                    <td>${person.name || 'N/A'}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>${createdAt}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-edit" data-person-id="${person.id}" data-active="${person.active}">
                            ${person.active ? 'Disable' : 'Enable'}
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // Add event listeners to action buttons
            document.querySelectorAll('#paid-by-table-body .btn-edit').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const personId = e.target.getAttribute('data-person-id');
                    const currentActive = e.target.getAttribute('data-active') === 'true';

                    try {
                        await this.updatePersonStatus(personId, !currentActive);
                        this.loadAndDisplayPersons(); // Refresh the list
                    } catch (error) {
                        console.error('Error updating person status:', error);
                        alert('Error updating person status: ' + error.message);
                    }
                });
            });
        } catch (error) {
            console.error('Error loading paid-by persons:', error);

            const loadingDiv = document.getElementById('paid-by-loading');
            const emptyDiv = document.getElementById('paid-by-empty');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                emptyDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h4>Error loading persons</h4><p>${error.message}</p>`;
                emptyDiv.style.display = 'block';
            }
        }
    }
}

// Initialize paid by persons manager
window.paidByPersonsManager = new PaidByPersonsManager();
