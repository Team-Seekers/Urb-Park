# Deploy Firestore Security Rules

## 🔧 Fix Firebase Permissions Error

The error "Missing or insufficient permissions" occurs because Firestore security rules are not configured to allow read/write access.

## 📋 Steps to Deploy Rules:

### 1. Install Firebase CLI (if not already installed):

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase:

```bash
firebase login
```

### 3. Initialize Firebase in your project (if not already done):

```bash
firebase init firestore
```

### 4. Deploy the security rules:

```bash
firebase deploy --only firestore:rules
```

## ⚠️ Important Notes:

- **Development Rules**: The generated `firestore.rules` file allows full read/write access for development
- **Production**: For production, implement proper authentication-based rules
- **Test**: After deployment, test the booking flow again

## 🔍 Verify Deployment:

1. Go to Firebase Console → Firestore Database
2. Check that the rules are updated
3. Test booking flow in your app

## 🚨 If You Still Get Permission Errors:

1. Make sure you're logged into the correct Firebase project
2. Check that the project ID matches your Firebase config
3. Try deploying rules again: `firebase deploy --only firestore:rules`

## 📞 Alternative Solution:

If you can't deploy rules immediately, the app will still work - bookings will be saved to parking areas but user history might not be saved due to permissions.
