import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobApplication } from './job-application.service';
import { AdminService } from './admin.service';
import {
  ApplicationDetailsModalComponent,
  ApplicationDetailsModalData
} from '../shared/application-details-modal/application-details-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ApplicationDetailsService {

  constructor(
    private dialog: MatDialog,
    private adminService: AdminService
  ) {
    console.log('🔧 ApplicationDetailsService initialized');
  }

  /**
   * Open application details modal in user context
   * @param application - The job application to display
   */
  openDetailsModal(application: JobApplication): Observable<boolean> {
    console.log('📋 Opening user details modal for application:', application.id);

    const dialogRef: MatDialogRef<ApplicationDetailsModalComponent, boolean | undefined> = this.dialog.open(
      ApplicationDetailsModalComponent,
      {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        autoFocus: false,
        restoreFocus: true,
        disableClose: false,
        panelClass: ['details-modal-panel'],
        data: {
          application,
          context: 'user'
        } as ApplicationDetailsModalData
      }
    );

    return dialogRef.afterClosed().pipe(
      map(result => result ?? false)
    );
  }

  /**
   * Open application details modal in admin context with user information
   * @param application - The job application to display
   * @param userEmail - Optional user email (will be looked up if not provided)
   */
  async openAdminDetailsModal(
    application: JobApplication,
    userEmail?: string
  ): Promise<Observable<boolean>> {
    console.log('📋 Opening admin details modal for application:', application.id);

    let resolvedUserEmail: string | undefined = userEmail;

    // If user email is not provided, look it up
    if (!resolvedUserEmail && application.userId) {
      try {
        console.log('👤 Looking up user email for admin context...');
        const lookupResult = await this.adminService.getUserEmailById(application.userId);
        resolvedUserEmail = lookupResult ?? undefined;
        console.log('✅ Found user email:', resolvedUserEmail);
      } catch (error) {
        console.error('❌ Error looking up user email:', error);
        resolvedUserEmail = 'Unknown User';
      }
    }

    const dialogRef: MatDialogRef<ApplicationDetailsModalComponent, boolean | undefined> = this.dialog.open(
      ApplicationDetailsModalComponent,
      {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        autoFocus: false,
        restoreFocus: true,
        disableClose: false,
        panelClass: ['details-modal-panel', 'admin-modal'],
        data: {
          application,
          context: 'admin',
          userEmail: resolvedUserEmail
        } as ApplicationDetailsModalData
      }
    );

    return dialogRef.afterClosed().pipe(
      map(result => result ?? false)
    );
  }

  /**
   * Generic method that automatically detects context
   * @param application - The job application to display
   * @param isAdminContext - Whether to show in admin context
   * @param userEmail - User email for admin context
   */
  async openModal(
    application: JobApplication,
    isAdminContext: boolean = false,
    userEmail?: string
  ): Promise<Observable<boolean>> {
    if (isAdminContext) {
      return await this.openAdminDetailsModal(application, userEmail);
    } else {
      return this.openDetailsModal(application);
    }
  }

  /**
   * Check if any details modal is currently open
   */
  isModalOpen(): boolean {
    return this.dialog.openDialogs.some(dialog =>
      dialog.componentInstance instanceof ApplicationDetailsModalComponent
    );
  }

  /**
   * Close all open details modals
   */
  closeAllModals(): void {
    this.dialog.openDialogs.forEach(dialog => {
      if (dialog.componentInstance instanceof ApplicationDetailsModalComponent) {
        dialog.close(false);
      }
    });
  }

  /**
   * Get count of open details modals
   */
  getOpenModalCount(): number {
    return this.dialog.openDialogs.filter(dialog =>
      dialog.componentInstance instanceof ApplicationDetailsModalComponent
    ).length;
  }
}
