// src/app/core/services/status.service.ts
import { Injectable } from '@angular/core';

export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected';
export type UserStatus = 'active' | 'inactive';
export type RoleType = 'admin' | 'user';

@Injectable({
  providedIn: 'root'
})
export class StatusService {

  // ============= JOB APPLICATION STATUS =============

  /**
   * Get CSS class for job application status
   */
  getJobStatusClass(status: JobStatus): string {
    return `status-${status}`;
  }

  /**
   * Get Material color for job application status
   */
  getJobStatusColor(status: JobStatus): string {
    switch(status) {
      case 'applied': return 'primary';
      case 'interview': return 'accent';
      case 'offer': return '';
      case 'rejected': return 'warn';
      default: return '';
    }
  }

  /**
   * Get icon for job application status
   */
  getJobStatusIcon(status: JobStatus): string {
    switch(status) {
      case 'applied': return 'send';
      case 'interview': return 'event';
      case 'offer': return 'celebration';
      case 'rejected': return 'cancel';
      default: return 'help';
    }
  }

  /**
   * Get display label for job application status
   */
  getJobStatusLabel(status: JobStatus): string {
    switch(status) {
      case 'applied': return 'Applied';
      case 'interview': return 'Interview';
      case 'offer': return 'Offer';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  }

  // ============= USER STATUS =============

  /**
   * Get CSS class for user active status
   */
  getUserStatusClass(isActive: boolean): string {
    return isActive ? 'active' : 'inactive';
  }

  /**
   * Get Material color for user active status
   */
  getUserStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  /**
   * Get icon for user active status
   */
  getUserStatusIcon(isActive: boolean): string {
    return isActive ? 'check_circle' : 'cancel';
  }

  /**
   * Get display label for user active status
   */
  getUserStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  // ============= ROLE STATUS =============

  /**
   * Get CSS class for user role
   */
  getRoleClass(isAdmin: boolean): string {
    return isAdmin ? 'admin' : 'user';
  }

  /**
   * Get Material color for user role
   */
  getRoleColor(isAdmin: boolean): string {
    return isAdmin ? 'accent' : '';
  }

  /**
   * Get icon for user role
   */
  getRoleIcon(isAdmin: boolean): string {
    return isAdmin ? 'admin_panel_settings' : 'person';
  }

  /**
   * Get display label for user role
   */
  getRoleLabel(isAdmin: boolean): string {
    return isAdmin ? 'Administrator' : 'User';
  }

  // ============= UTILITY METHODS =============

  /**
   * Get all available job statuses with metadata
   */
  getAllJobStatuses(): { value: JobStatus; label: string; icon: string }[] {
    return [
      { value: 'applied', label: 'Applied', icon: 'send' },
      { value: 'interview', label: 'Interview', icon: 'event' },
      { value: 'offer', label: 'Offer', icon: 'celebration' },
      { value: 'rejected', label: 'Rejected', icon: 'cancel' }
    ];
  }

  /**
   * Check if status is positive (interview/offer)
   */
  isPositiveStatus(status: JobStatus): boolean {
    return status === 'interview' || status === 'offer';
  }

  /**
   * Check if status is negative (rejected)
   */
  isNegativeStatus(status: JobStatus): boolean {
    return status === 'rejected';
  }

  /**
   * Check if status is neutral (applied)
   */
  isNeutralStatus(status: JobStatus): boolean {
    return status === 'applied';
  }

}
