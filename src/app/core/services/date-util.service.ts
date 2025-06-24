// src/app/core/services/date-util.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateUtilService {

  // ============= FIRESTORE DATE CONVERSION =============

  /**
   * Convert Firestore timestamp or any date format to JavaScript Date
   * Handles Firestore timestamps, Date objects, strings, and numbers
   */
  parseDate(date: any): Date {
    if (!date) {
      return new Date(); // Return current date for null/undefined
    }

    try {
      // Firestore Timestamp with toDate() method
      if (date && typeof date.toDate === 'function') {
        return date.toDate();
      }

      // Already a Date object
      if (date instanceof Date) {
        return date;
      }

      // Firestore Timestamp-like object with seconds
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000);
      }

      // String or number timestamp
      if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }

      // Fallback: try to convert whatever it is
      const fallback = new Date(date);
      if (!isNaN(fallback.getTime())) {
        return fallback;
      }

      // If all else fails, return current date
      console.warn('DateUtilService: Could not parse date:', date, 'Using current date');
      return new Date();

    } catch (error) {
      console.error('DateUtilService: Error parsing date:', error, 'Original value:', date);
      return new Date();
    }
  }

  // ============= DATE FORMATTING =============

  /**
   * Format date for display in tables (short format)
   * Returns: "Jan 15, 2024"
   */
  formatDateShort(date: any): string {
    if (!date) return 'Never';

    try {
      const jsDate = this.parseDate(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('DateUtilService: Error formatting date short:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Format date for display with time (medium format)
   * Returns: "Jan 15, 2024, 2:30 PM"
   */
  formatDateMedium(date: any): string {
    if (!date) return 'Never';

    try {
      const jsDate = this.parseDate(date);
      return jsDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    } catch (error) {
      console.error('DateUtilService: Error formatting date medium:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Format date for display with full details
   * Returns: "Monday, January 15, 2024 at 2:30:45 PM"
   */
  formatDateLong(date: any): string {
    if (!date) return 'Never';

    try {
      const jsDate = this.parseDate(date);
      return jsDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      });
    } catch (error) {
      console.error('DateUtilService: Error formatting date long:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Format date for form inputs (ISO format)
   * Returns: "2024-01-15"
   */
  formatDateForInput(date: any): string {
    if (!date) return '';

    try {
      const jsDate = this.parseDate(date);
      return jsDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('DateUtilService: Error formatting date for input:', error);
      return '';
    }
  }

  // ============= RELATIVE TIME =============

  /**
   * Get relative time description
   * Returns: "2 hours ago", "3 days ago", "1 week ago"
   */
  getRelativeTime(date: any): string {
    if (!date) return 'Never';

    try {
      const jsDate = this.parseDate(date);
      const now = new Date();

      // Check if it's the same day (regardless of time)
      if (this.isToday(jsDate)) {
        return 'Today';
      }

      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (jsDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }

      // For other dates, calculate differences
      const diffMs = now.getTime() - jsDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);

      if (diffMs < 0) {
        return 'In the future';
      } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      } else if (diffWeeks < 4) {
        return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
      } else {
        const diffYears = Math.floor(diffMonths / 12);
        return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
      }
    } catch (error) {
      console.error('DateUtilService: Error calculating relative time:', error);
      return 'Unknown';
    }
  }

  // ============= DATE CALCULATIONS =============

  /**
   * Check if date is within last N days
   */
  isWithinLastDays(date: any, days: number): boolean {
    if (!date || days < 0) return false;

    try {
      const jsDate = this.parseDate(date);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return jsDate >= daysAgo && jsDate <= now;
    } catch (error) {
      console.error('DateUtilService: Error checking date range:', error);
      return false;
    }
  }

  /**
   * Check if date is today
   */
  isToday(date: any): boolean {
    if (!date) return false;

    try {
      const jsDate = this.parseDate(date);
      const today = new Date();
      return jsDate.toDateString() === today.toDateString();
    } catch (error) {
      console.error('DateUtilService: Error checking if today:', error);
      return false;
    }
  }

  /**
   * Get start of week (Sunday) for given date
   */
  getStartOfWeek(date: any): Date {
    const jsDate = this.parseDate(date);
    const startOfWeek = new Date(jsDate);
    startOfWeek.setDate(jsDate.getDate() - jsDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }
}
