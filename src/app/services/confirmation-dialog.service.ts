import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../shared/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Open a confirmation dialog
   */
  confirm(data: ConfirmationDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      data,
      disableClose: false,
      panelClass: 'confirmation-dialog-panel'
    });

    return dialogRef.afterClosed();
  }

  /**
   * Quick delete confirmation
   */
  confirmDelete(itemName: string, itemType: string = 'item'): Observable<boolean> {
    return this.confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'delete'
    });
  }

  /**
   * Quick warning confirmation
   */
  confirmWarning(title: string, message: string, confirmText: string = 'Continue'): Observable<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type: 'warning',
      icon: 'warning'
    });
  }

  /**
   * Quick info confirmation
   */
  confirmInfo(title: string, message: string, confirmText: string = 'OK'): Observable<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type: 'info',
      icon: 'info'
    });
  }

  /**
   * Confirm application deletion specifically
   */
  confirmApplicationDelete(jobTitle: string, company: string): Observable<boolean> {
    return this.confirm({
      title: 'Delete Job Application',
      message: `Are you sure you want to delete the application for:\n\n<strong>${jobTitle}</strong>\nat <strong>${company}</strong>?\n\nThis action cannot be undone and will permanently remove all application data.`,
      confirmText: 'Delete Application',
      cancelText: 'Keep Application',
      type: 'danger',
      icon: 'delete_forever'
    });
  }

  /**
   * Confirm unsaved changes
   */
  confirmUnsavedChanges(): Observable<boolean> {
    return this.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes that will be lost.\n\nDo you want to leave without saving?',
      confirmText: 'Leave Without Saving',
      cancelText: 'Stay on Page',
      type: 'warning',
      icon: 'warning'
    });
  }

  /**
   * Confirm bulk operations
   */
  confirmBulkDelete(count: number): Observable<boolean> {
    return this.confirm({
      title: 'Delete Multiple Applications',
      message: `Are you sure you want to delete ${count} job applications?\n\nThis action cannot be undone.`,
      confirmText: `Delete ${count} Applications`,
      cancelText: 'Cancel',
      type: 'danger',
      icon: 'delete_sweep'
    });
  }

  /**
   * Confirm account actions
   */
  confirmAccountAction(action: string, description: string): Observable<boolean> {
    return this.confirm({
      title: `${action} Account`,
      message: `${description}\n\nThis action may affect your account access.`,
      confirmText: action,
      cancelText: 'Cancel',
      type: 'warning',
      icon: 'account_circle'
    });
  }
}
