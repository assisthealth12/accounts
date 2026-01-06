// Seed default services on first run
async function seedDefaultServices() {
    try {
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
                    createdBy: 'system',
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

// Auto-run on page load after Firebase initializes
window.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    await seedDefaultServices();
});

window.seedDefaultServices = seedDefaultServices;