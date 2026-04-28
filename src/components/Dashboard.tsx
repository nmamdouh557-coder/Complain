import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';

import { cn, formatKuwaitDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Complaint } from '@/types';

import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function Dashboard() {
  const { profile } = useAuth();
  const { t, theme } = useApp();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    pending: 0,
    escalated: 0
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const data = await api.getComplaints(undefined, profile?.id);
        
        if (!isMounted) return;

        let filteredData = data;
        // Filter based on role (backend already filters for restaurant_user if userId is passed)
        if (profile?.role === 'employee') {
          filteredData = data.filter(c => c.createdBy === profile.id || c.creatorUsername === profile.username);
        }

        setComplaints(filteredData);
        
        const newStats = filteredData.reduce((acc, curr) => {
          acc.total++;
          if (curr.status === 'Open') acc.open++;
          if (curr.status === 'Closed') acc.closed++;
          if (curr.status === 'Pending') acc.pending++;
          if (curr.status === 'Escalated') acc.escalated++;
          return acc;
        }, { total: 0, open: 0, closed: 0, pending: 0, escalated: 0 });
        
        setStats(newStats);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (isMounted) {
          setError("Failed to fetch dashboard data. Please check your connection.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Polling every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile?.id]);

  if (loading && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-full transition-colors">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Connection Error</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-white transition-colors">
            <TrendingUp className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Open', value: stats.open },
    { name: 'Closed', value: stats.closed },
    { name: 'Pending', value: stats.pending },
    { name: 'Escalated', value: stats.escalated },
  ];

  const categoryData = complaints.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.typeOfComplaint);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: curr.typeOfComplaint, value: 1 });
    }
    return acc;
  }, []);

  // Restaurant User Specific Calculations
  const topItems = complaints.reduce((acc: Record<string, number>, curr) => {
    if (curr.item) {
      acc[curr.item] = (acc[curr.item] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedTopItems = Object.entries(topItems)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const responseTimes = complaints
    .filter(c => c.branchResponseAt && c.dateTime)
    .map(c => {
      const start = new Date(c.dateTime).getTime();
      const end = new Date(c.branchResponseAt!).getTime();
      return Math.max(0, (end - start) / (1000 * 60)); // in minutes
    });

  const avgResponseTime = responseTimes.length > 0
    ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
    : 'N/A';

  const validCount = complaints.filter(c => c.validationStatus === 'Valid').length;
  const invalidCount = complaints.filter(c => c.validationStatus === 'Invalid').length;
  const totalValidated = validCount + invalidCount;
  const validationRatio = totalValidated > 0 ? ((validCount / totalValidated) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white transition-colors">
            {profile?.role === 'restaurant_user' ? `Branch Dashboard: ${profile.branch}` : t('dashboard')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm transition-colors">
            {profile?.role === 'restaurant_user' 
              ? `Performance analytics for ${profile.brand} - ${profile.branch}`
              : 'Real-time tracking and analytics of customer complaints'}
          </p>
        </div>
        <div className="flex items-center self-start sm:self-auto gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 transition-colors">
          <Clock className="h-3.5 w-3.5 transition-colors" />
          Updated: {formatKuwaitDate(new Date())}
        </div>
      </div>

      {profile?.role === 'restaurant_user' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top 3 Complained Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedTopItems.length > 0 ? sortedTopItems.map(([item, count], idx) => (
                  <div key={item} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold border border-rose-100 dark:border-rose-900/50">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item}</span>
                    </div>
                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">{count} cases</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">No item data available</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {avgResponseTime} <span className="text-xs font-bold text-slate-400">mins</span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-1">From creation to branch comment</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-slate-950 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Validation Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                {validationRatio}%
              </div>
              <div className="flex gap-4 mt-2">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase text-emerald-500">Valid</p>
                  <p className="text-xs font-bold dark:text-white">{validCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase text-rose-500">Invalid</p>
                  <p className="text-xs font-bold dark:text-white">{invalidCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Total Complaints" 
          value={stats.total} 
          icon={MessageSquare} 
          trend="+12%" 
          trendUp={true} 
          color="emerald"
        />
        <StatCard 
          title="Open Cases" 
          value={stats.open} 
          icon={AlertCircle} 
          trend="+5%" 
          trendUp={false} 
          color="orange"
        />
        <StatCard 
          title="Resolved" 
          value={stats.closed} 
          icon={CheckCircle2} 
          trend="+18%" 
          trendUp={true} 
          color="emerald"
        />
        <StatCard 
          title="Active Users" 
          value="24" 
          icon={Users} 
          trend="+2" 
          trendUp={true} 
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4 border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-all">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 px-6 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500 transition-colors" />
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">Status Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] p-6 bg-white dark:bg-slate-950 transition-colors">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} 
                  fontSize={10} 
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} 
                  fontSize={10} 
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }}
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                    border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#008f5d', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-all">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 px-6 transition-colors">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-emerald-500 transition-colors" />
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">Category Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] p-6 bg-white dark:bg-slate-950 transition-colors">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#008f5d', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                    border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  const colorClasses: any = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    slate: "bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800/30",
  };

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-all">
        <CardContent className="p-6 bg-white dark:bg-slate-950 transition-colors">
          <div className="flex items-center justify-between">
            <div className={cn("p-2.5 rounded-xl border transition-all", colorClasses[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className={cn(
              "flex items-center text-[10px] font-bold px-2 py-1 rounded-full transition-colors", 
              trendUp ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
            )}>
              {trend}
              {trendUp ? <ArrowUpRight className="ml-1 h-3 w-3" /> : <ArrowDownRight className="ml-1 h-3 w-3" />}
            </div>
          </div>
          <div className="mt-5 space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">{value}</h3>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
