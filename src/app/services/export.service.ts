import { Injectable } from '@angular/core';
import { JobApplication } from './job-application.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  // Export as CSV
  exportAsCSV(applications: JobApplication[], filename: string = 'job-applications') {
    if (!applications || applications.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Job Title',
      'Company',
      'Date Applied',
      'Location',
      'Status',
      'Salary',
      'Job URL',
      'Notes'
    ];

    const csvData = applications.map(app => [
      this.escapeCsvField(app.jobTitle),
      this.escapeCsvField(app.company),
      this.formatDateForExport(app.dateApplied),
      this.escapeCsvField(app.location || ''),
      this.escapeCsvField(app.status),
      app.salary ? app.salary.toString() : '',
      this.escapeCsvField(app.jobUrl || ''),
      this.escapeCsvField(app.notes || '')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  // Export as JSON
  exportAsJSON(applications: JobApplication[], filename: string = 'job-applications') {
    if (!applications || applications.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = applications.map(app => ({
      jobTitle: app.jobTitle,
      company: app.company,
      dateApplied: this.formatDateForExport(app.dateApplied),
      location: app.location || '',
      status: app.status,
      salary: app.salary || null,
      jobUrl: app.jobUrl || '',
      notes: app.notes || '',
      id: app.id
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  // Helper method to escape CSV fields
  private escapeCsvField(field: string): string {
    if (!field) return '';

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  // Helper method to format dates for export
  private formatDateForExport(date: any): string {
    if (!date) return '';

    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate(); // Firestore timestamp
    } else {
      dateObj = new Date(date);
    }

    return dateObj.toLocaleDateString();
  }

  // Helper method to trigger file download
  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }
}
