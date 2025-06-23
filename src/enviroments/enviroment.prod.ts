export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyBhO6EFCG6MjucqUCIo0vhMF7fOBaUZVqE",
    authDomain: "job-tracker-app-11056.firebaseapp.com",
    projectId: "job-tracker-app-11056",
    storageBucket: "job-tracker-app-11056.firebasestorage.app",
    messagingSenderId: "185137569661",
    appId: "1:185137569661:web:6d9f1ab2afaf44f1b23614"
  },
  // Feature flags for production
  enableAnalytics: true,
  enableLogging: false, // Disable console logs in production
  apiUrl: 'https://job-tracker-app-11056.web.app', // Your Firebase hosting URL

  // Social login providers
  socialLogin: {
    google: true,
    facebook: true,  // Enable in production
    github: true     // Enable in production
  }
};
