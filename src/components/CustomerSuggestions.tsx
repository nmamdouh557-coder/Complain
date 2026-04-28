import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Lightbulb, 
  Send, 
  Trash2, 
  Calendar, 
  User, 
  Phone, 
  Plus, 
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Suggestion } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const suggestionSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  customerPhone: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  description: z.string().min(5, 'Description is required'),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;

export function CustomerSuggestions() {
  const { t, language } = useApp();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema)
  });

  useEffect(() => {
    fetchSuggestions();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const configs = await api.getConfigs();
      const brandConfig = configs.find(c => c.key === 'brands');
      if (brandConfig) setBrands(brandConfig.value);
    } catch (error) {
      console.error('Fetch config error:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const data = await api.getSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error('Fetch errors:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SuggestionFormData) => {
    try {
      if (!user) return;
      
      await api.createSuggestion({
        ...data,
        title: data.brand, // Use brand as title for backward compatibility if needed
        createdBy: user.id,
        creatorUsername: user.username,
      });
      
      toast.success(t('suggestion_saved'));
      reset();
      setActiveTab('manage');
      fetchSuggestions();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save suggestion');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('suggestion_delete_confirm'))) return;
    
    try {
      await api.deleteSuggestion(id);
      toast.success('Suggestion deleted');
      if (selectedSuggestion?.id === id) setSelectedSuggestion(null);
      fetchSuggestions();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete suggestion');
    }
  };

  const [activeTab, setActiveTab] = useState<'submit' | 'manage'>('submit');

  const filteredSuggestions = suggestions.filter((s) =>
    (s.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-200/50 dark:shadow-none">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
              {t('customer_suggestions')}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
            Manage and track customer suggestions and feedback. Transform ideas into actionable improvements for a better customer experience.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('submit')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
            activeTab === 'submit' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Submit Suggestion
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'manage' 
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Manage Suggestions
          {suggestions.length > 0 && (
            <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] px-2 py-0.5 rounded-full">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      <div className="pt-4">
        {activeTab === 'submit' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Lightbulb className="w-64 h-64 text-slate-900 dark:text-white" />
              </div>
              
              <div className="flex flex-col gap-2 mb-10 relative z-10">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Share your idea</h2>
                <p className="text-slate-500 text-sm">Fill out the form below to submit a new improvement suggestion.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <User className="w-3 h-3" />
                       {t('customer_name')}
                    </label>
                    <input
                      {...register('customerName')}
                      placeholder="e.g. John Doe"
                      className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2 text-sm ring-offset-white transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:bg-white dark:focus:bg-slate-900 font-bold"
                    />
                    {errors.customerName && (
                      <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-rose-500" />
                        {errors.customerName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {t('customer_phone')} <span className="opacity-50 italic text-[10px]">({t('optional')})</span>
                    </label>
                    <input
                      {...register('customerPhone')}
                      placeholder="e.g. 0123456789"
                      className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2 text-sm ring-offset-white transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:bg-white dark:focus:bg-slate-900 font-bold"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Filter className="w-3 h-3" />
                      {t('brand')}
                    </label>
                    <select
                      {...register('brand')}
                      className="flex h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2 text-sm ring-offset-white transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:bg-white dark:focus:bg-slate-900 font-bold appearance-none"
                    >
                      <option value="">Select Brand</option>
                      {brands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                    {errors.brand && (
                      <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-rose-500" />
                        {errors.brand.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Filter className="w-3 h-3" />
                      {t('suggestion_description')}
                    </label>
                    <textarea
                      {...register('description')}
                      rows={5}
                      placeholder="Provide more details about the suggestion..."
                      className="flex w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-3 text-sm ring-offset-white transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:bg-white dark:focus:bg-slate-900 resize-none font-medium"
                    />
                    {errors.description && (
                      <p className="text-xs font-medium text-rose-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-rose-500" />
                        {errors.description.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white shadow-sm"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Suggestions List
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[600px] flex-1">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400 italic">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 dark:border-slate-800 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
                      Loading...
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic flex flex-col items-center">
                      <Filter className="w-10 h-10 mb-3 opacity-20" />
                      {t('no_suggestions')}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => setSelectedSuggestion(suggestion)}
                          className={cn(
                            "w-full text-left p-5 transition-all group relative",
                            selectedSuggestion?.id === suggestion.id 
                              ? "bg-slate-50 dark:bg-slate-800/50" 
                              : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          )}
                        >
                          {selectedSuggestion?.id === suggestion.id && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900 dark:bg-white" 
                            />
                          )}
                          
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1 pr-6 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors uppercase italic tracking-tight">
                            {suggestion.brand || 'No Brand'}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <User className="w-3 h-3 opacity-50" />
                              <span className="truncate max-w-[120px]">{suggestion.customerName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-black font-mono text-slate-400 dark:text-slate-500">
                              <Calendar className="w-3 h-3 opacity-50" />
                              {format(new Date(suggestion.date), 'MMM dd')}
                            </div>
                          </div>
                          
                          <ChevronRight className={cn(
                            "absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-slate-900 dark:group-hover:text-white transition-all",
                            selectedSuggestion?.id === suggestion.id && "text-slate-900 dark:text-white translate-x-1"
                          )} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {selectedSuggestion ? (
                  <motion.div
                    key={selectedSuggestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-10 space-y-10 shadow-sm min-h-[500px] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150">
                      <Lightbulb className="w-64 h-64 text-slate-900 dark:text-white" />
                    </div>

                    <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full w-fit text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(selectedSuggestion.date), 'PPPP p')}
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic leading-tight tracking-tighter">
                          {selectedSuggestion.brand || 'No Brand'}
                        </h2>
                      </div>
                      
                      <div className="flex gap-2">
                        {(user?.role === 'admin' || user?.role === 'supervisor' || user?.id === selectedSuggestion.createdBy) && (
                          <button
                            onClick={() => handleDelete(selectedSuggestion.id)}
                            className="h-10 w-10 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90 border border-rose-100 dark:border-rose-900/30"
                            title={t('delete')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-y border-slate-100 dark:border-slate-800 relative z-10">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2 block">
                            Customer Identity
                          </label>
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{t('customer')}</div>
                              <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedSuggestion.customerName}</div>
                            </div>
                          </div>
                        </div>
                        
                        {selectedSuggestion.customerPhone && (
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2 block">
                              Contact Info
                            </label>
                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <Phone className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{t('customer_phone')}</div>
                                <div className="font-black font-mono text-slate-900 dark:text-white tracking-wider">{selectedSuggestion.customerPhone}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2 block">
                            Source Agent
                          </label>
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                              <Plus className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{t('created_by')}</div>
                              <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedSuggestion.creatorUsername}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="h-0.5 w-8 bg-amber-500 rounded-full" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">
                          Suggestion Content
                        </h3>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950 p-8 rounded-3xl whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 text-xl font-medium italic">
                        "{selectedSuggestion.description}"
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] p-20 flex flex-col items-center justify-center text-center space-y-6 h-full min-h-[500px]">
                    <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200/50 dark:shadow-none animate-bounce duration-[3000ms]">
                      <Lightbulb className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">{t('view_suggestion')}</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Select a suggestion from the list to view its full details and customer information
                      </p>
                    </div>
                    <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
