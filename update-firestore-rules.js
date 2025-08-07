import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firestore security rules for development
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
`;

// Write rules to a file
const rulesPath = path.join(__dirname, 'firestore.rules');
fs.writeFileSync(rulesPath, firestoreRules);

console.log('✅ Firestore rules file created: firestore.rules');
console.log('');
console.log('📋 To deploy these rules, run:');
console.log('   firebase deploy --only firestore:rules');
console.log('');
console.log('⚠️  WARNING: These rules allow full access for development only!');
console.log('   For production, implement proper authentication rules.'); 