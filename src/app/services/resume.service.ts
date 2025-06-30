import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, where, orderBy, doc, updateDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { AuthService } from './auth.service';
import { Resume, ResumeUploadData } from '../interfaces/resume.interface';
import { Observable, BehaviorSubject, switchMap, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {PermissionService} from './permission.service';

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private collectionName = 'resumes';
  private maxFileSize = 10 * 1024 * 1024; // 10MB limit
  private allowedTypes = ['application/pdf'];

  // Refresh triggers for real-time updates
  private userResumesRefresh$ = new BehaviorSubject<void>(undefined);

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {
    console.log('📁 ResumeService initialized');
  }

  /**
   * Upload a new resume file and save metadata
   */
  async uploadResume(uploadData: ResumeUploadData): Promise<string> {
    const currentUser = this.authService.getCurrentUserInfo();
    if (!currentUser) {
      throw new Error('User must be logged in to upload resumes');
    }

    // Validate file
    this.validateFile(uploadData.file);

    try {
      console.log('📤 Uploading resume:', uploadData.displayName);

      // Generate unique filename
      const fileExtension = uploadData.file.name.split('.').pop();
      const fileName = `${Date.now()}_${uploadData.displayName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;

      // Upload to Firebase Storage
      const storageRef = ref(this.storage, `resumes/${currentUser.uid}/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, uploadData.file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // If this is set as default, update other resumes to not be default
      if (uploadData.isDefault) {
        await this.clearDefaultResumes(currentUser.uid!);
      }

      // Save metadata to Firestore
      const resumeData: Omit<Resume, 'id'> = {
        userId: currentUser.uid!,
        fileName: fileName,
        displayName: uploadData.displayName,
        fileUrl: downloadURL,
        fileSize: uploadData.file.size,
        uploadDate: new Date(),
        isDefault: uploadData.isDefault || false,
        fileType: uploadData.file.type,
        tags: uploadData.tags || []
      };

      const docRef = await addDoc(collection(this.firestore, this.collectionName), resumeData);
      console.log('✅ Resume uploaded with ID:', docRef.id);

      // Trigger refresh
      this.refreshUserResumes();

      return docRef.id;
    } catch (error) {
      console.error('❌ Error uploading resume:', error);
      throw error;
    }
  }

  /**
   * Get all resumes for current user with refresh capability
   */
  getUserResumes(): Observable<Resume[]> {
    const currentUser = this.authService.getCurrentUserInfo();
    if (!currentUser) {
      return throwError(() => new Error('User not logged in'));
    }

    return this.userResumesRefresh$.pipe(
      switchMap(() => {
        console.log('📋 Fetching user resumes...');
        const resumesCollection = collection(this.firestore, this.collectionName);
        const q = query(
          resumesCollection,
          where('userId', '==', currentUser.uid),
          orderBy('uploadDate', 'desc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<Resume[]>;
      }),
      tap(resumes => console.log(`📋 Found ${resumes.length} resumes`)),
      catchError(error => {
        console.error('❌ Error fetching resumes:', error);
        throw error;
      })
    );
  }

  /**
   * Get default resume for current user
   */
  getDefaultResume(): Observable<Resume | null> {
    return this.getUserResumes().pipe(
      map(resumes => resumes.find(resume => resume.isDefault) || null)
    );
  }

  /**
   * Set a resume as default (and unset others)
   */
  async setDefaultResume(resumeId: string): Promise<void> {
    const currentUser = this.authService.getCurrentUserInfo();
    if (!currentUser) {
      throw new Error('User not logged in');
    }

    try {
      // Clear all default flags for user
      await this.clearDefaultResumes(currentUser.uid!);

      // Set the selected resume as default
      const resumeRef = doc(this.firestore, this.collectionName, resumeId);
      await updateDoc(resumeRef, { isDefault: true });

      console.log('✅ Default resume updated:', resumeId);
      this.refreshUserResumes();
    } catch (error) {
      console.error('❌ Error setting default resume:', error);
      throw error;
    }
  }

  /**
   * Update resume metadata (name, tags, etc.)
   */
  async updateResume(resumeId: string, updates: Partial<Pick<Resume, 'displayName' | 'tags' | 'isDefault'>>): Promise<void> {
    try {
      const resumeRef = doc(this.firestore, this.collectionName, resumeId);
      await updateDoc(resumeRef, updates);

      console.log('✅ Resume updated:', resumeId);
      this.refreshUserResumes();
    } catch (error) {
      console.error('❌ Error updating resume:', error);
      throw error;
    }
  }

  /**
   * Delete a resume (file and metadata)
   */
  async deleteResume(resumeId: string): Promise<void> {
    try {
      // Get resume data first
      const resumeRef = doc(this.firestore, this.collectionName, resumeId);
      const resumeSnap = await getDoc(resumeRef);

      if (!resumeSnap.exists()) {
        throw new Error('Resume not found');
      }

      const resumeData = resumeSnap.data() as Resume;

      // Delete file from Storage
      const fileRef = ref(this.storage, `resumes/${resumeData.userId}/${resumeData.fileName}`);
      await deleteObject(fileRef);

      // Delete metadata from Firestore
      await deleteDoc(resumeRef);

      console.log('✅ Resume deleted:', resumeId);
      this.refreshUserResumes();
    } catch (error) {
      console.error('❌ Error deleting resume:', error);
      throw error;
    }
  }

  /**
   * Get resume by ID
   */
  async getResumeById(resumeId: string): Promise<Resume | null> {
    try {
      const resumeRef = doc(this.firestore, this.collectionName, resumeId);
      const resumeSnap = await getDoc(resumeRef);

      if (resumeSnap.exists()) {
        return { id: resumeSnap.id, ...resumeSnap.data() } as Resume;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching resume:', error);
      throw error;
    }
  }

  /**
   * Download resume file (opens in new tab)
   */
  downloadResume(resume: Resume): void {
    window.open(resume.fileUrl, '_blank');
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): void {
    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('Only PDF files are allowed');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size must be less than ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File must have a valid name');
    }
  }

  /**
   * Clear default flag from all user's resumes
   */
  private async clearDefaultResumes(userId: string): Promise<void> {
    // This is a simplified version - in production you might want to use batch writes
    const resumes = await this.getUserResumes().pipe(
      map(resumes => resumes.filter(r => r.isDefault))
    ).toPromise();

    for (const resume of resumes || []) {
      if (resume.id) {
        const resumeRef = doc(this.firestore, this.collectionName, resume.id);
        await updateDoc(resumeRef, { isDefault: false });
      }
    }
  }

  /**
   * Trigger refresh of user resumes
   */
  refreshUserResumes(): void {
    console.log('🔄 Triggering refresh for user resumes');
    this.userResumesRefresh$.next();
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file validation rules for display
   */
  getValidationRules() {
    return {
      maxSize: this.maxFileSize,
      maxSizeMB: this.maxFileSize / (1024 * 1024),
      allowedTypes: this.allowedTypes,
      allowedExtensions: ['.pdf']
    };
  }
}
