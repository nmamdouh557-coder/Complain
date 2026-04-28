import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { ComplaintsTable } from './ComplaintsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { EditComplaintDialog } from './EditComplaintDialog';
import { ComplaintTimelineDialog } from './ComplaintTimelineDialog';
import { useAuth } from '@/contexts/AuthContext';

export function Validation({ setActiveTab }: { setActiveTab?: (id: string) => void }) {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchComplaints = async () => {
    try {
      const data = await api.getComplaints(undefined, profile?.id);
      // Only show closed complaints for validation that are NOT yet processed
      setComplaints(data.filter(c => 
        !c.isProcessed && c.status === 'Closed'
      ));
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

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredComplaints = complaints.filter(c => 
    (c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (c.complaintNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (c.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (c.customerPhone?.includes(searchTerm) ?? false)
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
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
      'Closed By': c.closedByUsername || 'N/A',
      'Closed At': formatKuwaitDate(c.closedAt),
      'Created At': formatKuwaitDate(c.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Validation Complaints");
    
    const kuwaitDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' });
    XLSX.writeFile(workbook, `Validation_Complaints_${kuwaitDateStr}.xlsx`);
  };

  const handleView = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailsOpen(true);
  };

  const handleEdit = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">Validation</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm transition-colors">Review and validate resolved complaints</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            className="h-10 px-4 gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-semibold w-full sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Export Excel</span>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 transition-colors">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Search complaints..." 
              className="pl-10 bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all h-11 w-full font-medium dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
            isValidationPage={true}
            emptyMessage="No validated complaints found"
            showClosedBy={true}
            showCreatedBy={true}
          />

          {/* Pagination Controls */}
          {!loading && filteredComplaints.length > 0 && (
            <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 transition-colors">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredComplaints.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredComplaints.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 dark:bg-slate-950 transition-all"
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
                            ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow-sm" 
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
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
                  className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 dark:bg-slate-950 transition-all"
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
        isValidationPage={true}
        setActiveTab={setActiveTab}
      />

      <EditComplaintDialog 
        complaint={selectedComplaint}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdate={fetchComplaints}
        isValidationPage={true}
        setActiveTab={setActiveTab}
      />

      <ComplaintTimelineDialog 
        complaint={selectedComplaint}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />
    </div>
  );
}
