import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Check, 
  X, 
  AlertCircle, 
  User, 
  Clock, 
  MessageSquare, 
  Search, 
  ListFilter, 
  PlusSquare, 
  Send,
  Phone,
  Hash,
  Store,
  MapPin,
  Tag,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';

import { cn, formatKuwaitDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ManagerRequest } from '@/types';
import { toast } from 'sonner';
import { useConfigs } from '@/hooks/useConfigs';

const requestSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().min(8, "Phone number is required"),
  orderId: z.string().optional(),
  brand: z.string().min(1, "Brand is required"),
  branch: z.string().min(1, "Branch is required"),
  requestType: z.string().min(1, "Request type is required"),
  item: z.string().optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function ManagerRequests() {
  const { profile, isManager, isComplaintsTeam } = useAuth();
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'pending' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { brands, brandsBranches, managerRequestTypes } = useConfigs();
  
  // Action Dialog State
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ManagerRequest | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      requestType: "Manager Contact",
    }
  });

  const selectedBrand = watch("brand");

  const fetchRequests = async () => {
    try {
      const data = await api.getManagerRequests(profile?.id);
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  // Set default tab based on role
  useEffect(() => {
    if (profile?.role === 'employee') {
      setActiveTab('new');
    } else {
      setActiveTab('all');
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'restaurant_user') {
      setValue("brand", profile.brand || "");
      setValue("branch", profile.branch || "");
    }
  }, [profile, setValue]);

  const onSubmitRequest = async (data: RequestFormValues) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      await api.createManagerRequest({
        ...data,
        createdBy: profile.id,
        creatorUsername: profile.username,
        status: 'Pending'
      });
      toast.success("Request submitted successfully");
      reset();
      setActiveTab('pending');
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (request: ManagerRequest, type: 'Approved' | 'Rejected') => {
    setSelectedRequest(request);
    setActionType(type);
    setActionComment('');
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType || !profile) return;
    if (!actionComment.trim()) {
      toast.error("Comment is required");
      return;
    }

    try {
      setIsSubmittingAction(true);
      await api.updateManagerRequest(selectedRequest.id, { 
        status: actionType, 
        approvedBy: profile.id, 
        approverUsername: profile.username,
        approverComment: actionComment
      });
      toast.success(`Request ${actionType.toLowerCase()} successfully`);
      setActionDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error("Failed to process request");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.customerPhone.includes(searchQuery) || 
                         req.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'pending') {
      return matchesSearch && req.status === 'Pending' && (profile?.role !== 'employee' || req.createdBy === profile?.id);
    }
    
    if (profile?.role === 'employee' && activeTab === 'all') {
      return matchesSearch && req.createdBy === profile?.id;
    }

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Requests</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Request manager contact for a customer</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
          <Input 
            placeholder="Search by phone..." 
            className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-10 dark:text-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg w-fit transition-colors">
        {profile?.role === 'employee' && (
          <Button 
            variant={activeTab === 'new' ? 'secondary' : 'ghost'} 
            size="sm" 
            className={cn(
              "h-8 px-4 font-semibold transition-all", 
              activeTab === 'new' 
                ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            onClick={() => setActiveTab('new')}
          >
            New Request
          </Button>
        )}
        <Button 
          variant={activeTab === 'pending' ? 'secondary' : 'ghost'} 
          size="sm" 
          className={cn(
            "h-8 px-4 font-semibold transition-all", 
            activeTab === 'pending' 
              ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          )}
          onClick={() => setActiveTab('pending')}
        >
          {profile?.role === 'employee' ? 'My Pending Requests' : 'Pending Requests'}
        </Button>
        <Button 
          variant={activeTab === 'all' ? 'secondary' : 'ghost'} 
          size="sm" 
          className={cn(
            "h-8 px-4 font-semibold transition-all", 
            activeTab === 'all' 
              ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          )}
          onClick={() => setActiveTab('all')}
        >
          {profile?.role === 'employee' ? 'My Requests' : 'All Requests'}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'new' ? (
          <motion.div
            key="new-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden max-w-2xl transition-colors">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-4 px-8">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <PlusSquare className="h-4 w-4" />
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider">New Request</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <Input 
                          placeholder="Full name" 
                          {...register("customerName")} 
                          className="pl-10 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm dark:text-white" 
                        />
                      </div>
                      {errors.customerName && <p className="text-[10px] text-destructive mt-1">{errors.customerName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <Input 
                          placeholder="Phone number" 
                          {...register("customerPhone")} 
                          className="pl-10 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm dark:text-white" 
                        />
                      </div>
                      {errors.customerPhone && <p className="text-[10px] text-destructive mt-1">{errors.customerPhone.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Order ID (Optional)</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <Input 
                          placeholder="Order ID" 
                          {...register("orderId")} 
                          className="pl-10 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm dark:text-white" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Request Type</Label>
                      <Select onValueChange={(v: string) => setValue("requestType", v)} defaultValue="Manager Contact">
                        <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors">
                          {managerRequestTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.requestType && <p className="text-[10px] text-destructive mt-1">{errors.requestType.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Brand</Label>
                      <Select 
                        onValueChange={(v: string) => setValue("brand", v)} 
                        value={watch("brand")}
                        disabled={profile?.role === 'restaurant_user'}
                      >
                        <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors">
                          {profile?.role === 'restaurant_user' ? (
                            <SelectItem value={profile.brand || ""}>{profile.brand}</SelectItem>
                          ) : (
                            brands.map((b: string) => <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>)
                          )}
                        </SelectContent>
                      </Select>
                      {errors.brand && <p className="text-[10px] text-destructive mt-1">{errors.brand.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Branch</Label>
                      <Select 
                        onValueChange={(v: string) => setValue("branch", v)} 
                        value={watch("branch")}
                        disabled={profile?.role === 'restaurant_user' || !selectedBrand}
                      >
                        <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors">
                          {profile?.role === 'restaurant_user' ? (
                            <SelectItem value={profile.branch || ""}>{profile.branch}</SelectItem>
                          ) : (
                            selectedBrand && brandsBranches[selectedBrand]?.map((b: string) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.branch && <p className="text-[10px] text-destructive mt-1">{errors.branch.message}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Item (Optional)</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <Input 
                          placeholder="Product or item name" 
                          {...register("item")} 
                          className="pl-10 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm dark:text-white" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Reason for Manager</Label>
                      <Textarea 
                        placeholder="Explain why manager contact is needed..." 
                        {...register("reason")} 
                        className="min-h-[120px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm resize-none dark:text-white" 
                      />
                      {errors.reason && <p className="text-[10px] text-destructive mt-1">{errors.reason.message}</p>}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    <Send className="h-4 w-4" />
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-4 px-8">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <ListFilter className="h-4 w-4" />
                  <CardTitle className="text-[11px] font-bold uppercase tracking-wider">
                    {activeTab === 'pending' ? 'Pending Requests' : 'All Requests'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="h-[300px] animate-pulse bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800" />
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 dark:text-slate-700">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No requests found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {filteredRequests.map((request) => (
                        <motion.div
                          key={request.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm h-full flex flex-col overflow-hidden group hover:border-blue-100 dark:hover:border-blue-900 transition-all">
                            <div className="p-5 flex-grow space-y-4 text-slate-900 dark:text-slate-100">
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <h3 className="font-bold text-slate-900 dark:text-white">{request.customerName}</h3>
                                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{request.customerPhone}</p>
                                </div>
                                <Badge 
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                    request.status === 'Pending' 
                                      ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20" 
                                      : request.status === 'Approved'
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                                        : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"
                                  )}
                                >
                                  {request.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50 dark:border-slate-900">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-300 dark:text-slate-600 tracking-wider">Brand</span>
                                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize">{request.brand}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-300 dark:text-slate-600 tracking-wider">Branch</span>
                                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{request.branch}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-300 dark:text-slate-600 tracking-wider">Type</span>
                                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{request.requestType || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase text-slate-300 dark:text-slate-600 tracking-wider">Item</span>
                                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{request.item || 'N/A'}</p>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase text-slate-300 dark:text-slate-600 tracking-wider">Reason</span>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {request.reason}
                                </p>
                              </div>

                              {request.approverComment && (
                                <div className={cn(
                                  "rounded-lg p-3 space-y-1 border transition-colors",
                                  request.status === 'Approved' 
                                    ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20" 
                                    : "bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20"
                                )}>
                                  <div className="flex items-center justify-between">
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase tracking-wider",
                                      request.status === 'Approved' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                    )}>
                                      Response
                                    </span>
                                    <span className="text-[8px] text-slate-400 dark:text-slate-600">
                                      {request.approvedAt ? formatKuwaitDate(request.approvedAt) : ''}
                                    </span>
                                  </div>
                                  <p className={cn(
                                    "text-[10px] italic leading-relaxed",
                                    request.status === 'Approved' ? "text-emerald-800 dark:text-emerald-200" : "text-rose-800 dark:text-rose-200"
                                  )}>
                                    "{request.approverComment}"
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between transition-colors">
                              <div className="space-y-1">
                                <p className="text-[9px] text-slate-400 dark:text-slate-600">Created by: <span className="font-bold text-slate-500 dark:text-slate-400">{request.creatorUsername}</span></p>
                                {request.status !== 'Pending' && (
                                  <p className="text-[9px] text-slate-400 dark:text-slate-600">Responded by: <span className="font-bold text-slate-500 dark:text-slate-400">{request.approverUsername}</span></p>
                                )}
                              </div>
                              {request.status === 'Pending' && (isComplaintsTeam || isManager) && (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-md border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                    onClick={() => openActionDialog(request, 'Approved')}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-md border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    onClick={() => openActionDialog(request, 'Rejected')}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'Approved' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Approve Request
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-500" />
                  Reject Request
                </>
              )}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Please provide a comment for this {actionType === 'Approved' ? 'approval' : 'rejection'}. This comment will be visible to the employee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="comment" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 block">
              Comment (Mandatory)
            </Label>
            <Textarea
              id="comment"
              placeholder="Enter your comment here..."
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              className="min-h-[100px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm resize-none focus:border-blue-500"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialogOpen(false)} disabled={isSubmittingAction} className="dark:text-slate-400">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction} 
              disabled={isSubmittingAction || !actionComment.trim()}
              className={cn(
                "text-white font-bold",
                actionType === 'Approved' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isSubmittingAction ? "Processing..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
