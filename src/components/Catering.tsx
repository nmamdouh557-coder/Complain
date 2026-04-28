import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Hash,
  History,
  LayoutDashboard,
  CalendarDays,
  Truck,
  CreditCard,
  Banknote,
  Package as PackageIcon,
  ShoppingBag,
  Info,
  Bell,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notificationService } from '@/lib/notifications';
import { useConfigs } from '@/hooks/useConfigs';
import { CateringRequest, CateringStatus, CateringAvailability } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, startOfWeek, endOfWeek } from 'date-fns';

const BRANDS = ['Shakir', 'Pattie', 'Just C', 'Slice', 'Mishmash'];

export default function Catering() {
  const { profile } = useAuth();
  const { cateringFormFields, brands: configBrands } = useConfigs();
  const [requests, setRequests] = useState<CateringRequest[]>([]);
  const [availability, setAvailability] = useState<CateringAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar' | 'dashboard'>('list');
  const [selectedRequest, setSelectedRequest] = useState<CateringRequest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Cash");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<CateringStatus | null>(null);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [requestToProcess, setRequestToProcess] = useState<number | null>(null);

  // Dynamic form state
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
  // Structured items for creation
  const [createItems, setCreateItems] = useState<{ id: string; name: string; qty: number; unitPrice: number }[]>([
    { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, unitPrice: 0 }
  ]);
  const [deliveryCharge, setDeliveryCharge] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const filteredAvailability = availability.filter(a => {
    if (brandFilter === 'all') return true;
    return a.brand === 'All' || a.brand === brandFilter;
  });

  const lastUnreadCount = useRef(unreadCount);

  useEffect(() => {
    fetchData();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s for more "real-time" feel
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sound and Toast logic when new notifications arrive
    if (unreadCount > lastUnreadCount.current) {
      const newNotif = notifications.find(n => !n.isRead);
      if (newNotif) {
        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));

        // Show WhatsApp-like toast
        toast.custom((t: any) => (
          <div className={cn(
            "w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-all animate-in slide-in-from-top-full",
            t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Bell className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-widest">{newNotif.title}</p>
              <p className="text-sm text-slate-500 font-medium line-clamp-1">{newNotif.message}</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => toast.dismiss(t.id)}
              className="rounded-xl h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    }
    lastUnreadCount.current = unreadCount;
  }, [unreadCount, notifications]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;
    try {
      const data = await api.getNotifications(profile.id);
      setNotifications(data || []);
      setUnreadCount(data.filter((n: any) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;
    try {
      await api.markAllNotificationsRead(profile.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('requestId', id.toString());
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const requestId = e.dataTransfer.getData('requestId');
    if (!requestId) return;

    const request = requests.find(r => r.id === Number(requestId));
    if (!request) return;

    if (isSameDay(new Date(request.date), new Date(date))) return;

    // Check availability
    if (isDayBusy(date, request.brand)) {
      toast.error(`The selected date is blocked for ${request.brand}.`);
      return;
    }

    try {
      await api.updateCateringRequest(Number(requestId), {
        date,
        userId: profile?.id,
        username: profile?.username
      });
      toast.success('Request moved successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to move request');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqs, avail] = await Promise.all([
        api.getCateringRequests(),
        api.getCateringAvailability()
      ]);
      setRequests(reqs || []);
      setAvailability(avail || []);
    } catch (error) {
      toast.error('Failed to fetch catering data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = (requests || []).filter(req => {
    const matchesSearch = req.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         req.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesBrand = brandFilter === 'all' || req.brand === brandFilter;
    
    const canSeeAll = ['complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'].includes(profile?.role || '');
    const matchesUser = canSeeAll || req.createdBy === profile?.id;

    return matchesSearch && matchesStatus && matchesBrand && matchesUser;
  });

  const handleQuickBusy = async (day: Date) => {
    const data = {
      type: 'Busy',
      busyType: 'Full Day',
      startDate: format(day, 'yyyy-MM-dd'),
      endDate: format(day, 'yyyy-MM-dd'),
      brand: brandFilter === 'all' ? 'All' : brandFilter,
      reason: 'Manual Block',
      createdBy: profile?.username || ''
    };

    try {
      await api.createCateringAvailability(data);
      toast.success(`Marked as busy for ${data.brand}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as busy');
    }
  };

  const isDayBusy = (date: string, brand: string) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return availability.some(a => {
      const start = new Date(a.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(a.endDate);
      end.setHours(23, 59, 59, 999);

      const inDateRange = checkDate >= start && checkDate <= end;
      if (!inDateRange) return false;

      // If brand is "All" or matches, it's busy
      const matchesBrand = !a.brand || a.brand === 'All' || a.brand === brand;
      return matchesBrand;
    });
  };

  const handleCreateAvailability = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: 'Busy',
      busyType: formData.get('busyType') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string || formData.get('startDate') as string,
      brand: formData.get('brand') as string,
      reason: formData.get('reason') as string,
      createdBy: profile?.username || ''
    };

    try {
      await api.createCateringAvailability(data);
      toast.success('Availability updated successfully');
      setIsAvailabilityDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalAmount = createItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) + deliveryCharge;

    const data: any = {
      ...dynamicFormValues,
      items: createItems.map(item => `${item.qty}x ${item.name} (${item.unitPrice} each)`).join('\n'),
      deliveryCharge: deliveryCharge,
      totalAmount: totalAmount,
      createdBy: profile?.id || '',
      creatorUsername: profile?.username || ''
    };

    if (!data.brand) {
      toast.error('Please select a brand');
      return;
    }

    if (isDayBusy(data.date, data.brand)) {
      toast.error(`The selected date is blocked for ${data.brand}. Please choose another date.`);
      return;
    }

    try {
      const response = await api.createCateringRequest(data);
      toast.success('Catering request submitted successfully');
      
      // Send notification to restaurant users of this brand
      await notificationService.sendNotification({
        recipientRole: 'restaurant_user',
        message: `New Catering Request for ${data.brand} from ${data.customerName}`,
        createdBy: profile?.id || 'system',
        createdByUsername: profile?.username || 'System',
        relatedId: response.id?.toString() || 'new',
        brand: data.brand,
        type: 'CATERING'
      });

      setIsCreateDialogOpen(false);
      setSelectedBrand("");
      setSelectedPaymentMethod("Cash");
      fetchData();
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const handleStatusChange = (requestId: number, newStatus: CateringStatus) => {
    setRequestToProcess(requestId);
    setProcessingStatus(newStatus);
    setDecisionMessage('');
    setIsProcessDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!requestToProcess || !processingStatus) return;

    try {
      await api.updateCateringRequest(requestToProcess, {
        status: processingStatus,
        confirmedBy: profile?.id,
        confirmedByName: profile?.username,
        processMessage: decisionMessage,
        userId: profile?.id,
        username: profile?.username
      });
      toast.success(`Request ${processingStatus.toLowerCase()} successfully`);
      if (selectedRequest?.id === requestToProcess) {
        setSelectedRequest(prev => prev ? { 
          ...prev, 
          status: processingStatus,
          confirmedByName: profile?.username,
          processMessage: decisionMessage
        } : null);
      }
      setIsProcessDialogOpen(false);
      setRequestToProcess(null);
      setProcessingStatus(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update request status');
    }
  };

  const getStatusColor = (status: CateringStatus) => {
    switch (status) {
      case 'Done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block mx-2" />
            <div className="hidden md:flex items-center gap-2">
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                 <SelectTrigger className="h-9 w-[140px] rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs">
                   <div className="flex items-center gap-2">
                     <Filter className="h-3 w-3 text-slate-400" />
                     <SelectValue placeholder="All Brands" />
                   </div>
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Brands</SelectItem>
                   {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                 </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-xs font-bold uppercase text-slate-400 tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayRequests = (requests || []).filter(r => {
              const isDay = isSameDay(new Date(r.date), day);
              const matchesBrand = brandFilter === 'all' || r.brand === brandFilter;
              return isDay && matchesBrand;
            });
            const dayAvailability = (filteredAvailability || []).filter(a => {
              const start = new Date(a.startDate);
              start.setHours(0,0,0,0);
              const end = new Date(a.endDate);
              end.setHours(23,59,59,999);
              return day >= start && day <= end;
            });

            return (
              <div 
                key={idx} 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-blue-50/50', 'dark:bg-blue-900/10');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-blue-50/50', 'dark:bg-blue-900/10');
                }}
                onDrop={(e) => {
                  e.currentTarget.classList.remove('bg-blue-50/50', 'dark:bg-blue-900/10');
                  handleDrop(e, format(day, 'yyyy-MM-dd'));
                }}
                className={cn(
                  "min-h-[140px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all relative group",
                  !isSameMonth(day, monthStart) && "bg-slate-50/50 dark:bg-slate-900/50 grayscale opacity-40"
                )}
              >
                {/* Hover Actions */}
                {isSameMonth(day, monthStart) && (
                  <div className="absolute inset-0 z-30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                    {dayAvailability.length === 0 && (
                      <Button 
                        size="sm"
                        className="rounded-lg h-6 px-1.5 bg-slate-900 text-white font-black text-[7px] uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                        onClick={() => {
                           setIsCreateDialogOpen(true);
                           setTimeout(() => {
                             const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
                             if (dateInput) {
                               const dateStr = format(day, 'yyyy-MM-dd');
                               dateInput.value = dateStr;
                               const event = new Event('input', { bubbles: true });
                               dateInput.dispatchEvent(event);
                             }
                           }, 100);
                        }}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        Add Request
                      </Button>
                    )}
                    {(['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')) && (
                      <Button 
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-6 px-1.5 bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900 text-rose-500 font-black text-[7px] uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBusy(day);
                        }}
                      >
                        <Hash className="h-2.5 w-2.5" />
                        Mark Busy
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex justify-between p-1">
                  <div className="flex gap-1">
                    {dayAvailability.map((a, i) => (
                      <div 
                        key={i} 
                        title={`Busy: ${a.reason || 'No reason'}`}
                        className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"
                      />
                    ))}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    isSameDay(day, new Date()) ? "bg-primary text-white h-6 w-6 flex items-center justify-center rounded-full" : "text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {dayAvailability.map((a, i) => (
                    <div 
                      key={i}
                      className="p-1 px-2 rounded-lg text-[9px] font-black bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100 dark:border-rose-800 flex items-center gap-1"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      BUSY {a.brand && a.brand !== 'All' ? `- ${a.brand}` : ''}
                    </div>
                  ))}
                  {dayRequests.map(req => (
                    <div 
                      key={req.id}
                      draggable={['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')}
                      onDragStart={(e) => handleDragStart(e, req.id)}
                      onClick={() => setSelectedRequest(req)}
                      className={cn(
                        "p-1.5 px-2 rounded-lg text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02]",
                        getStatusColor(req.status)
                      )}
                    >
                      <span className="opacity-70 mr-1">{req.servingTime}</span>
                      {req.brand}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const brandRequests = brandFilter === 'all' 
      ? requests 
      : requests.filter(r => r.brand === brandFilter);

    const brandStats = BRANDS.map(brand => ({
      brand,
      count: requests.filter(r => r.brand === brand).length,
      done: requests.filter(r => r.brand === brand && r.status === 'Done').length
    }));

    return (
      <div className="space-y-8">
        <div className="flex justify-end mb-4">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
             <SelectTrigger className="h-10 w-[180px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold shadow-sm transition-all">
               <div className="flex items-center gap-2">
                 <Filter className="h-4 w-4 text-slate-400" />
                 <SelectValue placeholder="Brand Filter" />
               </div>
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Everywhere</SelectItem>
               {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
             </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl border-none">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Filtered Requests</p>
            <h3 className="text-3xl font-black">{brandRequests.length}</h3>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-3xl border-none">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Done</p>
            <h3 className="text-3xl font-black">{brandRequests.filter(r => r.status === 'Done').length}</h3>
          </Card>
          <Card 
            onClick={() => (['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')) && setIsAvailabilityDialogOpen(true)}
            className={cn(
              "p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl border-none flex flex-col justify-between transition-all active:scale-95",
              (['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')) && "cursor-pointer hover:shadow-lg hover:shadow-blue-500/20"
            )}
          >
             <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Busy Periods</p>
                <h3 className="text-3xl font-black">{filteredAvailability.length}</h3>
             </div>
             {(['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')) && (
               <div className="flex justify-end">
                 <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                   <Plus className="h-4 w-4" />
                 </div>
               </div>
             )}
          </Card>
          <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Upcoming Today</p>
            <h3 className="text-3xl font-black dark:text-white">
              {brandRequests.filter(r => isSameDay(new Date(r.date), new Date())).length}
            </h3>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="text-lg font-bold mb-6 dark:text-white">Requests by Brand</h3>
            <div className="space-y-4">
              {brandStats.map(stat => (
                <div key={stat.brand} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="dark:text-white">{stat.brand}</span>
                    <span className="text-slate-400">{stat.count} requests</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${(stat.count / (requests.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <h3 className="text-lg font-bold mb-6 dark:text-white">Recent Activity Log</h3>
            <div className="space-y-6 max-h-[300px] overflow-y-auto no-scrollbar">
              {requests.slice(0, 10).map((req, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 z-10 shrink-0" />
                  {idx !== 9 && <div className="absolute left-[3.5px] top-4 bottom-[-24px] w-[1px] bg-slate-100 dark:bg-slate-800" />}
                  <div>
                    <p className="text-sm font-bold dark:text-white">New request for {req.brand}</p>
                    <p className="text-xs text-slate-400">Created by {req.creatorUsername} • {format(new Date(req.createdAt), 'MMM d, p')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  if (!['employee', 'complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'].includes(profile?.role || '')) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-black mb-2">Access Restricted</h1>
        <p className="text-slate-500 max-w-md">You do not have the required permissions to access the Catering management system.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
               <span className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CalendarIcon className="h-6 w-6" />
               </span>
               <h1 className="text-3xl font-black tracking-tight dark:text-white">Catering Portal</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Manage events, track requests, and handle availability for all brands.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative rounded-2xl h-11 w-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <Bell className="h-5 w-5 text-slate-500" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                      )}
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-80 p-0 rounded-3xl border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[10px] font-bold text-blue-500 hover:text-blue-600 px-2 rounded-lg">
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator className="m-0" />
                  <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer",
                            !n.isRead && "bg-blue-50/30 dark:bg-blue-900/5"
                          )}
                          onClick={async () => {
                            if (!n.isRead) await api.markNotificationRead(n.id);
                            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                            setUnreadCount(prev => Math.max(0, prev - (n.isRead ? 0 : 1)));
                            
                            // If it's a catering request, select it
                            if (n.relatedId) {
                               const req = requests.find(r => r.id.toString() === n.relatedId);
                               if (req) setSelectedRequest(req);
                            }
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-xl shrink-0 flex items-center justify-center",
                              n.type === 'CATERING_NEW' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                            )}>
                              {n.type === 'CATERING_NEW' ? <Plus className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </div>
                            <div className="space-y-1">
                              <p className={cn("text-xs font-black leading-tight", !n.isRead ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[9px] font-bold text-slate-300 uppercase">
                                {format(new Date(n.createdAt), 'MMM d, p')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
             </DropdownMenu>

             {(['manager', 'admin', 'supervisor', 'team_leader', 'complaints_team'].includes(profile?.role || '')) && (
               <Button 
                 variant="outline"
                 onClick={() => setIsAvailabilityDialogOpen(true)}
                 className="rounded-2xl px-6 h-11 font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 transition-all active:scale-95 text-rose-500"
               >
                 <Hash className="h-5 w-5" />
                 Mark Busy
               </Button>
             )}
             <div className="flex items-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm transition-colors">
                <Button 
                  variant={view === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('list')} 
                  className={cn("rounded-xl font-bold text-xs h-9", view === 'list' && "bg-slate-100 dark:bg-slate-800")}
                >
                  List
                </Button>
                <Button 
                  variant={view === 'calendar' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('calendar')}
                  className={cn("rounded-xl font-bold text-xs h-9", view === 'calendar' && "bg-slate-100 dark:bg-slate-800")}
                >
                  Calendar
                </Button>
                <Button 
                  variant={view === 'dashboard' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('dashboard')}
                  className={cn("rounded-xl font-bold text-xs h-9", view === 'dashboard' && "bg-slate-100 dark:bg-slate-800")}
                >
                  Dashboard
                </Button>
             </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger render={
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-11 font-bold shadow-lg shadow-blue-500/20 gap-2 transition-all active:scale-95">
            <Plus className="h-5 w-5" />
            New Request
          </Button>
        } />
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none bg-white dark:bg-slate-900 shadow-2xl no-scrollbar">
          <DialogHeader className="px-8 pt-8 pb-6 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-2xl font-black dark:text-white">Submit Catering Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Brand</Label>
                <Select value={dynamicFormValues.brand || ""} onValueChange={(val) => setDynamicFormValues(prev => ({ ...prev, brand: val }))} required>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 font-medium">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {(configBrands || BRANDS).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {(cateringFormFields || []).map((field: any) => {
                if (field.id === 'brand') return null; // Handled separately if needed, but it's usually at the top
                
                return (
                  <div key={field.id} className={cn("space-y-2", field.type === 'textarea' && "md:col-span-2")}>
                    <Label className="text-xs font-bold uppercase tracking-wider">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </Label>
                    
                    {field.type === 'dropdown' ? (
                      <Select 
                        value={dynamicFormValues[field.id] || ""} 
                        onValueChange={(val) => setDynamicFormValues(prev => ({ ...prev, [field.id]: val }))}
                        required={field.required}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 font-medium">
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt: string) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        value={dynamicFormValues[field.id] || ""}
                        onChange={(e) => setDynamicFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.required}
                        className="rounded-xl min-h-[100px] bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800"
                      />
                    ) : (
                      <Input
                        type={field.type}
                        value={dynamicFormValues[field.id] || ""}
                        onChange={(e) => setDynamicFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        required={field.required}
                        className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800"
                      />
                    )}
                  </div>
                );
              })}

              <div className="space-y-4 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider">Order Items</Label>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => setCreateItems([...createItems, { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, unitPrice: 0 }])}
                            className="h-8 px-3 rounded-lg text-[10px] font-black uppercase text-blue-500 hover:bg-blue-50"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Item
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          {createItems.map((item, idx) => (
                            <div key={item.id} className="flex gap-3 items-end group">
                              <div className="w-16">
                                <Label className="text-[9px] font-bold text-slate-400 block mb-1">Qty</Label>
                                <Input 
                                  type="number" 
                                  min="1"
                                  value={item.qty === 0 ? '' : item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setCreateItems(prev => prev.map(it => it.id === item.id ? { ...it, qty: val } : it));
                                  }}
                                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-center font-bold"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-[9px] font-bold text-slate-400 block mb-1">Name</Label>
                                <Input 
                                  value={item.name}
                                  onChange={(e) => {
                                    setCreateItems(prev => prev.map(it => it.id === item.id ? { ...it, name: e.target.value } : it));
                                  }}
                                  placeholder="Item name..."
                                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 font-medium"
                                />
                              </div>
                              <div className="w-24">
                                <Label className="text-[9px] font-bold text-slate-400 block mb-1">Unit Price</Label>
                                <Input 
                                  type="number"
                                  step="0.001"
                                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setCreateItems(prev => prev.map(it => it.id === item.id ? { ...it, unitPrice: val } : it));
                                  }}
                                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 font-black text-blue-600"
                                />
                              </div>
                              {createItems.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setCreateItems(prev => prev.filter(it => it.id !== item.id))}
                                  className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Additional Request Details</Label>
                        <Textarea name="additional" placeholder="Any extra service details..." className="rounded-xl min-h-[60px] bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Administrative Notes</Label>
                        <Textarea name="notes" placeholder="Internal notes for team..." className="rounded-xl min-h-[60px] bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider">Logistics / Delivery Charge</Label>
                        <Input 
                          type="number" 
                          step="0.001" 
                          value={deliveryCharge === 0 ? '' : deliveryCharge}
                          onChange={(e) => setDeliveryCharge(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="h-12 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800" 
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <div className="p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800 flex flex-col items-center">
                          <Label className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2">Calculated Total Amount</Label>
                          <p className="text-4xl font-black text-blue-600 dark:text-blue-400">
                            {(createItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) + deliveryCharge).toFixed(3)} 
                            <span className="text-xs ml-2">KWD</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                      <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl h-12 px-8 font-bold">Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-10 font-bold">Register Request</Button>
                    </div>
                  </form>
                </DialogContent>
             </Dialog>
          </div>
        </div>

        {/* View Content */}
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                   <Input 
                    placeholder="Search customer or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 placeholder:font-medium"
                   />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <Select value={brandFilter} onValueChange={setBrandFilter}>
                      <SelectTrigger className="h-12 w-full md:w-[160px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold transition-all shadow-sm">
                        <SelectValue placeholder="Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                   </Select>
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 w-full md:w-[160px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold transition-all shadow-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRequests.map(req => (
                  <Card 
                    key={req.id} 
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 cursor-pointer flex flex-col h-full border-b-[6px] border-b-primary/5 hover:border-b-primary/40"
                    onClick={() => setSelectedRequest(req)}
                  >
                    {/* Brand Accent Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 opacity-30 px-6 pt-6" />
                    
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                           <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500">
                              <span className="text-[10px] font-black text-slate-400">#{req.id}</span>
                           </div>
                           <Badge className={cn("font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-full shadow-sm", getStatusColor(req.status))}>
                              {req.status}
                           </Badge>
                        </div>
                        <div className="flex -space-x-1">
                           <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center overflow-hidden">
                              <User className="h-4 w-4 text-slate-400" />
                           </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1.5">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                             req.brand === 'Pattie' ? "bg-blue-600 text-white" :
                             req.brand === 'Shakir' ? "bg-orange-600 text-white" :
                             req.brand === 'Just C' ? "bg-emerald-600 text-white" :
                             req.brand === 'Slice' ? "bg-rose-600 text-white" :
                             req.brand === 'Mishmash' ? "bg-purple-600 text-white" :
                             "bg-slate-800 text-white"
                           )}>
                              {req.brand}
                           </span>
                        </div>
                        <h3 className="text-2xl font-black dark:text-white tracking-tight leading-tight group-hover:text-primary transition-colors">
                           {req.customerName}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 pt-6 border-t border-slate-50 dark:border-slate-800/50 mt-auto">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-500">
                              <CalendarIcon className="h-4 w-4" />
                           </div>
                           <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Event Date</p>
                              <p className="text-xs font-bold dark:text-slate-200">{format(new Date(req.date), 'MMM d, yyyy')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
                              <Clock className="h-4 w-4" />
                           </div>
                           <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Time Slot</p>
                              <p className="text-xs font-bold dark:text-slate-200 truncate max-w-[80px]">{req.servingTime}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
                              <MapPin className="h-4 w-4" />
                           </div>
                           <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Location</p>
                              <p className="text-xs font-bold dark:text-slate-200 line-clamp-1">{req.address}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500">
                              <Banknote className="h-4 w-4" />
                           </div>
                           <div>
                              <p className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">Pricing</p>
                              <p className="text-sm font-black text-primary">{req.totalAmount.toFixed(3)} <span className="text-[8px]">KWD</span></p>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    {(profile?.role === 'complaints_team' || profile?.role === 'manager' || profile?.role === 'admin') && req.status === 'Pending' ? (
                      <div className="px-8 pb-8 pt-0 flex gap-3">
                        <Button 
                          size="sm" 
                          className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(req.id, 'Done');
                          }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 rounded-2xl border-slate-100 dark:border-slate-800 font-bold h-11 text-rose-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(req.id, 'Cancelled');
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="px-8 pb-8 pt-0">
                         <div className="w-full py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                            <span className="text-[10px] font-black uppercase tracking-widest">View Booking Details</span>
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                         </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {filteredRequests.length === 0 && (
                <div className="py-32 text-center">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6 group-hover:scale-110 transition-transform">
                     <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white mb-2">No Requests Found</h3>
                  <p className="text-slate-400">Try adjusting your filters or search query.</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              {renderCalendar()}
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderDashboard()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
           <DialogContent className="sm:max-w-xl rounded-3xl p-0 border-none bg-white dark:bg-slate-900 shadow-2xl">
              {selectedRequest && (
                <>
                  <DialogHeader className="p-10 pb-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-40" />
                    <div className="flex justify-between items-center mb-6">
                       <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-[0.2em] text-[8px] py-1 px-3 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                          Booking ID #{selectedRequest.id}
                       </Badge>
                       <Badge className={cn("font-black text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-full shadow-sm", getStatusColor(selectedRequest.status))}>
                          {selectedRequest.status}
                       </Badge>
                    </div>
                    <div className="flex items-start gap-4 mb-8">
                       <div className="h-16 w-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
                          <User className="h-8 w-8 text-primary/40" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Name</p>
                          <DialogTitle className="text-3xl font-black dark:text-white tracking-tight">{selectedRequest.customerName}</DialogTitle>
                       </div>
                    </div>
                  </DialogHeader>

                  <div className="p-10 pt-6 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                     <section className="grid grid-cols-2 gap-8 p-6 rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-orange-500">
                                 <CalendarIcon className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Event Date</p>
                                 <p className="text-sm font-bold dark:text-white leading-none mt-0.5">{format(new Date(selectedRequest.date), 'PPPP')}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-blue-500">
                                 <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Serving Time</p>
                                 <p className="text-sm font-bold dark:text-white leading-none mt-0.5">{selectedRequest.servingTime}</p>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="flex items-start gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-emerald-500 shrink-0">
                                 <MapPin className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Address</p>
                                 <p className="text-sm font-bold dark:text-white leading-snug mt-0.5 line-clamp-2">{selectedRequest.address}</p>
                                 <a 
                                   href={selectedRequest.location} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-[10px] font-bold text-blue-500 hover:decoration-2 hover:underline mt-1.5 flex items-center gap-1 group/map"
                                 >
                                   <span>Open Navigation</span>
                                   <ChevronRight className="h-3 w-3 group-hover/map:translate-x-0.5 transition-transform" />
                                 </a>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-purple-500">
                                 <Phone className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Contact</p>
                                 <p className="text-sm font-bold dark:text-white leading-none mt-0.5">{selectedRequest.customerPhone}</p>
                              </div>
                           </div>
                        </div>
                     </section>

                     <section className="space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Package & Order</span>
                           <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-6 rounded-[1.5rem] bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/30">
                              <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider mb-2">Package Type</p>
                              <div className="flex items-baseline gap-2">
                                 <PackageIcon className="h-3 w-3 text-indigo-400" />
                                 <p className="text-base font-black dark:text-white">{selectedRequest.package}</p>
                              </div>
                           </div>
                           <div className="p-6 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                 <Banknote className="h-12 w-12 text-blue-600" />
                              </div>
                              <p className="text-[9px] font-black uppercase text-blue-400 dark:text-blue-500 tracking-wider mb-2">Total Amount</p>
                              <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                 {selectedRequest.totalAmount.toFixed(3)} <span className="text-[10px] ml-1">KWD</span>
                              </p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                 <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Order Items
                              </div>
                              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm leading-relaxed dark:text-slate-300 min-h-[100px] flex items-center justify-center text-center italic">
                                 "{selectedRequest.items}"
                              </div>
                           </div>
                           <div className="space-y-3">
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Additional Req.
                              </div>
                              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm leading-relaxed dark:text-slate-300 min-h-[100px] flex items-center justify-center text-center italic">
                                 {selectedRequest.additional || 'None specified'}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Admin/Internal Notes
                           </div>
                           <div className="p-6 bg-orange-50/20 dark:bg-orange-900/10 border border-orange-100/30 dark:border-orange-900/30 rounded-[1.5rem] text-sm leading-relaxed dark:text-slate-300 italic min-h-[80px]">
                               {selectedRequest.notes || 'No special instructions provided.'}
                           </div>
                        </div>
                     </section>

                     <section className="grid grid-cols-2 gap-8 py-8 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Truck className="h-6 w-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Delivery Fee</p>
                              <p className="text-base font-black dark:text-white">{selectedRequest.deliveryCharge.toFixed(3)} <span className="text-[10px]">KWD</span></p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <CreditCard className="h-6 w-6" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</p>
                              <p className="text-base font-black dark:text-white uppercase tracking-tight">{selectedRequest.paymentMethod}</p>
                           </div>
                        </div>
                     </section>

                     <div className="space-y-6 p-8 bg-slate-50 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                        <div className="flex flex-wrap items-center justify-between gap-6">
                           <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 relative">
                                 <User className="h-7 w-7 text-slate-300" />
                                 <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-500 border-4 border-slate-50 dark:border-slate-800" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Recorded By</p>
                                 <p className="text-base font-black dark:text-white">{selectedRequest.creatorUsername}</p>
                              </div>
                           </div>

                           {selectedRequest.confirmedByName && (
                              <div className="flex items-center gap-4 text-right">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Processed By</p>
                                    <p className="text-base font-black dark:text-white">{selectedRequest.confirmedByName}</p>
                                 </div>
                                 <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center border-2 border-emerald-500/20 relative">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-slate-50 dark:border-slate-800" />
                                 </div>
                              </div>
                           )}
                        </div>

                        {selectedRequest.processMessage && (
                           <div className="pt-6 border-t border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex items-center gap-2 mb-3">
                                 <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Info className="h-3.5 w-3.5 text-primary" />
                                 </div>
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Decision Message</p>
                              </div>
                              <div className="relative p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                 <div className="absolute top-4 left-4 opacity-5">
                                    <ShoppingBag className="h-8 w-8" />
                                 </div>
                                 <p className="text-sm font-medium leading-relaxed dark:text-slate-300 italic relative z-10">
                                    "{selectedRequest.processMessage}"
                                 </p>
                              </div>
                           </div>
                        )}
                        {(profile?.role === 'complaints_team' || profile?.role === 'manager' || profile?.role === 'admin') && selectedRequest.status === 'Pending' && (
                          <div className="flex gap-4 pt-4">
                             <Button 
                              variant="outline" 
                              className="flex-1 rounded-2xl font-black bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 shadow-lg shadow-rose-500/10 h-14 tracking-widest uppercase text-[10px] transition-all active:scale-95 flex gap-2"
                              onClick={() => handleStatusChange(selectedRequest.id, 'Cancelled')}
                             >
                                <XCircle className="h-4 w-4" />
                                Reject
                             </Button>
                             <Button 
                              className="flex-1 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 h-14 tracking-widest uppercase text-[10px] transition-all active:scale-95 flex gap-2"
                              onClick={() => handleStatusChange(selectedRequest.id, 'Done')}
                             >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                             </Button>
                          </div>
                        )}
                     </div>
                  </div>
                </>
              )}
           </DialogContent>
        </Dialog>

        {/* Process Decision Dialog */}
        <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
           <DialogContent className="sm:max-w-md rounded-[2rem] p-0 border-none bg-white dark:bg-slate-900 shadow-2xl">
              <div className="p-8">
                 <div className="flex items-center gap-4 mb-8">
                    <div className={cn(
                       "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg",
                       processingStatus === 'Done' 
                          ? "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10" 
                          : "bg-rose-500/10 text-rose-600 shadow-rose-500/10"
                    )}>
                       {processingStatus === 'Done' ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                    </div>
                    <div>
                       <h3 className="text-xl font-black dark:text-white tracking-tight">
                          {processingStatus === 'Done' ? 'Approve Request' : 'Reject Request'}
                       </h3>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add a decision Note</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Message / Reason</Label>
                       <Textarea 
                          placeholder={processingStatus === 'Done' ? "Add any instructions for the team..." : "Reason for rejection..."}
                          className="min-h-[120px] rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 focus:ring-primary/20 resize-none p-4 font-medium"
                          value={decisionMessage}
                          onChange={(e) => setDecisionMessage(e.target.value)}
                       />
                    </div>

                    <div className="flex gap-4 pt-2">
                       <Button 
                          variant="ghost" 
                          className="flex-1 rounded-xl font-black text-slate-400 hover:text-slate-600 tracking-widest uppercase text-[10px] h-12"
                          onClick={() => setIsProcessDialogOpen(false)}
                       >
                          Cancel
                       </Button>
                       <Button 
                          className={cn(
                             "flex-[2] rounded-xl font-black text-white shadow-lg h-12 tracking-widest uppercase text-[10px] transition-all active:scale-95",
                             processingStatus === 'Done' 
                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" 
                                : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                          )}
                          onClick={confirmStatusChange}
                          disabled={!decisionMessage.trim()}
                       >
                          Confirm {processingStatus === 'Done' ? 'Approval' : 'Rejection'}
                       </Button>
                    </div>
                 </div>
              </div>
           </DialogContent>
        </Dialog>
        {/* Availability Management Dialog */}
        <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
           <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 border-none bg-white dark:bg-slate-900 shadow-2xl">
              <DialogHeader className="p-8 pb-4">
                 <DialogTitle className="text-2xl font-black flex items-center gap-2">
                    <Hash className="h-6 w-6 text-rose-500" />
                    Busy Dates
                 </DialogTitle>
                 <p className="text-slate-500 text-sm font-medium mt-1">Prevent bookings for specific dates or brands.</p>
              </DialogHeader>
              
              <div className="p-8 pt-0 space-y-8">
                 <form onSubmit={handleCreateAvailability} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</Label>
                          <Select name="busyType" defaultValue="Full Day">
                             <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="Full Day">Full Day</SelectItem>
                                <SelectItem value="Specific Hours">Specific Hours</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</Label>
                          <Select name="brand" defaultValue="All">
                             <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none">
                                <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                                <SelectItem value="All">All Brands</SelectItem>
                                {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</Label>
                          <Input name="startDate" type="date" required className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date (Optional)</Label>
                          <Input name="endDate" type="date" className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason / Note</Label>
                       <Input name="reason" placeholder="e.g., Public Holiday, Maintenance..." className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none" />
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 font-black tracking-widest uppercase text-xs shadow-xl transition-all active:scale-95">
                       Add Busy Period
                    </Button>
                 </form>

                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <History className="h-3 w-3" />
                       Current Busy Periods
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                       {availability.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                             <p className="text-xs font-bold text-slate-400">No active busy periods</p>
                          </div>
                       ) : (
                          availability.map((a, i) => (
                             <div key={i} className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 flex items-center justify-between">
                                <div>
                                   <p className="text-sm font-black dark:text-white">{a.startDate === a.endDate ? a.startDate : `${a.startDate} to ${a.endDate}`}</p>
                                   <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{a.brand || 'All Brands'} • {a.reason || 'No reason'}</p>
                                </div>
                                <Badge className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 border-none font-black text-[10px]">BUSY</Badge>
                             </div>
                          ))
                       )}
                    </div>
                 </div>
              </div>
           </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
