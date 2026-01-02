// Script to add an admin user to your Firestore database
// This should be run in a Node.js environment or in the Firebase Functions emulator

// For browser environment, you can run this in the browser console after Firebase is initialized
async function addAdminUser(email, name) {
    try {
        // Check if Firebase is initialized
        if (!window.firebaseAuth || !window.firestore) {
            console.error('Firebase is not initialized. Please ensure firebase.js is loaded first.');
            return;
        }

        // Check if user already exists
        const userCheck = await window.firebaseUtils.userExistsInFirestore(email);
        
        if (userCheck.exists) {
            console.error('User already exists:', email);
            return;
        }

        // Create a new user document with admin role
        // Note: This assumes you have already created an auth account for this email
        // You need to create the auth account first using Firebase Auth
        console.log('Creating admin user in Firestore...');
        
        // This function would typically be called after creating an auth account
        // For a true admin, you'd need to create the auth account first
        // This is usually done through Firebase Console or Admin SDK
        
        console.log('Admin user creation requires Firebase Admin SDK on a server.');
        console.log('For immediate setup, add the user manually in Firebase Console:');
        console.log('1. Go to Firebase Console -> Authentication and create the user account');
        console.log('2. Go to Firebase Console -> Firestore Database and create a user document with:');
        console.log('   - Collection: users');
        console.log('   - Fields: {name: "' + name + '", email: "' + email + '", role: "admin", status: "active", active: true}');
        
    } catch (error) {
        console.error('Error adding admin user:', error);
    }
}

// Alternative: Function to manually add admin via Firebase Console
console.log('To manually add an admin user:');
console.log('1. Go to Firebase Console -> Authentication');
console.log('2. Create a new user account with the desired email');
console.log('3. Go to Firebase Console -> Firestore Database');
console.log('4. Create a document in the "users" collection with:');
console.log('   - name: "Administrator" (or desired name)');
console.log('   - email: "admin@example.com" (or desired email)');
console.log('   - role: "admin"');
console.log('   - status: "active"');
console.log('   - active: true');
console.log('   - uid: [copy the UID from Authentication section]');

// Example usage (after Firebase is loaded):
// addAdminUser('admin@example.com', 'Administrator');