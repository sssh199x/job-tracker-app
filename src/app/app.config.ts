import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { firebaseConfig, appConfig } from './firebase.config';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { LogLevel, setLogLevel } from '@angular/fire';
import {getStorage, provideStorage} from '@angular/fire/storage';

// Set log level based on environment
setLogLevel(appConfig.production ? LogLevel.WARN : LogLevel.VERBOSE);

// Log environment info in development
if (!appConfig.production && appConfig.enableLogging) {
  console.log('🔥 Firebase initialized for development');
  console.log('📊 Analytics enabled:', appConfig.enableAnalytics);
  console.log('🔐 Social login config:', appConfig.socialLogin);
}

export const appConfiguration: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
  ]
};
