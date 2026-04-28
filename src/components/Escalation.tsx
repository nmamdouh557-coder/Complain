import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  FileText, 
  ArrowRight,
  Bell,
  Clock,
  AlertCircle,
  Edit2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '@/lib/utils';
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
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ComplaintsTable } from './ComplaintsTable';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { EditComplaintDialog } from './EditComplaintDialog';
import { ComplaintTimelineDialog } from './ComplaintTimelineDialog';

import { useConfigs } from '@/hooks/useConfigs';

export function Escalation({ setActiveTab }: { setActiveTab?: (id: string) => void }) {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(profile?.role === 'restaurant_user' ? profile.brand || "" : "all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const { brands } = useConfigs();

  const canEdit = profile?.role === 'complaints_team' || profile?.role === 'manager' || profile?.role === 'restaurant_user';

  const fetchComplaints = async () => {
    try {
      const data = await api.getComplaints(undefined, profile?.id);
      // Filter for escalated complaints that are NOT yet processed
      setComplaints(data.filter(c => {
        if (profile?.role === 'quality') return true;
        return !c.isProcessed && (c.status === 'Escalated' || c.status === 'Open');
      }));
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand]);

  const handleView = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailsOpen(true);
  };

  const handleEdit = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsEditOpen(true);
  };

  const filteredComplaints = complaints.filter(c => 
    ((c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (c.complaintNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (c.customerPhone?.includes(searchTerm) ?? false)) &&
    (selectedBrand === "all" || c.brand === selectedBrand)
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">Escalation</h1>
            <Bell className="h-4 w-4 md:h-5 md:w-5 text-blue-500 dark:text-blue-400" />
            <Badge className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 font-bold text-[10px] px-2 py-0.5 transition-colors">
              {complaints.length} Complaints
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm transition-colors">View and manage open complaints that need attention</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 bg-blue-50/30 dark:bg-slate-900/50 border-blue-100 dark:border-blue-900 text-slate-600 dark:text-slate-300 font-medium transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="All Brands" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              {profile?.role === 'restaurant_user' ? (
                <SelectItem value={profile.brand || ""}>{profile.brand}</SelectItem>
              ) : (
                <>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </>
              )}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Search by phone..." 
              className="pl-10 bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-800 h-11 font-medium dark:text-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg transition-colors">
                <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white transition-colors">Escalated Complaints</h2>
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
            emptyMessage="No escalated complaints found"
            showClosedBy={true}
            showCreatedBy={true}
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
        setActiveTab={setActiveTab}
      />

      <EditComplaintDialog 
        complaint={selectedComplaint}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdate={fetchComplaints}
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

