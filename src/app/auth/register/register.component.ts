import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ThemeService } from '../../services/theme.service';
import { ValidationService } from '../../core/services/validation.service';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatSnackBarModule,
    MatTooltipModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  socialLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar,
    public themeService: ThemeService,
    public validationService: ValidationService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
    this.registerForm.get('confirmPassword')?.setValidators([
      Validators.required,
      this.validationService.passwordMatchValidator()
    ]);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // 🆕 Google Social Signup
  async onGoogleSignup() {
    try {
      this.socialLoading = true;
      this.registerForm.markAsUntouched();

      const userCredential = await this.authService.loginWithGoogle();
      const user = userCredential.user;
      const userId = user.uid;
      const email = user.email!;

      // Check if this is a new user or existing user
      const existingProfile = await this.adminService.getUserProfile(userId).toPromise();
      const isNewUser = !existingProfile;

      await this.adminService.createOrUpdateUserProfile(userId, email, isNewUser);

      console.log('🎉 Google signup successful!', user);

      const welcomeMessage = isNewUser
        ? `Welcome to Job Tracker, ${user.displayName || user.email}!`
        : `Welcome back, ${user.displayName || user.email}!`;

      this.snackBar.open(welcomeMessage, 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });

      await this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error('❌ Google signup failed:', error);

      let errorMessage = 'Google signup failed. Please try again.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Signup was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email. Please use email/password login.';
      }

      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.socialLoading = false;
    }
  }

  async onRegister() {
    if (this.registerForm.valid) {
      this.loading = true;
      const { email, password } = this.registerForm.value;

      try {
        console.log('🔄 Starting registration for:', email);

        const userCredential = await this.authService.register(email, password);
        console.log('✅ Firebase registration successful for:', email);

        // Handle user profile
        try {
          const userId = userCredential.user.uid;
          if (userId) {
            await this.adminService.createOrUpdateUserProfile(userId, email, true);
            console.log('✅ User profile created successfully');
          }
        } catch (profileError) {
          console.warn('⚠️ User profile creation failed, but registration was successful:', profileError);
        }

        this.snackBar.open('Account created successfully! Welcome to Job Tracker!', 'Close', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });

        console.log('🎉 Registration complete, redirecting to dashboard');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);

      } catch (error: any) {
        console.error('❌ Registration failed:', error);
        this.handleRegistrationError(error, email);
      } finally {
        this.loading = false;
      }
    } else {
      this.validationService.markFormGroupTouched(this.registerForm);
      this.showValidationErrors();
    }
  }

  // 🎯 Smart error handling for registration
  private handleRegistrationError(error: any, email: string) {
    const errorCode = error.code;

    let errorMessage = '';

    const domainAnalysis = this.validationService.analyzeDomain(email);

    switch (errorCode) {
      case 'auth/email-already-in-use':
        if (domainAnalysis.isGmail) {
          errorMessage = `📧 "${email}" is already registered. Gmail users often sign up with Google - try the "Sign up with Google" button above.`;
        } else if (domainAnalysis.isLikelyGoogleWorkspace) {
          errorMessage = `📧 "${email}" is already registered. ${domainAnalysis.type} emails often use Google Workspace - try the "Sign up with Google" button above.`;
        } else {
          errorMessage = `📧 An account with "${email}" already exists. Please sign in instead.`;
        }
        break;

      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;

      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
        break;

      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled. Please contact support.';
        break;

      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection and try again.';
        break;

      default:
        console.log('⚠️ Unhandled registration error code:', errorCode);
        if (domainAnalysis.isGmail || domainAnalysis.isLikelyGoogleWorkspace) {
          errorMessage = `Registration failed for "${email}". 💡 Tip: Try the "Sign up with Google" button if you prefer.`;
        } else {
          errorMessage = `Registration failed: ${errorCode}. Please try again or contact support.`;
        }
    }
    const duration = errorMessage.includes('Google') ? 8000 : 5000;

    this.snackBar.open(errorMessage, 'Close', {
      duration,
      panelClass: ['error-snackbar']
    });
  }

  private showValidationErrors() {
    const errors = this.validationService.getFormErrors(this.registerForm);

    if (errors.length > 0) {
      this.snackBar.open(
        `Please fix the following: ${errors.join(', ')}`,
        'Close',
        {
          duration: 4000,
          panelClass: ['error-snackbar']
        }
      );
    }
  }
  // Helper method to check if passwords match for template
  get passwordMismatch() {
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    return confirmPasswordControl?.hasError('passwordMismatch') &&
      confirmPasswordControl?.touched;
  }

  getPasswordStrength(): string {
    const password = this.registerForm.get('password')?.value || '';
    const strength = this.validationService.getPasswordStrength(password);

    // Convert numeric strength to string
    switch(strength) {
      case 0: return '';
      case 1: return 'very-weak';
      case 2: return 'weak';
      case 3: return 'fair';
      case 4: return 'strong';
      default: return '';
    }
  }

  getPasswordStrengthText(): string {
    const password = this.registerForm.get('password')?.value || '';
    return this.validationService.getPasswordStrengthLabel(password);
  }
}
