export type UserRole = 'employee' | 'complaints_team' | 'manager' | 'admin' | 'restaurant_user' | 'supervisor' | 'quality' | 'team_leader';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  brand?: string;
  brands?: string[]; // Multiple brands for Quality role
  branch?: string;
  createdAt?: string;
}

export interface Complaint {
  id: number;
  complaintNumber: string;
  customerPhone: string;
  customerName: string;
  brand: string;
  branch: string;
  platform: string;
  orderId?: string | null;
  orderDate?: string | null;
  complaintSource: string;
  typeOfComplaint?: string | null;
  title: string;
  caseType: string;
  item?: string | null;
  product?: string | null;
  response?: string | null;
  notes?: string | null;
  comment?: string | null;
  adminNotes?: string | null;
  adminNotesBy?: string | null;
  adminNotesByUsername?: string | null;
  amountSpent?: string | null;
  responsibleParty?: string | null;
  actionTaken?: string | null;
  complaintComment?: string | null;
  status: string;
  priority: string;
  isEscalated: boolean;
  isProcessed: boolean;
  validationStatus: 'Valid' | 'Invalid' | null;
  dateTime: string;
  images: string[];
  createdBy?: string | null;
  creatorUsername?: string | null;
  updatedBy?: string | null;
  updatedByUsername?: string | null;
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  escalationTimestamp?: string | null;
  validationTimestamp?: string | null;
  flagNoteTimestamp?: string | null;
  followUpTimestamp?: string | null;
  // Branch fields
  branchComment?: string | null;
  branchAttachments?: string[];
  branchResponseAt?: string | null;
  // Follow-up fields
  followUpSatisfaction?: string | null;
  followUpAgentResolution?: string | null;
  followUpHelpProvided?: string | null;
  followUpServiceSuggestions?: string | null;
  followUpOverallRating?: string | null;
  closedByUsername?: string | null;
  closedAt?: string | null;
  assignedToUid?: string | null;
  assignedToUsername?: string | null;
  opxResponsibleParty?: string | null;
  opxComment?: string | null;
}

export interface ManagerRequest {
  id: number;
  customerName: string;
  customerPhone: string;
  orderId?: string | null;
  brand: string;
  branch: string;
  reason: string;
  requestType?: string | null;
  item?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy?: string | null;
  creatorUsername?: string | null;
  approvedBy?: string | null;
  approverUsername?: string | null;
  approverComment?: string | null;
  createdAt: string;
  approvedAt?: string | null;
}

export interface Configuration {
  id: number;
  key: string;
  value: string[];
}

export interface Suggestion {
  id: string;
  customerName: string;
  customerPhone?: string;
  brand: string;
  title: string;
  description: string;
  date: string;
  createdBy: string;
  creatorUsername: string;
  createdAt: string;
  updatedAt: string;
}

export type CateringStatus = 'Pending' | 'Done' | 'Cancelled';

export interface CateringRequest {
  id: number;
  brand: string;
  customerName: string;
  customerPhone: string;
  date: string;
  servingTime: string;
  address: string;
  location: string;
  package: string;
  items: string;
  additional?: string;
  notes?: string;
  deliveryCharge: number;
  paymentMethod: string;
  totalAmount: number;
  status: CateringStatus;
  createdBy: string;
  creatorUsername?: string;
  confirmedBy?: string;
  confirmedByName?: string;
  processMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CateringAvailability {
  id: number;
  type: 'Busy';
  busyType: 'Full Day' | 'Specific Hours' | 'Full Month';
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  brand?: string;
  reason?: string;
  createdBy: string;
}

export interface CateringLog {
  id: number;
  requestId: number;
  action: string;
  details: string;
  userId: string;
  username: string;
  timestamp: string;
}
