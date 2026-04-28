import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Login } from '@/components/Login';
import { RegisterComplaint } from '@/components/RegisterComplaint';
import { Dashboard } from '@/components/Dashboard';
import { ManagerRequests } from '@/components/ManagerRequests';
import { Validation } from '@/components/Validation';
import { Escalation } from '@/components/Escalation';
import { FollowUp } from '@/components/FollowUp';
import { Search } from '@/components/Search';
import { AllComplaints } from '@/components/AllComplaints';
import { Statistics } from '@/components/Statistics';
import { Configuration } from '@/components/Configuration';
import { UserManagement } from '@/components/UserManagement';
import { CustomerSuggestions } from '@/components/CustomerSuggestions';
import { NotificationCenter } from '@/components/NotificationCenter';
import Catering from '@/components/Catering';
import PreOrder from '@/components/PreOrder';
import { Loader2, Search as SearchIcon, Menu, Moon, Sun, Languages } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function AppContent() {
  const { user, loading, profile } = useAuth();
  const { theme, toggleTheme, language, toggleLanguage, t } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  React.useEffect(() => {
    if (profile?.role === 'quality' && activeTab !== 'followup') {
      setActiveTab('followup');
    }
  }, [profile, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-bold">{t('portal')}...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    // Role-based access control
    const rolePermissions: Record<string, string[]> = {
      'dashboard': ['employee', 'complaints_team', 'manager', 'admin', 'restaurant_user', 'supervisor'],
      'register': ['employee', 'complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'],
      'requests': ['employee', 'complaints_team', 'manager', 'admin', 'restaurant_user', 'supervisor', 'team_leader'],
      'validation': ['complaints_team', 'manager', 'admin', 'supervisor'],
      'escalation': ['complaints_team', 'manager', 'admin', 'restaurant_user', 'supervisor'],
      'followup': ['complaints_team', 'manager', 'admin', 'supervisor', 'quality'],
      'search': ['employee', 'complaints_team', 'manager', 'admin', 'restaurant_user', 'supervisor', 'team_leader'],
      'all': ['complaints_team', 'manager', 'admin', 'restaurant_user', 'supervisor'],
      'stats': ['manager', 'admin', 'restaurant_user', 'supervisor'],
      'config': ['manager', 'admin', 'supervisor'],
      'users': ['manager', 'admin', 'supervisor'],
      'suggestions': ['employee', 'complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'],
      'catering': ['employee', 'complaints_team', 'manager', 'admin', 'supervisor', 'team_leader'],
      'preorder': ['employee', 'complaints_team', 'manager', 'admin', 'supervisor', 'restaurant_user', 'team_leader'],
    };

    const userRole = profile?.role || 'employee';

    const allowedRoles = rolePermissions[activeTab] || [];

    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-muted-foreground">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to access the {activeTab} module.</p>
          <Button onClick={() => setActiveTab('dashboard')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'register':
        return <RegisterComplaint />;
      case 'requests':
        return <ManagerRequests />;
      case 'validation':
        return <Validation setActiveTab={setActiveTab} />;
      case 'escalation':
        return <Escalation setActiveTab={setActiveTab} />;
      case 'followup':
        return <FollowUp />;
      case 'search':
        return <Search />;
      case 'all':
        return <AllComplaints />;
      case 'stats':
        return <Statistics />;
      case 'config':
        return <Configuration />;
      case 'users':
        return <UserManagement />;
      case 'suggestions':
        return <CustomerSuggestions />;
      case 'catering':
        return <Catering />;
      case 'preorder':
        return <PreOrder />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[80vh] text-muted-foreground">
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p>The {activeTab} module is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-slate-950 transition-colors">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <SidebarInset className="flex flex-col bg-transparent">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-white/80 dark:bg-slate-950/80 px-4 md:px-6 backdrop-blur transition-colors">
            <SidebarTrigger className="-ml-1 text-slate-500 transition-colors" />
            <div className="flex-1" />
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                title={language === 'en' ? 'العربية' : 'English'}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                <Languages className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'light' ? t('theme_dark') : t('theme_light')}
                className="text-slate-500 hover:text-primary transition-colors"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <NotificationCenter />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className={cn(
              "py-4 md:py-8 transition-all duration-300 w-full",
              activeTab === 'all' || activeTab === 'stats' ? "px-2 md:px-6" : "mx-auto px-4 md:px-8 max-w-[1600px]"
            )}>
              {renderContent()}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <Toaster position="top-right" richColors closeButton />
      </AppProvider>
    </AuthProvider>
  );
}
