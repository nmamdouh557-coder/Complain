import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { 
  Eye,
  ClipboardList,
  Clock,
  Pencil
} from 'lucide-react';
import { cn, formatKuwaitDate, calculateDurationInMinutes } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Complaint } from '@/types';

interface ComplaintsTableProps {
  complaints: Complaint[];
  loading: boolean;
  onView: (complaint: Complaint) => void;
  onTimeline?: (complaint: Complaint) => void;
  onEdit?: (complaint: Complaint) => void;
  emptyMessage?: string;
  showActions?: boolean;
  isValidationPage?: boolean;
  isFollowUpPage?: boolean;
  showClosedBy?: boolean;
  showCreatedBy?: boolean;
  isAllComplaintsPage?: boolean;
}

export function ComplaintsTable({ 
  complaints, 
  loading, 
  onView, 
  onTimeline,
  onEdit,
  emptyMessage,
  showActions = true,
  isValidationPage = false,
  isFollowUpPage = false,
  showClosedBy = false,
  showCreatedBy = false,
  isAllComplaintsPage = false
}: ComplaintsTableProps) {
  const { t } = useApp();
  const defaultEmptyMessage = t('no_complaints') || "No complaints found";
  const displayEmptyMessage = emptyMessage || defaultEmptyMessage;

  return (
    <div className="overflow-x-auto w-full transition-colors rounded-xl border border-slate-50 dark:border-slate-800">
      <Table className={cn("min-w-[1200px] lg:min-w-full")}>
        <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-950 shadow-sm transition-colors">
          <TableRow className="hover:bg-transparent border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('id')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('customer')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden sm:table-cell">{t('brand')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden lg:table-cell">{t('branch')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden md:table-cell">{t('title')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden xl:table-cell">{t('case_type')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('status')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden md:table-cell">{isFollowUpPage || isAllComplaintsPage ? t('order_data') || 'Order data' : t('date')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden lg:table-cell">{t('created')}</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden xl:table-cell">Resolution Time</TableHead>
            { (showCreatedBy || isFollowUpPage || isAllComplaintsPage) && <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden xl:table-cell">{t('created_by')}</TableHead>}
            { (showClosedBy || isFollowUpPage || isAllComplaintsPage) && <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden md:table-cell">{t('closed_by')}</TableHead>}
            {isAllComplaintsPage && (
              <>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('category_type')}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('amount_spent')}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('action_taken')}</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4">{t('responsible_party')}</TableHead>
              </>
            )}
            {!isFollowUpPage && !isAllComplaintsPage && <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 hidden xl:table-cell">{t('assigned_to') || 'Assigned'}</TableHead>}
            {showActions && <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-3 px-4 text-right">{t('actions')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            [1, 2, 3].map(i => (
              <TableRow key={i} className="dark:border-slate-800">
                <TableCell colSpan={isAllComplaintsPage ? 18 : 14} className="h-16 animate-pulse bg-slate-50/50 dark:bg-slate-800/10" />
              </TableRow>
            ))
          ) : complaints.length === 0 ? (
            <TableRow className="dark:border-slate-800">
              <TableCell colSpan={isAllComplaintsPage ? 18 : 14} className="h-48 text-center text-slate-300 dark:text-slate-700">
                <div className="flex flex-col items-center justify-center">
                  <ClipboardList className="h-12 w-12 mb-2 opacity-10" />
                  <p className="text-sm font-medium">{displayEmptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            complaints.map((complaint) => (
              <TableRow key={complaint.id} className="border-slate-50 dark:border-slate-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                <TableCell className="py-2 px-4 font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
                  #{complaint.complaintNumber?.split('-').pop()}
                </TableCell>
                <TableCell className="py-2 px-4">
                  <div className="flex flex-col max-w-[140px]">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{complaint.customerName}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{complaint.customerPhone}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4 hidden sm:table-cell">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{complaint.brand}</span>
                </TableCell>
                <TableCell className="py-2 px-4 hidden lg:table-cell">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[80px] block">{complaint.branch}</span>
                </TableCell>
                <TableCell className="py-2 px-4 hidden md:table-cell">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[100px] block">{complaint.title === 'Quality' ? 'OPX' : (complaint.title || complaint.typeOfComplaint)}</span>
                </TableCell>
                <TableCell className="py-2 px-4 hidden xl:table-cell">
                  <span className="text-[11px] text-slate-500 dark:text-slate-500 truncate max-w-[80px] block">{complaint.caseType || "N/A"}</span>
                </TableCell>
                <TableCell className="py-2 px-4">
                  <Badge className={cn(
                    "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm shadow-sm",
                    (isValidationPage && complaint.status === 'Closed')
                      ? "bg-orange-600 text-white"
                      : complaint.status === 'Closed' 
                        ? "bg-blue-600 text-white" 
                        : complaint.status === 'Escalated'
                          ? "bg-rose-600 text-white"
                          : "bg-orange-600 text-white"
                  )}>
                    {isValidationPage && complaint.status === 'Closed' ? 'Pending' : complaint.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 px-4 hidden md:table-cell">
                  <div className="flex flex-col text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    <span>{formatKuwaitDate(complaint.dateTime)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4 hidden lg:table-cell">
                  <div className="flex flex-col text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    <span>{formatKuwaitDate(complaint.createdAt)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4 hidden xl:table-cell">
                   {complaint.status === 'Closed' && complaint.closedAt ? (
                     <span className="text-[11px] font-bold text-blue-600">
                       {calculateDurationInMinutes(complaint.createdAt, complaint.closedAt)} min
                     </span>
                   ) : (
                     <span className="text-[11px] text-slate-300">-</span>
                   )}
                </TableCell>
                {(showCreatedBy || isFollowUpPage || isAllComplaintsPage) && (
                  <TableCell className="py-2 px-4 hidden xl:table-cell">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[80px] block">{complaint.creatorUsername === 'Quality' ? 'OPX' : (complaint.creatorUsername || "N/A")}</span>
                  </TableCell>
                )}
                {(showClosedBy || isFollowUpPage || isAllComplaintsPage) && (
                  <TableCell className="py-2 px-4 hidden md:table-cell">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[80px] block">{complaint.closedByUsername === 'Quality' ? 'OPX' : (complaint.closedByUsername || "N/A")}</span>
                  </TableCell>
                )}
                {isAllComplaintsPage && (
                  <>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] text-slate-500 dark:text-slate-500 truncate max-w-[80px] block">{complaint.typeOfComplaint || "N/A"}</span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 font-mono tracking-tighter">{complaint.amountSpent || "0"} KWD</span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] text-slate-500 dark:text-slate-500 truncate max-w-[120px] block" title={complaint.actionTaken || ""}>{complaint.actionTaken || "N/A"}</span>
                    </TableCell>
                    <TableCell className="py-2 px-4">
                      <span className="text-[11px] text-slate-500 dark:text-slate-500 truncate max-w-[100px] block">{complaint.responsibleParty || "N/A"}</span>
                    </TableCell>
                  </>
                )}
                {!isFollowUpPage && !isAllComplaintsPage && (
                  <TableCell className="py-2 px-4 hidden xl:table-cell">
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate max-w-[80px] block">{complaint.assignedToUsername === 'Quality' ? 'OPX' : (complaint.assignedToUsername || "Unassigned")}</span>
                  </TableCell>
                )}
                {showActions && (
                  <TableCell className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => onView(complaint)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onTimeline && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          onClick={() => onTimeline(complaint)}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => onEdit(complaint)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
