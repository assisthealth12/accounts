// Global user context to track authenticated user
window.currentUserContext = null;

// Authentication system
class AuthService {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.initAuthListener();
    }

    // Initialize auth state listener
    initAuthListener() {
        firebaseAuth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user ? user.email : 'No user');
            
            if (!user) {
                // User is signed out
                this.currentUser = null;
                this.userRole = null;
                window.currentUserContext = null;
                this.showLogin();
                return;
            }
            
            // User is signed in
            this.currentUser = user;
            console.log('User signed in:', user.email);
            
            try {
                // Check if user document exists in users collection
                const userRef = firestore.collection('users').doc(user.uid);
                const userSnap = await userRef.get();
                
                console.log('User document exists:', userSnap.exists);

                if (userSnap.exists) {
                    // User document exists, load dashboard
                    const userData = userSnap.data();
                    console.log('User data:', userData);
                    
                    // Set global user context
                    window.currentUserContext = {
                        uid: user.uid,
                        role: userData.role,
                        name: userData.name
                    };
                    
                    this.userRole = userData.role;
                    console.log('User role set to:', this.userRole);
                    this.showDashboard();
                } else {
                    // User document doesn't exist
                    console.log('User document not found, checking allowed_users...');
                    
                    // Check if they're in allowed_users
                    const allowedRef = firestore.collection("allowed_users")
                        .where("email", "==", user.email)
                        .limit(1);
                    const allowedSnap = await allowedRef.get();

                    if (allowedSnap.empty) {
                        console.error('User not in allowed_users, signing out');
                        await firebaseAuth.signOut();
                        alert("Access denied. Contact admin to add your email.");
                        return;
                    }

                    const allowed = allowedSnap.docs[0].data();
                    console.log('Found in allowed_users:', allowed);

                    // Create Firestore user document
                    await userRef.set({
                        uid: user.uid,
                        email: user.email,
                        name: allowed.name,
                        role: allowed.role,
                        status: "active",
                        active: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('User document created');
                    
                    // Remove from allowed_users
                    await firestore.collection('allowed_users').doc(allowedSnap.docs[0].id).delete();
                    console.log('Removed from allowed_users');

                    // Set global user context
                    window.currentUserContext = {
                        uid: user.uid,
                        role: allowed.role,
                        name: allowed.name
                    };
                    
                    this.userRole = allowed.role;
                    console.log('User role set to:', this.userRole);
                    this.showDashboard();
                }
                
            } catch (error) {
                console.error('Error in auth state listener:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // Show error to user
                alert('Error loading user data: ' + error.message);
                this.showLogin();
            }
        });
    }

    // Login function
    async login(email, password) {
        const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const uid = cred.user.uid;

        // Check if user exists in Firestore
        const userSnap = await firebaseUtils.userExists(uid);

        if (!userSnap.exists) {
            await firebaseAuth.signOut();
            throw new Error("User not registered. Contact admin.");
        }

        return cred;
    }

    // Logout function
    logout() {
        // Clean up dashboard listeners before logout
        if (window.dashboardManager && window.dashboardManager.cleanupListeners) {
            window.dashboardManager.cleanupListeners();
        }
        
        firebaseAuth.signOut()
            .then(() => {
                console.log('User signed out');
            })
            .catch((error) => {
                console.error('Logout error:', error);
            });
    }

    // Show login screen
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard-screen').style.display = 'none';
        
        // Show the login form and hide activation form
        const loginForm = document.getElementById('login-form');
        const activateForm = document.getElementById('activate-form');
        if (loginForm) loginForm.style.display = 'block';
        if (activateForm) activateForm.style.display = 'none';
    }

    // Show dashboard based on user role
    showDashboard() {
        console.log('showDashboard called, role:', this.userRole);
        
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'block';
        
        // Set user display name
        if (this.currentUser) {
            document.getElementById('user-display-name').textContent = this.currentUser.email;
        }
        
        console.log('About to initialize services...');
        
        // Initialize services after successful authentication
        if (window.initServicesAfterAuth) {
            window.initServicesAfterAuth();
        }
        
        console.log('Loading dashboard for role:', this.userRole);
        
        // Load dashboard based on role
        if (this.userRole === 'admin') {
            window.currentRole = 'admin';
            console.log('Loading admin dashboard...');
            window.dashboardManager.loadAdminDashboard();
        } else if (this.userRole === 'navigator') {
            window.currentRole = 'navigator';
            console.log('Loading navigator dashboard...');
            window.dashboardManager.loadNavigatorDashboard();
        } else {
            console.error('Unknown role:', this.userRole);
            alert('Unknown user role. Contact admin.');
        }
        
        console.log('Dashboard loaded successfully');
    }

    // Get current user info
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current user role
    getUserRole() {
        return this.userRole;
    }
}

// Initialize auth service
window.authService = new AuthService();

// Set up event listeners for auth UI
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginBtn = document.getElementById('login-btn');
    const loginForm = document.getElementById('login-form');
    const activateForm = document.getElementById('activate-form');
    const showActivateForm = document.getElementById('show-activate-form');
    const showLoginForm = document.getElementById('show-login-form');
    const activateBtn = document.getElementById('activate-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginMessage = document.getElementById('login-message');

    // Login button
    loginBtn.addEventListener('click', async function() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            loginMessage.textContent = 'Please fill in all fields';
            loginMessage.className = 'message error';
            loginMessage.style.display = 'block';
            return;
        }

        try {
            loginMessage.textContent = 'Logging in...';
            loginMessage.className = 'message';
            loginMessage.style.display = 'block';

            await window.authService.login(email, password);
            
            loginMessage.textContent = 'Login successful!';
            loginMessage.className = 'message success';
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 2000);
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. ';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage += 'User not found.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Invalid email format.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }
            
            loginMessage.textContent = errorMessage;
            loginMessage.className = 'message error';
            loginMessage.style.display = 'block';
        }
    });

    // Hide the activation button and form since we're removing activation logic

    // Show/hide forms
    if (showActivateForm) {
        showActivateForm.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            activateForm.style.display = 'block';
            loginMessage.style.display = 'none';
        });
    }

    if (showLoginForm) {
        showLoginForm.addEventListener('click', function(e) {
            e.preventDefault();
            activateForm.style.display = 'none';
            loginForm.style.display = 'block';
            loginMessage.style.display = 'none';
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.authService.logout();
        });
    }

    // Handle form submission with Enter key
    const loginInputs = document.querySelectorAll('#login-form input');
    loginInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    });
    
    // Password toggle functionality
    window.togglePassword = function() {
        const passwordInput = document.getElementById('login-password');
        const toggleText = document.getElementById('toggle-text');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleText.textContent = 'HIDE';
        } else {
            passwordInput.type = 'password';
            toggleText.textContent = 'SHOW';
        }
    };
});