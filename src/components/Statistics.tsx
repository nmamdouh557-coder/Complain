import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  Filter,
  ChevronRight,
  Download,
  TrendingUp,
  ArrowsUpFromLine,
  TrendingDown,
  Clock,
  History as HistoryIcon,
  Building2,
  PieChart as PieChartIcon,
  LayoutGrid,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Utensils,
  Layers,
  Package,
  Zap,
  Sparkles,
  Activity,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, subMonths, startOfMonth, endOfMonth, differenceInHours, getHours, getDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function Statistics() {
  const { profile } = useAuth();
  
  // Theme check for charts
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Optional: listen for changes if next-themes is used or similar
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedBrand, setSelectedBrand] = useState<string>(profile?.role === 'restaurant_user' ? profile.brand || "all" : "all");
  const [selectedBranch, setSelectedBranch] = useState<string>(profile?.role === 'restaurant_user' ? profile.branch || "all" : "all");
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Top Analysis States
  const [topAnalysisBrand, setTopAnalysisBrand] = useState<string>('all');
  const [topAnalysisBranch, setTopAnalysisBranch] = useState<string>('all');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
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

  // Filtered Data
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const createdAt = parseISO(c.createdAt);
      const now = new Date();
      
      // Date Filter
      let dateMatch = true;
      if (dateRange === 'today') {
        dateMatch = isWithinInterval(createdAt, { start: startOfDay(now), end: endOfDay(now) });
      } else if (dateRange === 'week') {
        dateMatch = isWithinInterval(createdAt, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
      } else if (dateRange === 'month') {
        dateMatch = isWithinInterval(createdAt, { start: startOfMonth(now), end: endOfMonth(now) });
      }

      // Brand Filter
      const brandMatch = selectedBrand === 'all' || c.brand === selectedBrand;
      
      // Branch Filter
      const branchMatch = selectedBranch === 'all' || c.branch === selectedBranch;
      
      // Type Filter
      const typeMatch = selectedType === 'all' || c.typeOfComplaint === selectedType;

      // Search Filter
      const searchMatch = !searchQuery || 
        c.complaintNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase());

      return dateMatch && brandMatch && branchMatch && typeMatch && searchMatch;
    });
  }, [complaints, dateRange, selectedBrand, selectedBranch, selectedType, searchQuery]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = filteredComplaints.length;
    const now = new Date();
    const today = filteredComplaints.filter(c => isWithinInterval(parseISO(c.createdAt), { start: startOfDay(now), end: endOfDay(now) })).length;
    const yesterday = complaints.filter(c => isWithinInterval(parseISO(c.createdAt), { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) })).length;
    
    const changeToday = yesterday === 0 ? 100 : ((today - yesterday) / yesterday) * 100;
    
    const thisMonth = filteredComplaints.filter(c => isWithinInterval(parseISO(c.createdAt), { start: startOfMonth(now), end: endOfMonth(now) })).length;
    
    const open = filteredComplaints.filter(c => c.status !== 'Closed').length;
    const closed = filteredComplaints.filter(c => c.status === 'Closed').length;
    
    const branches = new Set(filteredComplaints.map(c => c.branch));
    const avgPerBranch = branches.size === 0 ? 0 : (total / branches.size).toFixed(1);

    // Highest Day
    const dayCounts: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      const day = format(parseISO(c.createdAt), 'yyyy-MM-dd');
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const highestDayEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const highestDay = highestDayEntry ? { date: highestDayEntry[0], count: highestDayEntry[1] } : { date: 'N/A', count: 0 };

    // Resolution Time
    const resolvedComplaints = filteredComplaints.filter(c => c.status === 'Closed' && c.resolvedAt);
    const avgResolutionTime = resolvedComplaints.length === 0 ? 0 : 
      (resolvedComplaints.reduce((acc, c) => acc + differenceInHours(parseISO(c.resolvedAt!), parseISO(c.createdAt)), 0) / resolvedComplaints.length).toFixed(1);

    return { total, today, changeToday, thisMonth, open, closed, avgPerBranch, avgResolutionTime, highestDay };
  }, [filteredComplaints, complaints]);

  // Chart Data: Trend with Brand Breakdown
  const trendData = useMemo(() => {
    const days = 14;
    const data = [];
    const brands = Array.from(new Set(filteredComplaints.map(c => c.brand)));
    
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      const dayComplaints = filteredComplaints.filter(c => format(parseISO(c.createdAt), 'MMM dd') === dateStr);
      
      const entry: any = { date: dateStr, total: dayComplaints.length };
      brands.forEach(brand => {
        entry[brand] = dayComplaints.filter(c => c.brand === brand).length;
      });
      data.push(entry);
    }
    return { data, brands };
  }, [filteredComplaints]);

  // Chart Data: Brand Distribution
  const brandData = useMemo(() => {
    const brands: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      brands[c.brand] = (brands[c.brand] || 0) + 1;
    });
    return Object.entries(brands)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  // Chart Data: Category Distribution
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      const cat = c.typeOfComplaint || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  // Chart Data: Hourly Distribution
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredComplaints.forEach(c => {
      const hour = getHours(parseISO(c.createdAt));
      hours[hour]++;
    });
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [filteredComplaints]);

  // Branch Rankings & Improvement
  const branchMetrics = useMemo(() => {
    const branches: Record<string, { total: number, today: number, lastWeek: number, prevWeek: number }> = {};
    const now = new Date();
    const lastWeekStart = startOfDay(subDays(now, 7));
    const prevWeekStart = startOfDay(subDays(now, 14));
    
    complaints.forEach(c => {
      if (!branches[c.branch]) branches[c.branch] = { total: 0, today: 0, lastWeek: 0, prevWeek: 0 };
      const createdAt = parseISO(c.createdAt);
      
      branches[c.branch].total++;
      if (isWithinInterval(createdAt, { start: startOfDay(now), end: endOfDay(now) })) {
        branches[c.branch].today++;
      }
      if (isWithinInterval(createdAt, { start: lastWeekStart, end: endOfDay(now) })) {
        branches[c.branch].lastWeek++;
      }
      if (isWithinInterval(createdAt, { start: prevWeekStart, end: endOfDay(subDays(now, 8)) })) {
        branches[c.branch].prevWeek++;
      }
    });

    return Object.entries(branches)
      .map(([name, stats]) => {
        const change = stats.prevWeek === 0 ? (stats.lastWeek > 0 ? 100 : 0) : ((stats.lastWeek - stats.prevWeek) / stats.prevWeek) * 100;
        return { name, ...stats, change };
      })
      .sort((a, b) => b.total - a.total);
  }, [complaints]);

  const platformDataPowerBI = useMemo(() => {
    const platforms = ['Talabat', 'Keeta', 'Deliveroo', 'Other'];
    return platforms.map(p => ({
      name: p,
      val: filteredComplaints.filter(c => 
        p === 'Other' 
          ? !['talabat', 'keeta', 'deliveroo'].includes(c.platform?.toLowerCase() || '')
          : c.platform?.toLowerCase() === p.toLowerCase()
      ).length
    })).sort((a, b) => b.val - a.val);
  }, [filteredComplaints]);

  const categoryDataPowerBI = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      const cat = c.typeOfComplaint || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([cat, val]) => ({ 
        cat, 
        val
      }))
      .sort((a, b) => b.val - a.val);
  }, [filteredComplaints]);

  // Dynamic Keywords
  const keywords = useMemo(() => {
    const words: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      const text = `${c.title} ${c.typeOfComplaint}`.toLowerCase();
      const commonWords = ['the', 'and', 'for', 'with', 'was', 'not', 'from', 'this', 'that', 'have', 'been', 'n/a', 'undefined', 'null'];
      text.split(/\s+/).forEach(word => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length > 3 && !commonWords.includes(cleanWord)) {
          words[cleanWord] = (words[cleanWord] || 0) + 1;
        }
      });
    });
    return Object.entries(words)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredComplaints]);

  const [selectedBranchForModal, setSelectedBranchForModal] = useState<string | null>(null);

  const branchComplaints = useMemo(() => {
    if (!selectedBranchForModal) return [];
    return filteredComplaints.filter(c => c.branch === selectedBranchForModal);
  }, [filteredComplaints, selectedBranchForModal]);

  const aiInsight = useMemo(() => {
    if (keywords.length === 0) return "No significant trends identified yet.";
    const topKeyword = keywords[0].text;
    const topBrand = brandData[0]?.name || "all brands";
    const peakHour = hourlyData.sort((a, b) => b.count - a.count)[0]?.hour;
    
    return `"${topKeyword}" is the most frequent issue this period, primarily affecting ${topBrand}. Peak activity is observed around ${peakHour}. Consider targeted training or process review in these areas.`;
  }, [keywords, brandData, hourlyData]);

  const brandsForFilter = useMemo(() => Array.from(new Set(complaints.map(c => c.brand))), [complaints]);
  const allBranches = useMemo(() => Array.from(new Set(complaints.map(c => c.branch))), [complaints]);
  const branchesForActiveBrand = useMemo(() => {
    if (topAnalysisBrand === 'all') return Array.from(new Set(complaints.map(c => c.branch)));
    return Array.from(new Set(complaints.filter(c => c.brand === topAnalysisBrand).map(c => c.branch)));
  }, [complaints, topAnalysisBrand]);

  const branchesForSelectedBrand = useMemo(() => {
    if (selectedBrand === 'all') return Array.from(new Set(complaints.map(c => c.branch)));
    return Array.from(new Set(complaints.filter(c => c.brand === selectedBrand).map(c => c.branch)));
  }, [complaints, selectedBrand]);

  const topAnalysisData = useMemo(() => {
    const filtered = complaints.filter(c => {
      const brandMatch = topAnalysisBrand === 'all' || c.brand === topAnalysisBrand;
      const branchMatch = topAnalysisBranch === 'all' || c.branch === topAnalysisBranch;
      return brandMatch && branchMatch;
    });

    if (filtered.length === 0) return null;

    // Top Item
    const itemCounts: Record<string, number> = {};
    filtered.forEach(c => {
      const item = c.item || 'Unknown Item';
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topItem = sortedItems[0];

    if (!topItem) return null;

    // Top Complaint Type for that Item
    const itemComplaints = filtered.filter(c => (c.item || 'Unknown Item') === topItem[0]);
    const typeCounts: Record<string, number> = {};
    itemComplaints.forEach(c => {
      const type = c.typeOfComplaint || 'Unknown Type';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const topType = sortedTypes[0];

    const chartData = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      topItem: { name: topItem[0], count: topItem[1] },
      topType: topType ? { name: topType[0], count: topType[1] } : null,
      chartData
    };
  }, [complaints, topAnalysisBrand, topAnalysisBranch]);

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Raw Complaints Data
    const rawWorksheet = XLSX.utils.json_to_sheet(filteredComplaints.map(c => ({
      'Complaint #': c.complaintNumber,
      'Date': format(parseISO(c.createdAt), 'yyyy-MM-dd HH:mm'),
      'Customer': c.customerName,
      'Phone': c.customerPhone,
      'Brand': c.brand,
      'Branch': c.branch,
      'Category': c.title,
      'Case Type': c.caseType,
      'Item': c.item,
      'Type': c.typeOfComplaint || 'N/A',
      'Status': c.status,
      'Closed By': c.closedByUsername || 'N/A',
      'Resolution Time (hrs)': c.resolvedAt ? differenceInHours(parseISO(c.resolvedAt), parseISO(c.createdAt)) : 'N/A',
      'Notes': c.notes
    })));
    XLSX.utils.book_append_sheet(workbook, rawWorksheet, "Complaints Data");

    // 2. Overview & KPIs
    const kpiData = [
      { Metric: 'Total Complaints', Value: kpis.total },
      { Metric: 'This Month', Value: kpis.thisMonth },
      { Metric: 'Highest Day Volume', Value: kpis.highestDay.count },
      { Metric: 'Highest Day Date', Value: kpis.highestDay.date },
      { Metric: 'Avg Resolution Time (hrs)', Value: kpis.avgResolutionTime },
      { Metric: 'Open Cases', Value: kpis.open },
      { Metric: 'Closed Cases', Value: kpis.closed },
      { Metric: 'Avg Complaints Per Branch', Value: kpis.avgPerBranch }
    ];
    const kpiWorksheet = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(workbook, kpiWorksheet, "Overview & KPIs");

    // 3. Brands & Categories Analysis
    const brandCategoryData = [
      { Section: 'BRANDS DISTRIBUTION', Name: '', Value: '' },
      ...brandData.map(b => ({ Section: '', Name: b.name, Value: b.value })),
      { Section: '', Name: '', Value: '' },
      { Section: 'CATEGORIES DISTRIBUTION', Name: '', Value: '' },
      ...categoryData.map(c => ({ Section: '', Name: c.name, Value: c.value }))
    ];
    const brandCatWorksheet = XLSX.utils.json_to_sheet(brandCategoryData);
    XLSX.utils.book_append_sheet(workbook, brandCatWorksheet, "Brand & Categories");

    // 4. Branch Performance
    const branchesWorksheet = XLSX.utils.json_to_sheet(branchMetrics.map(b => ({
      'Branch Name': b.name,
      'Today': b.today,
      'Total Complaints': b.total,
      'Last Week': b.lastWeek,
      'Prev Week': b.prevWeek,
      'Status': b.total > 20 ? 'High' : b.total > 10 ? 'Medium' : 'Low',
      'Growth Trend (%)': b.change.toFixed(2) + '%'
    })));
    XLSX.utils.book_append_sheet(workbook, branchesWorksheet, "Branch Metrics");

    // 5. Time Analysis
    const weeklyData = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => ({
      Day: day,
      Complaints: filteredComplaints.filter(c => getDay(parseISO(c.createdAt)) === i).length
    }));
    
    const timeAnalysisData = [
      { Type: 'PERIODIC PEAKS (HOURLY)', Label: '', Volume: '' },
      ...hourlyData.map(h => ({ Type: '', Label: h.hour, Volume: h.count })),
      { Type: '', Label: '', Volume: '' },
      { Type: 'WEEKLY DISTRIBUTION', Label: '', Volume: '' },
      ...weeklyData.map(w => ({ Type: '', Label: w.Day, Volume: w.Complaints }))
    ];
    const timeWorksheet = XLSX.utils.json_to_sheet(timeAnalysisData);
    XLSX.utils.book_append_sheet(workbook, timeWorksheet, "Time Analysis");

    // 6. Deep Dive & Keywords
    const keywordWorksheet = XLSX.utils.json_to_sheet(keywords.map(k => ({
      'Keyword/Theme': k.text,
      'Frequency': k.count
    })));
    XLSX.utils.book_append_sheet(workbook, keywordWorksheet, "Deep Dive Insights");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(fileData, `Advanced_Analytics_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const [activeTab, setActiveTabInternal] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse transition-colors">Generating advanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20 w-full max-w-[1800px] mx-auto"
    >
      {/* Header & Global Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl transition-all w-full">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-2xl transition-all shadow-xl shadow-slate-200 dark:shadow-none animate-in fade-in zoom-in duration-500">
              <BarChart3 className="h-8 w-8 text-white dark:text-slate-100 transition-colors" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors italic uppercase">Analytics Workspace</h1>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] transition-colors">Business Intelligence Ecosystem</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-1.5 border border-slate-100 dark:border-slate-800 transition-colors backdrop-blur-xl">
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  dateRange === range 
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-100 dark:ring-slate-700 scale-105" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          
          <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden xl:block" />

          <Button 
            onClick={exportToExcel}
            variant="outline" 
            className="h-12 px-8 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-[0.3em] gap-3 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 rounded-2xl transition-all shadow-lg active:scale-95"
          >
            <Download className="h-4 w-4" />
            Database Export
          </Button>
        </div>
      </div>

      {/* Main Analytics Tabs - Vertical Layout Transformation */}
      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTabInternal}
        className="flex flex-col lg:flex-row gap-8 w-full outline-none items-start"
      >
        <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-8 animate-in fade-in slide-in-from-left duration-700">
          <div className="bg-white dark:bg-slate-950/50 p-3 rounded-[2.5rem] border border-slate-100 dark:border-slate-900 shadow-2xl backdrop-blur-xl transition-all">
            <TabsList className="bg-transparent flex flex-col h-auto w-full gap-2 p-0">
              <TabsTrigger 
                value="overview" 
                className="w-full justify-start gap-4 h-14 data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-slate-900 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm group"
              >
                <LayoutDashboard className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="brands" 
                className="w-full justify-start gap-4 h-14 data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-slate-900 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm group"
              >
                <Building2 className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                Brands & Branches
              </TabsTrigger>
              <TabsTrigger 
                value="deep-dive" 
                className="w-full justify-start gap-4 h-14 data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-slate-900 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm group"
              >
                <Layers className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                Deep Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="time" 
                className="w-full justify-start gap-4 h-14 data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-slate-900 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm group"
              >
                <Clock className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                Time Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="top-complaints" 
                className="w-full justify-start gap-4 h-14 data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-slate-900 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm group"
              >
                <AlertCircle className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                Top Complaints
              </TabsTrigger>
              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <TabsTrigger 
                  value="power-bi" 
                  className="w-full justify-start gap-4 h-14 data-[state=active]:bg-emerald-600 dark:data-[state=active]:bg-emerald-400 data-[state=active]:text-white dark:data-[state=active]:text-slate-950 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest transition-all bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 group"
                >
                  <BarChart3 className="h-4 w-4 opacity-50 group-data-[state=active]:opacity-100" />
                  Power BI
                </TabsTrigger>
              </div>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 w-full lg:min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
            <TabsContent value="overview" className="space-y-6 mt-0 w-full outline-none">
              {/* KPI Grid - Only in Overview for focused view */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                  title="Total Complaints" 
                  value={kpis.total} 
                  icon={LayoutGrid}
                  trend={kpis.changeToday}
                  trendLabel="vs yesterday"
                  color="slate"
                />
                <KpiCard 
                  title="This Month" 
                  value={kpis.thisMonth} 
                  icon={Calendar}
                  subtitle={`Highest: ${kpis.highestDay.count} (${kpis.highestDay.date})`}
                  color="blue"
                />
                <KpiCard 
                  title="Avg Resolution" 
                  value={`${kpis.avgResolutionTime}h`} 
                  icon={Clock}
                  subtitle="Time to close"
                  color="emerald"
                />
                <KpiCard 
                  title="Open Cases" 
                  value={kpis.open} 
                  icon={AlertCircle}
                  trend={-(kpis.open / (kpis.total || 1) * 100)}
                  trendLabel="of total"
                  color="rose"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                {/* Trend Chart */}
                <Card className="lg:col-span-8 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
                  <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Complaints Trend by Brand</CardTitle>
                      <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Daily volume over the last 14 days</CardDescription>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="h-[450px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData.data}>
                          <defs>
                            {trendData.brands.map((brand, i) => (
                              <linearGradient key={brand} id={`color${brand}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '20px', 
                              border: 'none', 
                              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', 
                              fontSize: '12px',
                              padding: '16px',
                              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                              color: isDarkMode ? '#f8fafc' : '#0f172a'
                            }}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, paddingBottom: '30px', textTransform: 'uppercase' }} />
                          {trendData.brands.map((brand, i) => (
                            <Area 
                              key={brand}
                              type="monotone" 
                              dataKey={brand} 
                              stackId="1"
                              stroke={COLORS[i % COLORS.length]} 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill={`url(#color${brand})`} 
                              animationDuration={1500}
                            />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Distribution */}
                <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl transition-all hover:shadow-2xl">
                  <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8 transition-colors">
                    <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Brand Distribution</CardTitle>
                    <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Complaints share by brand</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 transition-colors">
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={brandData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            paddingAngle={8}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {brandData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '20px', 
                              border: 'none', 
                              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', 
                              fontSize: '12px',
                              padding: '16px'
                            }}
                          />
                          <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-10 space-y-4">
                      {brandData.slice(0, 4).map((brand, i) => (
                        <div key={brand.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i] }} />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 transition-colors uppercase tracking-tight">{brand.name}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">{brand.value}</span>
                            <span className="text-[10px] font-bold text-slate-400 transition-colors">{((brand.value / (kpis.total || 1)) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                {/* Ranking Tables - Wider Layout */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 flex flex-row items-center justify-between transition-colors">
                <div>
                  <CardTitle className="text-[13px] font-bold text-slate-900 dark:text-white">Top 10 Branches (Complaints)</CardTitle>
                  <CardDescription className="text-[11px] text-slate-400 dark:text-slate-500">Branches with highest volume</CardDescription>
                </div>
                <MapPin className="h-4 w-4 text-slate-300 dark:text-slate-600 transition-colors" />
              </CardHeader>
              <CardContent className="p-0 transition-colors">
                <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                  {branchMetrics.slice(0, 10).map((branch, i) => (
                    <div key={branch.name} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-4 transition-colors">#{i + 1}</span>
                        <div className="space-y-0.5 transition-colors">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{branch.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Branch Performance</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Today</p>
                          <p className={cn("text-sm font-black transition-colors", branch.today > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-600")}>{branch.today}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Total</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white transition-colors">{branch.total}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bottom 10 Branches */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 flex flex-row items-center justify-between transition-colors">
                <div>
                  <CardTitle className="text-[13px] font-bold text-slate-900 dark:text-white">Bottom 10 Branches (Complaints)</CardTitle>
                  <CardDescription className="text-[11px] text-slate-400 dark:text-slate-500">Branches with lowest volume</CardDescription>
                </div>
                <MapPin className="h-4 w-4 text-slate-300 dark:text-slate-600 transition-colors" />
              </CardHeader>
              <CardContent className="p-0 transition-colors">
                <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                  {[...branchMetrics].reverse().slice(0, 10).map((branch, i) => (
                    <div key={branch.name} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4 transition-colors">
                        <span className="text-xs font-black text-slate-300 dark:text-slate-700 w-4 transition-colors">#{branchMetrics.length - i}</span>
                        <div className="space-y-0.5 transition-colors">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{branch.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Branch Performance</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 transition-colors">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">Total</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white transition-colors">{branch.total}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

            <TabsContent value="brands" className="space-y-8 mt-0 w-full outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                {/* Brand List with Drill-down */}
                <Card className="lg:col-span-3 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
                  <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8 transition-colors">
                    <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Brand Selector</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 transition-colors">
                    <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                      {brandData.map((brand) => (
                        <motion.div 
                          key={brand.name} 
                          whileHover={{ x: 5 }}
                          onClick={() => {
                            if (profile?.role === 'restaurant_user') return;
                            setSelectedBrand(selectedBrand === brand.name ? 'all' : brand.name);
                          }}
                          className={cn(
                            "p-5 px-8 flex items-center justify-between cursor-pointer transition-all",
                            selectedBrand === brand.name ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors dark:text-slate-300"
                          )}
                        >
                          <span className="text-sm font-bold uppercase tracking-tight">{brand.name}</span>
                          <div className="flex items-center gap-4">
                            <span className={cn("text-xs font-black", selectedBrand === brand.name ? "text-slate-300 dark:text-slate-500" : "text-slate-900 dark:text-white")}>{brand.value}</span>
                            <ChevronRight className={cn("h-4 w-4", selectedBrand === brand.name ? "text-slate-400 dark:text-slate-500" : "text-slate-200 dark:text-slate-700")} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Branch Performance Table */}
                <Card className="lg:col-span-9 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl transition-colors">
                  <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div>
                      <CardTitle className="text-base font-black text-slate-900 dark:text-white transition-colors uppercase tracking-tight italic">Performance Registry</CardTitle>
                      <CardDescription className="text-xs text-slate-400 dark:text-slate-500 transition-colors font-medium">Comparative analytics for {selectedBrand === 'all' ? 'Corporate Portfolio' : selectedBrand}</CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
                      <Input 
                        placeholder="Search specific branches..." 
                        className="h-10 pl-10 text-xs w-64 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white transition-all rounded-xl focus:ring-2 focus:ring-slate-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 transition-colors">
                    <div className="overflow-x-auto transition-colors">
                      <table className="w-full text-left transition-colors border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Branch Name</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">New Cases</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Cases</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                          {branchMetrics.filter(b => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((branch) => (
                            <tr 
                              key={branch.name} 
                              onClick={() => setSelectedBranchForModal(branch.name)}
                              className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                            >
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4 transition-colors">
                                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors group-hover:scale-110">
                                    <Utensils className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors uppercase tracking-tight">{branch.name}</span>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <Badge className={cn(
                                  "text-[10px] font-black px-3 py-1 rounded-lg transition-all shadow-sm",
                                  branch.today > 5 ? "bg-rose-50 text-rose-600 border-rose-100" : 
                                  branch.today > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : 
                                  "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                  {branch.today} ACTIVE
                                </Badge>
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-base font-black text-slate-900 dark:text-white transition-colors">{branch.total}</span>
                              </td>
                              <td className="px-8 py-5">
                                {branch.total > 20 ? (
                                  <Badge className="bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg px-2 py-1 shadow-lg shadow-rose-200 transition-all">CRITICAL</Badge>
                                ) : branch.total > 10 ? (
                                  <Badge className="bg-amber-500 text-white text-[9px] font-black uppercase rounded-lg px-2 py-1 shadow-lg shadow-amber-200 transition-all">ATTENTION</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg px-2 py-1 shadow-lg shadow-emerald-200 transition-all">OPTIMAL</Badge>
                                )}
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2 transition-colors">
                                  {branch.change > 0 ? (
                                    <div className="flex items-center gap-1.5 text-rose-500 font-black transition-colors">
                                      <ArrowUpRight className="h-4 w-4 stroke-[3px]" />
                                      <span className="text-xs">+{branch.change.toFixed(0)}%</span>
                                    </div>
                                  ) : branch.change < 0 ? (
                                    <div className="flex items-center gap-1.5 text-emerald-500 font-black transition-colors">
                                      <ArrowDownRight className="h-4 w-4 stroke-[3px]" />
                                      <span className="text-xs">{branch.change.toFixed(0)}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400 transition-colors uppercase italic opacity-50">Stationary</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

        <TabsContent value="time" className="space-y-6 mt-0 w-full outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
            {/* Hourly Distribution */}
            <Card className="lg:col-span-8 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900/50 bg-white dark:bg-slate-950/50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Hourly Volume Analysis</CardTitle>
                  <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Complaint distribution by hour of day</CardDescription>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <Clock className="h-5 w-5 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                      <XAxis 
                        dataKey="hour" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ 
                          borderRadius: '1rem', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                          fontSize: '11px',
                          padding: '16px',
                          backgroundColor: isDarkMode ? '#020617' : '#ffffff',
                        }}
                      />
                      <Bar dataKey="count" fill="currentColor" className="text-slate-900 dark:text-slate-200" radius={[6, 6, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Day of Week Intensity */}
            <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900/50 bg-white dark:bg-slate-950/50 py-6 px-8">
                <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Daily Volume</CardTitle>
                <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Breakdown by day of the week</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => {
                  const count = filteredComplaints.filter(c => getDay(parseISO(c.createdAt)) === i).length;
                  const percentage = kpis.total === 0 ? 0 : (count / kpis.total) * 100;
                  return (
                    <div key={day} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{day}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{count}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-slate-900 dark:bg-slate-200 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deep-dive" className="space-y-6 mt-0 w-full outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
            {/* Resolution Efficiency Chart */}
            <Card className="lg:col-span-5 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8">
                <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Resolution Efficiency</CardTitle>
                <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Percentage of complaints resolved</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative h-64 w-64">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle className="text-slate-100 dark:text-slate-800 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                    <motion.circle 
                      initial={{ strokeDasharray: "0 251" }}
                      animate={{ strokeDasharray: `${(kpis.closed / (kpis.total || 1)) * 251} 251` }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="text-emerald-500 stroke-current" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                      fill="transparent" 
                      r="40" 
                      cx="50" 
                      cy="50" 
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{((kpis.closed / (kpis.total || 1)) * 100).toFixed(0)}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Resolved</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{kpis.closed}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-center">
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{kpis.open}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keyword Analysis */}
            <Card className="lg:col-span-7 border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
              <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">AI Sentiment Keywords</CardTitle>
                  <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Most frequent terms in complaints</CardDescription>
                </div>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-wrap gap-3">
                  {keywords.map((kw, i) => (
                    <div 
                      key={kw.text} 
                      className={cn(
                        "px-6 py-3 rounded-2xl border flex items-center gap-4 transition-all",
                        i < 3 
                          ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-xl" 
                          : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm"
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-tight">{kw.text}</span>
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg", i < 3 ? "bg-white/20 dark:bg-slate-900/10" : "bg-white dark:bg-slate-800")}>{kw.count}</span>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 rounded-xl">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight italic">AI Executive Insight</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">{aiInsight}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="top-complaints" className="space-y-6 mt-0 w-full outline-none">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-950 overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-950/50 py-8 px-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Top Analytics Analysis</CardTitle>
                  <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">Deep dive into top performing brands and branches</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Select value={topAnalysisBrand} onValueChange={(val) => { setTopAnalysisBrand(val); setTopAnalysisBranch('all'); }}>
                    <SelectTrigger className="w-[180px] h-10 text-xs font-black uppercase tracking-widest rounded-xl bg-slate-50 dark:bg-slate-900 border-none shadow-sm">
                      <SelectValue placeholder="Brand Matrix" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="all">ALL PORTFOLIOS</SelectItem>
                      {brandsForFilter.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={topAnalysisBranch} onValueChange={setTopAnalysisBranch}>
                    <SelectTrigger className="w-[180px] h-10 text-xs font-black uppercase tracking-widest rounded-xl bg-slate-50 dark:bg-slate-900 border-none shadow-sm">
                      <SelectValue placeholder="Geographic Point" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="all">ALL PHYSICAL POINTS</SelectItem>
                      {branchesForActiveBrand.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              {!topAnalysisData ? (
                <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <Search className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
                  <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Awaiting Brand Selection</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Please select a brand to initialize analysis</p>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl flex items-center gap-6">
                      <div className="p-4 bg-white/10 rounded-2xl">
                        <Package className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Top Item</p>
                        <h4 className="text-2xl font-black italic tracking-tighter truncate max-w-[200px]">{topAnalysisData.topItem.name}</h4>
                        <p className="text-emerald-400 text-xs font-black mt-1 italic">{topAnalysisData.topItem.count} Cases</p>
                      </div>
                    </div>
                    {topAnalysisData.topType && (
                      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-6">
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl transition-colors">
                          <AlertCircle className="h-8 w-8 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Most Common Type</p>
                          <h4 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter truncate max-w-[200px]">{topAnalysisData.topType.name}</h4>
                          <Badge className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 rounded-full text-[9px] font-black uppercase mt-1 italic">{topAnalysisData.topType.count} Cases</Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl overflow-hidden">
                      <CardHeader className="py-6 px-8 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-xs font-black uppercase tracking-widest italic">Density Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topAnalysisData.chartData}
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {topAnalysisData.chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', padding: '10px', fontSize: '10px', fontWeight: 900 }} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl overflow-hidden">
                      <CardHeader className="py-6 px-8 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-xs font-black uppercase tracking-widest italic">Volume Comparison</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topAnalysisData.chartData}>
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '1rem', border: 'none', padding: '10px', fontWeight: 900 }} />
                            <Bar dataKey="value" fill="currentColor" className="text-slate-900 dark:text-white" radius={[6, 6, 0, 0]} barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="power-bi" className="space-y-6 mt-0 w-full outline-none">
          {/* Main Dashboard Container */}
          <div className="rounded-[2.5rem] overflow-hidden bg-[#f8fafc] dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Green Header Bar */}
            <div className="bg-[#608c5a] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <Utensils className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tighter text-white italic">ENTREPRENEUR</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Brand</span>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="h-8 w-32 bg-white/10 border-white/20 text-white text-[10px] font-bold rounded-lg px-3">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {brandsForFilter.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Location</span>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="h-8 w-32 bg-white/10 border-white/20 text-white text-[10px] font-bold rounded-lg px-3">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {branchesForSelectedBrand.map(branch => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Date Range</span>
                  <div className="h-8 px-3 bg-white/10 border border-white/20 text-white text-[10px] font-bold rounded-lg flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>01/04/2026 - 27/04/2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6 space-y-6">
              {/* Row 1: KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Total Complaints */}
                <Card className="md:col-span-3 border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest">Total Complaints</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 bg-white">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900">{kpis.total}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cases</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">Valid :</span>
                          <span className="text-sm font-black text-slate-900">{kpis.closed}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{((kpis.closed / (kpis.total || 1)) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">In Valid :</span>
                          <span className="text-sm font-black text-slate-900">{kpis.open}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{((kpis.open / (kpis.total || 1)) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Activity */}
                <Card className="md:col-span-5 border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest">System Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white flex flex-col justify-between h-[180px]">
                    <div className="h-full w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={trendData.data.slice(-7)}>
                           <Line type="monotone" dataKey="total" stroke="#608c5a" strokeWidth={2} dot={false} />
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-[#608c5a] uppercase tracking-[0.2em]">Active Tracking</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Complaint Areas */}
                <Card className="md:col-span-4 border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest">Top Complaint Areas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white h-[180px]">
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData.slice(0, 5)} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" hide />
                          <Bar dataKey="value" fill="#608c5a" radius={[0, 4, 4, 0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Large Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest">Daily Complaints</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData.data}>
                          <defs>
                            <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#608c5a" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#608c5a" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Area type="monotone" dataKey="total" stroke="#608c5a" fill="url(#colorDaily)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-[9px] font-bold text-slate-500">Complaints</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-400" />
                        <span className="text-[9px] font-bold text-slate-500">Complaint %</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest">Hourly Complaints</CardTitle>
                    <div className="flex bg-slate-100 rounded-md p-0.5">
                      <div className="px-3 py-1 bg-white text-[#608c5a] text-[9px] font-black rounded-md shadow-sm">H</div>
                      <div className="px-3 py-1 text-slate-400 text-[9px] font-black">W</div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 bg-white">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="hour" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Line type="monotone" dataKey="count" stroke="#608c5a" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <span className="text-[9px] font-bold text-slate-500">Complaints Count</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-400" />
                        <span className="text-[9px] font-bold text-slate-500">Complaint %</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Bottom Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Locations Bar Chart */}
                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest text-center">No. of Complaints across Location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white h-[280px]">
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchMetrics.slice(0, 5)}>
                          <Bar dataKey="total" fill="#608c5a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Bar Chart */}
                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest text-center">Total Complaints across Platform</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white h-[280px]">
                    <div className="h-full w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={platformDataPowerBI} layout="vertical" margin={{ left: 60 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                           <Bar dataKey="val" fill="#608c5a" radius={[0, 4, 4, 0]} barSize={12} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Table */}
                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardContent className="p-0 bg-white h-[328px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Category</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-center">Complaint</th>
                          <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Total %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {categoryDataPowerBI.slice(0, 7).map((cat, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-[10px] font-black text-slate-900">{cat.cat}</td>
                            <td className="px-4 py-3 text-[10px] font-black text-slate-900 text-center">{cat.val}</td>
                            <td className="px-4 py-3 text-[10px] font-black text-[#608c5a] text-right">{((cat.val / (kpis.total || 1)) * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 border-t border-slate-100">
                          <td className="px-4 py-4 text-[10px] font-black text-slate-900">TOTAL</td>
                          <td className="px-4 py-4 text-[10px] font-black text-slate-900 text-center">{kpis.total}</td>
                          <td className="px-4 py-4 text-[10px] font-black text-[#608c5a] text-right">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Complaint Reasons */}
                <Card className="border-none shadow-md rounded-xl overflow-hidden">
                  <CardHeader className="py-4 px-6 border-b border-slate-50 bg-white">
                    <CardTitle className="text-[10px] font-black text-[#608c5a] uppercase tracking-widest text-center">Complaint Reasons</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white h-[280px]">
                    <div className="h-full w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={categoryData.slice(0, 5)}
                             cx="50%"
                             cy="50%"
                             innerRadius={40}
                             outerRadius={70}
                             dataKey="value"
                           >
                              {categoryData.slice(0, 5).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#608c5a', '#78a671', '#90c088', '#a9dab0', '#c2f4d8'][index % 5]} />
                              ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
        </motion.div>
      </AnimatePresence>
    </div>
  </Tabs>

      <Dialog open={!!selectedBranchForModal} onOpenChange={(open) => !open && setSelectedBranchForModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-white dark:bg-slate-950 transition-colors">
          <DialogHeader className="p-6 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">{selectedBranchForModal}</DialogTitle>
                <DialogDescription className="text-slate-400 dark:text-slate-500 text-xs font-medium transition-colors">
                  Viewing {branchComplaints.length} complaints for this branch
                </DialogDescription>
              </div>
              <Badge className="bg-white/10 text-white border-white/20 transition-colors">{selectedBranchForModal ? branchMetrics.find(b => b.name === selectedBranchForModal)?.total : 0} Total</Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950 transition-colors">
            <div className="space-y-4">
              {branchComplaints.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 dark:text-slate-500 font-medium transition-colors">No complaints found for the selected filters.</p>
                </div>
              ) : (
                branchComplaints.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white transition-colors">{c.complaintNumber}</Badge>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">{format(parseISO(c.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black px-2 py-0.5",
                        c.status === 'Closed' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" :
                        c.status === 'Escalation' ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" :
                        "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                      )}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{c.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 transition-colors">{c.notes || c.comment || 'No details provided'}</p>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">{c.brand}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">{c.typeOfComplaint}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendLabel, subtitle, color }: any) {
  const colorMap: any = {
    slate: "bg-slate-50 text-slate-900",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };

  const iconColorMap: any = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-600 text-white",
    emerald: "bg-emerald-600 text-white",
    rose: "bg-rose-600 text-white",
  };

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className={cn("p-2 rounded-lg w-fit", iconColorMap[color])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
            </div>
            {trend !== undefined ? (
              <div className="flex items-center gap-2 pt-1">
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black",
                  trend >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                )}>
                  {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(0)}%
                </div>
                <span className="text-[10px] font-bold text-slate-400">{trendLabel}</span>
              </div>
            ) : subtitle ? (
              <p className="text-[10px] font-bold text-slate-400 pt-1">{subtitle}</p>
            ) : null}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

