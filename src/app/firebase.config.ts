import { environment } from "../environments/environment";

// Use environment-based configuration
export const firebaseConfig = environment.firebase;

// Export additional environment settings for use throughout the app
export const appConfig = {
  production: environment.production,
  enableAnalytics: environment.enableAnalytics,
  enableLogging: environment.enableLogging,
  socialLogin: environment.socialLogin
};
