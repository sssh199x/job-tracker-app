// src/app/job-form/job-form.component.ts - FIXED
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JobApplicationService } from '../services/job-application.service';
import { AuthService } from '../services/auth.service';
import { StatusService, JobStatus } from '../core/services/status.service'; // ✅ IMPORT JobStatus type

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
    MatNativeDateModule
  ],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.css'
})
export class JobFormComponent implements OnInit {
  jobForm: FormGroup;
  isSubmitting = false;

  // ✅ FIXED: Initialize as empty array, populate in ngOnInit
  statusOptions: { value: JobStatus; label: string; icon: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private jobService: JobApplicationService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    public statusService: StatusService // ✅ StatusService injection
  ) {
    this.jobForm = this.fb.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      company: ['', [Validators.required, Validators.minLength(2)]],
      dateApplied: ['', Validators.required],
      location: [''],
      salary: ['', [Validators.min(0)]],
      jobUrl: ['', [Validators.pattern('https?://.+')]],
      status: ['applied', Validators.required],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  // ✅ NEW: Initialize status options after component construction
  ngOnInit() {
    this.statusOptions = this.statusService.getAllJobStatuses();
  }

  async onSubmit() {
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

        const formData = {
          ...this.jobForm.value,
          dateApplied: new Date(this.jobForm.value.dateApplied),
          salary: this.jobForm.value.salary ? Number(this.jobForm.value.salary) : 0,
          userId: userId!
        };

        const docId = await this.jobService.addApplication(formData);
        console.log('Document written with ID:', docId);

        const snackBarRef = this.snackBar.open('Application submitted successfully!', 'View Dashboard', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });

        snackBarRef.onAction().subscribe(() => {
          this.router.navigate(['/dashboard']);
        });

        this.jobForm.reset({ status: 'applied' });

      } catch (error) {
        console.error('Error submitting application:', error);
        this.snackBar.open('Error submitting application. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.jobForm.controls).forEach(key => {
      const control = this.jobForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for form validation
  getErrorMessage(fieldName: string): string {
    const control = this.jobForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(fieldName)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid URL (starting with http:// or https://)';
    }
    if (control?.hasError('min')) {
      return 'Salary must be a positive number';
    }
    if (control?.hasError('maxlength')) {
      return `Notes must be less than ${control.errors?.['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      jobTitle: 'Job Title',
      company: 'Company',
      dateApplied: 'Date Applied',
      location: 'Location',
      salary: 'Salary',
      jobUrl: 'Job URL',
      status: 'Status',
      notes: 'Notes'
    };
    return labels[fieldName] || fieldName;
  }

  async navigateToDashboard() {
    await this.router.navigate(['/dashboard']);
  }
}
