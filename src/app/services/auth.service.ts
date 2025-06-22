import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(private auth: Auth) {
    this.user$ = user(this.auth);
  }

  // Register new user
  async register(email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      // We'll handle user profile creation in the component to avoid circular dependency
      console.log('User registered:', userCredential.user.uid);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

      // We'll handle user profile update in the component to avoid circular dependency
      console.log('User logged in:', userCredential.user.uid);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
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
}
