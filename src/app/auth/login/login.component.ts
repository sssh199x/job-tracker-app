import { Component, OnInit } from '@angular/core';
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
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  socialLoading = false;
  hidePassword = true;
  checkingAuthState = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router,
    private snackBar: MatSnackBar,
    public themeService: ThemeService,
    public validationService: ValidationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.checkingAuthState = false;
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // 🆕 Google Social Login
  async onGoogleLogin() {
    try {
      this.socialLoading = true;
      this.loginForm.markAsUntouched();

      const userCredential = await this.authService.loginWithGoogle();
      const user = userCredential.user;
      const userId = user.uid;
      const email = user.email!;

      await this.adminService.createOrUpdateUserProfile(userId, email, false);

      console.log('🎉 Google login successful!', user);
      this.snackBar.open(`Welcome ${user.displayName || user.email}!`, 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });

      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      console.error('❌ Google login failed:', error);

      let errorMessage = 'Google login failed. Please try again.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login was cancelled. Please try again.';
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

  // Email/Password Login with Smart Error Handling
  async onLogin() {
    if (this.loginForm.valid) {
      this.loading = true;
      const { email, password } = this.loginForm.value;

      try {
        console.log('🔄 Starting email login for:', email);

        const userCredential = await this.authService.login(email, password);
        console.log('✅ Firebase authentication successful for:', email);

        // Handle user profile
        try {
          const userId = userCredential.user.uid;
          if (userId) {
            await this.adminService.createOrUpdateUserProfile(userId, email, false);
            console.log('✅ User profile updated successfully');
          }
        } catch (profileError) {
          console.warn('⚠️ User profile update failed, but login was successful:', profileError);
        }

        this.snackBar.open('Login successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        console.log('🎉 Login complete, redirecting to dashboard');
        this.router.navigate(['/dashboard']);

      } catch (error: any) {
        console.error('❌ Login failed:', error);
        this.handleLoginError(error, email);
      } finally {
        this.loading = false;
      }
    } else {
      this.validationService.markFormGroupTouched(this.loginForm);
    }
  }

  // 🎯 Smart error handling based on domain analysis
  private handleLoginError(error: any, email: string) {
    const errorCode = error.code;
    const domain = email.split('@')[1]?.toLowerCase();
    // Analyze domain type
    const domainAnalysis = this.validationService.analyzeDomain(email);

    console.log('🔍 Processing error for:', email, 'Domain:', domain, 'Error:', errorCode);

    let errorMessage = '';

    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        if (domainAnalysis.isLikelyGoogleWorkspace) {
          errorMessage = `🔍 "${email}" appears to be a ${domainAnalysis.type} email. These often use Google Workspace authentication. Try the "Continue with Google" button above.`;
        } else if (domainAnalysis.isGmail) {
          errorMessage = `🔍 Gmail accounts like "${email}" often use Google sign-in. Try the "Continue with Google" button above, or check your password if you set one up.`;
        } else {
          errorMessage = `❌ Invalid email or password for "${email}". Please check your credentials and try again.`;
        }
        break;

      case 'auth/user-not-found':
        if (domainAnalysis.isLikelyGoogleWorkspace) {
          errorMessage = `❌ No account found for "${email}". ${domainAnalysis.type} emails often use Google Workspace. Try the "Continue with Google" button above.`;
        } else if (domainAnalysis.isGmail) {
          errorMessage = `❌ No account found for "${email}". Gmail users often sign up with Google. Try the "Continue with Google" button above.`;
        } else {
          errorMessage = `❌ No account found for "${email}". Please check your email or create a new account.`;
        }
        break;

      case 'auth/wrong-password':
        if (domainAnalysis.isLikelyGoogleWorkspace || domainAnalysis.isGmail) {
          errorMessage = `❌ Incorrect password for "${email}". If you signed up with Google, use the "Continue with Google" button instead.`;
        } else {
          errorMessage = `❌ Incorrect password for "${email}". Please try again or reset your password.`;
        }
        break;

      case 'auth/too-many-requests':
        errorMessage = 'Too many failed login attempts. Please wait a moment before trying again.';
        break;

      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled. Please contact support.';
        break;

      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;

      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection and try again.';
        break;

      default:
        if (domainAnalysis.isLikelyGoogleWorkspace || domainAnalysis.isGmail) {
          errorMessage = `Login failed for "${email}". 💡 Tip: Try the "Continue with Google" button if you registered with Google.`;
        } else {
          errorMessage = `Login failed: ${errorCode}. Please try again or contact support.`;
        }
    }

    // Show longer duration for Google-related messages
    const duration = errorMessage.includes('Google') ? 8000 : 5000;

    this.snackBar.open(errorMessage, 'Close', {
      duration,
      panelClass: ['error-snackbar']
    });
  }
}
