// src/app/services/job-application.service.ts - Enhanced with refresh capability
import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import {delay} from 'rxjs/operators';

export interface JobApplication {
  id?: string;
  jobTitle: string;
  company: string;
  dateApplied: Date;
  location: string;
  salary: number;
  jobUrl: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  notes: string;
  userId: string;
}

export interface JobApplicationWithUser extends JobApplication {
  userEmail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobApplicationService {
  private collectionName = 'jobApplications';

  // Add refresh trigger subjects for different queries
  private userApplicationsRefresh$ = new BehaviorSubject<void>(undefined);
  private allApplicationsRefresh$ = new BehaviorSubject<void>(undefined);

  constructor(private firestore: Firestore) {
    console.log('🔧 JobApplicationService initialized');
  }

  // Add new job application
  async addApplication(applicationData: Omit<JobApplication, 'id'>): Promise<string> {
    try {
      console.log('➕ Adding new application:', applicationData.jobTitle);
      const docRef = await addDoc(collection(this.firestore, this.collectionName), applicationData);
      console.log('✅ Application added with ID:', docRef.id);

      // Trigger refresh for user applications
      this.refreshUserApplications();
      this.refreshAllApplications();

      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding application:', error);
      throw error;
    }
  }

  // Get applications by user with refresh capability
  getApplicationsByUser(userId: string): Observable<JobApplication[]> {
    console.log('📊 Setting up applications stream for user:', userId);

    return this.userApplicationsRefresh$.pipe(
      switchMap(() => {
        console.log('🔄 Fetching user applications from Firestore...');
        const applicationsCollection = collection(this.firestore, this.collectionName);
        const q = query(
          applicationsCollection,
          where('userId', '==', userId),
          orderBy('dateApplied', 'desc')
        );
        return (collectionData(q, { idField: 'id' }) as Observable<JobApplication[]>).pipe(delay(1000));
      })
    );
  }

  // Get all applications (admin only) with refresh capability
  getAllApplications(): Observable<JobApplication[]> {
    console.log('👥 Setting up all applications stream');

    return this.allApplicationsRefresh$.pipe(
      switchMap(() => {
        console.log('🔄 Fetching all applications from Firestore...');
        const applicationsCollection = collection(this.firestore, this.collectionName);
        const q = query(applicationsCollection, orderBy('dateApplied', 'desc'));
        return collectionData(q, { idField: 'id' }) as Observable<JobApplication[]>;
      })
    );
  }

  // Get applications with user info (admin only)
  getAllApplicationsWithUsers(): Observable<JobApplicationWithUser[]> {
    // For now, this returns the same as getAllApplications
    // We'll enhance this to include user email information
    return this.getAllApplications() as Observable<JobApplicationWithUser[]>;
  }

  // Get application statistics (admin only)
  getApplicationStatistics(): Observable<any> {
    return this.getAllApplications();
  }

  // PUBLIC REFRESH METHODS

  // Refresh user applications - triggers new Firestore query
  refreshUserApplications(): void {
    console.log('🔄 Triggering refresh for user applications');
    this.userApplicationsRefresh$.next();
  }

  // Refresh all applications - triggers new Firestore query
  refreshAllApplications(): void {
    console.log('🔄 Triggering refresh for all applications');
    this.allApplicationsRefresh$.next();
  }

  // Refresh everything
  refreshAll(): void {
    console.log('🔄 Triggering refresh for all data');
    this.refreshUserApplications();
    this.refreshAllApplications();
  }
}
