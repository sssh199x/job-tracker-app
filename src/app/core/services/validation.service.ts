// src/app/core/services/validation.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface DomainAnalysis {
  type: string;
  isGmail: boolean;
  isLikelyGoogleWorkspace: boolean;
}

export interface FieldConfig {
  label: string;
  type?: 'text' | 'email' | 'password' | 'url' | 'number' | 'textarea';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessages?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  // ============= FIELD CONFIGURATIONS =============

  private fieldConfigs: { [key: string]: FieldConfig } = {
    // Job Application Fields
    jobTitle: {
      label: 'Job Title',
      type: 'text',
      minLength: 2
    },
    company: {
      label: 'Company',
      type: 'text',
      minLength: 2
    },
    dateApplied: {
      label: 'Date Applied',
      type: 'text'
    },
    location: {
      label: 'Location',
      type: 'text'
    },
    salary: {
      label: 'Salary',
      type: 'number',
      min: 0
    },
    jobUrl: {
      label: 'Job URL',
      type: 'url',
      customMessages: {
        pattern: 'Please enter a valid URL (starting with http:// or https://)'
      }
    },
    status: {
      label: 'Status',
      type: 'text'
    },
    notes: {
      label: 'Notes',
      type: 'textarea',
      maxLength: 500
    },

    // Authentication Fields
    email: {
      label: 'Email',
      type: 'email',
      customMessages: {
        email: 'Please enter a valid email address',
        required: 'Email is required'
      }
    },
    password: {
      label: 'Password',
      type: 'password',
      minLength: 6,
      customMessages: {
        minlength: 'Password must be at least 6 characters',
        required: 'Password is required'
      }
    },
    confirmPassword: {
      label: 'Confirm Password',
      type: 'password',
      customMessages: {
        required: 'Please confirm your password',
        mismatch: 'Passwords do not match'
      }
    },

    // Search and Filter Fields
    searchQuery: {
      label: 'Search',
      type: 'text'
    }
  };

  // ============= ERROR MESSAGE GENERATION =============

  /**
   * Get error message for a form control
   * @param control - The form control to validate
   * @param fieldName - The field name (used to get configuration)
   * @param customConfig - Optional custom configuration
   */
  getErrorMessage(control: AbstractControl | null, fieldName: string, customConfig?: FieldConfig): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const config = customConfig || this.fieldConfigs[fieldName] || { label: fieldName };
    const errors = control.errors;

    // Check each possible error type
    if (errors['required']) {
      return config.customMessages?.['required'] || `${config.label} is required`;
    }

    if (errors['email']) {
      return config.customMessages?.['email'] || 'Please enter a valid email address';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return config.customMessages?.['minlength'] ||
        `${config.label} must be at least ${requiredLength} characters`;
    }

    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return config.customMessages?.['maxlength'] ||
        `${config.label} must be less than ${requiredLength} characters`;
    }

    if (errors['min']) {
      const min = errors['min'].min;
      return config.customMessages?.['min'] ||
        `${config.label} must be at least ${min}`;
    }

    if (errors['max']) {
      const max = errors['max'].max;
      return config.customMessages?.['max'] ||
        `${config.label} must be no more than ${max}`;
    }

    if (errors['pattern']) {
      return config.customMessages?.['pattern'] ||
        `${config.label} format is invalid`;
    }

    if (errors['passwordMismatch']) {
      return config.customMessages?.['mismatch'] || 'Passwords do not match';
    }

    if (errors['url']) {
      return config.customMessages?.['url'] || 'Please enter a valid URL';
    }

    // Generic error fallback
    const errorKey = Object.keys(errors)[0];
    return config.customMessages?.[errorKey] || `${config.label} is invalid`;
  }

  /**
   * Simplified method for quick error message retrieval
   * @param control - The form control
   * @param fieldName - The field name
   */
  getError(control: AbstractControl | null, fieldName: string): string {
    return this.getErrorMessage(control, fieldName);
  }

  // ============= CUSTOM VALIDATORS =============

  /**
   * URL validator that's more flexible than built-in pattern
   */
  urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values (use required for that)
      }

      const urlPattern = /^https?:\/\/.+/;
      const valid = urlPattern.test(control.value);
      return valid ? null : { url: { value: control.value } };
    };
  }

  /**
   * Password match validator for confirm password fields
   */
  passwordMatchValidator(passwordField: string = 'password'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null;
      }

      const password = control.parent.get(passwordField);
      const confirmPassword = control;

      if (!password || !confirmPassword) {
        return null;
      }

      if (password.value !== confirmPassword.value) {
        return { passwordMismatch: true };
      }

      return null;
    };
  }

  /**
   * Password strength validator
   */
  passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const password = control.value;
      const errors: any = {};

      if (password.length < 6) {
        errors.minlength = { requiredLength: 6, actualLength: password.length };
      }

      if (!/[A-Z]/.test(password)) {
        errors.missingUppercase = true;
      }

      if (!/[a-z]/.test(password)) {
        errors.missingLowercase = true;
      }

      if (!/\d/.test(password)) {
        errors.missingNumber = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }

  /**
   * Email domain validator (for specific domain requirements)
   */
  emailDomainValidator(allowedDomains: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const email = control.value.toLowerCase();
      const domain = email.split('@')[1];

      if (!domain || !allowedDomains.includes(domain)) {
        return {
          emailDomain: {
            value: control.value,
            allowedDomains: allowedDomains
          }
        };
      }

      return null;
    };
  }

  // ============= FORM UTILITIES =============

  /**
   * Mark all controls in a form group as touched
   */
  markFormGroupTouched(formGroup: any): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();

        // Handle nested form groups
        if (control.controls) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  /**
   * Get all validation errors from a form group
   */
  getFormErrors(formGroup: any): string[] {
    const errors: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control && control.errors && control.touched) {
        const errorMessage = this.getErrorMessage(control, key);
        if (errorMessage) {
          errors.push(errorMessage);
        }
      }
    });

    return errors;
  }

  /**
   * Check if form group has any errors
   */
  hasFormErrors(formGroup: any): boolean {
    return this.getFormErrors(formGroup).length > 0;
  }

  /**
   * Register custom field configuration
   */
  registerField(fieldName: string, config: FieldConfig): void {
    this.fieldConfigs[fieldName] = config;
  }

  /**
   * Get field configuration
   */
  getFieldConfig(fieldName: string): FieldConfig | undefined {
    return this.fieldConfigs[fieldName];
  }

  // ============= PASSWORD STRENGTH UTILITIES =============

  /**
   * Calculate password strength score (0-4)
   */
  getPasswordStrength(password: string): number {
    if (!password) return 0;

    let score = 0;

    // Length
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;

    // Character types
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return Math.min(score, 4);
  }

  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(password: string): string {
    const strength = this.getPasswordStrength(password);
    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong'];
    return labels[strength] || '';
  }

  /**
   * Get password strength class for styling
   */
  getPasswordStrengthClass(password: string): string {
    const strength = this.getPasswordStrength(password);
    const classes = ['', 'very-weak', 'weak', 'fair', 'strong'];
    return classes[strength] || '';
  }

  // ============= DOMAIN ANALYSIS UTILITIES =============

  /**
   * Known Google Workspace domains (add more as discovered)
   */
  private knownGoogleWorkspaceDomains: string[] = [
    'exosolve.io',
    // Add more domains you know use Google Workspace
  ];

  /**
   * Analyze email domain to provide smart authentication hints
   */
  analyzeDomain(email: string): DomainAnalysis {
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) {
      return {
        type: 'invalid',
        isGmail: false,
        isLikelyGoogleWorkspace: false
      };
    }

    // Gmail domains
    if (['gmail.com', 'googlemail.com'].includes(domain)) {
      return {
        type: 'Gmail',
        isGmail: true,
        isLikelyGoogleWorkspace: false
      };
    }

    // Check known Google Workspace domains
    if (this.knownGoogleWorkspaceDomains.includes(domain)) {
      return {
        type: 'corporate',
        isGmail: false,
        isLikelyGoogleWorkspace: true
      };
    }

    // Known public email domains
    const publicDomains = [
      'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'tutanota.com', 'mail.com',
      'yandex.com', 'zoho.com', 'gmx.com', 'fastmail.com'
    ];

    if (!publicDomains.includes(domain)) {
      // If it's not a known public domain, it's likely corporate
      return {
        type: 'corporate',
        isGmail: false,
        isLikelyGoogleWorkspace: true
      };
    }

    return {
      type: 'personal',
      isGmail: false,
      isLikelyGoogleWorkspace: false
    };
  }

  /**
   * Add a known Google Workspace domain
   */
  addGoogleWorkspaceDomain(domain: string): void {
    const lowerDomain = domain.toLowerCase();
    if (!this.knownGoogleWorkspaceDomains.includes(lowerDomain)) {
      this.knownGoogleWorkspaceDomains.push(lowerDomain);
    }
  }

  /**
   * Get authentication suggestion based on email
   */
  getAuthSuggestion(email: string): string {
    const analysis = this.analyzeDomain(email);

    if (analysis.isGmail) {
      return 'Gmail users typically sign in with Google. Try the "Continue with Google" button.';
    }

    if (analysis.isLikelyGoogleWorkspace) {
      return `This appears to be a ${analysis.type} email. Many organizations use Google Workspace. Try the "Continue with Google" button.`;
    }

    return '';
  }

  /**
   * Check if email likely uses Google authentication
   */
  isLikelyGoogleAuth(email: string): boolean {
    const analysis = this.analyzeDomain(email);
    return analysis.isGmail || analysis.isLikelyGoogleWorkspace;
  }

}
