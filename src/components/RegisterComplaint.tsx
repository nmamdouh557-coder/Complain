import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Phone, 
  User, 
  Hash, 
  MessageSquare,
  ClipboardList,
  XCircle,
  Camera,
  ChevronsUpDown,
  Search,
  PlusCircle,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Upload,
  X,
  MapPin,
  Tag,
  Smartphone,
  Store,
  FileText,
  Flag,
  Play,
  FileVideo,
  Eye,
  Languages,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getKuwaitISOString, formatKuwaitDate, getKuwaitDateTimeLocalString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { notificationService } from '@/lib/notifications';
import { toast } from 'sonner';

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { ComplaintsTable } from './ComplaintsTable';
import { ComplaintDetailsDialog } from './ComplaintDetailsDialog';
import { ComplaintTimelineDialog } from './ComplaintTimelineDialog';
import { geminiService, ExtractedComplaint } from '@/services/geminiService';
import { Wand2, FileUp, FileSpreadsheet, Mic, Square, Trash2, RotateCcw, Bookmark, RotateCw, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

const formSchema = z.object({
  customerPhone: z.string().min(8, "Phone number is required"),
  customerName: z.string().min(2, "Customer name is required"),
  brand: z.string().min(1, "Brand is required"),
  branch: z.string().min(1, "Branch is required"),
  platform: z.string().min(1, "Platform is required"),
  orderId: z.string().optional(),
  dateTime: z.string().min(1, "Date is required"),
  status: z.string(),
  priority: z.string(),
  complaintSource: z.string().min(1, "Source is required"),
  typeOfComplaint: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  caseType: z.string().min(1, "Case type is required"),
  item: z.string().optional(),
  product: z.string().optional(),
  notes: z.string().min(5, "Notes must be at least 5 characters"),
  response: z.string().optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
});

import { useConfigs } from '@/hooks/useConfigs';

const SUGGESTED_WORDS = [
  // Business & Status
  "Complaint", "Customer", "Order", "Delivery", "Receipt", "Refund", "Missing", "Branch", "Manager", "Platform",
  "Phone", "Validation", "Follow-up", "Satisfaction", "Response", "Driver", "Item", "Food", "Cold", "Delay",
  "Compensation", "Swish", "Portal", "Resolved", "Escalated", "Closed", "Pending", "Validated", "Canceled",
  "Completed", "Refunded", "Replacement", "Cancelled", "Voucher", "Discount", "Coupon", "Payment", "Wallet",
  "Credit", "Card", "Cash", "Service", "Feedback", "Agent", "Resolution", "Suggestions", "Experience",
  "Inconvenience", "Apologies", "Redelivery", "Incorrect", "Arrived", "Status", "Contact", "Called", "Email",
  "Message", "WhatsApp", "Support", "Urgent", "High", "Critical", "Normal", "Routine", "Standard",
  
  // Food & Quality
  "Hygiene", "Under-cooked", "Over-cooked", "Tasteless", "Salty", "Spicy", "Raw", "Burnt", "Stale", "Fresh",
  "Cold", "Frozen", "Melted", "Spilled", "Leaking", "Dirty", "Hair", "Insect", "Foreign", "Object", "Taste",
  "Smell", "Color", "Portion", "Quantity", "Quality", "Ingredients", "Allergy", "Gluten", "Sugar", "Salt",
  
  // Packaging & Logistics
  "Packaging", "Package", "Sealed", "Unsealed", "Damaged", "Crushed", "Open", "Container", "Box", "Bag",
  "Holder", "Napkins", "Cutlery", "Straw", "Spoon", "Fork", "Knife", "Cover", "Lid", "Sticker", "Label",
  "Address", "Location", "Area", "Street", "Block", "Building", "Floor", "Apartment", "House", "Map",
  "GPS", "Navigation", "Traffic", "Route", "Distance", "Time", "Minutes", "Hours", "Late", "Early",
  
  // Customer & Interaction
  "Angry", "Upset", "Frustrated", "Patient", "Polite", "Rude", "Shouting", "Calm", "Happy", "Satisfied",
  "Demanding", "Insulting", "Claiming", "Reporting", "Explaining", "Requesting", "Insisting", "Telling",
  "Mentioned", "Said", "Asked", "Demanded", "Agreed", "Refused", "Disconnected", "Busy", "No Answer",
  
  // Common Connectors & Verbs
  "Because", "Instead", "Actually", "However", "Although", "Regarding", "Concerning", "Through", "Between",
  "During", "Before", "After", "Already", "Never", "Always", "Possible", "Impossible", "Available", "Unavailable",
  "Necessary", "Important", "Required", "Optional", "Recommended", "Confirmed", "Checked", "Verified", "Reviewed",
  "Investigated", "Found", "Noticed", "Observed", "Reported", "Submitted", "Received", "Sent", "Forwarded"
].sort((a, b) => a.localeCompare(b));

const AUTO_CORRECT_MAP: Record<string, string> = {
  // Common Typos
  "delvery": "delivery", "delivvery": "delivery", "receit": "receipt", "recipt": "receipt",
  "refun": "refund", "refnd": "refund", "complant": "complaint", "complain": "complaint",
  "custmer": "customer", "costomer": "customer", "mising": "missing", "managr": "manager",
  "bransh": "branch", "brnach": "branch", "resived": "received", "paymnt": "payment",
  "paymnet": "payment", "walet": "wallet", "discont": "discount", "servis": "service",
  "suport": "support", "cancel": "cancel", "cancle": "cancel", "ordr": "order", "phne": "phone",

  // Communication & Social
  "plz": "please", "asap": "as soon as possible", "thx": "thanks", "tks": "thanks",
  "msg": "message", "info": "information", "id": "ID", "aka": "also known as",
  "btw": "by the way", "fyi": "for your information", "brb": "be right back",
  "bbl": "be back later", "fwd": "forward", "rsvp": "please reply", "txt": "text",
  "email": "email", "addr": "address", "tel": "telephone", "ph": "phone",
  "no": "number", "qty": "quantity", "vs": "versus", "etc": "et cetera",
  "eg": "for example", "ie": "that is", "re": "regarding", "ref": "reference",

  // Business & Professional
  "corp": "corporation", "inc": "incorporated", "co": "company", "dept": "department",
  "mgmt": "management", "mktg": "marketing", "hq": "headquarters", "ceo": "Chief Executive Officer",
  "cfo": "Chief Financial Officer", "cto": "Chief Technology Officer", "vp": "Vice President",
  "pr": "Public Relations", "it": "Information Technology",
  "biz": "business", "prof": "professional", "temp": "temporary", "perm": "permanent",
  "appt": "appointment", "conf": "confirmation", "inv": "invoice", "po": "purchase order",
  "sq": "square", "st": "street", "ave": "avenue", "rd": "road", "blvd": "boulevard",
  "bldg": "building", "fl": "floor", "ste": "suite", "apt": "apartment",

  // Logistics & Status
  "eta": "estimated time of arrival", "etd": "estimated time of departure",
  "shp": "shipment", "pkg": "package", "pos": "point of sale", "upd": "update",
  "resol": "resolution", "comp": "compensation", "vouch": "voucher", "disc": "discount",
  "authorized": "authorized", "investigated": "investigated", "finalized": "finalized",
  "urgent": "urgent", "crit": "critical", "std": "standard", "opt": "optional",
  "rec": "recommended", "rev": "reviewed", "verified": "verified",

  // Measurement & General
  "approx": "approximately", "max": "maximum", "min": "minute", "avg": "average",
  "w/": "with", "w/o": "without", "b/c": "because", "btn": "between",
  "u": "you", "r": "are", "k": "ok", "ok": "OK", "n/a": "not applicable", "atm": "at the moment",
  "lb": "pound", "oz": "ounce", "kg": "kilogram", "g": "gram", "m": "meter", "cm": "centimeter",
  "km": "kilometer", "in": "inch", "ft": "foot", "yd": "yard", "mi": "mile",
  "vol": "volume", "cap": "capacity", "wt": "weight", "ht": "height", "len": "length",

  // Time & Frequency
  "sec": "second", "hr": "hour", "day": "day", "wk": "week",
  "mo": "month", "yr": "year", "p.m.": "PM", "a.m.": "AM", "mon": "Monday",
  "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday",
  "sat": "Saturday", "sun": "Sunday", "jan": "January", "feb": "February",
  "mar": "March", "apr": "April", "jun": "June", "jul": "July", "aug": "August",
  "sep": "September", "oct": "October", "nov": "November", "dec": "December",
  "q1": "first quarter", "q2": "second quarter", "q3": "third quarter", "q4": "fourth quarter",

  // Internet & Digital
  "app": "application", "acc": "account", "pwd": "password", "url": "URL", "ip": "IP address",
  "api": "API", "os": "operating system", "hw": "hardware", "sw": "software", "db": "database",
  "dev": "development", "ui": "user interface", "ux": "user experience", "qa": "quality assurance",

  // Complaint Specific
  "cust": "customer", "cmp": "complaint", "tick": "ticket", "sub": "subject", "cat": "category",
  "loc": "location", "desc": "description", "cmt": "comment", "att": "attention",
  "prov": "provider", "auth": "authorized", "clari": "clarified"
};

// Simple Levenshtein distance for fuzzy matching
function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function findBestMatch(word: string, dictionary: string[]): string | null {
  if (word.length < 3) return null;
  let bestMatch = null;
  let minDistance = 2; // Allow up to 2 character differences

  for (const dictWord of dictionary) {
    const distance = getLevenshteinDistance(word.toLowerCase(), dictWord.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = dictWord;
    }
  }
  return bestMatch;
}

// Enhanced fuzzy matching for dropdowns
function findStrictMatch(text: string, options: string[]): { match: string | null, suggestions: string[] } {
  if (!text || options.length === 0) return { match: null, suggestions: [] };
  
  const normalizedText = text.trim().toLowerCase();
  
  // 1. Exact match (case insensitive)
  const exact = options.find(opt => opt.toLowerCase() === normalizedText);
  if (exact) return { match: exact, suggestions: [] };

  // 2. Fuzzy match
  const matches = options.map(opt => {
    const distance = getLevenshteinDistance(normalizedText, opt.toLowerCase());
    const maxLen = Math.max(normalizedText.length, opt.length);
    const similarity = 1 - (distance / maxLen);
    return { opt, similarity };
  });

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  // Threshold for "good match"
  const BEST_THRESHOLD = 0.7; 
  if (matches[0].similarity >= BEST_THRESHOLD) {
    return { match: matches[0].opt, suggestions: [] };
  }

  // No good match found, return top 3 suggestions
  return { 
    match: null, 
    suggestions: matches.slice(0, 3).map(m => m.opt) 
  };
}

const DRAFT_STORAGE_KEY = 'swish_complaint_form_draft';
const MANUAL_DRAFT_KEY = 'swish_manual_form_draft';

export function RegisterComplaint() {
  const { profile } = useAuth();
  const { t, language } = useApp();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [existingComplaints, setExistingComplaints] = useState<Complaint[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string, type: string, name: string } | null>(null);
  const [filePreviews, setFilePreviews] = useState<{ file: File, url: string }[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isMagicPasteOpen, setIsMagicPasteOpen] = useState(false);
  const [magicText, setMagicText] = useState("");
  const [isProcessingMagic, setIsProcessingMagic] = useState(false);
  const [isImprovingNotes, setIsImprovingNotes] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [manualDrafts, setManualDrafts] = useState<any[]>([]);
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleImproveNotes = async () => {
    const currentNotes = watch("notes");
    if (!currentNotes || currentNotes.length < 5) {
      toast.error("Please enter at least 5 characters to improve.");
      return;
    }

    setIsImprovingNotes(true);
    try {
      const response = await geminiService.improveText(currentNotes);
      if (response) {
        setValue("notes", response);
        toast.success("Notes improved successfully!");
      }
    } catch (error) {
      console.error("Failed to improve notes:", error);
      toast.error("Failed to improve notes. Please try again.");
    } finally {
      setIsImprovingNotes(false);
    }
  };

  const handleTranslateNotes = async () => {
    const currentNotes = watch("notes");
    if (!currentNotes || currentNotes.length < 2) {
      toast.error("Please enter text to translate.");
      return;
    }

    setIsTranslating(true);
    try {
      const isArabic = /[\u0600-\u06FF]/.test(currentNotes);
      const targetLang = isArabic ? 'English' : 'Arabic';
      
      const response = await geminiService.translateText(currentNotes, targetLang);
      if (response) {
        setOriginalNotes(currentNotes);
        setValue("notes", response);
        toast.success(`Translated to ${targetLang}!`, {
          action: {
            label: "Undo",
            onClick: () => {
              setValue("notes", currentNotes);
              setOriginalNotes(null);
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to translate notes:", error);
      toast.error("Failed to translate notes. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUndoTranslation = () => {
    if (originalNotes) {
      setValue("notes", originalNotes);
      setOriginalNotes(null);
      toast.success("Reverted to original text");
    }
  };

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const bulkInputRef = React.useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [hasManualDraft, setHasManualDraft] = useState(() => !!localStorage.getItem(MANUAL_DRAFT_KEY));
  const [isStoreDraftDialogOpen, setIsStoreDraftDialogOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = React.useRef<any>(null);

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
    formFieldOrdering,
    customFieldsDefinition,
    caseTypeMapping,
    loading: configsLoading
  } = useConfigs();

  useEffect(() => {
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setFilePreviews(newPreviews);
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [files]);
  
  useEffect(() => {
    const savedDrafts = localStorage.getItem(MANUAL_DRAFT_KEY);
    if (savedDrafts) {
      try {
        const parsed = JSON.parse(savedDrafts);
        if (Array.isArray(parsed)) {
          setManualDrafts(parsed);
          setHasManualDraft(parsed.length > 0);
        } else {
          // Migration: convert old single draft to array
          const migrated = [{
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            data: parsed,
            title: parsed.title || "Legacy Draft",
            customerName: parsed.customerName || "N/A"
          }];
          setManualDrafts(migrated);
          setHasManualDraft(true);
          localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify(migrated));
        }
      } catch (e) {
        console.error("Failed to load drafts:", e);
      }
    }
  }, []);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, control, getValues } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerPhone: "",
      customerName: "",
      brand: "",
      branch: "",
      platform: "",
      orderId: "",
      dateTime: getKuwaitDateTimeLocalString(),
      status: "Closed",
      priority: "medium",
      complaintSource: "",
      title: "",
      caseType: "",
      item: "",
      notes: "",
      response: ""
    }
  });

  // Draft persistence logic
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        reset(parsedDraft);
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, [reset]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const selectedBrand = watch("brand");
  const selectedTitle = watch("title");
  const customerPhone = watch("customerPhone");
  const customerName = watch("customerName");

  // Automatically set status to "Open" if title is "Critical"
  useEffect(() => {
    if (selectedTitle === "Critical") {
      setValue("status", "Open");
    }
  }, [selectedTitle, setValue]);

  // Customer Lookup logic
  useEffect(() => {
    const lookupCustomer = async () => {
      if (!customerPhone || customerPhone.length < 8) return;

      try {
        const results = await api.searchComplaints({ phone: customerPhone });
        if (results && results.length > 0) {
          // Sort by creation date descending to get the most recent
          const latest = results.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

          // Prompt user or auto-fill if current fields are empty
          if (!customerName) {
            setValue("customerName", latest.customerName);
          }
          
          if (!watch("brand")) {
            setValue("brand", latest.brand);
            // Delay branch and platform setting to allow brand-dependent configs to load if necessary
            setTimeout(() => {
               if (!watch("branch")) setValue("branch", latest.branch);
               if (!watch("platform")) setValue("platform", latest.platform);
            }, 100);
          } else if (!watch("platform")) {
            setValue("platform", latest.platform);
          }

          toast.info(t('customer_found_notice') || "Customer details found from previous records.");
        }
      } catch (error) {
        console.error("Customer lookup error:", error);
      }
    };

    const timer = setTimeout(lookupCustomer, 1000);
    return () => clearTimeout(timer);
  }, [customerPhone, setValue, t]);

  // Set default brand/branch for restaurant users
  useEffect(() => {
    if (profile?.role === 'restaurant_user') {
      if (profile.brand) setValue('brand', profile.brand);
      if (profile.branch) setValue('branch', profile.branch);
    }
  }, [profile, setValue]);

  const selectedItem = watch("item");
  const orderId = watch("orderId");
  const [itemOpen, setItemOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const fieldsMap: Record<string, React.ReactNode> = {
    customerPhone: (
      <div key="customerPhone" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Enter phone..." 
            {...register("customerPhone")} 
            className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm rounded-md dark:text-white" 
          />
        </div>
        {errors.customerPhone && <p className="text-[10px] text-destructive mt-1">{errors.customerPhone.message}</p>}
      </div>
    ),
    customerName: (
      <div key="customerName" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Customer Name</Label>
        <Input 
          placeholder="Full name" 
          {...register("customerName")} 
          className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm rounded-md dark:text-white" 
        />
        {errors.customerName && <p className="text-[10px] text-destructive mt-1">{errors.customerName.message}</p>}
      </div>
    ),
    brand: (
      <div key="brand" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Brand</Label>
        <Select 
          value={watch("brand") || ""} 
          onValueChange={(v: string) => setValue("brand", v)}
          disabled={profile?.role === 'restaurant_user' && !!profile.brand}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {brands.map((b: string) => <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.brand && <p className="text-[10px] text-destructive mt-1">{errors.brand.message}</p>}
      </div>
    ),
    branch: (
      <div key="branch" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Branch</Label>
        <Select 
          value={watch("branch") || ""} 
          onValueChange={(v: string) => setValue("branch", v)} 
          disabled={!selectedBrand || (profile?.role === 'restaurant_user' && !!profile.branch)}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {selectedBrand && brandsBranches[selectedBrand]?.map((b: string) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branch && <p className="text-[10px] text-destructive mt-1">{errors.branch.message}</p>}
      </div>
    ),
    platform: (
      <div key="platform" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Platform</Label>
        <Select 
          value={watch("platform") || ""} 
          onValueChange={(v: string) => setValue("platform", v)}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {platforms.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.platform && <p className="text-[10px] text-destructive mt-1">{errors.platform.message}</p>}
      </div>
    ),
    orderId: (
      <div key="orderId" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Order ID</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors" />
          <Input 
            placeholder="Optional" 
            {...register("orderId")} 
            className={cn(
              "pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm rounded-md dark:text-white",
              orderId && orderId.length >= 3 && "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-100 dark:ring-blue-900/20"
            )} 
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>
    ),
    dateTime: (
      <div key="dateTime" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Order Date</Label>
        <div className="relative">
          <Input 
            type="datetime-local" 
            {...register("dateTime")} 
            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm pr-10 rounded-md dark:text-white" 
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-colors" />
        </div>
        {errors.dateTime && <p className="text-[10px] text-destructive mt-1">{errors.dateTime.message}</p>}
      </div>
    ),
    status: (
      <div key="status" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Status</Label>
        <Select 
          value={watch("status") || "Closed"} 
          onValueChange={(v: string) => setValue("status", v)}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Closed" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {complaintStatus.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    ),
    complaintSource: (
      <div key="complaintSource" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Complaint Source</Label>
        <Select 
          value={watch("complaintSource") || ""} 
          onValueChange={(v: string) => setValue("complaintSource", v)}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {sources.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.complaintSource && <p className="text-[10px] text-destructive mt-1">{errors.complaintSource.message}</p>}
      </div>
    ),
    title: (
      <div key="title" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Category (Title)</Label>
        <Select 
          value={watch("title") || ""} 
          onValueChange={(v: string) => setValue("title", v)}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select title" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 max-h-[300px] transition-colors">
            {Object.keys(complaintCategories).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.title && <p className="text-[10px] text-destructive mt-1">{errors.title.message}</p>}
      </div>
    ),
    caseType: (
      <div key="caseType" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Case Type</Label>
        <Select 
          onValueChange={(v: string) => {
            setValue("caseType", v);
            if (caseTypeMapping && caseTypeMapping[v]) {
              setValue("title", caseTypeMapping[v]);
            }
          }}
          value={watch("caseType")}
        >
          <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
            <SelectValue placeholder="Select case" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
            {Object.values(complaintCategories as Record<string, string[]>).flat().map((type: string) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.caseType && <p className="text-[10px] text-destructive mt-1">{errors.caseType.message}</p>}
      </div>
    ),
    item: (
      <div key="item" className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Item</Label>
        <Popover open={itemOpen} onOpenChange={setItemOpen}>
          <PopoverTrigger
            className={cn(
              "w-full min-h-11 h-auto flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-normal transition-all hover:bg-slate-50 dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white",
              !watch("item") && "text-slate-500 dark:text-slate-500"
            )}
            disabled={!selectedBrand}
          >
            <div className="flex flex-wrap gap-1">
              {watch("item") ? (
                watch("item")!.split(', ').map((item: string) => (
                  <Badge key={item} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-1.5 py-0 h-5 text-[10px] flex items-center gap-1 transition-colors">
                    {item}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentItems = watch("item")?.split(', ') || [];
                        const newItems = currentItems.filter((i: string) => i !== item);
                        setValue("item", newItems.join(', '));
                      }} 
                    />
                  </Badge>
                ))
              ) : (
                "Item"
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" align="start">
            <Command className="bg-white dark:bg-slate-950">
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
        {errors.item && <p className="text-[10px] text-destructive mt-1">{errors.item.message}</p>}
      </div>
    ),
    notes: (
      <div key="notes" className="space-y-3 col-span-full">
        <div className="flex items-center justify-between col-span-full">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Internal Notes & Evidence</Label>
          </div>
          <div className="flex items-center gap-2">
            {originalNotes && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndoTranslation}
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
              disabled={isTranslating || !watch("notes")}
              onClick={handleTranslateNotes}
              className="h-7 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all gap-1.5 rounded-md"
            >
              {isTranslating ? (
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
              disabled={isImprovingNotes || !watch("notes")}
              onClick={handleImproveNotes}
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

        {suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-2"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                {suggestion}
              </button>
            ))}
            <p className="text-[9px] text-slate-400 flex items-center ml-1 italic">Click suggestion to apply</p>
          </motion.div>
        )}

        <div className="relative group">
          <Textarea 
            {...register("notes")} 
            onChange={(e) => {
              register("notes").onChange(e);
              handleNotesChange(e);
              setOriginalNotes(null); 
            }}
            placeholder="Details about the complaint..." 
            className="min-h-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none rounded-xl font-medium dark:text-white"
          />
          {recordingTime > 0 && (
            <Badge variant="secondary" className="absolute bottom-3 right-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50 text-[10px] font-bold animate-pulse">
              Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
            </Badge>
          )}
        </div>

        {errors.notes && <p className="text-[10px] text-destructive mt-1">{errors.notes.message}</p>}
      </div>
    )
  };


  const defaultOrder = ["customerPhone", "customerName", "brand", "branch", "platform", "orderId", "dateTime", "status", "complaintSource", "title", "caseType", "item", "notes"];
  const displayFields = (formFieldOrdering && formFieldOrdering.length > 0) ? formFieldOrdering : defaultOrder;

  // Search for existing complaints by Order ID
  useEffect(() => {
    const searchOrder = async () => {
      if (!orderId || orderId.length < 3) {
        setExistingComplaints([]);
        return;
      }

      setSearching(true);
      try {
        const results = await api.searchComplaints({ orderId });
        setExistingComplaints(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchOrder, 500);
    return () => clearTimeout(timer);
  }, [orderId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // If we are in voice assistant mode, we use the transcript instead of audio blob for text extraction
        // as per user requirement to see live transcript first.
        if (!isVoiceAssistantOpen) {
          handleMagicPaste(blob);
        }
      };

      // Set up Speech Recognition for Live Transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setLiveTranscript(prev => finalTranscript ? prev + " " + finalTranscript : prev);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const populateForm = (extracted: ExtractedComplaint) => {
    const matches: Record<string, string | null> = {};
    const failedMatches: string[] = [];

    const handleDropdownMatch = (field: string, value: string | undefined, options: string[], label: string) => {
      if (!value) return;
      const result = findStrictMatch(value, options);
      if (result.match) {
        setValue(field as any, result.match);
      } else {
        failedMatches.push(`${label}: "${value}" (Suggested: ${result.suggestions.join(', ')})`);
      }
    };

    if (extracted.customerPhone) setValue("customerPhone", extracted.customerPhone);
    if (extracted.customerName) setValue("customerName", extracted.customerName);
    
    // Dropdown fields with strict matching
    const brandResult = findStrictMatch(extracted.brand || "", brands);
    if (brandResult.match) {
      setValue("brand", brandResult.match);
    } else if (extracted.brand) {
      failedMatches.push(`Brand: "${extracted.brand}" (Suggested: ${brandResult.suggestions.join(', ')})`);
    }

    handleDropdownMatch("platform", extracted.platform, platforms, "Platform");
    handleDropdownMatch("complaintSource", extracted.complaintSource, sources, "Complaint Source");
    
    // Title match
    const titleOptions = Object.keys(complaintCategories);
    const titleResult = findStrictMatch(extracted.title || "", titleOptions);
    if (titleResult.match) {
      setValue("title", titleResult.match);
      // Now match Case Type based on matched title
      const caseOptions = complaintCategories[titleResult.match] || [];
      handleDropdownMatch("caseType", extracted.caseType, caseOptions, "Case Type");
    } else if (extracted.title) {
      failedMatches.push(`Title: "${extracted.title}" (Suggested: ${titleResult.suggestions.join(', ')})`);
    }

    // Branch & Item match based on matched brand
    const effectiveBrand = brandResult.match; 
    if (effectiveBrand) {
      const branchOptions = brandsBranches[effectiveBrand] || [];
      handleDropdownMatch("branch", extracted.branch, branchOptions, "Branch");
      
      const itemOptions = brandItems[effectiveBrand] || [];
      handleDropdownMatch("item", extracted.item, itemOptions, "Item");
    }

    if (extracted.orderId) setValue("orderId", extracted.orderId);
    if (extracted.dateTime) {
      try {
        const date = new Date(extracted.dateTime);
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DDTHH:mm in Kuwait time
          const kuwaitDate = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kuwait'
          }).formatToParts(date);
          
          const getPart = (type: string) => kuwaitDate.find(p => p.type === type)?.value;
          const formatted = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
          setValue("dateTime", formatted);
        }
      } catch (e) {}
    }
    
    if (extracted.notes) setValue("notes", extracted.notes);

    if (failedMatches.length > 0) {
      toast.warning(
        <div className="space-y-1">
          <p className="font-bold text-xs uppercase">No matches found for some fields:</p>
          <ul className="list-disc pl-4 text-[11px] space-y-0.5">
            {failedMatches.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>,
        { duration: 6000 }
      );
    }
  };

  const handleMagicPaste = async (blobOverride?: Blob) => {
    const textToProcess = isVoiceAssistantOpen ? liveTranscript : magicText;
    const targetBlob = blobOverride || audioBlob;
    
    if (!textToProcess.trim() && !targetBlob) return;
    setIsProcessingMagic(true);
    try {
      let extracted: ExtractedComplaint | null = null;

      if (targetBlob && !isVoiceAssistantOpen) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(targetBlob);
        const base64Audio = await base64Promise;
        extracted = await geminiService.processVoiceComplaint(base64Audio, 'audio/webm');
      } else {
        extracted = await geminiService.extractComplaintDetails(textToProcess);
      }

      if (extracted) {
        populateForm(extracted);
        toast.success("Form populated with AI magic!");
        setIsMagicPasteOpen(false);
        setIsVoiceAssistantOpen(false);
        setMagicText("");
        setLiveTranscript("");
        setAudioBlob(null);
      } else {
        toast.error("Could not extract details. Try again.");
      }
    } catch (error) {
      console.error("AI Error:", error);
      toast.error("AI processing failed.");
    } finally {
      setIsProcessingMagic(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("The Excel file is empty");
          return;
        }

        // Map data to complaint structure based on provided image headers
        const complaints = data.map((row: any) => {
          const status = String(row['Status'] || row['status'] || 'Closed');
          const isClosed = status === 'Closed';
          
          let rawBrand = String(row['Brand'] || row['brand'] || row['BRAND'] || '');
          let brand = rawBrand;
          let branch = String(row['Branch'] || row['branch'] || row['BRANCH'] || '');

          // Robust Brand(Branch) parsing if branch is missing
          if (!branch && rawBrand.includes('(')) {
            const parts = rawBrand.split('(');
            brand = parts[0].trim();
            branch = parts[1].replace(')', '').trim();
          }
          
          return {
            customerPhone: String(row['Phone Num'] || row['Customer Phone'] || row['phone'] || row['Phone'] || ''),
            customerName: String(row['Customer Name'] || row['name'] || row['Customer'] || row['customer_name'] || ''),
            brand: brand,
            branch: branch,
            platform: String(row['Platform'] || row['platform'] || ''),
            orderId: String(row['Order ID'] || row['order_id'] || ''),
            complaintSource: String(row['Complain source'] || row['Source'] || row['source'] || row['Complaint Source'] || ''),
            title: String(row['Title'] || row['title'] || row['Title (CATEGORY)'] || ''),
            caseType: String(row['Case Type'] || row['case_type'] || row['Case'] || ''),
            item: String(row['Item'] || row['item'] || ''),
            status: status,
            priority: 'medium',
            dateTime: row['Order Date'] 
              ? (typeof row['Order Date'] === 'number' 
                  ? XLSX.utils.format_cell({v: row['Order Date'], t: 'd'}) 
                  : String(row['Order Date'])) 
              : getKuwaitISOString(),
            notes: row['Note'] || row['Internal Note'] || row['notes'] || 'Bulk uploaded from Excel',
            isProcessed: false,
            customFields: {},
            closedByUsername: isClosed ? (row['Closed By'] || row['closed_by'] || profile.username) : null,
            closedAt: isClosed ? getKuwaitISOString() : null,
            createdByUid: profile.id,
            creatorUsername: profile.username || (profile as any).name || 'Unknown'
          };
        });

        setLoading(true);
        const result = await api.bulkCreateComplaints({
          complaints,
          createdByUid: profile.id,
          creatorUsername: profile.username || (profile as any).name || 'Unknown'
        });

        if (result.failed === 0) {
          toast.success(`Successfully uploaded ${result.success} complaints!`);
        } else {
          toast.warning(`Uploaded ${result.success} complaints, but ${result.failed} failed.`);
          console.error("Bulk upload errors:", result.errors);
        }
      } catch (error) {
        console.error("Excel parsing error:", error);
        toast.error("Failed to process Excel file. Please check the format.");
      } finally {
        setLoading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const headers = [
      ['Customer Phone', 'Customer Name', 'Brand', 'Branch', 'Order Date', 'Platform', 'Order ID', 'Source', 'Title', 'Case Type', 'Item', 'Status', 'Internal Note', 'Closed By'],
      ['1027496299', 'Mamdouh', 'pattie', 'Salmiya', '18/04/2026 16:24:24', 'Cari', '3398553222', 'Call Center', 'Critical', 'Hair', '(5Pcs) Pepsi', 'Closed', 'Check1', 'admin']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Complaint_Bulk_Template.xlsx");
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!profile) {
      toast.error("You must be logged in to submit a complaint");
      return;
    }

    setLoading(true);
    try {
      // Upload files to Cloudinary via our server
      let imageUrls: string[] = [];
      if (files.length > 0) {
        try {
          imageUrls = await api.uploadFiles(files);
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError);
          // If Cloudinary is missing, tell the user but allow submission without images if they want
          // or just fail gracefully with a descriptive message.
          if (uploadError.message && uploadError.message.includes("Cloudinary is not configured")) {
            toast.error("Cloudinary is not configured. Please add CLOUDINARY environmental variables to your project settings.");
            setLoading(false);
            return;
          }
          throw uploadError;
        }
      }

      const isClosed = data.status === 'Closed';

      const complaintData = {
        ...data,
        typeOfComplaint: data.title,
        images: imageUrls, 
        createdByUid: profile.id,
        creatorUsername: profile.username || (profile as any).name || 'Unknown',
        closedByUsername: isClosed ? (profile.username || (profile as any).name || 'Unknown') : null,
        closedAt: isClosed ? getKuwaitISOString() : null,
        isProcessed: false,
        customFields: data.custom_fields || {},
        createdAt: getKuwaitISOString(),
        updatedAt: getKuwaitISOString(),
        dateTime: data.dateTime.includes('+') ? data.dateTime : data.dateTime + "+03:00"
      };

      const result = await api.createComplaint(complaintData);

      // Trigger notification if status is Open
      if (complaintData.status === 'Open') {
        // Notify complaints team (existing)
        await notificationService.sendNotification({
          recipientRole: 'complaints_team',
          message: `New complaint received #${result.complaintNumber}`,
          createdBy: profile.id,
          createdByUsername: profile.username,
          complaintId: String(result.id),
          type: 'COMPLAINT'
        });

        // Notify specifically the restaurant_user of that branch
        if (complaintData.brand && complaintData.branch) {
          await notificationService.sendNotification({
            recipientRole: 'restaurant_user',
            message: `New complaint filed for your branch: #${result.complaintNumber}`,
            createdBy: profile.id,
            createdByUsername: profile.username,
            brand: complaintData.brand,
            branch: complaintData.branch,
            complaintId: String(result.id),
            type: 'COMPLAINT'
          });
        }
      }

      toast.success(`Complaint registered successfully!`);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      reset();
      setFiles([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const words = value.split(/(\s+)/); // Keep delimiters
    const lastWord = words[words.length - 1];
    
    // Auto-suggestion logic (no auto-replace on space)
    if (lastWord.length > 1) {
      // 1. Prefix matches from dictionary
      const filtered = SUGGESTED_WORDS.filter(w => 
        w.toLowerCase().startsWith(lastWord.toLowerCase()) && 
        w.toLowerCase() !== lastWord.toLowerCase()
      ).slice(0, 5);
      
      // 2. Direct mapping from auto-correct map (common typos/shorthand)
      const mappedSuggestion = AUTO_CORRECT_MAP[lastWord.toLowerCase()];
      if (mappedSuggestion && !filtered.includes(mappedSuggestion)) {
        filtered.unshift(mappedSuggestion);
      }

      // 3. Fuzzy matching for dictionary words (if no prefix match found and word is long enough)
      if (filtered.length === 0 && lastWord.length >= 3) {
        const fuzzyMatch = findBestMatch(lastWord.toLowerCase(), SUGGESTED_WORDS);
        if (fuzzyMatch && fuzzyMatch.toLowerCase() !== lastWord.toLowerCase()) {
          filtered.push(fuzzyMatch);
        }
      }

      setSuggestions(filtered);
      setCurrentWord(lastWord);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion: string) => {
    const value = watch("notes") || "";
    const words = value.split(/(\s+)/);
    words[words.length - 1] = suggestion;
    setValue("notes", words.join('') + ' ');
    setSuggestions([]);
  };

  const handleReset = () => {
    reset({
      customerPhone: "",
      customerName: "",
      brand: "",
      branch: "",
      platform: "",
      orderId: "",
      dateTime: getKuwaitDateTimeLocalString(),
      status: "Closed",
      priority: "medium",
      complaintSource: "",
      title: "",
      caseType: "",
      item: "",
      notes: "",
      response: ""
    });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFiles([]);
    setFilePreviews([]);
    setIsResetDialogOpen(false);
    toast.info("Form data cleared successfully");
  };

  const handleManualStoreDraft = () => {
    const currentValues = getValues();
    const newDraft = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      data: currentValues,
      title: currentValues.title || "Untitled Complaint",
      customerName: currentValues.customerName || "No Name"
    };
    
    const updatedDrafts = [newDraft, ...manualDrafts];
    setManualDrafts(updatedDrafts);
    localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify(updatedDrafts));
    setHasManualDraft(true);
    
    // Clear form after storing
    reset({
      customerPhone: "",
      customerName: "",
      brand: "",
      branch: "",
      platform: "",
      orderId: "",
      dateTime: getKuwaitDateTimeLocalString(),
      status: "Closed",
      priority: "medium",
      complaintSource: "",
      title: "",
      caseType: "",
      item: "",
      notes: "",
      response: ""
    });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFiles([]);
    setFilePreviews([]);
    setIsStoreDraftDialogOpen(false);
    toast.success(t('draft_stored') || "Draft stored in your collection.");
  };

  const handleApplyDraft = (draft: any) => {
    reset(draft.data);
    setIsDraftsDrawerOpen(false);
    toast.success("Draft applied to form.");
  };

  const handleDeleteDraft = (id: string) => {
    const updated = manualDrafts.filter(d => d.id !== id);
    setManualDrafts(updated);
    localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify(updated));
    setHasManualDraft(updated.length > 0);
    toast.info("Draft removed.");
  };

  const handleManualRestoreDraft = () => {
    setIsDraftsDrawerOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 max-w-[1400px] mx-auto pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <h1 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] transition-colors">
              Complaint Registration Form
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 px-1 py-1 rounded-xl border border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadTemplate}
              className="h-8 gap-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Template
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => bulkInputRef.current?.click()}
              className="h-8 gap-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
            >
              <FileUp className="h-3.5 w-3.5" />
              Bulk Push
            </Button>
          </div>

          <div className="flex items-center bg-slate-50 dark:bg-slate-900 px-1 py-1 rounded-xl border border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualStoreDraft}
              className="h-8 gap-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Store Data
            </Button>
            {hasManualDraft && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleManualRestoreDraft}
                className="h-8 gap-1.5 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all relative"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
                {manualDrafts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] text-white shadow-sm ring-1 ring-white dark:ring-slate-900">
                    {manualDrafts.length}
                  </span>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
              className="h-8 gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50/50 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setIsVoiceAssistantOpen(true)}
            className="h-9 gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
          >
            <Mic className="h-3.5 w-3.5" />
            Assistant
          </Button>
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setIsMagicPasteOpen(true)}
            className="h-9 gap-2 text-blue-600 border-blue-100 hover:bg-blue-50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Magic Paste
          </Button>
        </div>
      </div>

      <input 
        type="file" 
        ref={bulkInputRef} 
        className="hidden" 
        accept=".xlsx,.xls,.csv" 
        onChange={handleBulkUpload} 
      />

      {/* Existing Complaints Section */}
      <AnimatePresence>
        {existingComplaints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <h2 className="text-[10px] font-bold uppercase tracking-wider">{t('complaint_history')} ({existingComplaints.length})</h2>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
              {existingComplaints.map((complaint) => (
                <motion.div
                  key={complaint.id}
                  whileHover={{ y: -2 }}
                  className="snap-start"
                >
                  <Card 
                    className="min-w-[300px] max-w-[300px] border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      setSelectedComplaint(complaint);
                      setIsDetailsOpen(true);
                    }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[8px] font-bold uppercase",
                            complaint.status === 'Closed' ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"
                          )}
                        >
                          {complaint.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {formatKuwaitDate(complaint.createdAt)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{complaint.title}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{complaint.caseType}</p>
                      </div>

                      {complaint.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                          "{complaint.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                            {complaint.creatorUsername?.charAt(0) || 'U'}
                          </div>
                          <span className="text-[10px] text-slate-500">{complaint.creatorUsername || 'User'}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-300 hover:text-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComplaint(complaint);
                            setIsTimelineOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-950 transition-colors">
        <CardHeader className="border-b border-slate-50 dark:border-slate-800 transition-colors py-4 hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg font-bold">{t('new_complaint')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const currentDraft = getValues();
                  localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify(currentDraft));
                  setHasManualDraft(true);
                  toast.success(t('draft_saved_manually') || "Form draft saved successfully.");
                }}
                className="h-8 gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                onClick={() => setIsResetDialogOpen(true)}
                className="h-8 gap-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 lg:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
              {displayFields.filter(f => f !== 'notes').map((fieldName) => fieldsMap[fieldName])}
              
              {/* Custom Fields */}
              {(customFieldsDefinition || []).map((customField: any) => (
                <div key={customField.id} className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">
                    {customField.label} {customField.required && <span className="text-destructive font-bold">*</span>}
                  </Label>
                  {customField.type === 'dropdown' ? (
                    <Select 
                      value={watch(`custom_fields.${customField.id}`) || ""} 
                      onValueChange={(v: string) => setValue(`custom_fields.${customField.id}`, v)}
                    >
                      <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
                        <SelectValue placeholder={`Select ${customField.label}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        {customField.options?.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      type={customField.type === 'date' ? 'date' : customField.type === 'number' ? 'number' : 'text'}
                      placeholder={`Enter ${customField.label.toLowerCase()}...`}
                      {...(register(`custom_fields.${customField.id}` as any))} 
                      required={customField.required}
                      className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-sm rounded-md dark:text-white"
                    />
                  )}
                </div>
              ))}
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Resolution</Label>
                <div className="flex items-center gap-2">
                  <Select 
                    value={watch("response") || ""} 
                    onValueChange={(v: string) => setValue("response", v)}
                  >
                    <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500 text-sm rounded-md dark:text-white transition-all">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
                      {responses.map((r: string) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-11 px-4 text-[10px] font-bold uppercase tracking-wider text-emerald-600 border-emerald-100 hover:bg-emerald-50 gap-2 rounded-md transition-colors"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    ADD PHOTO
                  </Button>
                  <input 
                    id="file-upload" 
                    type="file" 
                    multiple 
                    accept="image/*,video/*"
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setFiles(prev => [...prev, ...newFiles]);
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {fieldsMap.notes}

              <div className="p-4 rounded-lg bg-emerald-50/30 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30">
                <p className="text-xs text-emerald-600 dark:text-emerald-500 italic">
                  Administrative resolution fields are only available when editing an existing complaint.
                </p>
              </div>
            </div>

            {/* Attachments Preview Section */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 p-4 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-slate-400" />
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Attachments ({files.length})</h3>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold uppercase text-slate-400 hover:text-destructive"
                      onClick={() => setFiles([])}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {filePreviews.map((preview, index) => {
                      const isVideo = preview.file.type.startsWith('video/');
                      return (
                        <motion.div
                          key={preview.url}
                          layoutId={`file-${index}`}
                          className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => setPreviewFile({ url: preview.url, type: preview.file.type, name: preview.file.name })}
                        >
                          {isVideo ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                              <FileVideo className="h-8 w-8 text-slate-300" />
                              <span className="text-[8px] font-medium text-slate-400 mt-1 truncate px-1 w-full text-center">
                                {preview.file.name}
                              </span>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                <Play className="h-6 w-6 text-white fill-white" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <img 
                                src={preview.url} 
                                alt={preview.file.name} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </>
                          )}
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiles(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-lg shadow-blue-500/20 transition-all text-[10px] uppercase tracking-wider" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SUBMIT & SEND WHATSAPP"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-4xl sm:max-w-4xl p-0 overflow-hidden bg-black/95 border-none"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
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
              <video 
                src={previewFile.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-[80vh]"
              />
            ) : (
              <img 
                src={previewFile?.url} 
                alt={previewFile?.name} 
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <p className="text-white text-sm font-medium truncate">{previewFile?.name}</p>
          </div>
        </DialogContent>
      </Dialog>

      <ComplaintDetailsDialog 
        complaint={selectedComplaint}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <ComplaintTimelineDialog 
        complaint={selectedComplaint}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />

      {/* AI Voice Assistant Dialog */}
      <Dialog open={isVoiceAssistantOpen} onOpenChange={(open) => {
        if (!open && isRecording) stopRecording();
        setIsVoiceAssistantOpen(open);
      }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl transition-colors">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Mic className="h-5 w-5" />
              </div>
              {t('voice_assistant')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-8 space-y-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <motion.div
                animate={isRecording ? {
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    "0 0 0 0px rgba(79, 70, 229, 0.4)",
                    "0 0 0 20px rgba(79, 70, 229, 0)",
                    "0 0 0 0px rgba(79, 70, 229, 0)"
                  ]
                } : {}}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut"
                }}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                  isRecording 
                    ? "bg-rose-600 text-white shadow-rose-500/50" 
                    : "bg-indigo-600 text-white shadow-indigo-500/50"
                )}
              >
                {isRecording ? <Square className="h-10 w-10 fill-current" /> : <Mic className="h-10 w-10" />}
              </motion.div>

              <div className="text-center space-y-2">
                <p className={cn(
                  "text-lg font-bold tracking-tight",
                  isRecording ? "text-rose-600 animate-pulse" : "text-slate-600 dark:text-slate-400"
                )}>
                  {isRecording ? t('recording_indicator') + ' ' + formatTime(recordingTime) : t('start_recording')}
                </p>
                <p className="text-xs text-slate-400 max-w-[300px] leading-relaxed">
                  {t('voice_privacy_notice')}
                </p>
              </div>

              <div className="flex gap-4">
                {!isRecording ? (
                  <Button 
                    onClick={startRecording}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/25 gap-2"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {t('start_recording')}
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-rose-500/25 gap-2"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    {t('stop_recording')}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  {t('live_transcript')}
                </Label>
                {liveTranscript && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setLiveTranscript("")}
                    className="h-6 text-[10px] text-slate-400 hover:text-rose-500 font-bold uppercase"
                  >
                    {t('clear_transcript')}
                  </Button>
                )}
              </div>
              <div className="min-h-[120px] max-h-[200px] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors text-right" dir="auto">
                {liveTranscript ? (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {liveTranscript}
                    {isRecording && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse" />}
                  </p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-600 italic text-center text-sm pt-8">
                    {isRecording ? "Listening..." : "Your transcript will appear here..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 dark:bg-slate-900/50 p-6 -mx-6 -mb-6 border-t rounded-b-xl border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsVoiceAssistantOpen(false);
                  setLiveTranscript("");
                }}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all font-sans"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={() => handleMagicPaste()}
                disabled={isRecording || isProcessingMagic || !liveTranscript.trim()}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all gap-2"
              >
                {isProcessingMagic ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('ai_analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t('extract_details')}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

            {/* AI Magic Paste Panel */}
            <AnimatePresence>
              {isMagicPasteOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed bottom-4 right-4 z-50 w-full max-w-[220px] bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors"
                  style={{ maxHeight: '60vh' }}
                >
                  {/* Header */}
                  <div className="p-2 bg-blue-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-3.5 w-3.5" />
                      <h3 className="text-[10px] font-bold leading-none">AI Magic</h3>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setIsMagicPasteOpen(false);
                        deleteRecording();
                      }}
                      className="h-6 w-6 text-white hover:bg-white/10"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="p-2 space-y-2 overflow-y-auto no-scrollbar bg-white dark:bg-slate-950 transition-colors">
                    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 gap-2 transition-colors">
                      {!audioBlob ? (
                        <>
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500",
                            isRecording ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 animate-pulse" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                          )}>
                            <Mic className="h-4 w-4" />
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 transition-colors">
                              {isRecording ? formatTime(recordingTime) : "Voice Mode"}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                              "h-7 px-3 rounded-lg font-bold uppercase tracking-wider text-[8px] transition-all",
                              isRecording ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20 shadow-lg" : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/20 shadow-lg"
                            )}
                          >
                            {isRecording ? "Stop" : "Record"}
                          </Button>
                        </>
                      ) : (
                        <div className="w-full space-y-1.5">
                          <div className="flex items-center justify-between p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800 transition-colors">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[9px] font-bold text-emerald-900 dark:text-emerald-400">{formatTime(recordingTime)}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={deleteRecording}
                              className="h-5 w-5 text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-5" />
                        </div>
                      )}
                    </div>

                    <Textarea 
                      placeholder="Paste text..."
                      value={magicText}
                      onChange={(e) => setMagicText(e.target.value)}
                      className="min-h-[50px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-blue-500 transition-all text-[9px] resize-none rounded-md p-1.5 dark:text-white"
                      disabled={!!audioBlob}
                    />
                  </div>

                  {/* Footer */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <Button 
                      onClick={() => handleMagicPaste()}
                      disabled={isRecording || isProcessingMagic || (!magicText.trim() && !audioBlob)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[8px] h-8 rounded-md shadow-sm gap-1.5 transition-all"
                    >
                      {isProcessingMagic ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3" />
                          <span>Fill Form</span>
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Confirm Reset
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              {t('confirm_reset')}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
              className="flex-1 font-bold"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              className="flex-1 font-bold bg-rose-600 hover:bg-rose-700"
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Draft Confirmation Dialog */}
      <Dialog open={isStoreDraftDialogOpen} onOpenChange={setIsStoreDraftDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-600">
              <Bookmark className="h-5 w-5" />
              {t('store_draft')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              {t('confirm_store_draft')}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStoreDraftDialogOpen(false)}
              className="flex-1 font-bold"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleManualStoreDraft}
              className="flex-1 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <Sheet open={isDraftsDrawerOpen} onOpenChange={setIsDraftsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
          <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Bookmark className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Stored Drafts</SheetTitle>
                <SheetDescription className="text-xs font-medium text-slate-500">
                  Manage and restore your saved complaints
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-4">
              {manualDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                    <History className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No drafts stored yet</p>
                    <p className="text-xs text-slate-500 max-w-[200px]">Save your progress to see multiple drafts here.</p>
                  </div>
                </div>
              ) : (
                manualDrafts.map((draft) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md transition-all cursor-default"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {draft.title || "Untitled Complaint"}
                          </h4>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400 border-slate-100 dark:border-slate-800">
                                {draft.data?.brand || "No Brand"}
                             </Badge>
                             <span className="text-[10px] text-slate-400">•</span>
                             <p className="text-[10px] font-medium text-slate-400">
                               {new Date(draft.timestamp).toLocaleString(undefined, { 
                                 month: 'short', 
                                 day: 'numeric', 
                                 hour: '2-digit', 
                                 minute: '2-digit' 
                               })}
                             </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 h-4 overflow-hidden">
                        <User className="h-3 w-3 text-slate-300" />
                        <p className="text-[10px] font-medium text-slate-500">{draft.customerName || "Anonymous"}</p>
                      </div>

                      <Button
                        onClick={() => handleApplyDraft(draft)}
                        className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-sm"
                      >
                        Restore Draft
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {manualDrafts.length > 0 && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                variant="outline"
                className="w-full h-10 border-slate-200 text-slate-600 hover:bg-white hover:text-rose-600 hover:border-rose-200 font-bold text-[10px] uppercase tracking-[0.1em] transition-all gap-2"
                onClick={() => {
                  setManualDrafts([]);
                  localStorage.setItem(MANUAL_DRAFT_KEY, JSON.stringify([]));
                  setHasManualDraft(false);
                  toast.success("All drafts cleared.");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All Drafts
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
