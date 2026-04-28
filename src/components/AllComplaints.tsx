import React, { useEffect, useState } from 'react';
import { 
  Search, 
  List,
  Copy,
  Download,
  MoreVertical,
  User,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

import { cn, formatKuwaitDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { ComplaintsTable } from './ComplaintsTable';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { ComplaintTimelineDialog } from './ComplaintTimelineDialog';
import { useAuth } from '@/contexts/AuthContext';

export function AllComplaints() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      (c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (c.customerPhone?.includes(searchTerm) ?? false) ||
      (c.complaintNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    return matchesSearch;
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

  const handleExport = () => {
    if (filteredComplaints.length === 0) return;

    const exportData = filteredComplaints.map(c => ({
      'Complaint #': c.complaintNumber,
      'Date & Time': formatKuwaitDate(c.dateTime),
      'Customer Name': c.customerName,
      'Customer Phone': c.customerPhone,
      'Brand': c.brand,
      'Branch': c.branch,
      'Title': c.title,
      'Case Type': c.caseType,
      'Status': c.status,
      'Type': c.typeOfComplaint || 'N/A',
      'Amount Spent': c.amountSpent || '0',
      'Action Taken': c.actionTaken || 'N/A',
      'Responsible Party': c.responsibleParty || 'N/A',
      'Created At': formatKuwaitDate(c.createdAt),
      'Created By': c.creatorUsername || 'N/A',
      'Closed By': c.closedByUsername || 'N/A',
      'Closed At': formatKuwaitDate(c.closedAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Complaints");
    
    XLSX.writeFile(workbook, `All_Complaints_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">All Complaints</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm transition-colors">Complete overview of all registered complaints in the system</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-80 lg:w-[450px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Search by name, phone or complaint #..." 
              className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 text-sm w-full font-medium dark:text-white transition-all rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="h-11 px-6 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 font-bold text-[10px] uppercase tracking-wider gap-2 transition-colors rounded-xl shadow-sm bg-white dark:bg-slate-950"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 transition-colors">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
              <List className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </div>
            <h2 className="font-bold text-slate-900 dark:text-white transition-colors">All Complaints History</h2>
          </div>
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] transition-colors">
            {filteredComplaints.length} complaints
          </Badge>
        </div>
        <ComplaintsTable 
          complaints={paginatedComplaints}
          loading={loading}
          onView={handleView}
          onTimeline={(c) => {
            setSelectedComplaint(c);
            setIsTimelineOpen(true);
          }}
          emptyMessage="No complaints found in the history"
          showClosedBy={true}
          showCreatedBy={true}
          isAllComplaintsPage={true}
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

      <ComplaintTimelineDialog 
        complaint={selectedComplaint}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />
    </div>
  );
}
