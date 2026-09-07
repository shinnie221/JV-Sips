/**
 * ==========================================================================
 * JV SIPS - FIREBASE CONFIGURATION
 * ==========================================================================
 */

export const firebaseConfig = {
  apiKey: "AIzaSyDKFbh41lcnIvu1W9WQDQePKnYlSM5GBu8",
  authDomain: "jv-sips.firebaseapp.com",
  projectId: "jv-sips",
  storageBucket: "jv-sips.firebasestorage.app",
  messagingSenderId: "749643964325",
  appId: "1:749643964325:web:fec9d1b55950c0aea8524c",
  measurementId: "G-JZXXST0JQ6"
};

// Helper to check if user has inserted valid credentials
export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.apiKey) &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY") &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.projectId.includes("YOUR_PROJECT_ID")
  );
}