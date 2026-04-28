import * as React from "react"
import { 
  LayoutDashboard,
  PlusSquare, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  List, 
  BarChart3, 
  Settings, 
  Users,
  LogOut,
  Menu,
  ClipboardCheck,
  Lightbulb,
  ShoppingBag,
  Search,
  CalendarDays
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { cn } from "@/lib/utils"
import { useApp } from "@/contexts/AppContext"
import { ProfileDialog } from "./ProfileDialog"

export function AppSidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (id: string) => void }) {
  const { profile, logout: authLogout } = useAuth()
  const { t, language } = useApp()
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)

  const items = [
    { title: t('dashboard'), icon: LayoutDashboard, id: "dashboard", roles: ["employee", "complaints_team", "manager", "admin", "restaurant_user", "supervisor"] },
    { title: t('register'), icon: PlusSquare, id: "register", roles: ["employee", "complaints_team", "manager", "admin", "supervisor", "team_leader"] },
    { title: t('requests'), icon: MessageSquare, id: "requests", roles: ["employee", "complaints_team", "manager", "admin", "restaurant_user", "supervisor", "team_leader"] },
    { title: t('validation'), icon: CheckCircle2, id: "validation", roles: ["complaints_team", "manager", "admin", "supervisor"] },
    { title: t('escalation'), icon: AlertTriangle, id: "escalation", roles: ["complaints_team", "manager", "admin", "restaurant_user", "supervisor"] },
    { title: t('followup'), icon: Clock, id: "followup", roles: ["complaints_team", "manager", "admin", "supervisor", "quality"] },
    { title: t('search'), icon: Eye, id: "search", roles: ["employee", "complaints_team", "manager", "admin", "restaurant_user", "supervisor", "team_leader"] },
    { title: t('all'), icon: List, id: "all", roles: ["complaints_team", "manager", "admin", "restaurant_user", "supervisor"] },
    { title: t('stats'), icon: BarChart3, id: "stats", roles: ["manager", "admin", "restaurant_user", "supervisor"] },
    { title: t('catering'), icon: CalendarDays, id: "catering", roles: ["employee", "complaints_team", "manager", "admin", "supervisor", "team_leader"] },
    { title: t('preorder'), icon: ShoppingBag, id: "preorder", roles: ["employee", "complaints_team", "manager", "admin", "supervisor", "restaurant_user", "team_leader"] },
    { title: t('config'), icon: Settings, id: "config", roles: ["manager", "admin", "supervisor"] },
    { title: t('users'), icon: Users, id: "users", roles: ["manager", "admin", "supervisor"] },
    { title: t('customer_suggestions'), icon: Lightbulb, id: "suggestions", roles: ["employee", "complaints_team", "manager", "admin", "supervisor", "team_leader"] },
  ]

  const userRole = profile?.role || 'employee';

  const filteredItems = items.filter(item => 
    userRole && item.roles.includes(userRole)
  )

  return (
    <Sidebar side={language === 'ar' ? 'right' : 'left'} collapsible="icon" className="border-r border-border/40 bg-white dark:bg-slate-950 transition-colors">
      <SidebarHeader className="p-6 transition-colors">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-slate-950 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
            <img 
              src="/api/attachments/70d6a048-c89b-437b-9c60-72153579e09d" 
              alt="Logo" 
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'text-xs font-black text-[#008f5d]';
                  fallback.innerText = 'SWISH';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight transition-colors">{t('swish')}</span>
            <span className="text-[10px] font-bold text-[#008f5d] uppercase tracking-widest transition-colors">{t('portal')}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-6 transition-colors">
        <div className="px-6 mb-4 group-data-[collapsible=icon]:hidden">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{t('navigation')}</span>
        </div>
        <SidebarMenu className="px-4 space-y-1">
          {filteredItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                onClick={() => setActiveTab(item.id)}
                isActive={activeTab === item.id}
                tooltip={item.title}
                className={cn(
                  "h-10 px-4 rounded-lg transition-all duration-200 justify-start",
                  activeTab === item.id 
                    ? "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", activeTab === item.id ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")} />
                <span className="text-sm transition-colors">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-6 border-t border-border/40 bg-slate-50/50 dark:bg-slate-950/20 transition-colors">
        <div className="flex flex-col gap-4">
          <div 
            className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 p-1 rounded-lg transition-all"
            onClick={() => setIsProfileOpen(true)}
          >
            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm transition-all">
              <AvatarFallback className="bg-[#008f5d] text-white font-bold transition-colors">
                {profile?.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden overflow-hidden">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate transition-colors">{profile?.username}</span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                {profile?.role ? t(profile.role) : ''}
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-center gap-2 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-destructive group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-0 transition-all"
            onClick={() => authLogout()}
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">{t('logout')}</span>
          </Button>
        </div>
      </SidebarFooter>
      <ProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </Sidebar>
  )
}
