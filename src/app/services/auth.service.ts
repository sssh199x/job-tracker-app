import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  user,
  User,
  UserCredential
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { appConfig } from '../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;
  private googleProvider: GoogleAuthProvider;

  constructor(private auth: Auth) {
    this.user$ = user(this.auth);

    // Initialize Google Auth Provider
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');

    if (appConfig.enableLogging) {
      console.log('🔐 AuthService initialized');
    }
  }

  // Register new user with email/password
  async register(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      if (appConfig.enableLogging) {
        console.log('✅ User registered:', userCredential.user.uid);
      }

      return userCredential;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  // Login user with email/password
  async login(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

      if (appConfig.enableLogging) {
        console.log('✅ User logged in:', userCredential.user.uid);
      }

      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // Google Social Login
  async loginWithGoogle(): Promise<UserCredential> {
    try {
      if (!appConfig.socialLogin.google) {
        throw new Error('Google login is not enabled in this environment');
      }

      const userCredential = await signInWithPopup(this.auth, this.googleProvider);

      if (appConfig.enableLogging) {
        console.log('✅ Google login successful:', userCredential.user.uid);
      }

      return userCredential;
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  }

  // Get user's profile photo
  getUserPhotoURL(): string | null {
    return this.auth.currentUser?.photoURL || null;
  }

  // Get user's display name
  getUserDisplayName(): string | null {
    return this.auth.currentUser?.displayName || null;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);

      if (appConfig.enableLogging) {
        console.log('👋 User logged out');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  // Get current user email
  getCurrentUserEmail(): string | null {
    return this.auth.currentUser?.email || null;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  // Check if user signed in with Google (simple check)
  isGoogleUser(): boolean {
    const user = this.auth.currentUser;
    return user?.providerData.some(provider => provider.providerId === 'google.com') || false;
  }

  // Get basic user info
  getCurrentUserInfo(): {
    uid: string | null;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isGoogleUser: boolean;
  } {
    const user = this.auth.currentUser;
    return {
      uid: user?.uid || null,
      email: user?.email || null,
      displayName: user?.displayName || null,
      photoURL: user?.photoURL || null,
      isGoogleUser: this.isGoogleUser()
    };
  }
}
