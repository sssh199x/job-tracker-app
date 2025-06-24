import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JobApplicationService } from '../services/job-application.service';
import { AuthService } from '../services/auth.service';
import { StatusService, JobStatus } from '../core/services/status.service';
import { ValidationService } from '../core/services/validation.service';

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

  statusOptions: { value: JobStatus; label: string; icon: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private jobService: JobApplicationService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    public statusService: StatusService,
    public validationService: ValidationService
  ) {
    this.jobForm = this.fb.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      company: ['', [Validators.required, Validators.minLength(2)]],
      dateApplied: ['', Validators.required],
      location: [''],
      salary: ['', [Validators.min(0)]],
      jobUrl: ['', [this.validationService.urlValidator()]],
      status: ['applied', Validators.required],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

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

        const selectedDate = this.jobForm.value.dateApplied;
        let finalDate: Date;

        if (selectedDate) {
          // Convert the selected date to a proper Date object
          const dateOnly = new Date(selectedDate);

          // Check if the selected date is today
          const today = new Date();
          const isToday = dateOnly.toDateString() === today.toDateString();

          if (isToday) {
            // If today is selected, use the current time for accurate "relative time"
            finalDate = new Date(); // Current date and time
            console.log('📅 Using current time for today\'s application');
          } else {
            // For past dates, set time to a reasonable hour (9 AM) to avoid "X hours ago" confusion
            finalDate = new Date(dateOnly);
            finalDate.setHours(9, 0, 0, 0); // Set to 9:00 AM
            console.log('📅 Using 9 AM for selected date:', finalDate);
          }
        } else {
          // Fallback: use current date and time
          finalDate = new Date();
        }

        const formData = {
          ...this.jobForm.value,
          dateApplied: finalDate,
          salary: this.jobForm.value.salary ? Number(this.jobForm.value.salary) : 0,
          userId: userId!
        };

        console.log('📝 Submitting application with date:', finalDate);

        const docId = await this.jobService.addApplication(formData);
        console.log('✅ Document written with ID:', docId);

        const snackBarRef = this.snackBar.open('Application submitted successfully!', 'View Dashboard', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });

        snackBarRef.onAction().subscribe(() => {
          this.router.navigate(['/dashboard']);
        });

        this.jobForm.reset({ status: 'applied' });

      } catch (error) {
        console.error('❌ Error submitting application:', error);
        this.snackBar.open('Error submitting application. Please try again.', 'Close', {
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

  async navigateToDashboard() {
    await this.router.navigate(['/dashboard']);
  }
}
