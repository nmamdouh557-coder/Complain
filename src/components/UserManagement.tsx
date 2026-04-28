import * as React from 'react';
import { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  Building, 
  MoreVertical, 
  Trash2, 
  Edit,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  User,
  UserCircle,
  ShieldCheck,
  MapPin,
  Tag,
  ClipboardList,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { UserProfile, UserRole } from '@/types';
import { toast } from 'sonner';
import { useConfigs } from '@/hooks/useConfigs';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State (Add & Edit)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("employee");
  const [brand, setBrand] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [branch, setBranch] = useState("");

  const { brands, brandsBranches } = useConfigs();

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!username || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createUser({
        username,
        role,
        brand: role === 'restaurant_user' ? brand : undefined,
        brands: role === 'quality' ? selectedBrands : undefined,
        branch: role === 'restaurant_user' ? branch : undefined,
        password
      });
      
      toast.success(`User ${username} created successfully!`);
      setIsAddDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    setUsername(user.username);
    setPassword(""); // Keep empty to not change unless typed
    setRole(user.role);
    setBrand(user.brand || "");
    setSelectedBrands(user.brands || []);
    setBranch(user.branch || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (!username) {
      toast.error("Username is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: any = {
        username,
        role,
        brand: role === 'restaurant_user' ? brand : null,
        brands: role === 'quality' ? selectedBrands : [],
        branch: role === 'restaurant_user' ? branch : null,
      };

      if (password) {
        updates.password = password;
      }

      await api.updateUser(selectedUser.id, updates);
      
      toast.success(`User ${username} updated successfully!`);
      setIsEditDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await api.deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole("employee");
    setBrand("");
    setSelectedBrands([]);
    setBranch("");
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(u => 
    (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Manage system users and their access levels</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger render={
            <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 dark:shadow-none transition-all gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Add New User</span>
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 rounded-2xl transition-colors">
            <div className="bg-slate-900 dark:bg-slate-900/50 px-6 py-8 text-white relative overflow-hidden transition-colors">
              <div className="relative z-10 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                  <UserPlus className="h-6 w-6 text-blue-400" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">Create New User</DialogTitle>
                <DialogDescription className="text-slate-400 mt-1 text-sm">
                  Configure access and credentials for a new team member.
                </DialogDescription>
              </div>
              {/* Decorative background element */}
              <div className="absolute -right-8 -top-8 h-32 w-32 bg-blue-600/10 rounded-full blur-3xl" />
              <div className="absolute -left-8 -bottom-8 h-32 w-32 bg-blue-400/10 rounded-full blur-3xl" />
            </div>

            <div className="px-6 py-8">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">Username</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      id="username" 
                      placeholder="e.g. jdoe" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">Access Role</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'employee', title: 'Employee', desc: 'Basic system access', icon: User },
                      { id: 'complaints_team', title: 'Complaints Team', desc: 'Process & handle cases', icon: ClipboardList },
                      { id: 'manager', title: 'Manager', desc: 'Review & approve requests', icon: Shield },
                      { id: 'supervisor', title: 'Supervisor', desc: 'Full System Access', icon: ShieldCheck },
                      { id: 'team_leader', title: 'Team Leader', desc: 'Operational Access', icon: Users },
                      { id: 'quality', title: 'OPX', desc: 'Escalation page access', icon: ClipboardCheck },
                      { id: 'restaurant_user', title: 'Restaurant User', desc: 'Branch-specific access', icon: Building },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id as UserRole)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 group",
                          role === r.id 
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-4 ring-blue-500/5" 
                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          role === r.id ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )}>
                          <r.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0 transition-colors">
                          <span className={cn(
                            "text-xs font-bold transition-colors",
                            role === r.id ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {r.title}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 line-clamp-1 transition-colors">
                            {r.desc}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {role === 'quality' && (
                  <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 transition-colors">
                    <Label className="text-[10px] font-bold uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest ml-1 transition-colors">Brand Access Control</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {brands.map((b: string) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            if (selectedBrands.includes(b)) {
                              setSelectedBrands(selectedBrands.filter(i => i !== b));
                            } else {
                              setSelectedBrands([...selectedBrands, b]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all border",
                            selectedBrands.includes(b)
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                          )}
                        >
                          <div className={cn(
                            "h-3 w-3 rounded-full border-2 flex items-center justify-center",
                            selectedBrands.includes(b) ? "border-white" : "border-slate-300 dark:border-slate-700"
                          )}>
                            {selectedBrands.includes(b) && <div className="h-1 w-1 bg-white rounded-full" />}
                          </div>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {role === 'restaurant_user' && (
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 transition-colors"
                  >
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest ml-1 transition-colors">Brand Assignment</Label>
                      <div className="relative group">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 dark:text-blue-500 z-10 transition-colors" />
                        <Select onValueChange={(v: string) => { setBrand(v); setBranch(""); }} value={brand}>
                          <SelectTrigger className="h-10 pl-10 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus:border-blue-500 transition-all rounded-lg dark:text-white">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl transition-colors">
                            {brands.map((b: string) => (
                              <SelectItem key={b} value={b} className="dark:text-white dark:focus:bg-slate-800">{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest ml-1 transition-colors">Branch Assignment</Label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 dark:text-blue-500 z-10 transition-colors" />
                        <Select onValueChange={(v: string) => setBranch(v)} disabled={!brand} value={branch}>
                          <SelectTrigger className="h-10 pl-10 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 focus:border-blue-500 transition-all rounded-lg dark:text-white">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl transition-colors">
                            {brand && brandsBranches[brand]?.map((b: string) => (
                              <SelectItem key={b} value={b} className="dark:text-white dark:focus:bg-slate-800">{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 transition-colors">
              <DialogClose render={
                <Button variant="ghost" className="h-11 px-6 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-colors">
                  Cancel
                </Button>
              } />
              <Button 
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white dark:text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50" 
                onClick={handleAddUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-widest transition-colors">Create Account</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors" />
            <Input 
              placeholder="Search users..." 
              className="pl-10 bg-slate-50/50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 transition-colors">
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-4 px-6">Username</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-4 px-6">Role</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-4 px-6">Joined Date</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider py-4 px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="h-16 animate-pulse bg-slate-50/50 dark:bg-slate-800/10 transition-colors" />
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-slate-300 dark:text-slate-700 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 mb-2 opacity-10" />
                      <p className="text-sm font-medium">No users found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-50 dark:border-slate-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-100 dark:border-blue-900/50 transition-colors">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-sm transition-colors">{user.username}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className={cn(
                        "inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors border",
                        user.role === 'manager' ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50" : 
                        user.role === 'supervisor' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50" :
                        user.role === 'team_leader' ? "bg-blue-600 text-white border-blue-700" :
                        user.role === 'complaints_team' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50" : 
                        user.role === 'quality' ? "bg-slate-900 text-white border-slate-700" :
                        user.role === 'restaurant_user' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50" :
                        "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800"
                      )}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role?.replace('_', ' ') || 'User'}
                      </div>
                      {user.role === 'restaurant_user' && user.branch && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium transition-colors">
                          {user.brand} - {user.branch}
                        </div>
                      )}
                      {user.role === 'quality' && user.brands && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.brands.map(b => (
                            <Badge key={b} variant="outline" className="text-[8px] h-4 px-1 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-[11px] font-medium text-slate-400 dark:text-slate-500 transition-colors">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent className="w-40 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 transition-colors">
                          <DropdownMenuItem 
                            onClick={() => handleEditClick(user)}
                            className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 gap-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/20"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-800" />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(user)}
                            className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 gap-2 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 rounded-2xl transition-colors">
          <div className="bg-blue-600 dark:bg-blue-600/50 px-6 py-8 text-white relative overflow-hidden transition-colors border-b border-white/10">
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 border border-white/30">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">Edit User Account</DialogTitle>
              <DialogDescription className="text-blue-100 mt-1 text-sm">
                Modify access level and preferences for {selectedUser?.username}.
              </DialogDescription>
            </div>
            <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="px-6 py-8">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">Username</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    id="edit-username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">New Password (Leave empty to keep current)</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    id="edit-password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1 transition-colors">Access Role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'employee', title: 'Employee', icon: User },
                    { id: 'complaints_team', title: 'Complaints Team', icon: ClipboardList },
                    { id: 'manager', title: 'Manager', icon: Shield },
                    { id: 'supervisor', title: 'Supervisor', icon: ShieldCheck },
                    { id: 'team_leader', title: 'Team Leader', icon: Users },
                    { id: 'quality', title: 'OPX', icon: ClipboardCheck },
                    { id: 'restaurant_user', title: 'Restaurant User', icon: Building },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as UserRole)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        role === r.id ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-4 ring-blue-500/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors", role === r.id ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                        <r.icon className="h-4 w-4" />
                      </div>
                      <span className={cn("text-xs font-bold transition-colors", role === r.id ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300")}>{r.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {role === 'quality' && (
                <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 transition-colors">
                  <Label className="text-[10px] font-bold uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest ml-1 transition-colors">Brand Access Control</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {brands.map((b: string) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          if (selectedBrands.includes(b)) {
                            setSelectedBrands(selectedBrands.filter(i => i !== b));
                          } else {
                            setSelectedBrands([...selectedBrands, b]);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all border",
                          selectedBrands.includes(b)
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                        )}
                      >
                        <div className={cn(
                          "h-3 w-3 rounded-full border-2 flex items-center justify-center",
                          selectedBrands.includes(b) ? "border-white" : "border-slate-300 dark:border-slate-700"
                        )}>
                          {selectedBrands.includes(b) && <div className="h-1 w-1 bg-white rounded-full" />}
                        </div>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {role === 'restaurant_user' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 transition-colors">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-blue-600/70 tracking-widest ml-1">Brand</Label>
                    <Select onValueChange={(v: string) => { setBrand(v); setBranch(""); }} value={brand}>
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-blue-600/70 tracking-widest ml-1">Branch</Label>
                    <Select onValueChange={(v: string) => setBranch(v)} disabled={!brand} value={branch}>
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {brand && brandsBranches[brand]?.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 transition-colors">
            <DialogClose render={
              <Button variant="ghost" className="font-bold text-[11px] uppercase tracking-wider">
                Cancel
              </Button>
            } />
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 transition-colors" 
              onClick={handleUpdateUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl transition-colors">
          <div className="bg-rose-600 px-6 py-10 text-white text-center transition-colors">
            <div className="mx-auto h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-4 border border-white/30">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Delete Account?</DialogTitle>
            <DialogDescription className="text-rose-100 mt-2 font-medium">
              Are you sure you want to permanently delete <strong>{selectedUser?.username}</strong>?
            </DialogDescription>
          </div>
          <div className="p-8 space-y-4 transition-colors">
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-700 dark:text-orange-400 font-medium leading-relaxed">
                This action cannot be undone. All data associated with this user will be removed from system logs.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-wider transition-colors" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                No, Keep
              </Button>
              <Button 
                className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-rose-200 dark:shadow-none transition-all" 
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
