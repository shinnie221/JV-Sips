/**
 * ==========================================================================
 * JV SIPS - FIREBASE CONFIGURATION
 * ==========================================================================
 * 
 * Instructions:
 * 1. Go to Firebase Console (https://console.firebase.google.com/)
 * 2. Create a Project named "JV Sips" (or your preferred name)
 * 3. Add a Web App (</>) to your project
 * 4. Replace the placeholder values in the `firebaseConfig` object below with your actual keys.
 * 5. Enable Firestore Database in "Test mode" or apply the provided firestore.rules.
 * 
 * NOTE: If credentials are left as placeholders, JV Sips will smoothly run in 
 * Local Demo Mode (using browser storage) so you can test all features immediately!
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Helper to check if user has inserted valid credentials
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("YOUR_PROJECT_ID")
  );
}
