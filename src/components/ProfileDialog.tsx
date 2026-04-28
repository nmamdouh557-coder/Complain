import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  X, 
  User, 
  Lock, 
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDialog({ isOpen, onClose }: ProfileDialogProps) {
  const { profile, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!profile) return;
    
    setIsSubmitting(true);
    try {
      const updateData: { username?: string, password?: string } = {
        username: data.username
      };
      
      if (data.password) {
        updateData.password = data.password;
      }

      const updatedUser = await api.updateProfile(profile.id, updateData);
      login(updatedUser);
      toast.success("Profile updated successfully!");
      reset({ ...data, password: '', confirmPassword: '' });
      onClose();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 border-none shadow-2xl bg-white dark:bg-slate-950 transition-colors">
        <DialogHeader className="p-6 border-b border-slate-50 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-[#008f5d]" />
              Edit Profile
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  {...register('username')} 
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800 focus:border-[#008f5d] transition-all rounded-xl dark:text-white" 
                  placeholder="Enter username"
                />
              </div>
              {errors.username && <p className="text-[10px] text-destructive font-bold">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">New Password (Optional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type="password"
                  {...register('password')} 
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800 focus:border-[#008f5d] transition-all rounded-xl dark:text-white" 
                  placeholder="Leave blank to keep current"
                />
              </div>
              {errors.password && <p className="text-[10px] text-destructive font-bold">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type="password"
                  {...register('confirmPassword')} 
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800 focus:border-[#008f5d] transition-all rounded-xl dark:text-white" 
                  placeholder="Repeat new password"
                />
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-destructive font-bold">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-50 dark:border-slate-800">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-11 bg-[#008f5d] hover:bg-[#007a4f] text-white font-bold rounded-xl gap-2 transition-all shadow-md shadow-[#008f5d]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
