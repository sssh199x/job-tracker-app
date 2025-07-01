import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {Subject, Observable, BehaviorSubject, firstValueFrom} from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

// Services
import { JobApplicationService, JobApplicationFormData, JobApplication } from '../services/job-application.service';
import { ResumeService } from '../services/resume.service';
import { AuthService } from '../services/auth.service';
import { StatusService, JobStatus } from '../core/services/status.service';
import { ValidationService } from '../core/services/validation.service';
import { DateUtilService } from '../core/services/date-util.service';
import { PermissionService } from '../services/permission.service';

// Interfaces
import { Resume } from '../interfaces/resume.interface';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import {AdminService} from '../services/admin.service';

@Component({
  selector: 'app-job-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.css'
})
export class JobFormComponent implements OnInit, OnDestroy {
  // Form properties
  jobForm!: FormGroup;
  isSubmitting = false;
  isLoading = false;
  hasFormChanged = false;

  // Drag and drop state
  isDragOver = false;

  // Edit mode properties
  isEditMode = false;
  isAdminMode = false; // Track if admin is editing
  applicationId: string | null = null;
  currentApplication: JobApplication | null = null;
  applicationOwnerEmail: string | null = null; // Store owner's email for admin view

  // Resume properties
  userResumes$!: Observable<Resume[]>;
  selectedResume: Resume | null = null;
  isUploadingResume = false;

  // Status and validation
  statusOptions: { value: JobStatus; label: string; icon: string }[] = [];

  // Permission properties
  canUploadResumes$!: Observable<boolean>;
  canModifyApplications$!: Observable<boolean>;

  // Component state
  private destroy$ = new Subject<void>();
  private formState$ = new BehaviorSubject<JobApplicationFormData | null>(null);

  constructor(
    private fb: FormBuilder,
    private jobService: JobApplicationService,
    public resumeService: ResumeService,
    private authService: AuthService,
    private adminService: AdminService,
    private permissions: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    public statusService: StatusService,
    public validationService: ValidationService,
    public dateUtil: DateUtilService
  ) {
    // Initialize permissions in constructor
    this.canUploadResumes$ = this.permissions.isAuthenticated$;
    this.canModifyApplications$ = this.permissions.isAuthenticated$;
  }

  ngOnInit() {
    console.log('📝 Job form component initializing...');

    // Initialize form in ngOnInit
    this.initializeForm();

    // 🆕 Check if we're in edit mode and load data
    this.checkEditMode();

    // Initialize data
    this.initializeData();

    // Set up form value changes subscription
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    console.log('📝 Job form component destroying...');
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if we're in edit mode and load application data
   */
  private async checkEditMode(): Promise<void> {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.applicationId = params.get('id');
        this.isEditMode = !!this.applicationId;

        // Check if this is admin mode based on route
        this.isAdminMode = this.router.url.includes('/admin/edit-application');

        console.log('📝 Mode check:', {
          isEditMode: this.isEditMode,
          isAdminMode: this.isAdminMode,
          applicationId: this.applicationId,
          currentRoute: this.router.url
        });

        if (this.isEditMode && this.applicationId) {
          return this.loadApplicationForEdit(this.applicationId);
        }
        return Promise.resolve();
      })
    ).subscribe();
  }

  /**
   * Load application data for editing
   */
  private async loadApplicationForEdit(id: string): Promise<void> {
    try {
      this.isLoading = true;
      console.log('📖 Loading application for edit:', id);

      const application = await this.jobService.getApplicationById(id);

      if (!application) {
        console.error('❌ Application not found:', id);
        this.snackBar.open('Application not found', 'Close', { duration: 3000 });
        this.router.navigate([this.isAdminMode ? '/admin' : '/dashboard']);
        return;
      }

      // Permission check based on mode
      if (this.isAdminMode) {
        // Admin mode: Check if user is admin
        const isAdmin = await firstValueFrom(this.permissions.isAdmin$);
        if (!isAdmin) {
          console.error('❌ User is not admin');
          this.snackBar.open('Admin access required', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
          return;
        }

        // For admin mode, get the application owner's email
        try {
          this.applicationOwnerEmail = await this.adminService.getUserEmailById(application.userId);
          console.log('👨‍💼 Admin editing application for user:', this.applicationOwnerEmail);
        } catch (error) {
          console.error('❌ Error getting user email:', error);
          this.applicationOwnerEmail = `User ID: ${application.userId}`;
        }

      } else {
        // User mode: Check if user owns this application
        const currentUserId = this.authService.getCurrentUserId();
        if (!currentUserId || application.userId !== currentUserId) {
          console.error('❌ User cannot edit this application');
          this.snackBar.open('You cannot edit this application', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
          return;
        }
      }

      this.currentApplication = application;
      console.log('✅ Application loaded for edit:', application.jobTitle);

      // Populate form with existing data
      this.populateFormForEdit(application);

    } catch (error) {
      console.error('❌ Error loading application for edit:', error);
      this.snackBar.open('Error loading application', 'Close', { duration: 3000 });
      this.router.navigate([this.isAdminMode ? '/admin' : '/dashboard']);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Populate form with existing application data
   */
  private populateFormForEdit(application: JobApplication): void {
    console.log('📝 Populating form with existing data');
    console.log('📝 Original dateApplied:', application.dateApplied, typeof application.dateApplied);

    // Use DateUtilService to properly convert Firestore date
    const dateApplied = this.dateUtil.parseDate(application.dateApplied);
    console.log('📝 Converted dateApplied using DateUtilService:', dateApplied);

    this.jobForm.patchValue({
      jobTitle: application.jobTitle,
      company: application.company,
      dateApplied: dateApplied,
      location: application.location,
      salary: application.salary,
      jobUrl: application.jobUrl,
      status: application.status,
      notes: application.notes,
      resumeId: application.resumeId || ''
    });

    // Mark form as pristine after initial population
    this.jobForm.markAsPristine();
    this.hasFormChanged = false;
    console.log('📝 Form marked as pristine after population');

    console.log('📝 Form values after patch:', this.jobForm.value);

    // Set selected resume if exists
    if (application.resumeId) {
      this.userResumes$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(resumes => {
        this.selectedResume = resumes.find(r => r.id === application.resumeId) || null;
        console.log('📝 Resume selected for edit:', this.selectedResume?.displayName);
      });
    }
  }

  /**
   * Initialize the reactive form
   */
  private initializeForm(): void {
    this.jobForm = this.fb.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      company: ['', [Validators.required, Validators.minLength(2)]],
      dateApplied: ['', Validators.required],
      location: [''],
      salary: ['', [Validators.min(0)]],
      jobUrl: ['', [this.validationService.urlValidator()]],
      status: ['applied', Validators.required],
      notes: ['', [Validators.maxLength(500)]],
      resumeId: [''] // New field for resume selection
    });

    console.log('📝 Form initialized');
  }

  /**
   * Initialize component data
   */
  private initializeData(): void {
    // Load status options
    this.statusOptions = this.statusService.getAllJobStatuses();

    // Load user resumes
    this.userResumes$ = this.resumeService.getUserResumes().pipe(
      takeUntil(this.destroy$)
    );

    // Set default resume if available (only for new applications)
    if (!this.isEditMode) {
      this.resumeService.getDefaultResume().pipe(
        takeUntil(this.destroy$)
      ).subscribe(defaultResume => {
        if (defaultResume) {
          this.selectedResume = defaultResume;
          this.jobForm.patchValue({ resumeId: defaultResume.id });
          console.log('📝 Default resume selected:', defaultResume.displayName);
        }
      });
    }
  }

  /**
   * Set up form subscriptions for reactive updates
   */
  private setupFormSubscriptions(): void {
    // Subscribe to form changes and emit current state
    this.jobForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(formValue => {
      this.formState$.next(formValue);

      // Track if form has been modified (only in edit mode)
      if (this.isEditMode) {
        this.hasFormChanged = this.jobForm.dirty;
        console.log('📝 Form changed status:', this.hasFormChanged);
      }
    });

    // Subscribe to resume selection changes
    this.jobForm.get('resumeId')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(resumeId => {
      this.onResumeSelectionChange(resumeId);
    });
  }

  /**
   * Handle resume selection change
   */
  private onResumeSelectionChange(resumeId: string): void {
    if (resumeId) {
      this.userResumes$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(resumes => {
        this.selectedResume = resumes.find(r => r.id === resumeId) || null;
        console.log('📝 Resume selected:', this.selectedResume?.displayName);
      });
    } else {
      this.selectedResume = null;
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      if (file.type === 'application/pdf') {
        this.handleFileUpload(file);
      } else {
        this.snackBar.open('Please drop a PDF file only', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  /**
   * Unified file upload handler (for both click and drag-drop)
   */
  private async handleFileUpload(file: File): Promise<void> {
    try {
      this.isUploadingResume = true;

      // Generate display name from filename
      const displayName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

      const resumeId = await this.resumeService.uploadResume({
        file,
        displayName,
        isDefault: false // Don't set as default automatically
      });

      // Select the newly uploaded resume
      this.jobForm.patchValue({ resumeId });

      this.snackBar.open('Resume uploaded successfully!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      console.log('📝 Resume uploaded and selected:', resumeId);

    } catch (error) {
      console.error('❌ Error uploading resume:', error);
      this.snackBar.open(
        error instanceof Error ? error.message : 'Error uploading resume',
        'Close',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.isUploadingResume = false;
    }
  }


  /**
   * Handle file upload for new resume
   */
  async onResumeUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    await this.handleFileUpload(file);

    // Clear the input
    input.value = '';
  }

  /**
   * Download selected resume
   */
  downloadResume(): void {
    if (this.selectedResume) {
      this.resumeService.downloadResume(this.selectedResume);
    }
  }

  /**
   * Updated submit method to handle both create and edit
   */
  async onSubmit(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      const snackBarRef = this.snackBar.open('Please log in to submit applications.', 'Login', {
        duration: 5000
      });

      snackBarRef.onAction().subscribe(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    if (this.jobForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      try {
        const userId = this.authService.getCurrentUserId();
        const formValue = this.jobForm.value;

        // Handle date logic (your existing logic)
        const selectedDate = formValue.dateApplied;
        let finalDate: Date;

        if (selectedDate) {
          const dateOnly = new Date(selectedDate);
          const today = new Date();
          const isToday = dateOnly.toDateString() === today.toDateString();

          if (isToday) {
            finalDate = new Date();
            console.log('📅 Using current time for today\'s application');
          } else {
            finalDate = new Date(dateOnly);
            finalDate.setHours(9, 0, 0, 0);
            console.log('📅 Using 9 AM for selected date:', finalDate);
          }
        } else {
          finalDate = new Date();
        }

        // Prepare form data with resume information
        const formData = {
          ...formValue,
          dateApplied: finalDate,
          salary: formValue.salary ? Number(formValue.salary) : 0,
          userId: userId!,
          // Add resume fields if resume is selected
          ...(this.selectedResume && {
            resumeId: this.selectedResume.id,
            resumeName: this.selectedResume.displayName,
            resumeUrl: this.selectedResume.fileUrl
          })
        };

        // Handle edit vs create
        if (this.isEditMode && this.applicationId) {
          console.log('✏️ Updating application:', this.applicationId);
          await this.jobService.updateApplication(this.applicationId, formData);

          this.snackBar.open('Application updated successfully!', 'View Dashboard', {
            duration: 5000,
            panelClass: ['success-snackbar']
          }).onAction().subscribe(() => {
            this.router.navigate(['/dashboard']);
          });

          console.log('✅ Application updated');
        } else {
          console.log('📝 Creating new application');
          const docId = await this.jobService.addApplication(formData);

          this.snackBar.open('Application submitted successfully!', 'View Dashboard', {
            duration: 5000,
            panelClass: ['success-snackbar']
          }).onAction().subscribe(() => {
            this.router.navigate(['/dashboard']);
          });

          console.log('✅ Application created with ID:', docId);

          // Reset form only for new applications
          this.resetForm();
        }

      } catch (error) {
        console.error('❌ Error submitting application:', error);
        const action = this.isEditMode ? 'updating' : 'submitting';
        this.snackBar.open(`Error ${action} application. Please try again.`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.validationService.markFormGroupTouched(this.jobForm);
    }
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    this.jobForm.reset({
      status: 'applied',
      resumeId: this.selectedResume?.id || '' // Keep selected resume
    });
  }

  /**
   * Navigate to dashboard
   */
  async navigateToDashboard(): Promise<void> {
    // Navigate to appropriate dashboard based on mode
    if (this.isAdminMode) {
      await this.router.navigate(['/admin']);
    } else {
      await this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Navigate to resume management
   */
  async navigateToResumeManagement(): Promise<void> {
    // You can create this route later
    console.log('📝 Navigate to resume management (to be implemented)');
    this.snackBar.open('Resume management coming soon!', 'Close', { duration: 3000 });
  }

  /**
   * Get current form state (useful for other components)
   */
  getFormState(): Observable<JobApplicationFormData | null> {
    return this.formState$.asObservable();
  }

  /**
   * Get current form validity
   */
  isFormValid(): boolean {
    return this.jobForm.valid;
  }

  /**
   * Check if form can be submitted
   */
  canSubmitForm(): boolean {
    if (this.isEditMode) {
      // In edit mode, require form to be valid AND changed
      return this.jobForm.valid && this.hasFormChanged && !this.isSubmitting;
    } else {
      // In create mode, just require form to be valid
      return this.jobForm.valid && !this.isSubmitting;
    }
  }

  /**
   * Get form validation errors
   */
  getFormErrors(): any {
    return this.validationService.getFormErrors(this.jobForm);
  }

  /**
   * Programmatically set form values (useful for edit mode)
   */
  setFormValues(data: Partial<JobApplicationFormData>): void {
    this.jobForm.patchValue(data);
  }

  /**
   * Get resume validation rules for display
   */
  getResumeValidationRules() {
    return this.resumeService.getValidationRules();
  }

  /**
   *Get page title based on mode
   */
  getPageTitle(): string {
    if (this.isAdminMode) {
      return 'Admin: Edit Job Application';
    }
    return this.isEditMode ? 'Edit Job Application' : 'Submit Job Application';
  }

  /**
   * Get page subtitle based on mode
   */
  getPageSubtitle(): string {
    if (this.isAdminMode && this.applicationOwnerEmail) {
      return `Editing application for user: ${this.applicationOwnerEmail}`;
    }
    if (this.isEditMode) {
      return 'Update your job application details';
    }
    return 'Track your job application progress with resume attachment';
  }

  /**
   * Get submit button text based on mode
   */
  getSubmitButtonText(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Updating...' : 'Submitting...';
    }
    return this.isEditMode ? 'Update Application' : 'Submit Application';
  }
}
