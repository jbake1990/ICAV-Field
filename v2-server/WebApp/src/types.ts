export interface TimeEntry {
  id: string;
  userId: string;
  technicianName: string;
  customerName: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  lunchStartTime?: Date;
  lunchEndTime?: Date;
  driveStartTime?: Date;
  driveEndTime?: Date;
  isActive: boolean;
  isOnLunch: boolean;
  isDriving: boolean;
  duration?: number;
  formattedDuration?: string;
  lunchDuration?: number;
  formattedLunchDuration?: string;
  driveDuration?: number;
  formattedDriveDuration?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: 'tech' | 'admin';
  isActive?: boolean;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface TimeEntryFilters {
  technicianName?: string;
  customerName?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'all' | 'active' | 'completed';
}

export interface DashboardStats {
  totalEntries: number;
  activeEntries: number;
  totalHours: number;
  averageHoursPerDay: number;
  techniciansWorking: number;
}

// New types for reporting system
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'technician' | 'customer' | 'summary';

export interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  technicianName?: string;
  customerName?: string;
  includeDriveTime?: boolean;
  includeLunchTime?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'technician' | 'customer';
}

export interface ReportData {
  type: ReportType;
  filters: ReportFilters;
  generatedAt: Date;
  summary: {
    totalEntries: number;
    totalHours: number;
    totalDriveHours: number;
    totalLunchHours: number;
    averageHoursPerDay: number;
    techniciansCount: number;
    customersCount: number;
  };
  entries: TimeEntry[];
  groupedData?: {
    [key: string]: {
      entries: TimeEntry[];
      totalHours: number;
      totalDriveHours: number;
      totalLunchHours: number;
      entryCount: number;
    };
  };
}

export interface TechnicianReport {
  technicianName: string;
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
  entryCount: number;
  customers: string[];
  averageHoursPerDay: number;
  entries: TimeEntry[];
}

export interface CustomerReport {
  customerName: string;
  totalHours: number;
  totalDriveHours: number;
  totalLunchHours: number;
  entryCount: number;
  technicians: string[];
  averageHoursPerDay: number;
  entries: TimeEntry[];
}

// Job assignment system types
export interface Job {
  id: string;
  title: string;
  customerName: string;
  description?: string;
  location?: string;
  estimatedHours: number;
  status: JobStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID who created the job
}

export interface JobAssignment {
  id: string;
  jobId: string;
  userId: string;
  technicianName: string;
  assignedDate: Date;
  assignedHours: number;
  actualHours?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  jobId: string;
  job: Job;
  assignment: JobAssignment;
  date: Date;
  technicianId: string;
  technicianName: string;
}

export interface CalendarFilters {
  week?: Date;
  technician?: string;
  status?: JobStatus[];
}

// Job notes and AI summary types
export interface JobNotes {
  id: string;
  timeEntryId: string;
  userId: string;
  jobId?: string;
  originalText: string;
  aiSummary?: string;
  customerName: string;
  workDescription?: string;
  followUpSteps?: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
} 