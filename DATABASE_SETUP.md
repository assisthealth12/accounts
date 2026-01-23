# Office Expenses Module - Database Initialization

This guide provides instructions for initializing the Firestore database for the Office Expenses module.

## Prerequisites

- You must be logged in as an **Admin** user
- You must have access to the browser's Developer Console (F12)

---

## Step 1: Initialize Counter Document

**Purpose**: Create the counter document for auto-incrementing expense serial numbers.

**Instructions**:
1. Login to the application as an admin user
2. Open browser Developer Console (F12)
3. Copy and paste the following code:

```javascript
// Initialize office expense counter
firestore.collection('counters').doc('officeExpenseCounter').set({ 
    officeExpenseLastNo: 0 
})
.then(() => {
    console.log('✅ Office expense counter initialized successfully');
})
.catch((error) => {
    console.error('❌ Error initializing counter:', error);
});
```

4. Press Enter to execute
5. Verify you see the success message in console

---

## Step 2: Add Sample Paid-By Persons

**Purpose**: Add initial "Paid By" persons for dropdown selection.

**Instructions**:
1. In the same Developer Console, copy and paste the following code:

```javascript
// Sample paid-by persons
const samplePersons = [
    { name: "Admin Cash Account", active: true },
    { name: "Petty Cash", active: true },
    { name: "Company Bank Account", active: true },
    { name: "CEO Personal Account", active: true }
];

// Add each person to Firestore
const promises = samplePersons.map(person => {
    return firestore.collection('paid_by_persons').add({
        ...person,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
});

Promise.all(promises)
    .then(() => {
        console.log('✅ Added ' + samplePersons.length + ' paid-by persons successfully');
    })
    .catch((error) => {
        console.error('❌ Error adding persons:', error);
    });
```

2. Press Enter to execute
3. Verify you see the success message

---

## Step 3: Update Firestore Security Rules (IMPORTANT)

**Purpose**: Restrict access to office expenses to admin users only.

**Instructions**:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: **accounts---ah**
3. Navigate to **Firestore Database** → **Rules**
4. Add the following rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...

    // Office Expenses - Admin only
    match /office_expenses/{expenseId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Paid By Persons - Read for all auth users, write for admin only
    match /paid_by_persons/{personId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Office Expense Counter - Admin only
    match /counters/officeExpenseCounter {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

5. Click **Publish** to deploy the rules

---

## Step 4: Verify Installation

**Instructions**:

1. Refresh the application page (F5)
2. Verify you see two new menu items in the sidebar:
   - **Office Expenses**
   - **Manage Paid By**
3. Click **"Office Expenses"**
4. Verify the screen displays:
   - 4 summary cards (all showing ₹0.00)
   - Filters section
   - Empty expenses table
5. Click **"+ Add Expense"** button
6. Verify the modal opens with all form fields
7. Check that **"Paid By"** dropdown shows the 4 sample persons
8. Close the modal
9. Click **"Manage Paid By"** in the sidebar
10. Verify the modal shows the 4 paid-by persons you added

---

## Step 5: Add Your First Test Expense

**Instructions**:

1. Click **"Office Expenses"** in sidebar
2. Click **"+ Add Expense"**
3. Fill in the form:
   - **Date**: Select today's date
   - **Expense Category**: Select "Salary"
   - **Paid By**: Select "Company Bank Account"
   - **Paid To**: Enter "Test Employee"
   - **Details**: Enter "Test salary payment for verification"
   - **Amount**: Enter "50000"
   - **Mode of Transaction**: Select "Bank Transfer"
   - **Transaction ID**: Enter "TEST123456"
4. Click **"Save Expense"**
5. Verify:
   - You see success message "Office expense added successfully!"
   - The table now shows 1 expense with S.No = 1
   - **Total Expenses** card shows ₹50,000.00
   - **Salary Expenses** card shows ₹50,000.00
   - **This Month** card shows ₹50,000.00

---

## Step 6: Test Excel Export

**Instructions**:

1. Click **"Download Excel"** button
2. Verify:
   - File downloads with name format: `Office_Expenses_YYYYMMDD_HHMMSS.xlsx`
   - Excel file opens correctly
   - Headers are bold with green background
   - Data matches what's shown in the table
   - Currency is formatted with ₹ symbol
   - Date is formatted as DD/MM/YYYY

---

## Step 7: Test Filters

**Instructions**:

1. Add 2-3 more test expenses with different categories and dates
2. Test each filter:
   - **Date Range**: Select last 7 days
   - **Expense Category**: Select specific category
   - **Paid By**: Select specific person
   - **Mode of Transaction**: Select specific mode
   - **Universal Search**: Type part of "Paid To" name
3. Verify table and summary cards update correctly
4. Click **"Reset Filters"**
5. Verify all expenses show again

---

## Troubleshooting

### Issue: Navigation items not appearing
**Solution**: 
- Ensure you're logged in as an **admin** user (not navigator)
- Refresh the page (F5)
- Check browser console for any JavaScript errors

### Issue: "Access denied" message
**Solution**:
- Verify your user account has `role: 'admin'` in Firestore users collection
- Logout and login again

### Issue: "Paid By" dropdown is empty
**Solution**:
- Re-run Step 2 to add sample persons
- Or use "Manage Paid By" to manually add persons

### Issue: Counter not incrementing
**Solution**:
- Re-run Step 1 to initialize the counter
- Check browser console for transaction errors

### Issue: Firestore permission denied
**Solution**:
- Verify Step 3 security rules are published
- Ensure you're logged in with a valid account

---

## Success Checklist

- [✓] Counter document created in Firestore
- [✓] Sample paid-by persons added
- [✓] Firestore security rules updated and published
- [✓] Office Expenses menu item visible to admin
- [✓] Manage Paid By menu item visible to admin
- [✓] Can create new expense successfully
- [✓] S.No auto-increments correctly
- [✓] Summary cards calculate correctly
- [✓] Filters work as expected
- [✓] Excel export works correctly
- [✓] Can edit and delete expenses

---

## Next Steps

Once initialization is complete:

1. **Add Real Paid-By Persons**: Use "Manage Paid By" to add your actual payment accounts
2. **Delete Test Data**: Remove the test expense you created
3. **Start Using**: Begin tracking your actual office expenses

For any issues or questions, refer to the [Implementation Plan](./implementation_plan.md) for detailed technical documentation.
