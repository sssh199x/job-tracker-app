import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service'; // Add this import

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private adminService: AdminService, // Add this injection
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { 'passwordMismatch': true };
    }
    return null;
  }

  async onRegister() {
    if (this.registerForm.valid) {
      this.loading = true;

      try {
        const { email, password } = this.registerForm.value;
        console.log('🔄 Starting registration for:', email);

        // Step 1: Create Firebase account
        await this.authService.register(email, password);
        console.log('✅ Firebase registration successful for:', email);

        // Step 2: Handle user profile (separate try-catch)
        try {
          const userId = this.authService.getCurrentUserId();
          console.log('👤 Retrieved user ID:', userId);

          if (userId) {
            console.log('📝 Creating user profile...');
            await this.adminService.createOrUpdateUserProfile(userId, email, true);
            console.log('✅ User profile created successfully for:', userId);
          } else {
            console.warn('⚠️ No user ID found after registration');
          }
        } catch (profileError) {
          console.warn('⚠️ User profile creation failed, but registration was successful:', profileError);
          // Don't throw this error - registration was successful
        }

        // Show success and redirect
        this.snackBar.open('Account created successfully! Redirecting to dashboard...', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        console.log('🎉 Registration complete, redirecting to dashboard');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);

      } catch (error: any) {
        console.error('❌ Registration failed:', error);
        this.snackBar.open(this.getErrorMessage(error.code), 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.loading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      default:
        return 'Registration failed. Please try again.';
    }
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }

    // Check for password mismatch
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    return labels[fieldName] || fieldName;
  }

  // Helper method to check if passwords match for template
  get passwordMismatch() {
    return this.registerForm.errors?.['passwordMismatch'] &&
      this.registerForm.get('confirmPassword')?.touched;
  }
}
