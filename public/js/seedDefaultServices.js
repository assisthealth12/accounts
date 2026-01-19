// Seed default services on first run (ADMIN ONLY)
async function seedDefaultServices() {
    try {
        // ✅ FIX: Only run for admins to avoid permission errors
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) {
            console.log('No user logged in, skipping service seed');
            return false;
        }

        // Check if user is admin
        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            console.log('User is not admin, skipping service seed');
            return false;
        }

        const servicesSnapshot = await firestore.collection('services_master').get();

        // Only seed if collection is empty
        if (servicesSnapshot.empty) {
            console.log('Seeding default services...');

            const defaultServices = [
                'Premium Membership',
                'Basic Membership',
                'Special Package',
                'Diagnostics',
                'Physiotherapy',
                'Medicines',
                'Care Taker 12hr',
                'Care Taker 24hr',
                'Nurse 12hr',
                'Nurse 24hr',
                'Short Visit Nurse',
                'Medical Equipment',
                'Consultation OPD',
                'In Patient',
                'Online Consultation',
                'Home Visit / Offline Consultation'
            ];

            const batch = firestore.batch();

            defaultServices.forEach(serviceName => {
                const docRef = firestore.collection('services_master').doc();
                batch.set(docRef, {
                    name: serviceName,
                    active: true,
                    createdBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            console.log('Default services seeded successfully');
            return true;
        }

        console.log('Services already exist, skipping seed');
        return false;
    } catch (error) {
        console.error('Error seeding default services:', error);
        return false;
    }
}

// ✅ FIX: Don't auto-run on page load, only expose as function
// Admins can manually call window.seedDefaultServices() if needed
window.seedDefaultServices = seedDefaultServices;