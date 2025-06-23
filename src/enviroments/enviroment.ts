export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyBhO6EFCG6MjucqUCIo0vhMF7fOBaUZVqE",
    authDomain: "job-tracker-app-11056.firebaseapp.com",
    projectId: "job-tracker-app-11056",
    storageBucket: "job-tracker-app-11056.firebasestorage.app",
    messagingSenderId: "185137569661",
    appId: "1:185137569661:web:6d9f1ab2afaf44f1b23614"
  },
  // Feature flags for development
  enableAnalytics: false,
  enableLogging: true,
  apiUrl: 'http://localhost:4200',

  // Social login providers (we'll enable these step by step)
  socialLogin: {
    google: true,
    facebook: false, // We'll add this later
    github: false    // We'll add this later
  }
};
