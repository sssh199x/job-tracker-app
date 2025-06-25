export interface Resume {
  id?: string;
  userId: string;
  fileName: string;
  displayName: string;        // User-friendly name like "Software Engineer Resume"
  fileUrl: string;           // Firebase Storage download URL
  fileSize: number;          // File size in bytes
  uploadDate: Date;
  isDefault: boolean;        // Default resume for quick selection
  fileType: string;          // MIME type (application/pdf)
  tags?: string[];           // Optional tags like ["frontend", "react", "senior"]
}

// Resume upload data
export interface ResumeUploadData {
  file: File;
  displayName: string;
  tags?: string[];
  isDefault?: boolean;
}

