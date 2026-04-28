import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  X, 
  Save, 
  History, 
  ClipboardList, 
  MessageSquare,
  AlertCircle,
  Languages,
  Plus,
  Eye,
  Trash2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Mic,
  MicOff,
  Volume2,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  RotateCcw
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Complaint } from '@/types';
import { api } from '@/lib/api';
import { geminiService } from '@/services/geminiService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatKuwaitDate, getKuwaitISOString, getKuwaitDateTimeLocalString, formatToDateTimeLocal } from '@/lib/utils';

const complaintSchema = z.object({
  customerPhone: z.string().min(1, "Phone is required"),
  customerName: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  branch: z.string().min(1, "Branch is required"),
  platform: z.string().min(1, "Platform is required"),
  orderId: z.string().optional().nullable(),
  incidentDate: z.string().optional().nullable(),
  status: z.string().min(1, "Status is required"),
  complaintSource: z.string().min(1, "Source is required"),
  title: z.string().min(1, "Title is required"),
  caseType: z.string().min(1, "Case Type is required"),
  item: z.string().optional().nullable(),
  response: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  responsibleParty: z.string().optional().nullable(),
  amountSpent: z.string().optional().nullable(),
  actionTaken: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  complaintComment: z.string().optional().nullable(),
  typeOfComplaint: z.string().optional().nullable(),
  branchComment: z.string().optional().nullable(),
  opxResponsibleParty: z.string().optional().nullable(),
  opxComment: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).optional(),
  // Follow-up survey fields
  followUpSatisfaction: z.string().optional().nullable(),
  followUpAgentResolution: z.string().optional().nullable(),
  followUpHelpProvided: z.string().optional().nullable(),
  followUpServiceSuggestions: z.string().optional().nullable(),
  followUpOverallRating: z.string().optional().nullable(),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

interface EditComplaintDialogProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isValidationPage?: boolean;
  isFollowUpPage?: boolean;
  setActiveTab?: (id: string) => void;
}

import { useConfigs } from '@/hooks/useConfigs';
import { Upload, FileVideo, FileImage } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';

export function EditComplaintDialog({ 
  complaint, 
  isOpen, 
  onClose, 
  onUpdate,
  isValidationPage = false,
  isFollowUpPage = false,
  setActiveTab
}: EditComplaintDialogProps) {
  const { profile } = useAuth();
  const [branchAttachments, setBranchAttachments] = React.useState<string[]>([]);
  const [previewFile, setPreviewFile] = React.useState<{ url: string, type: string, name: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const isRestaurantUser = profile?.role === 'restaurant_user';
  const isQuality = profile?.role === 'quality';
  const isFieldDisabled = isRestaurantUser || isQuality;
  const isComplaintsTeamOrManager = profile?.role === 'complaints_team' || profile?.role === 'manager';
  
  const [isRecording, setIsRecording] = React.useState(false);
  const [appendMode, setAppendMode] = React.useState(true);
  const [isImprovingNotes, setIsImprovingNotes] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState<Record<string, boolean>>({});
  const [originalValues, setOriginalValues] = React.useState<Record<string, string | null>>({});
  const recognitionRef = React.useRef<any>(null);
  const baselineTextRef = React.useRef("");

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser does not support speech recognition.");
      return;
    }

    baselineTextRef.current = (watch('branchComment') || '').trim();
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info("Recording started... Speaker clearly in English", { duration: 2000 });
    };

    recognition.onresult = (event: any) => {
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        sessionTranscript += event.results[i][0].transcript;
      }
      
      if (appendMode) {
        const prefix = baselineTextRef.current ? baselineTextRef.current + ' ' : '';
        setValue('branchComment', prefix + sessionTranscript);
      } else {
        setValue('branchComment', sessionTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
      toast.error(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleCopySummary = () => {
    const formData = watch();
    const summary = `
Complaint Summary #${complaint.id}
Customer: ${formData.customerName} (${formData.customerPhone})
Brand: ${formData.brand} - Branch: ${formData.branch}
Platform: ${formData.platform}
Status: ${formData.status}
Title: ${formData.title}
Case Type: ${formData.caseType}
Item: ${formData.item || 'N/A'}
Incident Date: ${formatKuwaitDate(formData.incidentDate)}

Admin Notes: ${formData.adminNotes || 'N/A'}

Regards,
${profile?.username || 'Swish Portal'}
`.trim();

    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard!");
  };

  const handleSendEmail = () => {
    const formData = watch();
    const subject = `Complaint Summary #${complaint.id} - ${formData.customerName}`;
    const body = `
Complaint Details:
------------------
ID: ${complaint.id}
Customer: ${formData.customerName}
Phone: ${formData.customerPhone}
Brand: ${formData.brand}
Branch: ${formData.branch}
Platform: ${formData.platform}
Status: ${formData.status}
Order ID: ${formData.orderId || 'N/A'}
Incident Date: ${formatKuwaitDate(formData.incidentDate)}

Title: ${formData.title}
Case Type: ${formData.caseType}
Item: ${formData.item || 'N/A'}

Admin Notes: ${formData.adminNotes || 'N/A'}
Complaint Comment: ${formData.complaintComment || 'N/A'}
Branch Comment: ${formData.branchComment || 'N/A'}

Regards,
${profile?.username || 'Swish Portal'}
`.trim();

    // Use Outlook web compose URL to open in browser (Office 365)
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(outlookUrl, '_blank');
    toast.success("Opening Outlook in a new tab...");
  };

  const handleImproveText = async (fieldName: keyof ComplaintFormValues) => {
    const currentValue = watch(fieldName) as string;
    if (!currentValue || currentValue.length < 5) {
      toast.error("Please enter at least 5 characters to improve.");
      return;
    }

    setIsImprovingNotes(true);
    try {
      const response = await geminiService.improveText(currentValue);
      if (response) {
        setValue(fieldName, response);
        toast.success("Text improved successfully!");
      }
    } catch (error) {
      console.error(`Failed to improve ${fieldName}:`, error);
      toast.error("Failed to improve text. Please try again.");
    } finally {
      setIsImprovingNotes(false);
    }
  };

  const handleTranslateText = async (fieldName: keyof ComplaintFormValues) => {
    const currentValue = watch(fieldName) as string;
    if (!currentValue || currentValue.length < 2) {
      toast.error("Please enter text to translate.");
      return;
    }

    setIsTranslating(prev => ({ ...prev, [fieldName]: true }));
    try {
      const isArabic = /[\u0600-\u06FF]/.test(currentValue);
      const targetLang = isArabic ? 'English' : 'Arabic';
      
      const response = await geminiService.translateText(currentValue, targetLang);
      if (response) {
        setOriginalValues(prev => ({ ...prev, [fieldName]: currentValue }));
        setValue(fieldName, response);
        toast.success(`Translated ${fieldName === 'notes' ? 'Notes' : 'Comment'} to ${targetLang}!`);
      }
    } catch (error) {
      console.error(`Failed to translate ${fieldName}:`, error);
      toast.error("Failed to translate text. Please try again.");
    } finally {
      setIsTranslating(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleUndoTranslation = (fieldName: keyof ComplaintFormValues) => {
    const original = originalValues[fieldName];
    if (original) {
      setValue(fieldName, original);
      setOriginalValues(prev => ({ ...prev, [fieldName]: null }));
      toast.success("Reverted to original text");
    }
  };
  
  const {
    brands,
    platforms,
    sources,
    brandsBranches,
    complaintCategories,
    brandItems,
    responses,
    responsibleParties,
    complaintStatus,
    validationTypes,
    formFieldOrdering,
    customFieldsDefinition,
    caseTypeMapping,
    loading: configsLoading
  } = useConfigs();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema)
  });

  const selectedBrand = watch('brand');
  const selectedTitle = watch('title');

  const fieldsMap: Record<string, React.ReactNode> = {
    customerPhone: (
      <div key="customerPhone" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Phone Number</Label>
        <Input {...register('customerPhone')} disabled={isFieldDisabled} className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 transition-all rounded-xl font-medium dark:text-white" />
      </div>
    ),
    customerName: (
      <div key="customerName" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Customer Name</Label>
        <Input {...register('customerName')} disabled={isFieldDisabled} className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 transition-all rounded-xl font-medium dark:text-white" />
      </div>
    ),
    brand: (
      <div key="brand" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Brand</Label>
        <Select disabled={isFieldDisabled} value={watch('brand')} onValueChange={(v) => setValue('brand', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            {brands.map((b: string) => (
              <SelectItem key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    branch: (
      <div key="branch" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Branch</Label>
        <Select disabled={isFieldDisabled} value={watch('branch')} onValueChange={(v) => setValue('branch', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            {selectedBrand && brandsBranches[selectedBrand]?.map((b: string) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    platform: (
      <div key="platform" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Platform</Label>
        <Select disabled={isFieldDisabled} value={watch('platform')} onValueChange={(v) => setValue('platform', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            {platforms.map((p: string) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    orderId: (
      <div key="orderId" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Order ID</Label>
        <Input {...register('orderId')} disabled={isFieldDisabled} className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 transition-all rounded-xl font-medium dark:text-white" />
      </div>
    ),
    dateTime: (
      <div key="dateTime" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Order Date</Label>
        <Input type="datetime-local" {...register('incidentDate')} disabled={isFieldDisabled} className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 transition-all rounded-xl font-medium dark:text-white" />
      </div>
    ),
    status: (
      <div key="status" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Status</Label>
        <Select disabled={isFieldDisabled} value={watch('status')} onValueChange={(v) => setValue('status', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white">
            <SelectValue>
              {isValidationPage && watch('status') === 'Closed' ? 'Pending' : watch('status')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            {complaintStatus.map((s: string) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    complaintSource: (
      <div key="complaintSource" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Complaint Source</Label>
        <Select disabled={isFieldDisabled} value={watch('complaintSource')} onValueChange={(v) => setValue('complaintSource', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            {sources.map((s: string) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    title: (
      <div key="title" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Category (Title)</Label>
        <Select disabled={isFieldDisabled} value={watch('title')} onValueChange={(v) => setValue('title', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            {Object.keys(complaintCategories).map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    caseType: (
      <div key="caseType" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Case Type</Label>
        <Select 
          disabled={isFieldDisabled} 
          value={watch('caseType')} 
          onValueChange={(v) => {
            setValue('caseType', v);
            if (caseTypeMapping && caseTypeMapping[v]) {
              setValue('title', caseTypeMapping[v]);
            }
          }}
        >
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
            <SelectValue placeholder="Select case type" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            {Object.values(complaintCategories as Record<string, string[]>).flat().map((t: string) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    item: (
      <div key="item" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Items</Label>
        <Popover>
          <PopoverTrigger
            disabled={isFieldDisabled}
            className={cn(
              "w-full min-h-11 h-auto flex items-center justify-between rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 px-3 py-2 text-sm font-normal transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white text-left",
              !watch("item") && "text-slate-500 dark:text-slate-500"
            )}
          >
            <div className="flex flex-wrap gap-1">
              {watch("item") ? (
                watch("item")!.split(', ').map((item: string) => (
                  <Badge key={item} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-1.5 py-0 h-5 text-[10px] flex items-center gap-1 transition-colors border-blue-100 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300">
                    {item}
                    {!isFieldDisabled && (
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentItems = watch("item")?.split(', ') || [];
                          const newItems = currentItems.filter((i: string) => i !== item);
                          setValue("item", newItems.join(', '));
                        }} 
                      />
                    )}
                  </Badge>
                ))
              ) : (
                "Select items..."
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" align="start">
            <Command className="bg-white dark:bg-slate-900">
              <CommandInput placeholder="Search item..." className="h-9" />
              <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  {selectedBrand && Array.from(new Set(brandItems[selectedBrand] || [])).map((item: any) => {
                    const currentItems = watch("item")?.split(', ') || [];
                    const isChecked = currentItems.includes(item);
                    return (
                      <CommandItem
                        key={item}
                        value={item}
                        onSelect={() => {
                          let newItems;
                          if (isChecked) {
                            newItems = currentItems.filter((i: string) => i !== item);
                          } else {
                            newItems = [...currentItems, item];
                          }
                          setValue("item", newItems.filter(Boolean).join(', '));
                        }}
                        className="text-sm flex items-center justify-between"
                      >
                        {item}
                        <div className={cn(
                          "h-4 w-4 border rounded flex items-center justify-center transition-colors",
                          isChecked ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-slate-600"
                        )}>
                          {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    ),
    response: (
      <div key="response" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Resolution</Label>
        <Select disabled={isFieldDisabled} value={watch('response') || ''} onValueChange={(v) => setValue('response', v)}>
          <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
            <SelectValue placeholder="Select resolution" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
            {responses.map((r: string) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    notes: null // Notes is handled separately in Internal Notes section
  };

  useEffect(() => {
    if (complaint) {
      reset({
        customerPhone: complaint.customerPhone,
        customerName: complaint.customerName,
        brand: complaint.brand,
        branch: complaint.branch,
        platform: complaint.platform,
        orderId: complaint.orderId,
        incidentDate: formatToDateTimeLocal(complaint.dateTime),
        status: complaint.status,
        complaintSource: complaint.complaintSource,
        title: complaint.title,
        caseType: complaint.caseType,
        item: complaint.item,
        response: complaint.response,
        notes: complaint.notes,
        responsibleParty: complaint.responsibleParty,
        amountSpent: complaint.amountSpent,
        actionTaken: complaint.actionTaken,
        adminNotes: complaint.adminNotes,
        complaintComment: complaint.complaintComment,
        typeOfComplaint: complaint.typeOfComplaint,
        branchComment: complaint.branchComment,
        opxResponsibleParty: complaint.opxResponsibleParty,
        opxComment: complaint.opxComment,
        custom_fields: complaint.customFields || {},
        followUpSatisfaction: complaint.followUpSatisfaction,
        followUpAgentResolution: complaint.followUpAgentResolution,
        followUpHelpProvided: complaint.followUpHelpProvided,
        followUpServiceSuggestions: complaint.followUpServiceSuggestions,
        followUpOverallRating: complaint.followUpOverallRating,
      });
      setBranchAttachments(complaint.branchAttachments || []);
    }
  }, [complaint, reset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const urls = await api.uploadFiles(Array.from(files));
      setBranchAttachments(prev => [...prev, ...urls]);
      toast.success("Files uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.message && error.message.includes("Cloudinary is not configured")) {
        toast.error("Cloudinary is not configured in settings.");
      } else {
        toast.error("Failed to upload files");
      }
    }
  };

  const removeAttachment = (index: number) => {
    setBranchAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: ComplaintFormValues) => {
    if (!complaint) return;
    
    try {
      const isSurveySubmitted = !!values.followUpSatisfaction && !!values.followUpOverallRating;
      const willBeProcessed = isValidationPage || values.status === 'Closed';
      const isMovingToProcessed = willBeProcessed && !complaint.isProcessed;

      const isClosingNow = values.status === 'Closed' && complaint.status !== 'Closed';
      const isAlreadyClosed = values.status === 'Closed';
      
      const isBranchResponding = isRestaurantUser && (
        values.branchComment !== complaint.branchComment || 
        JSON.stringify(branchAttachments) !== JSON.stringify(complaint.branchAttachments)
      );

      await api.updateComplaint(complaint.id, {
        ...values,
        branchAttachments,
        updatedByUid: profile?.id,
        updatedByUsername: profile?.username,
        updatedAt: getKuwaitISOString(),
        dateTime: values.incidentDate ? (values.incidentDate.includes('+') ? values.incidentDate : values.incidentDate + "+03:00") : complaint.dateTime,
        isProcessed: willBeProcessed ? true : false,
        followUpTimestamp: (isMovingToProcessed || (isFollowUpPage && isSurveySubmitted)) ? getKuwaitISOString() : complaint.followUpTimestamp,
        validationTimestamp: isClosingNow ? getKuwaitISOString() : complaint.validationTimestamp,
        escalationTimestamp: (values.status === 'Escalated' && complaint.status !== 'Escalated') ? getKuwaitISOString() : complaint.escalationTimestamp,
        flagNoteTimestamp: (values.adminNotes !== complaint.adminNotes) ? getKuwaitISOString() : complaint.flagNoteTimestamp,
        branchResponseAt: isBranchResponding ? getKuwaitISOString() : complaint.branchResponseAt,
        closedByUsername: isAlreadyClosed 
          ? profile?.username || complaint.closedByUsername || 'N/A'
          : null,
        closedAt: isAlreadyClosed ? (complaint.closedAt || getKuwaitISOString()) : null
      });
      toast.success("Complaint updated successfully");
      onUpdate();
      onClose();
      
      // Redirect to Follow Up if closed and setActiveTab is available
      if (willBeProcessed && setActiveTab) {
        setActiveTab('followup');
      }
    } catch (error) {
      toast.error("Failed to update complaint");
      console.error(error);
    }
  };

  if (!complaint) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl bg-white dark:bg-slate-950 no-scrollbar transition-colors">
        <DialogHeader className="p-6 border-b border-slate-50 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 flex flex-row items-center justify-between space-y-0 transition-colors">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Edit Complaint #{complaint.complaintNumber}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6 md:space-y-8">
          <div className={cn("grid gap-6 md:gap-8", (isFollowUpPage && !isQuality) ? "lg:grid-cols-2" : "grid-cols-1")}>
            <div className={cn("space-y-6 md:space-y-8", (isFollowUpPage && !isQuality) && "max-h-[70vh] overflow-y-auto pr-4 no-scrollbar")}>
              {/* Complaint History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500">
                  <History className="h-4 w-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Complaint History (1)</h3>
                </div>
                <Card className="p-4 border-orange-100 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-900/10 border-2 rounded-xl transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                      {isValidationPage && watch('status') === 'Closed' ? 'Pending' : watch('status')}
                    </Badge>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatKuwaitDate(complaint.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{complaint.title === 'Quality' ? 'OPX' : complaint.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{complaint.caseType}</p>
                  {complaint.closedByUsername && (
                    <div className="mt-3 pt-2 border-t border-orange-200/50 dark:border-orange-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Closed By</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {complaint.closedByUsername === 'Quality' ? 'OPX' : complaint.closedByUsername}
                        </span>
                        {complaint.closedAt && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{formatKuwaitDate(complaint.closedAt)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Registration Form */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-500">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider">Complaint Registration Form</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {(formFieldOrdering || []).map((fieldId: string) => {
                    if (fieldsMap[fieldId]) return fieldsMap[fieldId];
                    
                    const customField = (customFieldsDefinition || []).find((f: any) => f.id === fieldId);
                    if (customField) {
                      return (
                        <div key={fieldId} className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                            {customField.label} {customField.required && <span className="text-destructive">*</span>}
                          </Label>
                          {customField.type === 'dropdown' ? (
                            <Select 
                              disabled={isFieldDisabled}
                              value={watch(`custom_fields.${fieldId}`) || ""} 
                              onValueChange={(v: string) => setValue(`custom_fields.${fieldId}`, v)}
                            >
                              <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
                                <SelectValue placeholder={`Select ${customField.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                {customField.options?.map((opt: string) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : customField.type === 'date' ? (
                            <Input 
                              type="date"
                              disabled={isFieldDisabled}
                              {...register(`custom_fields.${fieldId}` as any)}
                              className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 rounded-xl transition-colors dark:text-white"
                            />
                          ) : customField.type === 'number' ? (
                            <Input 
                              type="number"
                              disabled={isFieldDisabled}
                              {...register(`custom_fields.${fieldId}` as any)}
                              className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 rounded-xl transition-colors dark:text-white"
                            />
                          ) : (
                            <Input 
                              disabled={isFieldDisabled}
                              {...register(`custom_fields.${fieldId}` as any)}
                              className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 rounded-xl transition-colors dark:text-white"
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold opacity-0 uppercase tracking-wider hidden md:block select-none">Action</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      disabled={isFieldDisabled}
                      className="h-11 w-full gap-2 text-emerald-600 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all"
                      onClick={() => document.getElementById('edit-file-upload')?.click()}
                    >
                      <Plus className="h-4 w-4" />
                      Add Photo
                    </Button>
                    <input 
                      id="edit-file-upload" 
                      type="file" 
                      multiple 
                      accept="image/*,video/*"
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files && complaint) {
                          const newFiles = Array.from(e.target.files);
                          const imagePromises = newFiles.map(file => {
                            return new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(file);
                            });
                          });
                          const base64Images = await Promise.all(imagePromises);
                          
                          // Update complaint images in DB
                          try {
                            await api.updateComplaint(complaint.id, {
                              images: [...(complaint.images || []), ...base64Images]
                            } as any);
                            toast.success("Photo added successfully");
                            onUpdate();
                          } catch (error) {
                            toast.error("Failed to add photo");
                          }
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* OPX Section - Visible only for Quality role */}
              {profile?.role === 'quality' && (
                <div className="space-y-4 p-5 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle className="h-4 w-4" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider">OPX Section</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Responsible Party (OPX)</Label>
                      <Select value={watch('opxResponsibleParty') || ''} onValueChange={(v) => setValue('opxResponsibleParty', v)}>
                        <SelectTrigger className="w-full h-11 border-primary/20 dark:border-primary/40 bg-white dark:bg-slate-900 rounded-xl font-medium">
                          <SelectValue placeholder="Select party" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Store">Store</SelectItem>
                          <SelectItem value="CPU">CPU</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">OPX Comment</Label>
                    <Textarea 
                      {...register('opxComment')} 
                      placeholder="Enter OPX related comments..." 
                      className="min-h-[100px] border-primary/20 dark:border-primary/40 bg-white dark:bg-slate-900 rounded-xl font-medium resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MessageSquare className="h-4 w-4" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider">Internal Notes & Evidence</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {originalValues['notes'] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoTranslation('notes')}
                        className="h-7 px-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all gap-1.5 rounded-md"
                      >
                        <RotateCcw className="h-3 w-3" />
                        UNDO
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isTranslating['notes'] || !watch('notes')}
                      onClick={() => handleTranslateText('notes')}
                      className="h-7 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1.5 rounded-md"
                    >
                      {isTranslating['notes'] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3" />
                      )}
                      TRANSLATE
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isImprovingNotes || !watch('notes') || isFieldDisabled}
                      onClick={() => handleImproveText('notes')}
                      className="h-7 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all gap-1.5 rounded-md"
                    >
                    {isImprovingNotes ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    CORRECT
                  </Button>
                </div>
              </div>
                
              <div className="relative group">
                  <Textarea 
                    {...register('notes')} 
                    disabled={isFieldDisabled}
                    placeholder="Internal notes..." 
                    className="min-h-[120px] border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none rounded-xl font-medium dark:text-white"
                  />
                  {(complaint?.images && complaint.images.length > 0) && (
                    <div className="absolute bottom-3 right-3">
                      <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {complaint.images.length} {complaint.images.length === 1 ? 'Photo' : 'Photos'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Existing Images Display - Dashed Box matching screenshot */}
                {(complaint?.images && complaint.images.length > 0) && (
                  <div className="p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-900/40 transition-colors">
                    <div className="flex flex-wrap gap-4">
                      {complaint.images.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group shadow-sm hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setPreviewFile({ url: img, type: 'image/jpeg', name: `Photo ${idx + 1}` })}
                        >
                          <img src={img} alt={`Complaint ${idx}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <div className="p-1.5 bg-white/20 dark:bg-slate-900/40 rounded-full">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (complaint) {
                                  const newImages = complaint.images?.filter((_, i) => i !== idx);
                                  try {
                                    await api.updateComplaint(complaint.id, { images: newImages });
                                    toast.success("Photo removed");
                                    onUpdate();
                                  } catch (error) {
                                    toast.error("Failed to remove photo");
                                  }
                                }
                              }}
                              className="p-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-full transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Section */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 transition-colors">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Type</Label>
                  <Select disabled={isFieldDisabled} value={watch('typeOfComplaint') || ''} onValueChange={(v) => setValue('typeOfComplaint', v)}>
                    <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                      {validationTypes.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Amount Spent</Label>
                  <Input {...register('amountSpent')} disabled={isFieldDisabled} placeholder="0.00" className="h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl font-medium dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Created By</Label>
                  <div className="h-11 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 rounded-xl flex items-center px-4 transition-colors">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {complaint.creatorUsername === 'Quality' ? 'OPX' : (complaint.creatorUsername || 'N/A')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Responsible Party</Label>
                  <Select disabled={isFieldDisabled} value={watch('responsibleParty') || ''} onValueChange={(v) => setValue('responsibleParty', v)}>
                    <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                      {responsibleParties.map((p: string) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Action Taken</Label>
                  <Select disabled={isFieldDisabled} value={watch('actionTaken') || ''} onValueChange={(v) => setValue('actionTaken', v)}>
                    <SelectTrigger className="w-full h-11 border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl font-medium dark:text-white transition-colors">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                      {responses.map((r: string) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {watch('status') === 'Closed' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Closed By</Label>
                    <div className="h-11 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center px-4 transition-colors">
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {complaint.closedByUsername === 'Quality' ? 'OPX' : (complaint.closedByUsername || (profile?.username === 'Quality' ? 'OPX' : (profile?.username || 'N/A')))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Admin Comment</Label>
                    <div className="flex items-center gap-2">
                      {originalValues['adminNotes'] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoTranslation('adminNotes')}
                          className="h-6 px-1.5 text-[9px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all gap-1 rounded-md"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          UNDO
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isTranslating['adminNotes'] || !watch('adminNotes')}
                        onClick={() => handleTranslateText('adminNotes')}
                        className="h-6 px-1.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1 rounded-md"
                      >
                        {isTranslating['adminNotes'] ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Languages className="h-2.5 w-2.5" />
                        )}
                        TRANSLATE
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isImprovingNotes || !watch('adminNotes') || isFieldDisabled}
                        onClick={() => handleImproveText('adminNotes')}
                        className="h-6 px-1.5 text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all gap-1 rounded-md"
                      >
                      {isImprovingNotes ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      CORRECT
                    </Button>
                  </div>
                </div>
                  <Textarea 
                  {...register('adminNotes')} 
                    disabled={isFieldDisabled}
                    placeholder="Final resolution notes..." 
                    className="min-h-[100px] border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none rounded-xl font-medium text-sm dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Complaint Comment (Admin Only)</Label>
                    <div className="flex items-center gap-2">
                      {originalValues['complaintComment'] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoTranslation('complaintComment')}
                          className="h-6 px-1.5 text-[9px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all gap-1 rounded-md"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          UNDO
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isTranslating['complaintComment'] || !watch('complaintComment')}
                        onClick={() => handleTranslateText('complaintComment')}
                        className="h-6 px-1.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1 rounded-md"
                      >
                        {isTranslating['complaintComment'] ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Languages className="h-2.5 w-2.5" />
                        )}
                        TRANSLATE
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isImprovingNotes || !watch('complaintComment') || isFieldDisabled}
                        onClick={() => handleImproveText('complaintComment')}
                        className="h-6 px-1.5 text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all gap-1 rounded-md"
                      >
                      {isImprovingNotes ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      CORRECT
                    </Button>
                  </div>
                </div>
                  <Textarea 
                  {...register('complaintComment')} 
                    disabled={isFieldDisabled}
                    placeholder="Additional complaint notes..." 
                    className="min-h-[100px] border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none rounded-xl font-medium text-sm dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Visible only to Complaints Team and Manager</p>
                </div>
              </div>

              {/* Branch Section */}
              {(isRestaurantUser || isQuality || (isComplaintsTeamOrManager && (complaint.branchComment || (complaint.branchAttachments && complaint.branchAttachments.length > 0)))) && (
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Upload className="h-4 w-4" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider">Branch Feedback & Attachments</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase text-[#008f5d] dark:text-[#00c983] tracking-wider">Branch Comment</Label>
                        <div className="flex items-center gap-2">
                          {originalValues['branchComment'] && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndoTranslation('branchComment')}
                              className="h-6 px-1.5 text-[9px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all gap-1 rounded-md"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
                              UNDO
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isTranslating['branchComment'] || !watch('branchComment')}
                            onClick={() => handleTranslateText('branchComment')}
                            className="h-6 px-1.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1 rounded-md"
                          >
                            {isTranslating['branchComment'] ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Languages className="h-2.5 w-2.5" />
                            )}
                            TRANSLATE
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isImprovingNotes || !watch('branchComment') || !isRestaurantUser}
                            onClick={() => handleImproveText('branchComment')}
                            className="h-6 px-1.5 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1 rounded-md"
                          >
                            {isImprovingNotes ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-2.5 w-2.5" />
                            )}
                            CORRECT
                          </Button>
                          {isRestaurantUser && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 scale-90 origin-right transition-colors bg-white/50 dark:bg-slate-900/50">
                              <button
                                type="button"
                                onClick={() => setAppendMode(true)}
                                className={cn(
                                  "px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all",
                                  appendMode ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Append
                              </button>
                              <button
                                type="button"
                                onClick={() => setAppendMode(false)}
                                className={cn(
                                  "px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all",
                                  !appendMode ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Replace
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={isRecording ? stopRecording : startRecording}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all shadow-sm",
                                isRecording 
                                  ? "bg-rose-500 text-white animate-pulse" 
                                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                              )}
                            >
                              {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                              {isRecording ? "Stop" : "Speak (EN)"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {isRestaurantUser ? (
                        <div className="space-y-3">
                          <Textarea 
                            {...register('branchComment')} 
                            placeholder="Write your branch feedback here..." 
                            className="min-h-[120px] border-emerald-100 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-900/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none rounded-xl font-medium dark:text-white"
                          />
                        </div>
                      ) : (
                        <div className="min-h-[120px] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-900/10 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed transition-colors">
                          {complaint.branchComment || 'No comment provided.'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase text-[#008f5d] dark:text-[#00c983] tracking-wider">Attachments (Images/Videos)</Label>
                      {isRestaurantUser && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-emerald-100 dark:border-emerald-900 bg-emerald-50/10 dark:bg-emerald-900/5 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-all group"
                        >
                          <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <Upload className="h-6 w-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Click to upload media</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Supports Images and Videos</p>
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            multiple 
                            accept="image/*,video/*"
                            onChange={handleFileUpload}
                          />
                        </div>
                      )}

                      {branchAttachments.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          {branchAttachments.map((url, index) => (
                            <div 
                              key={index} 
                              className="relative group aspect-square rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                              onClick={() => setPreviewFile({ 
                                url, 
                                type: url.includes('video') || url.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', 
                                name: `Branch Attachment ${index + 1}` 
                              })}
                            >
                              {url.includes('video') || url.endsWith('.mp4') ? (
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center transition-colors">
                                  <FileVideo className="h-8 w-8 text-slate-400" />
                                </div>
                              ) : (
                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                              {isRestaurantUser && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(index);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!isRestaurantUser && branchAttachments.length === 0 && (
                        <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs italic transition-colors">
                          No attachments provided.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Survey Section (Right Side) */}
            {(isFollowUpPage && !isQuality) && (
              <div className="space-y-8 border-l border-slate-100 dark:border-slate-800 pl-8 transition-colors">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <ClipboardList className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Follow up — {complaint.complaintNumber}</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Feedback — How satisfied were you with your experience?</Label>
                    <div className="flex flex-wrap gap-4">
                      {['Very satisfied', 'Somewhat satisfied', 'Not satisfied'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="radio" 
                            value={option}
                            {...register('followUpSatisfaction')}
                            className="h-4 w-4 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-transparent"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">What were you hoping the agent would do to resolve your issue?</Label>
                    <Textarea 
                      {...register('followUpAgentResolution')}
                      placeholder="Enter details..."
                      className="min-h-[100px] border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 focus:border-blue-500 rounded-xl resize-none dark:text-white transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Did the agent provide the help you needed?</Label>
                    <Textarea 
                      {...register('followUpHelpProvided')}
                      placeholder="Enter details..."
                      className="min-h-[100px] border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 focus:border-blue-500 rounded-xl resize-none dark:text-white transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Any suggestions to improve our service?</Label>
                    <Textarea 
                      {...register('followUpServiceSuggestions')}
                      placeholder="Enter suggestions..."
                      className="min-h-[100px] border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 focus:border-blue-500 rounded-xl resize-none dark:text-white transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">How would you rate your overall experience with our service?</Label>
                    <div className="flex gap-6">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="radio" 
                            value={rating.toString()}
                            {...register('followUpOverallRating')}
                            className="h-4 w-4 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-transparent"
                          />
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{rating}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopySummary}
                className="h-11 px-4 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all flex items-center gap-2"
                title="Copy Summary to Clipboard"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendEmail}
                className="h-11 px-4 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all flex items-center gap-2"
                title="Send Summary via Email"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-11 px-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 px-12 h-11 font-bold uppercase tracking-wider shadow-lg shadow-emerald-200 dark:shadow-none transition-all rounded-xl active:scale-[0.98]"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Preview Modal */}
    <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none"
      >
        <div className="relative w-full h-full flex items-center justify-center min-h-[300px]">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setPreviewFile(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          {previewFile?.type.startsWith('video/') ? (
            <video src={previewFile.url} controls autoPlay className="max-w-full max-h-[80vh]" />
          ) : (
            <img src={previewFile?.url} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  </>
);
}
