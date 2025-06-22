import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Firestore, doc, getDoc, setDoc, collection, collectionData } from '@angular/fire/firestore';
import { Observable, switchMap, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UserProfile {
  uid: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {}

  // Check if current user is admin
  isCurrentUserAdmin(): Observable<boolean> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(false);
        return this.getUserProfile(user.uid).pipe(
          map(profile => profile?.isAdmin || false)
        );
      })
    );
  }

  // Get user profile
  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.firestore, 'users', uid);
    return new Observable(subscriber => {
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          subscriber.next({
            uid,
            email: data['email'],
            isAdmin: data['isAdmin'] || false,
            createdAt: data['createdAt']?.toDate() || new Date(),
            lastLoginAt: data['lastLoginAt']?.toDate(),
            isActive: data['isActive'] !== false
          });
        } else {
          subscriber.next(null);
        }
        subscriber.complete();
      }).catch(error => {
        subscriber.error(error);
      });
    });
  }

  // Create or update user profile
  async createOrUpdateUserProfile(uid: string, email: string, isNewUser: boolean = false): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);

    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          email,
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true
        });
      } else {
        const currentData = docSnap.data();
        await setDoc(userDocRef, {
          ...currentData,
          lastLoginAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  // Get all users (admin only)
  getAllUsers(): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  // Toggle user active status (admin only)
  async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        await setDoc(userDocRef, {
          ...currentData,
          isActive,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }

  // Toggle admin status
  async toggleAdminStatus(uid: string, isAdmin: boolean): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', uid);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        await setDoc(userDocRef, {
          ...currentData,
          isAdmin,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      throw error;
    }
  }
}
