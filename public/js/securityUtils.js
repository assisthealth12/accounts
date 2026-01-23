// Security and Utility Functions

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe string that might contain HTML
 * @returns {string} - Safe HTML-escaped string
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';

    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Safely parse number from string
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Parsed number or default
 */
function safeParseNumber(value, defaultValue = 0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Retry async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} - Result of operation
 */
async function retryOperation(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error('Operation failed after', maxRetries, 'retries:', error);
                throw error;
            }
            const delay = 1000 * Math.pow(2, i); // Exponential backoff
            console.warn(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Safe localStorage operations with fallback
 */
const safeStorage = {
    set: function (key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    },

    get: function (key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('localStorage read failed:', e);
            return defaultValue;
        }
    },

    remove: function (key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('localStorage remove failed:', e);
            return false;
        }
    }
};

/**
 * Network status manager
 */
class NetworkStatusManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.listeners = [];
        this.init();
    }

    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners(true);
            this.showOnlineMessage();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners(false);
            this.showOfflineMessage();
        });
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(status) {
        this.listeners.forEach(callback => callback(status));
    }

    showOfflineMessage() {
        // Remove existing indicator
        const existing = document.getElementById('offline-indicator');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 0.75rem;
            text-align: center;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        indicator.innerHTML = `
            <i class="fas fa-wifi-slash"></i>
            You are offline - Some features may be limited
        `;
        document.body.appendChild(indicator);
    }

    showOnlineMessage() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.style.background = '#27ae60';
            indicator.innerHTML = `
                <i class="fas fa-wifi"></i>
                Back online - Syncing data...
            `;

            setTimeout(() => {
                indicator.remove();
            }, 3000);
        }
    }

    getStatus() {
        return this.isOnline;
    }
}

// Initialize network status manager
window.networkStatus = new NetworkStatusManager();

/**
 * Debounce function to limit rapid calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format currency safely
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    const safeAmount = safeParseNumber(amount, 0);
    return '₹' + safeAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format date safely
 * @param {any} dateValue - Date to format
 * @returns {string} - Formatted date string (DD/MM/YYYY)
 */
function formatDate(dateValue) {
    if (!dateValue) return '';

    let date;
    try {
        if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else if (dateValue && dateValue.toDate) {
            // Firestore timestamp
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            return '';
        }

        if (isNaN(date.getTime())) return '';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

// Export to window for global access
window.securityUtils = {
    escapeHtml,
    isValidEmail,
    safeParseNumber,
    retryOperation,
    safeStorage,
    debounce,
    formatCurrency,
    formatDate
};

console.log('Security utilities loaded');
