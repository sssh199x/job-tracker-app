import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Firestore, doc, getDoc, setDoc, collection, collectionData } from '@angular/fire/firestore';
import { Observable, switchMap, of, BehaviorSubject } from 'rxjs';
import { map, shareReplay, catchError, distinctUntilChanged } from 'rxjs/operators';

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
  // Cache the admin status to prevent repeated calls
  private adminStatusCache = new BehaviorSubject<boolean | null>(null);
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {
    console.log('🔧 AdminService constructed');

    // Watch for user changes and clear cache when user changes
    this.authService.user$.subscribe(user => {
      if (user?.uid !== this.currentUserId) {
        console.log('👤 User changed, clearing admin cache');
        this.currentUserId = user?.uid || null;
        this.adminStatusCache.next(null);
      }
    });
  }

  // Check if current user is admin with caching
  isCurrentUserAdmin(): Observable<boolean> {
    console.log('🔍 Checking if current user is admin...');

    return this.authService.user$.pipe(
      distinctUntilChanged((prev, curr) => prev?.uid === curr?.uid),
      switchMap(user => {
        console.log('👤 Current user:', user?.uid || 'No user');

        if (!user) {
          console.log('❌ No user logged in');
          this.adminStatusCache.next(false);
          return of(false);
        }

        // Check if we have cached result for this user
        const cachedStatus = this.adminStatusCache.value;
        if (cachedStatus !== null && this.currentUserId === user.uid) {
          console.log('💾 Using cached admin status:', cachedStatus);
          return of(cachedStatus);
        }

        console.log(`🔎 Looking up admin status for user: ${user.uid}`);
        return this.checkUserAdminStatus(user.uid);
      }),
      shareReplay(1)
    );
  }

  // Separate method to check admin status and cache result
  private checkUserAdminStatus(uid: string): Observable<boolean> {
    const userDocRef = doc(this.firestore, 'users', uid);

    return new Observable<boolean>(subscriber => {
      console.log(`📖 Fetching user document for: ${uid}`);

      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isAdmin = data['isAdmin'] || false;

          console.log(`📊 Raw Firestore data for ${uid}:`, data);
          console.log(`🛡️ User ${uid} admin status:`, isAdmin);

          // Cache the result
          this.adminStatusCache.next(isAdmin);

          subscriber.next(isAdmin);
        } else {
          console.log(`❌ No document found for user: ${uid}`);
          this.adminStatusCache.next(false);
          subscriber.next(false);
        }
        subscriber.complete();
      }).catch(error => {
        console.error(`❌ Error fetching admin status for ${uid}:`, error);
        this.adminStatusCache.next(false);
        subscriber.error(error);
      });
    }).pipe(
      catchError(error => {
        console.error('❌ Error in checkUserAdminStatus:', error);
        return of(false);
      })
    );
  }

  // Get user profile (simplified, no caching for this method)
  getUserProfile(uid: string): Observable<UserProfile | null> {
    console.log(`📖 Getting user profile for: ${uid}`);

    const userDocRef = doc(this.firestore, 'users', uid);

    return new Observable<UserProfile | null>(subscriber => {
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const profile: UserProfile = {
            uid,
            email: data['email'],
            isAdmin: data['isAdmin'] || false,
            createdAt: data['createdAt']?.toDate() || new Date(),
            lastLoginAt: data['lastLoginAt']?.toDate(),
            isActive: data['isActive'] !== false
          };

          console.log(`✅ Profile for ${uid}:`, profile);
          subscriber.next(profile);
        } else {
          console.log(`❌ No profile found for user: ${uid}`);
          subscriber.next(null);
        }
        subscriber.complete();
      }).catch(error => {
        console.error(`❌ Error fetching profile for ${uid}:`, error);
        subscriber.error(error);
      });
    });
  }

  // Create or update user profile
  async createOrUpdateUserProfile(uid: string, email: string, isNewUser: boolean = false): Promise<void> {
    console.log(`👥 Creating/updating profile for: ${uid}`);

    const userDocRef = doc(this.firestore, 'users', uid);

    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        console.log(`✨ Creating new profile for: ${uid}`);
        await setDoc(userDocRef, {
          email,
          isAdmin: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true
        });
      } else {
        console.log(`🔄 Updating existing profile for: ${uid}`);
        const currentData = docSnap.data();
        await setDoc(userDocRef, {
          ...currentData,
          lastLoginAt: new Date()
        });
      }

      // Clear cache so it gets refreshed
      this.adminStatusCache.next(null);
    } catch (error) {
      console.error('❌ Error creating/updating user profile:', error);
      throw error;
    }
  }

  // Get all users (admin only)
  // Get all users (admin only) - FIXED to properly convert dates
  getAllUsers(): Observable<UserProfile[]> {
    console.log('👥 Getting all users');
    const usersCollection = collection(this.firestore, 'users');

    return collectionData(usersCollection, { idField: 'uid' }).pipe(
      map((users: any[]) => {
        return users.map(userData => {
          console.log('Raw user data:', userData);

          // Convert Firestore timestamps to Date objects
          let createdAt: Date;
          let lastLoginAt: Date | undefined;

          try {
            // Handle createdAt
            if (userData.createdAt?.toDate) {
              createdAt = userData.createdAt.toDate();
            } else if (userData.createdAt) {
              createdAt = new Date(userData.createdAt);
            } else {
              createdAt = new Date();
            }

            // Handle lastLoginAt
            if (userData.lastLoginAt?.toDate) {
              lastLoginAt = userData.lastLoginAt.toDate();
            } else if (userData.lastLoginAt) {
              lastLoginAt = new Date(userData.lastLoginAt);
            }
          } catch (dateError) {
            console.error('Error converting dates for user:', userData.uid, dateError);
            createdAt = new Date();
            lastLoginAt = undefined;
          }

          const userProfile: UserProfile = {
            uid: userData.uid || userData.id,
            email: userData.email,
            isAdmin: userData.isAdmin || false,
            createdAt,
            lastLoginAt,
            isActive: userData.isActive !== false
          };

          console.log(`✅ Converted user profile:`, userProfile);
          return userProfile;
        });
      }),
      catchError(error => {
        console.error('❌ Error getting all users:', error);
        return of([]);
      })
    );
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

      // Clear cache if we're updating current user
      if (uid === this.currentUserId) {
        this.adminStatusCache.next(null);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      throw error;
    }
  }

  // Method to manually refresh admin status
  refreshAdminStatus(): void {
    console.log('🔄 Manually refreshing admin status');
    this.adminStatusCache.next(null);
  }
}
