import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Clock,
  CheckCircle2,
  Copy,
  Download,
  MoreVertical,
  User,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { cn, formatKuwaitDate } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { ComplaintsTable } from './ComplaintsTable';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { EditComplaintDialog } from './EditComplaintDialog';
import { ComplaintTimelineDialog } from './ComplaintTimelineDialog';
import { useAuth } from '@/contexts/AuthContext';

export function FollowUp() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'Validated' | 'Completed'>('Validated');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const bulkInputRef = React.useRef<HTMLInputElement>(null);
  
  // Performance Tracker State
  const [performanceCloser, setPerformanceCloser] = useState("");
  const [performanceDate, setPerformanceDate] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchComplaints = async () => {
    try {
      const data = await api.getComplaints(undefined, profile?.id);
      setComplaints(data);
    } catch (error) {
      console.error("Failed to fetch complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchComplaints();
    }
  }, [profile?.id]);

  // Derive unique closers from data
  const uniqueClosers = Array.from(new Set(complaints.map(c => c.closedByUsername).filter(Boolean))).sort();

  // Performance Calculation
  const performanceResult = (() => {
    if (!performanceCloser || !performanceDate) return null;

    const count = complaints.filter(c => {
      if (c.closedByUsername !== performanceCloser) return false;
      if (!c.closedAt) return false;
      
      const closedDate = new Date(c.closedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' });
      return closedDate === performanceDate;
    }).length;

    return {
      closer: performanceCloser,
      date: performanceDate,
      count
    };
  })();

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, teamSearch, statusFilter]);

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = (c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                         (c.customerPhone?.includes(searchTerm) ?? false);
    
    const matchesTeam = !teamSearch || (c.closedByUsername?.toLowerCase().includes(teamSearch.toLowerCase()) ?? false);

    // If user is Quality role, only show Critical priority/type and Closed status
    if (profile?.role === 'quality') {
       const isCritical = 
         c.priority?.toLowerCase() === 'critical' || 
         c.typeOfComplaint?.toLowerCase() === 'critical' || 
         c.title?.toLowerCase() === 'critical';
       if (!isCritical || c.status !== 'Closed') return false;
    }

    if (!c.isProcessed || !matchesTeam) return false;

    // For Quality role, we relax the validation requirement if it's already Critical and Closed
    const isValidated = (profile?.role === 'quality') 
      ? true 
      : (!!c.typeOfComplaint && (c.amountSpent !== null && c.amountSpent !== undefined && c.amountSpent !== ""));
    
    const isFollowedUp = !!c.followUpSatisfaction;
    
    if (statusFilter === 'Validated') {
      return matchesSearch && isValidated && !isFollowedUp;
    }
    
    return matchesSearch && isFollowedUp;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleView = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailsOpen(true);
  };

  const handleEdit = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsEditOpen(true);
  };

  const handleExport = () => {
    if (filteredComplaints.length === 0) return;

    const exportData = filteredComplaints.map(c => ({
      'Complaint #': c.complaintNumber,
      'Date & Time': formatKuwaitDate(c.dateTime),
      'Customer Name': c.customerName,
      'Customer Phone': c.customerPhone,
      'Brand': c.brand,
      'Branch': c.branch,
      'Platform': c.platform,
      'Order ID': c.orderId || 'N/A',
      'Source': c.complaintSource,
      'Title': c.title,
      'Case Type': c.caseType,
      'Item': c.item || 'N/A',
      'Status': c.status,
      'Priority': c.priority,
      'Responsible Party': c.responsibleParty || 'N/A',
      'Amount Spent': c.amountSpent || 'N/A',
      'Action Taken': c.actionTaken || 'N/A',
      'Admin Notes': c.adminNotes || 'N/A',
      'Branch Comment': c.branchComment || 'N/A',
      'Restaurant Response Time': formatKuwaitDate(c.branchResponseAt),
      'Escalation Time': formatKuwaitDate(c.escalationTimestamp),
      'Validation Time': formatKuwaitDate(c.validationTimestamp),
      'Flag/Note Time': formatKuwaitDate(c.flagNoteTimestamp),
      'Follow-up Time': formatKuwaitDate(c.followUpTimestamp),
      'Follow-up Satisfaction': c.followUpSatisfaction || 'N/A',
      'Follow-up Rating': c.followUpOverallRating || 'N/A',
      'Closed By': c.closedByUsername || 'N/A',
      'Closed At': formatKuwaitDate(c.closedAt),
      'Created At': formatKuwaitDate(c.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Follow Up Complaints");
    
    // Get current date in Kuwait for filename
    const kuwaitDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' }); // YYYY-MM-DD
    
    XLSX.writeFile(workbook, `Follow_Up_Complaints_${kuwaitDateStr}.xlsx`);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsBulkUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          toast.error("The file is empty");
          setIsBulkUploading(false);
          return;
        }

        // Map data to match Complaint structure and set as Completed based on image columns
        const complaintsToUpload = data.map(row => ({
          customerPhone: String(row['Phone'] || row['Customer Phone'] || ''),
          customerName: String(row['Customer Name'] || row['Customer'] || row['Name'] || ''),
          brand: String(row['Brand'] || ''),
          branch: String(row['Branch'] || ''),
          platform: String(row['Platform'] || ''),
          orderId: String(row['Order ID'] || ''),
          complaintSource: String(row['Source'] || ''),
          title: String(row['Title'] || ''),
          typeOfComplaint: String(row['Title'] || ''), // UI Table displays this as "TITLE"
          caseType: String(row['Case'] || 'Other'),
          item: String(row['Item'] || ''),
          status: 'Closed',
          priority: 'medium',
          isProcessed: true,
          amountSpent: "0",
          followUpSatisfaction: 'Historical Bulk Upload',
          followUpOverallRating: '5',
          closedAt: new Date().toISOString(),
          closedByUsername: (() => {
            const rawVal = row['Closed By'] || row['Admin User'] || profile.username;
            const val = String(rawVal).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(val) || val.length > 30 || val === 'N/A') {
              return profile.username;
            }
            return val;
          })(),
          dateTime: row['Order Date & Time'] || row['Date & Time'] || new Date().toISOString(),
          adminNotes: row['Admin Comment'] || row['Admin Notes'] || '',
          actionTaken: row['Resolution'] || row['Action Taken'] || 'Legacy data migration',
          createdByUid: profile.id,
          creatorUsername: profile.username || (profile as any).name || 'Unknown'
        }));

        const result = await api.bulkCreateComplaints({
          complaints: complaintsToUpload,
          createdByUid: profile.id,
          creatorUsername: profile.username || (profile as any).name || 'Unknown'
        });

        if (result.success > 0) {
          toast.success(`Successfully uploaded ${result.success} complaints to Completed section`);
          fetchComplaints();
        }

        if (result.failed > 0) {
          toast.error(`Failed to upload ${result.failed} rows. Check console for details.`);
          console.error("Bulk upload errors:", result.errors);
        }
      } catch (error) {
        console.error("Bulk upload error:", error);
        toast.error("Failed to process Excel file");
      } finally {
        setIsBulkUploading(false);
        if (bulkInputRef.current) bulkInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">Follow Up</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm transition-colors">Track and follow up on complaints with admin comments or closed status</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg self-start sm:self-auto transition-colors">
            <Button 
              variant={statusFilter === 'Validated' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setStatusFilter('Validated')}
              className={cn(
                "h-8 px-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all",
                statusFilter === 'Validated' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              Validated
            </Button>
            <Button 
              variant={statusFilter === 'Completed' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setStatusFilter('Completed')}
              className={cn(
                "h-8 px-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all",
                statusFilter === 'Completed' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              Completed
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
            <div className="relative flex-1 sm:w-40 lg:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
              <Input 
                placeholder="Phone..." 
                className="pl-10 bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-800 h-11 text-sm w-full font-medium dark:text-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative flex-1 sm:w-48 lg:w-56">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
              <Input 
                placeholder="Team Name..." 
                className="pl-10 bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-800 h-11 text-sm w-full font-medium dark:text-white transition-all"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => bulkInputRef.current?.click()}
            disabled={isBulkUploading}
            className="h-11 px-4 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold text-[10px] md:text-[11px] uppercase tracking-wider gap-2 w-full sm:w-auto transition-colors"
          >
            {isBulkUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            Bulk Upload
          </Button>
          <input 
            type="file"
            ref={bulkInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleBulkUpload}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="h-10 px-4 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold text-[11px] uppercase tracking-wider gap-2 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>
      </div>
      
      {/* Performance Tracker Section - Visible only for Admin and Supervisor */}
      {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 transition-colors mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Closed By</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select 
                    className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none text-slate-900 dark:text-white"
                    value={performanceCloser}
                    onChange={(e) => setPerformanceCloser(e.target.value)}
                  >
                    <option value="">Select Employee...</option>
                    {uniqueClosers.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[160px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Select Date</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="date"
                    className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                    value={performanceDate}
                    onChange={(e) => setPerformanceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {performanceResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0"
              >
                <Card className={cn(
                  "p-4 border shadow-sm transition-all flex flex-col md:flex-row items-center gap-4",
                  performanceResult.count > 0 
                    ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" 
                    : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                )}>
                  <div className="p-2 bg-white dark:bg-slate-950 rounded-lg shadow-sm">
                    <CheckCircle2 className={cn("h-5 w-5", performanceResult.count > 0 ? "text-blue-500" : "text-slate-400")} />
                  </div>
                  <div className="text-center md:text-left">
                    {performanceResult.count > 0 ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Performance Result</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {performanceResult.closer} closed <span className="text-blue-600 dark:text-blue-400 text-base">{performanceResult.count}</span> complaints
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          Date: {new Date(performanceResult.date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Performance Result</p>
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">
                          No complaints closed on this date
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          Employee: {performanceResult.closer}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      )}

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white transition-colors">Follow Up Complaints</h2>
            </div>
            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] transition-colors">
              {filteredComplaints.length} complaints
            </Badge>
          </div>
          <ComplaintsTable 
            complaints={paginatedComplaints}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onTimeline={(c) => {
              setSelectedComplaint(c);
              setIsTimelineOpen(true);
            }}
            emptyMessage="No complaints for follow up"
            showClosedBy={true}
            isFollowUpPage={true}
          />

          {/* Pagination Controls */}
          {!loading && filteredComplaints.length > 0 && (
            <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors">
                Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredComplaints.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredComplaints.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "h-8 w-8 p-0 text-xs font-bold transition-all",
                          currentPage === pageNum 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

      <ComplaintDetailsDialog 
        complaint={selectedComplaint}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onUpdate={fetchComplaints}
      />

      <EditComplaintDialog 
        complaint={selectedComplaint}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdate={fetchComplaints}
        isFollowUpPage={statusFilter === 'Validated'}
      />

      <ComplaintTimelineDialog 
        complaint={selectedComplaint}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />
    </div>
  );
}
