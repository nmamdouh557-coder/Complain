import React, { useState, useEffect } from 'react';
import { 
  Search as SearchIcon, 
  Eye,
  ClipboardList,
  Phone,
  Hash,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn, formatKuwaitDate } from '@/lib/utils';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';

export function Search() {
  const { profile } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Smart Search for Phone
  useEffect(() => {
    const searchPhone = async () => {
      if (phone && phone.length >= 8) {
        setLoading(true);
        try {
          const data = await api.searchComplaints({ phone, userId: profile?.id });
          setResults(data);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setLoading(false);
        }
      } else if (!orderId) {
        setResults([]);
      }
    };

    const timer = setTimeout(searchPhone, 500);
    return () => clearTimeout(timer);
  }, [phone]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.searchComplaints({ orderId, phone, userId: profile?.id });
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailsOpen(true);
  };

  const refreshResults = async () => {
    if (!orderId && !phone) return;
    try {
      const data = await api.searchComplaints({ orderId, phone, userId: profile?.id });
      setResults(data);
      if (selectedComplaint) {
        const updated = data.find(c => c.id === selectedComplaint.id);
        if (updated) setSelectedComplaint(updated);
      }
    } catch (error) {
      console.error("Refresh failed", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Search Complaints</h1>
          <Eye className="h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Search for complaints by Order ID or Customer Phone</p>
      </div>

      <Card className="max-w-4xl border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 px-6 transition-colors">
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search Criteria</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8 transition-colors">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">Order ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                <Input 
                  id="orderId" 
                  placeholder="Order ID" 
                  className="pl-10 h-11 bg-blue-50/30 dark:bg-slate-950 border-blue-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">Customer Phone</Label>
              <div className="flex gap-3">
                <div className="relative flex-grow">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <Input 
                    id="phone" 
                    placeholder="Customer Phone" 
                    className="pl-10 h-11 bg-blue-50/30 dark:bg-slate-950 border-blue-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:text-white"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="h-11 px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-100 dark:shadow-none transition-all gap-2"
                  disabled={loading}
                >
                  {loading ? <Clock className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                  <span className="text-[11px] font-bold uppercase tracking-wider">Search</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest transition-colors">Search Results ({results.length})</h2>
          {results.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setResults([])} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[10px] font-bold uppercase transition-colors">
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((complaint) => (
              <div key={complaint.id} className="group">
                <Card 
                  className="border-none shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-950 overflow-hidden cursor-pointer"
                  onClick={() => openDetails(complaint)}
                >
                  <div className={cn(
                    "h-1.5 w-full transition-colors",
                    (complaint.status === 'Open' || complaint.status === 'Closed') ? "bg-orange-500" : "bg-emerald-500"
                  )} />
                  <CardContent className="p-5 space-y-4 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">#{complaint.complaintNumber}</p>
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{complaint.customerName}</h3>
                      </div>
                      <div className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors",
                        (complaint.status === 'Open' || complaint.status === 'Closed') 
                          ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50" 
                          : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                      )}>
                        {complaint.status}
                      </div>
                    </div>

                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50 dark:border-slate-800 transition-colors">
                        <div className="space-y-0.5 transition-colors">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Brand</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">{complaint.brand}</p>
                        </div>
                        <div className="space-y-0.5 transition-colors">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Branch</p>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">{complaint.branch}</p>
                        </div>
                      </div>

                      {complaint.complaintComment && (
                        <div className="space-y-1 p-2 bg-rose-50/50 dark:bg-rose-950/20 rounded border border-rose-100/50 dark:border-rose-900/50 transition-colors">
                          <p className="text-[9px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider transition-colors">Complaint Comment</p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 italic line-clamp-2 transition-colors">
                            {complaint.complaintComment}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 transition-colors">
                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 transition-colors">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium">{formatKuwaitDate(complaint.createdAt)}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 gap-1 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(complaint);
                          }}
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center h-64 text-slate-300 dark:text-slate-700 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors"
            >
              <ClipboardList className="h-16 w-16 mb-4 opacity-10" />
              <p className="text-sm font-medium dark:text-slate-400">Enter search criteria to view results</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Search by Order ID or Phone Number</p>
            </div>
          )}
        </div>

      <ComplaintDetailsDialog 
        complaint={selectedComplaint}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onUpdate={refreshResults}
        isValidationPage={true}
      />
    </div>
  );
}
