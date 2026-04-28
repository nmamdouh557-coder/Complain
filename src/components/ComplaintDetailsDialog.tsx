import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Flag, 
  Clock, 
  User, 
  Hash, 
  Phone, 
  Store, 
  Smartphone, 
  MapPin, 
  Tag, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  FileVideo,
  Eye,
  Calendar,
  ChevronDown,
  Search,
  History,
  ClipboardList,
  MessageSquare,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatKuwaitDate, getKuwaitISOString, calculateDurationInMinutes } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Complaint } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface FieldViewProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  isSelect?: boolean;
  className?: string;
}

function SimpleField({ label, value, children, className }: { label: string, value?: string | null, children?: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 transition-colors">{label}</p>
      {children ? children : <p className="text-[15px] font-bold text-slate-900 dark:text-white transition-colors">{value || '-'}</p>}
    </div>
  );
}

interface ComplaintDetailsDialogProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  isValidationPage?: boolean;
  setActiveTab?: (id: string) => void;
}

export function ComplaintDetailsDialog({ 
  complaint, 
  isOpen, 
  onClose, 
  onUpdate,
  isValidationPage = false,
  setActiveTab
}: ComplaintDetailsDialogProps) {
  const { profile } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [isFlagged, setIsFlagged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);

  if (!complaint) return null;

  const handleAddNote = async () => {
    if (!newNote.trim() || !profile) return;
    setIsSubmitting(true);
    try {
      const timestamp = formatKuwaitDate(getKuwaitISOString());
      const flagMarker = isFlagged ? "[FLAG]" : "";
      const noteEntry = `\n${flagMarker}${newNote} | By: ${profile.username} | ${timestamp}`;
      const updatedNotes = (complaint.adminNotes || "") + noteEntry;
      
      const isComplaintsTeamOrManager = profile.role === 'complaints_team' || profile.role === 'manager';

      await api.updateComplaint(complaint.id, {
        adminNotes: updatedNotes,
        adminNotesBy: profile.id,
        adminNotesByUsername: profile.username,
        isProcessed: complaint.isProcessed,
        flagNoteTimestamp: getKuwaitISOString()
      });
      
      toast.success("Note added successfully");
      setNewNote("");
      setIsFlagged(false);
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const timestamp = formatKuwaitDate(getKuwaitISOString());
      const isComplaintsTeamOrManager = profile.role === 'complaints_team' || profile.role === 'manager';
      
      const updates: any = {
        isEscalated: true,
        status: 'Escalated',
        adminNotes: (complaint.adminNotes || "") + 
          `\n[System: Escalated by ${profile.username} at ${timestamp}]`,
        isProcessed: false,
        escalationTimestamp: getKuwaitISOString()
      };
      
      await api.updateComplaint(complaint.id, updates);
      toast.success("Complaint escalated successfully");
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to escalate complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseComplaint = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const timestamp = formatKuwaitDate(getKuwaitISOString());
      const isComplaintsTeamOrManager = profile.role === 'complaints_team' || profile.role === 'manager';

      await api.updateComplaint(complaint.id, {
        status: 'Closed',
        adminNotes: (complaint.adminNotes || "") + 
          `\n[System: Closed by ${profile.username} at ${timestamp}]`,
        isProcessed: true,
        validationTimestamp: getKuwaitISOString(),
        closedByUsername: (complaint.closedByUsername && complaint.closedByUsername !== 'N/A') 
          ? complaint.closedByUsername 
          : profile.username,
        closedAt: complaint.closedAt || getKuwaitISOString()
      });
      toast.success("Complaint closed successfully");
      onUpdate?.();
      
      if (setActiveTab) {
        setActiveTab('followup');
      }
    } catch (error) {
      toast.error("Failed to close complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidation = async (status: 'Valid' | 'Invalid') => {
    if (!profile) return;
    setIsSubmitting(true);
    try {
      const timestamp = formatKuwaitDate(getKuwaitISOString());
      await api.updateComplaint(complaint.id, {
        isProcessed: true,
        validationStatus: status,
        validationTimestamp: getKuwaitISOString(),
        adminNotes: (complaint.adminNotes || "") + 
          `\n[System: Validated as ${status} by ${profile.username} at ${timestamp}]`
      });
      toast.success(`Complaint validated as ${status}`);
      onUpdate?.();
      onClose();
    } catch (error) {
      toast.error("Failed to validate complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-white dark:bg-slate-950 no-scrollbar transition-colors">
          <DialogHeader className="p-6 border-b border-slate-50 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-950/80 backdrop-blur-md z-10 flex flex-row items-center justify-between space-y-0 transition-colors">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Complaint Details #{complaint.complaintNumber}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </Button>
          </DialogHeader>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <SimpleField label="Customer Name" value={complaint.customerName} />
              <SimpleField label="Customer Phone" value={complaint.customerPhone} />
              
              <SimpleField label="Brand" value={complaint.brand} />
              <SimpleField label="Branch" value={complaint.branch} />
              
              <SimpleField label="Platform" value={complaint.platform} />
              <SimpleField label="Order ID" value={complaint.orderId} />

              <SimpleField label="Order Date" value={formatKuwaitDate(complaint.dateTime)} className="col-span-2" />
              
              <SimpleField label="Complaint Source" value={complaint.complaintSource} />
              <SimpleField label="Title" value={complaint.title} />
              
              <SimpleField label="Case" value={complaint.caseType} />
              <SimpleField label="Item" value={complaint.item} />
              
              <SimpleField label="Response" value={complaint.response} />
              <SimpleField label="Status">
                <Badge className={cn(
                  "text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md border-none",
                  complaint.status === 'Closed' 
                    ? "bg-blue-600 text-white" 
                    : complaint.status === 'Escalated'
                      ? "bg-rose-500 text-white"
                      : "bg-orange-500 text-white"
                )}>
                  {complaint.status}
                </Badge>
              </SimpleField>

              <SimpleField label="Registration Date" value={formatKuwaitDate(complaint.createdAt)} />
              <SimpleField label="Assigned To" value={complaint.assignedToUsername === 'Quality' ? 'OPX' : (complaint.assignedToUsername || '-')} />
              
              <SimpleField label="Created By" value={complaint.creatorUsername === 'Quality' ? 'OPX' : (complaint.creatorUsername || '-')} />
              <SimpleField label="Closed By" value={complaint.closedByUsername === 'Quality' ? 'OPX' : (complaint.closedByUsername || '-')} />
              <SimpleField label="Type" value={isValidationPage && complaint.status === 'Closed' ? 'Pending' : complaint.typeOfComplaint} />
              
              <SimpleField label="Amount Spent" value={complaint.amountSpent || '0.00'} />
              <SimpleField label="Responsible Party" value={complaint.responsibleParty || '-'} />
              
              <SimpleField label="Action Taken" value={complaint.actionTaken || '-'} className="col-span-2" />
              
              {complaint.opxResponsibleParty && (
                <div className="col-span-2 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-[11px] font-bold uppercase tracking-wider">OPX Information</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SimpleField label="Responsible Party (OPX)" value={complaint.opxResponsibleParty} />
                    <SimpleField label="OPX Comment" value={complaint.opxComment} className="col-span-2" />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
              <p className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 transition-colors">Activity Timestamps</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <SimpleField label="Registration" value={formatKuwaitDate(complaint.createdAt)} />
                <SimpleField label="Restaurant Response" value={formatKuwaitDate(complaint.branchResponseAt)} />
                <SimpleField label="Escalation / Resolution" value={formatKuwaitDate(complaint.escalationTimestamp)} />
                <SimpleField label="Closed At" value={formatKuwaitDate(complaint.closedAt)} />
                <SimpleField label="Flag / Note" value={formatKuwaitDate(complaint.flagNoteTimestamp)} />
                <SimpleField label="Resolution Duration">
                  {complaint.status === 'Closed' && complaint.closedAt ? (
                    <div className="flex items-center gap-2">
                       <p className="text-[15px] font-bold text-blue-600">
                         {calculateDurationInMinutes(complaint.createdAt, complaint.closedAt)} min
                       </p>
                       <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50/50">
                         {Math.floor(calculateDurationInMinutes(complaint.createdAt, complaint.closedAt)! / 60)}h {calculateDurationInMinutes(complaint.createdAt, complaint.closedAt)! % 60}m
                       </Badge>
                    </div>
                  ) : (
                    <p className="text-[15px] font-bold text-slate-300">-</p>
                  )}
                </SimpleField>
              </div>
            </div>

            {(complaint.followUpSatisfaction || complaint.followUpOverallRating) && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Follow-up Survey Results</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SimpleField label="Customer Satisfaction" value={complaint.followUpSatisfaction} />
                  <SimpleField label="Overall rating" value={complaint.followUpOverallRating ? `${complaint.followUpOverallRating} / 5` : '-'} />
                  <SimpleField label="Expected Resolution" value={complaint.followUpAgentResolution} className="col-span-1 md:col-span-2" />
                  <SimpleField label="Help Provided" value={complaint.followUpHelpProvided} className="col-span-1 md:col-span-2" />
                  <SimpleField label="Service Suggestions" value={complaint.followUpServiceSuggestions} className="col-span-1 md:col-span-2" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 transition-colors">Notes</p>
              <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                {complaint.notes || 'No notes provided.'}
              </p>
            </div>

            {complaint.adminNotes && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 transition-colors">Admin Notes / Flags</p>
                <div className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/30 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 whitespace-pre-wrap transition-colors">
                  {complaint.adminNotes}
                </div>
              </div>
            )}

            {profile?.role === 'employee' && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Flag className="h-4 w-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Add Flag / Note</h3>
                </div>
                <div className="space-y-3">
                  <Textarea 
                    placeholder="Write your flag or note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 transition-all resize-none rounded-xl dark:text-white"
                  />
                  <Button 
                    onClick={handleAddNote}
                    disabled={isSubmitting || !newNote.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider h-10 rounded-xl"
                  >
                    {isSubmitting ? "Saving..." : "Save Flag / Note"}
                  </Button>
                </div>
              </div>
            )}

            {complaint.images && complaint.images.length > 0 && (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 transition-colors">Attached Images</p>
                <div className="flex flex-wrap gap-3">
                  {complaint.images.map((url, index) => (
                    <div 
                      key={index}
                      className="h-20 w-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => setPreviewFile({ url, type: 'image/jpeg', name: `Attachment ${index + 1}` })}
                    >
                      <img src={url} alt={`Attachment ${index}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Branch Feedback Section (Keep it but style it simply) */}
            {(complaint.branchComment || (complaint.branchAttachments && complaint.branchAttachments.length > 0)) && (
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Upload className="h-4 w-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Branch Feedback</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {complaint.branchComment && (
                    <SimpleField label="Branch Comment" value={complaint.branchComment} />
                  )}
                  {complaint.branchAttachments && complaint.branchAttachments.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 transition-colors">Branch Attachments</p>
                      <div className="flex flex-wrap gap-3">
                        {complaint.branchAttachments.map((url, index) => (
                          <div 
                            key={index}
                            className="h-20 w-20 rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-900 bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                            onClick={() => setPreviewFile({ url, type: 'image/jpeg', name: `Branch Attachment ${index + 1}` })}
                          >
                            <img src={url} alt={`Branch Attachment ${index}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Section (Keep functionality but keep it clean) */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                {isValidationPage && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-10 px-6 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-black text-[11px] uppercase tracking-wider gap-2 shadow-sm rounded-xl transition-all"
                      onClick={() => handleValidation('Valid')}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Correct (صحيحة)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-10 px-6 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-black text-[11px] uppercase tracking-wider gap-2 shadow-sm rounded-xl transition-all"
                      onClick={() => handleValidation('Invalid')}
                      disabled={isSubmitting}
                    >
                      <XCircle className="h-4 w-4" />
                      False (كاذبة)
                    </Button>
                  </>
                )}
                {!isValidationPage && profile?.role !== 'restaurant_user' && profile?.role !== 'employee' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-bold text-[11px] uppercase tracking-wider gap-2 transition-colors"
                    onClick={handleEscalate}
                    disabled={isSubmitting}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Escalate
                  </Button>
                )}
                {profile?.role !== 'restaurant_user' && profile?.role !== 'employee' && complaint.status !== 'Closed' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold text-[11px] uppercase tracking-wider gap-2 transition-colors"
                    onClick={handleCloseComplaint}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none"
        >
          <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setPreviewFile(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            
            {previewFile?.type.startsWith('video/') ? (
              <video src={previewFile.url} controls autoPlay className="max-w-full max-h-[80vh]" />
            ) : (
              <img src={previewFile?.url} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const CalendarIcon = ({ className }: { className?: string }) => (
  <Calendar className={className} />
);

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("animate-spin", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
