// src/app/shared/application-details-modal/application-details-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobApplication } from '../../services/job-application.service';
import { StatusService } from '../../core/services/status.service';
import { DateUtilService } from '../../core/services/date-util.service';

export interface ApplicationDetailsModalData {
  application: JobApplication;
  context: 'user' | 'admin';
  userEmail?: string; // Only provided for admin context
}

@Component({
  selector: 'app-application-details-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './application-details-modal.component.html',
  styleUrl: './application-details-modal.component.css'
})
export class ApplicationDetailsModalComponent {
  application: JobApplication;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApplicationDetailsModalData,
    private dialogRef: MatDialogRef<ApplicationDetailsModalComponent>,
    public statusService: StatusService,
    public dateUtil: DateUtilService
  ) {
    this.application = data.application;
    console.log('📋 Application Details Modal opened:', {
      context: data.context,
      applicationId: data.application.id,
      userEmail: data.userEmail
    });
  }

  openJobUrl(): void {
    if (this.application.jobUrl) {
      console.log('🔗 Opening job URL:', this.application.jobUrl);
      window.open(this.application.jobUrl, '_blank', 'noopener,noreferrer');
    }
  }

  openResumeUrl(): void {
    if (this.application.resumeUrl) {
      console.log('📄 Opening resume URL:', this.application.resumeUrl);
      window.open(this.application.resumeUrl, '_blank', 'noopener,noreferrer');
    }
  }

  getDisplayUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const path = urlObj.pathname;

      if (path.length > 30) {
        return `${domain}${path.substring(0, 27)}...`;
      }

      return `${domain}${path}`;
    } catch {
      return url.length > 50 ? `${url.substring(0, 47)}...` : url;
    }
  }
}
