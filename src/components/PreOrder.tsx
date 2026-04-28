import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Truck, 
  ShoppingBag, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Store,
  CreditCard,
  FileText,
  ChevronRight,
  ArrowRight,
  Save,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

import { useConfigs } from '@/hooks/useConfigs';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { notificationService } from '@/lib/notifications';

interface PreOrderItem {
  id: string;
  name: string;
  qty: number;
  notes: string;
  amount: number;
  isDeliveryField?: boolean;
}

const PreOrder: React.FC = () => {
  const { profile } = useAuth();
  const { brands, brandsBranches, preorderFormFields } = useConfigs();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>(profile?.role === 'restaurant_user' ? 'list' : 'create');

  // Dynamic form state
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({
    orderType: 'Pick Up',
    paymentStatus: 'Unpaid'
  });

  const [items, setItems] = useState<PreOrderItem[]>([
    { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, notes: '', amount: 0 }
  ]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const isRestaurantUser = profile?.role === 'restaurant_user';

  // Fetch orders when brand/branch changes
  useEffect(() => {
    if (dynamicFormValues.brand && dynamicFormValues.branch) {
      api.getPreOrders(dynamicFormValues.brand, dynamicFormValues.branch).then(setExistingOrders).catch(console.error);
    } else {
      setExistingOrders([]);
    }
  }, [dynamicFormValues.brand, dynamicFormValues.branch]);

  // Set default brand/branch for restaurant users
  useEffect(() => {
    if (profile?.role === 'restaurant_user') {
      setDynamicFormValues(prev => ({
        ...prev,
        brand: profile.brand || '',
        branch: profile.branch || ''
      }));
      setActiveTab('list');
    }
  }, [profile]);

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, notes: '', amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1 || items[0].isDeliveryField) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof PreOrderItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty.toString()) || 0;
    const price = parseFloat(item.amount.toString()) || 0;
    return sum + (qty * price);
  }, 0);

  // Handle Order Type Change
  useEffect(() => {
    if (dynamicFormValues.orderType === 'Delivery') {
      setItems(prev => {
        const hasDeliveryItem = prev.some(item => item.isDeliveryField);
        if (!hasDeliveryItem) {
          return [...prev, { 
            id: 'delivery-fee', 
            name: 'Delivery Charge', 
            qty: 1, 
            notes: 'Standard Delivery', 
            amount: 1,
            isDeliveryField: true 
          }];
        }
        return prev;
      });
    } else {
      setItems(prev => prev.filter(item => !item.isDeliveryField));
    }
  }, [dynamicFormValues.orderType]);

  const handleSubmit = async () => {
    if (!dynamicFormValues.customer || !dynamicFormValues.phone || !dynamicFormValues.brand || !dynamicFormValues.branch) {
      toast.error('Please fill in required fields (Customer, Phone, Brand, Branch)');
      return;
    }
    
    const orderData = {
      ...dynamicFormValues,
      items,
      totalAmount,
      createdBy: profile?.id,
      creatorUsername: profile?.username || 'System'
    };

    try {
      const result = await api.createPreOrder(orderData);
      toast.success('Pre-Order Saved Successfully!');
      
      // Send notification to restaurant user
      await notificationService.sendNotification({
        recipientRole: 'restaurant_user',
        message: `New Pre-Order from ${dynamicFormValues.customer}`,
        createdBy: profile?.id || 'system',
        createdByUsername: profile?.username || 'System',
        relatedId: result.id.toString(),
        brand: dynamicFormValues.brand,
        branch: dynamicFormValues.branch,
        type: 'PRE_ORDER'
      });
      
      // Refresh existing orders list if applicable
      if (dynamicFormValues.brand && dynamicFormValues.branch) {
        const updated = await api.getPreOrders(dynamicFormValues.brand, dynamicFormValues.branch);
        setExistingOrders(updated);
      }
      
      // Reset form (optional, but good for UX)
      setDynamicFormValues(prev => ({
        ...prev,
        customer: '',
        phone: '',
        address: ''
      }));
      setItems([{ id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, notes: '', amount: 0 }]);
    } catch (error) {
      toast.error('Failed to save order');
      console.error(error);
    }
  };

  return (
    <div id="pre-order-container" className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/60 dark:border-slate-800/60 pb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              Management System
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              Pre-Order <span className="text-slate-400 font-light italic">Portal</span>
            </h1>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit">
              {!isRestaurantUser && (
                <button
                  onClick={() => setActiveTab('create')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'create' 
                      ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  New Order
                </button>
              )}
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'list' 
                    ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                Orders List
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'create' && (
              <>
                <Button 
                  variant="outline"
                  className="h-14 px-8 rounded-2xl border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="h-14 px-10 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 font-black tracking-widest uppercase text-xs shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:shadow-none hover:translate-y-px transition-all flex gap-3"
                >
                  <Save className="h-4 w-4" />
                  Save Order
                </Button>
              </>
            )}
            {activeTab === 'list' && (
              <Button 
                variant="outline"
                onClick={() => {
                  if (dynamicFormValues.brand && dynamicFormValues.branch) {
                    api.getPreOrders(dynamicFormValues.brand, dynamicFormValues.branch).then(setExistingOrders).catch(console.error);
                    toast.success('List Refreshed');
                  }
                }}
                className="h-14 px-8 rounded-2xl border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Refresh List
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'create' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-10">
              {/* Step 1: Customer Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="h-8 w-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black">01</span>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Customer Information</h2>
                </div>
                
                <Card className="p-10 rounded-[3rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white dark:bg-slate-900/40 backdrop-blur-3xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Brand Vertical</Label>
                      <Select 
                        onValueChange={(v) => {
                          setDynamicFormValues(prev => ({ ...prev, brand: v, branch: '' }));
                        }} 
                        value={dynamicFormValues.brand || ""}
                        disabled={profile?.role === 'restaurant_user' && !!profile.brand}
                      >
                        <SelectTrigger className="h-16 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-transparent focus:border-primary/20 pl-14 font-bold text-slate-700 dark:text-white transition-all">
                          <div className="absolute left-5 top-5">
                            <Store className="h-6 w-6 text-slate-300" />
                          </div>
                          <SelectValue placeholder="Selection" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 p-2">
                          {brands?.map(b => <SelectItem key={b} value={b} className="rounded-xl font-bold p-3">{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Execution Branch</Label>
                      <Select 
                        onValueChange={(v) => setDynamicFormValues(prev => ({ ...prev, branch: v }))} 
                        value={dynamicFormValues.branch || ""} 
                        disabled={!dynamicFormValues.brand || (profile?.role === 'restaurant_user' && !!profile.branch)}
                      >
                        <SelectTrigger className="h-16 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-transparent focus:border-primary/20 pl-14 font-bold text-slate-700 dark:text-white transition-all disabled:opacity-30">
                          <div className="absolute left-5 top-5">
                            <MapPin className="h-6 w-6 text-slate-300" />
                          </div>
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 dark:border-slate-800 p-2">
                          {dynamicFormValues.brand && brandsBranches[dynamicFormValues.brand]?.map(b => (
                            <SelectItem key={b} value={b} className="rounded-xl font-bold p-3">{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(preorderFormFields || []).map((field: any) => {
                      if (field.id === 'orderType' || field.id === 'paymentStatus' || field.id === 'brand' || field.id === 'branch') return null;

                      return (
                        <div key={field.id} className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </Label>
                          <div className="group relative">
                            {field.type === 'dropdown' ? (
                              <Select
                                value={dynamicFormValues[field.id] || ""}
                                onValueChange={(val) => setDynamicFormValues(prev => ({ ...prev, [field.id]: val }))}
                                required={field.required}
                              >
                                <SelectTrigger className="h-16 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-transparent focus:border-primary/20 pl-14 font-bold text-slate-700 dark:text-white">
                                  <SelectValue placeholder={`Select ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((opt: string) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input 
                                type={field.type}
                                placeholder={`Enter ${field.label}...`}
                                value={dynamicFormValues[field.id] || ""}
                                onChange={(e) => setDynamicFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                required={field.required}
                                className="h-16 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border-2 border-transparent focus:border-primary/20 pl-14 font-bold text-slate-700 dark:text-white transition-all"
                              />
                            )}
                            <FileText className="absolute left-5 top-5 h-6 w-6 text-slate-300 group-focus-within:text-primary transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </section>

              {/* Step 2: Line Items */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="h-8 w-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-black">02</span>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Order Line Items</h2>
                  </div>
                  <Button 
                    onClick={addItem}
                    variant="ghost" 
                    className="rounded-2xl h-12 px-6 text-primary font-black uppercase text-[10px] tracking-widest flex gap-2 hover:bg-primary/10 transition-all border border-dashed border-primary/20"
                  >
                    <Plus className="h-4 w-4" />
                    Add Position
                  </Button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={item.id} 
                      className={cn(
                        "group relative p-8 rounded-[2.5rem] border transition-all",
                        item.isDeliveryField 
                          ? "bg-primary/[0.03] border-primary/10 ring-1 ring-primary/5" 
                          : "bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-md"
                      )}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                        <div className="md:col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block text-center">Qty</Label>
                          <Input 
                            type="number" 
                            min="1"
                            step="any"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            disabled={item.isDeliveryField}
                            className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-black text-center text-lg focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Product Name</Label>
                          <Input 
                            placeholder="e.g. Signature Platter"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            disabled={item.isDeliveryField}
                            className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-bold placeholder:font-medium focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Unit Price</Label>
                          <div className="relative group/price">
                            <Input 
                              type="number" 
                              step="0.01"
                              value={item.amount === 0 ? '' : item.amount}
                              onChange={(e) => updateItem(item.id, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none font-black pr-12 text-lg focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="absolute right-4 top-4.5 text-[10px] font-black text-slate-400">AED</span>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Line Total</Label>
                          <div className="h-14 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center font-black text-slate-900 dark:text-white text-lg">
                            {((parseFloat(item.qty.toString()) || 0) * (parseFloat(item.amount.toString()) || 0)).toFixed(2)}
                          </div>
                        </div>
                        <div className="md:col-span-1 flex justify-end pb-1.5 text-center">
                          {!item.isDeliveryField && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="h-12 w-12 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            >
                              <Trash2 className="h-6 w-6" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {!item.isDeliveryField && (
                        <div className="mt-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Special Item Notes</Label>
                          <Input 
                            placeholder="e.g. No onions, Well done, Extra sauce..."
                            value={item.notes}
                            onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                            className="h-11 rounded-xl bg-slate-50 dark:bg-slate-800/20 border-none font-medium text-[11px] text-slate-500 focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            </div>

            {/* Configuration Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <Card className="p-10 rounded-[3rem] border-none shadow-[0_20px_60px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900 sticky top-10">
                <div className="space-y-12">
                  {/* Method Selector */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-slate-900 dark:text-white" />
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Service Method</Label>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                      <button
                        onClick={() => setDynamicFormValues(prev => ({ ...prev, orderType: 'Pick Up' }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 h-14 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all",
                          dynamicFormValues.orderType === 'Pick Up' ? "bg-white dark:bg-slate-700 shadow-xl text-slate-900 dark:text-white scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Pick Up
                      </button>
                      <button
                        onClick={() => setDynamicFormValues(prev => ({ ...prev, orderType: 'Delivery' }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 h-14 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all",
                          dynamicFormValues.orderType === 'Delivery' ? "bg-white dark:bg-slate-700 shadow-xl text-slate-900 dark:text-white scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <Truck className="h-4 w-4" />
                        Delivery
                      </button>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-5 w-5 text-slate-900 dark:text-white" />
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Payment Authority</Label>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem]">
                      <button
                        onClick={() => setDynamicFormValues(prev => ({ ...prev, paymentStatus: 'Paid' }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 h-14 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all",
                          dynamicFormValues.paymentStatus === 'Paid' ? "bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Captured
                      </button>
                      <button
                        onClick={() => setDynamicFormValues(prev => ({ ...prev, paymentStatus: 'Unpaid' }))}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 h-14 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all",
                          dynamicFormValues.paymentStatus === 'Unpaid' ? "bg-rose-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)]" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <XCircle className="h-4 w-4" />
                        Pending
                      </button>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Subtotal</span>
                        <span className="text-lg font-black text-slate-600 dark:text-white">{(totalAmount - (dynamicFormValues.orderType === 'Delivery' ? 1 : 0)).toFixed(2)}</span>
                      </div>
                      {dynamicFormValues.orderType === 'Delivery' && (
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Logistics Fee</span>
                          <span className="text-lg font-black text-primary">1.00</span>
                        </div>
                      )}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-800 mt-6 shadow-inner">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Grand Total Amount</span>
                        <div className="flex items-end gap-2">
                          <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{totalAmount.toFixed(2)}</span>
                          <span className="text-sm font-black text-slate-400 mb-2">AED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 px-1">
                      <FileText className="h-4 w-4 text-primary" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collaborative Notes</Label>
                    </div>
                    <div 
                      contentEditable
                      onInput={(e) => setDynamicFormValues(prev => ({ ...prev, generalNotes: e.currentTarget.textContent || '' }))}
                      className="min-h-[160px] bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] text-sm font-bold leading-relaxed dark:text-slate-300 focus:outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all border border-slate-100 dark:border-slate-700/50 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 italic"
                      data-placeholder="Define any critical kitchen instructions or logistical edge cases here..."
                    />
                  </div>

                  <Button 
                    onClick={handleSubmit}
                    className="w-full h-20 rounded-[2.2rem] bg-primary hover:bg-primary/90 text-white font-black tracking-widest uppercase text-sm shadow-[0_25px_60px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98] flex gap-4 group"
                  >
                    Confirm Pre-Order Position
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* Step 3: Branch Orders View - NOW AS A MAIN TAB */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/5">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Orders Record</h2>
                  <p className="text-sm font-medium text-slate-400">Viewing active orders for <span className="text-slate-900 dark:text-white font-black">{dynamicFormValues.branch || 'All Locations'}</span></p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                 <Select 
                    onValueChange={(v) => {
                      setDynamicFormValues(prev => ({ ...prev, brand: v, branch: '' }));
                    }} 
                    value={dynamicFormValues.brand || ""}
                    disabled={profile?.role === 'restaurant_user' && !!profile.brand}
                  >
                    <SelectTrigger className="h-12 w-48 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
 
                   <Select 
                    onValueChange={(v) => setDynamicFormValues(prev => ({ ...prev, branch: v }))} 
                    value={dynamicFormValues.branch || ""} 
                    disabled={!dynamicFormValues.brand || (profile?.role === 'restaurant_user' && !!profile.branch)}
                  >
                    <SelectTrigger className="h-12 w-48 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold disabled:opacity-30">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {dynamicFormValues.brand && brandsBranches[dynamicFormValues.brand]?.map((b: string) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {existingOrders.length === 0 ? (
                <div className="col-span-full p-20 text-center rounded-[3rem] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="h-10 w-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Orders Found</h3>
                  <p className="text-slate-400 font-medium max-w-sm mx-auto">Select a brand and branch above or create a new order to see results here.</p>
                </div>
              ) : (
                existingOrders.map((order) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={order.id} 
                    onClick={() => handleOrderClick(order)}
                    className="group relative p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden"
                  >
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-3xl transition-all group-hover:bg-primary/10" />
                    
                    <div className="relative space-y-6">
                      {/* Card Header: ID and Status */}
                      <div className="flex items-center justify-between">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[9px] font-black tracking-tighter text-slate-400 uppercase">Order</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-white">#{order.id.toString().slice(-4)}</span>
                        </div>
                        <Badge 
                          variant={order.paymentStatus === 'Paid' ? 'secondary' : 'destructive'} 
                          className={cn(
                            "text-[8px] px-3 py-1 rounded-lg font-black uppercase tracking-[0.15em] shadow-sm",
                            order.paymentStatus === 'Paid' 
                              ? "bg-emerald-500 text-white border-none" 
                              : "bg-rose-500 text-white border-none"
                          )}
                        >
                           {order.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                            {order.customerName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <p className="text-[10px] text-slate-400 font-bold tracking-wide">{order.customerPhone}</p>
                          </div>
                        </div>
                        
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Date</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-700 dark:text-slate-200 leading-none">
                              {order.date}
                            </p>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/50 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Time</span>
                            </div>
                            <p className="text-[9px] font-black text-slate-700 dark:text-slate-200 leading-none">
                              {order.time}
                            </p>
                          </div>
                        </div>

                        {/* Creator Tag - Added this */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800">
                          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <User className="h-3 w-3 text-slate-400" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Dispatcher</span>
                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{order.creatorUsername || 'System'}</span>
                          </div>
                        </div>

                        {/* Logistics Tags */}
                        <div className="flex flex-wrap gap-1.5">
                           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.03] border border-primary/10 text-[8px] font-black text-primary uppercase tracking-widest">
                              <Truck className="h-2.5 w-2.5" />
                              {order.orderType}
                           </div>
                           <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              <MapPin className="h-2.5 w-2.5" />
                              {order.branch}
                           </div>
                        </div>
                      </div>

                      {/* Footer: Amount and Action */}
                      <div className="pt-6 mt-4 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-300">Amount</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{order.totalAmount.toFixed(2)}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase">AED</span>
                          </div>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:scale-105 transition-all duration-500 flex items-center justify-center shadow-inner">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-none bg-slate-50 dark:bg-slate-900">
          {selectedOrder && (
            <div className="flex flex-col h-[85vh]">
              {/* Header */}
              <div className="p-8 bg-white dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      #{selectedOrder.id.toString().slice(-3)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedOrder.customerName || selectedOrder.customer}</h3>
                      <p className="text-sm font-bold text-slate-400">{selectedOrder.customerPhone || selectedOrder.phone}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={selectedOrder.paymentStatus === 'Paid' ? 'secondary' : 'destructive'} 
                    className={cn(
                      "text-[10px] px-4 py-2 rounded-full font-black uppercase tracking-widest",
                      selectedOrder.paymentStatus === 'Paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""
                    )}
                  >
                    {selectedOrder.paymentStatus === 'Paid' ? 'Captured' : 'Pending'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Date</p>
                    <p className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                       <CalendarIcon className="h-3.5 w-3.5" />
                       {selectedOrder.date}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time</p>
                    <p className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                       <Clock className="h-3.5 w-3.5" />
                       {selectedOrder.time}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</p>
                    <p className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                       <Truck className="h-3.5 w-3.5" />
                       {selectedOrder.orderType}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Branch</p>
                    <p className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                       <MapPin className="h-3.5 w-3.5" />
                       {selectedOrder.branch}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Order Line Items</h4>
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center font-black text-slate-400">
                        {item.qty}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        {item.notes && <p className="text-xs font-medium text-slate-400 italic">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 dark:text-white capitalize">{(item.amount * item.qty).toFixed(2)} AED</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.qty} x {item.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer / Notes */}
              <div className="p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 space-y-6">
                {(selectedOrder.generalNotes || selectedOrder.notes) && (
                  <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Administrative Notes</p>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{selectedOrder.generalNotes || selectedOrder.notes}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grand Total</p>
                    <p className="text-3xl font-black text-primary">{selectedOrder.totalAmount?.toFixed(2)} <span className="text-sm">AED</span></p>
                  </div>
                  <Button 
                    onClick={() => setIsDetailsOpen(false)}
                    className="h-14 px-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                  >
                    Close Portal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreOrder;
