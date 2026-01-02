// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjzlKNkHI7KJgylbsGvVLxuWLt-OZ8zJA",
    authDomain: "accounts---ah.firebaseapp.com",
    projectId: "accounts---ah",
    storageBucket: "accounts---ah.firebasestorage.app",
    messagingSenderId: "967007324288",
    appId: "1:967007324288:web:1ed5d294fb3c606ee3fe65",
    measurementId: "G-GP4NNP7CCR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable persistence for better performance
db.enablePersistence()
  .catch(function(err) {
      console.warn('Firebase persistence failed:', err.code);
  });

// Export services for use in other files
window.firebaseAuth = auth;
window.firestore = db;

// Utility functions for Firestore operations
window.firebaseUtils = {
    // Function to get the next service entry number using a transaction
    getNextServiceEntryNumber: async function() {
        const counterRef = db.collection('counters').doc('serviceEntryLastNo');
        
        try {
            const result = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                if (!counterDoc.exists) {
                    // If counter doesn't exist, initialize it
                    transaction.set(counterRef, { value: 1 });
                    return 1;
                } else {
                    const newValue = counterDoc.data().value + 1;
                    transaction.update(counterRef, { value: newValue });
                    return newValue;
                }
            });
            return result;
        } catch (error) {
            console.error('Error getting next service entry number:', error);
            throw error;
        }
    },
    
    // Function to check if user exists in main users collection
    userExists: async function(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                return {
                    exists: true,
                    userData: userDoc.data(),
                    userId: userDoc.id
                };
            }
            return { exists: false };
        } catch (error) {
            console.error('Error checking user in Firestore:', error);
            throw error;
        }
    },
    
    // Function to check if user is allowed to register
    isUserAllowed: async function(email) {
        try {
            const snapshot = await db.collection('allowed_users')
                .where('email', '==', email)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                return {
                    allowed: true,
                    userData: snapshot.docs[0].data(),
                    docId: snapshot.docs[0].id
                };
            }
            return { allowed: false };
        } catch (error) {
            console.error('Error checking if user is allowed:', error);
            throw error;
        }
    },
    
    // Function to create a new user in Firestore
    createUserInFirestore: async function(authUid, name, email, role = 'navigator') {
        try {
            const userRef = db.collection('users').doc(authUid); // Use auth UID as document ID
            const userData = {
                uid: authUid,
                name: name,
                email: email,
                role: role,
                status: 'active',
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await userRef.set(userData);
            return userRef.id;
        } catch (error) {
            console.error('Error creating user in Firestore:', error);
            throw error;
        }
    },
    
    // Function to update user status in Firestore
    updateUserStatus: async function(userId, status) {
        try {
            await db.collection('users').doc(userId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    },
    
    // Function to get user role from Firestore
    getUserRole: async function(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data().role;
            }
            return null;
        } catch (error) {
            console.error('Error getting user role:', error);
            throw error;
        }
    },
    
    // Function to get all services
    getServices: async function() {
        try {
            const snapshot = await db.collection('services_master')
                .where('active', '==', true)
                .get();
            
            const services = [];
            snapshot.forEach(doc => {
                services.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return services;
        } catch (error) {
            console.error('Error getting services:', error);
            throw error;
        }
    },
    
    // Function to get all navigators (for admin use)
    getNavigators: async function() {
        try {
            const snapshot = await db.collection('users').get();
            
            const navigators = [];
            snapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.role === 'navigator') {
                    navigators.push({
                        id: doc.id,
                        ...userData
                    });
                }
            });
            
            return navigators;
        } catch (error) {
            console.error('Error getting navigators:', error);
            throw error;
        }
    },
};

console.log('Firebase initialized');