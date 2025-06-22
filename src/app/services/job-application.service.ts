import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

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

  constructor(private firestore: Firestore) {}

  // Add new job application
  async addApplication(applicationData: Omit<JobApplication, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(this.firestore, this.collectionName), applicationData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding application:', error);
      throw error;
    }
  }

  // Get applications by user
  getApplicationsByUser(userId: string): Observable<JobApplication[]> {
    const applicationsCollection = collection(this.firestore, this.collectionName);
    const q = query(
      applicationsCollection,
      where('userId', '==', userId),
      orderBy('dateApplied', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<JobApplication[]>;
  }

  // Get all applications (admin only)
  getAllApplications(): Observable<JobApplication[]> {
    const applicationsCollection = collection(this.firestore, this.collectionName);
    const q = query(applicationsCollection, orderBy('dateApplied', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<JobApplication[]>;
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
}
