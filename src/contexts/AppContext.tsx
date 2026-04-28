import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'ar';
type Theme = 'light' | 'dark';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'dashboard': 'Dashboard',
    'register': 'Register Complaint',
    'requests': 'Manager Requests',
    'validation': 'Validation',
    'escalation': 'Escalation',
    'followup': 'Follow Up',
    'search': 'Search',
    'all': 'All Complaints',
    'stats': 'Statistics',
    'config': 'Configuration',
    'users': 'User Management',
    'logout': 'Logout',
    'navigation': 'Navigation',
    'portal': 'Portal',
    'swish': 'Swish',
    'complaints': 'Complaints',
    'notifications': 'Notifications',
    'profile': 'Profile',
    'language': 'العربية',
    'theme_dark': 'Dark Mode',
    'theme_light': 'Light Mode',
    'search_placeholder': 'Search...',
    'filters': 'Filters',
    'export': 'Export Excel',
    'clear_all': 'Clear All',
    'records_found': 'Records Found',
    'order_id': 'Order ID / Search',
    'customer_phone': 'Customer Phone',
    'brand': 'Brand',
    'branch': 'Branch',
    'status': 'Status',
    'title': 'Title',
    'case_type': 'Case Type',
    'order_data': 'Order data',
    'created_by': 'Created By',
    'date_closed': 'Date Closed',
    'closed_by': 'Closed By',
    'actions': 'Actions',
    'id': 'ID',
    'customer': 'Customer',
    'date': 'Date',
    'created': 'Created',
    'admin': 'Administrator',
    'supervisor': 'Super Visor',
    'manager': 'Manager',
    'staff': 'Staff',
    'complaints_team': 'Complaints Team',
    'team_leader': 'Team Leader',
    'quality': 'OPX',
    'register_complaint': 'Register Complaint',
    'register_description': 'Register a new customer complaint or search for existing complaints',
    'complaint_history': 'COMPLAINT HISTORY',
    'customer_found_notice': 'Customer details found from previous records.',
    'clear': 'Clear',
    'confirm_reset': 'Are you sure you want to clear all data? This action cannot be undone.',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'store_draft': 'Store Draft',
    'restore_draft': 'Restore Draft',
    'draft_stored': 'Draft stored and form cleared.',
    'draft_restored': 'Draft restored.',
    'confirm_store_draft': 'This will clear the current form and store it as a draft. Continue?',
    'customer_suggestions': 'Customer Suggestions',
    'suggestion_title': 'Suggestion Title',
    'suggestion_description': 'Description',
    'add_suggestion': 'Add New Suggestion',
    'view_suggestion': 'View Suggestion Details',
    'suggestion_saved': 'Suggestion saved successfully!',
    'no_suggestions': 'No suggestions found.',
    'suggestion_delete_confirm': 'Are you sure you want to delete this suggestion?',
    'submit': 'Submit',
    'customer_name': 'Customer Name',
    'optional': 'Optional',
    'voice_assistant': 'AI Voice Assistant',
    'start_recording': 'Start Recording',
    'stop_recording': 'Stop Recording',
    'recording_indicator': 'Recording...',
    'live_transcript': 'Live Transcript',
    'ai_analyzing': 'Analyzing with AI...',
    'processing_voice': 'Processing voice...',
    'extract_details': 'Extract Details',
    'clear_transcript': 'Clear Transcript',
    'voice_privacy_notice': 'Note: Voice captures are used only for extracting complaint details and are not stored.',
    'complaint_timeline': 'Complaint Timeline',
    'timeline_description': 'Follow the journey of this complaint from registration to resolution.',
    'registered': 'Registered',
    'validated': 'Validated',
    'escalated': 'Escalated',
    'branch_responded': 'Branch Responded',
    'flagged': 'Admin Note Added',
    'followed_up': 'Followed Up',
    'closed': 'Closed',
    'by': 'by',
    'category_type': 'Type',
    'amount_spent': 'Amount Spent',
    'action_taken': 'Action Taken',
    'responsible_party': 'Responsible Party',
    'catering': 'Catering',
    'preorder': 'Pre-Order Management',
  },
  ar: {
    'dashboard': 'لوحة التحكم',
    'register': 'تسجيل شكوى',
    'requests': 'طلبات المديرين',
    'validation': 'التحقق',
    'escalation': 'التصعيد',
    'followup': 'المتابعة',
    'search': 'بحث',
    'all': 'جميع الشكاوى',
    'stats': 'الإحصائيات',
    'config': 'الإعدادات',
    'users': 'إدارة المستخدمين',
    'logout': 'تسجيل الخروج',
    'navigation': 'التنقل',
    'portal': 'بوابة',
    'swish': 'سويش',
    'complaints': 'الشكاوى',
    'notifications': 'التنبيهات',
    'profile': 'الملف الشخصي',
    'language': 'English',
    'theme_dark': 'الوضع الليلي',
    'theme_light': 'الوضع النهاري',
    'search_placeholder': 'بحث...',
    'filters': 'الفلاتر',
    'export': 'تصدير إكسل',
    'clear_all': 'مسح الكل',
    'records_found': 'سجلات تم العثور عليها',
    'order_id': 'رقم الطلب / بحث',
    'customer_phone': 'هاتف العميل',
    'brand': 'العلامة التجارية',
    'branch': 'الفرع',
    'status': 'الحالة',
    'title': 'العنوان',
    'case_type': 'نوع الحالة',
    'order_data': 'بيانات الطلب',
    'created_by': 'أنشئ بواسطة',
    'date_closed': 'تاريخ الإغلاق',
    'closed_by': 'أغلق بواسطة',
    'actions': 'الإجراءات',
    'id': 'المعرف',
    'customer': 'العميل',
    'date': 'التاريخ',
    'created': 'أنشئ في',
    'admin': 'مسؤول النظام',
    'supervisor': 'مشرف',
    'manager': 'مدير',
    'staff': 'موظف',
    'complaints_team': 'فريق الشكاوى',
    'team_leader': 'قائد فريق',
    'quality': 'OPX',
    'register_complaint': 'تسجيل شكوى',
    'register_description': 'قم بتسجيل شكوى عميل جديدة أو ابحث عن شكاوى موجودة',
    'complaint_history': 'سجل الشكاوى',
    'customer_found_notice': 'تم العثور على بيانات العميل من السجلات السابقة.',
    'clear': 'مسح',
    'confirm_reset': 'هل أنت متأكد أنك تريد مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
    'cancel': 'إلغاء',
    'confirm': 'تأكيد',
    'store_draft': 'تخزين مسودة',
    'restore_draft': 'استعادة مسودة',
    'draft_stored': 'تم تخزين المسودة وتفريغ الحقول.',
    'draft_restored': 'تم استعادة المسودة.',
    'confirm_store_draft': 'سيؤدي هذا إلى مسح النموذج الحالي وتخزينه كمسودة. هل تريد الاستمرار؟',
    'customer_suggestions': 'اقتراحات العملاء',
    'suggestion_title': 'عنوان الاقتراح',
    'suggestion_description': 'الوصف',
    'add_suggestion': 'إضافة اقتراح جديد',
    'view_suggestion': 'عرض تفاصيل الاقتراح',
    'suggestion_saved': 'تم حفظ الاقتراح بنجاح!',
    'no_suggestions': 'لم يتم العثور على اقتراحات.',
    'suggestion_delete_confirm': 'هل أنت متأكد من حذف هذا الاقتراح؟',
    'submit': 'إرسال',
    'customer_name': 'اسم العميل',
    'optional': 'اختياري',
    'voice_assistant': 'المساعد الصوتي الذكي',
    'start_recording': 'ابدأ التسجيل',
    'stop_recording': 'إيقاف التسجيل',
    'recording_indicator': 'جاري التسجيل...',
    'live_transcript': 'النص المباشر',
    'ai_analyzing': 'جاري التحليل بالذكاء الاصطناعي...',
    'processing_voice': 'جاري معالجة الصوت...',
    'extract_details': 'استخراج التفاصيل',
    'clear_transcript': 'مسح النص',
    'voice_privacy_notice': 'ملاحظة: يتم استخدام التسجيل الصوتي فقط لاستخراج تفاصيل الشكوى ولا يتم تخزينه.',
    'complaint_timeline': 'الخط الزمني للشكوى',
    'timeline_description': 'تابع رحلة هذه الشكوى منذ التسجيل وحتى الحل.',
    'registered': 'تم التسجيل',
    'validated': 'تم التحقق',
    'escalated': 'تم التصعيد',
    'branch_responded': 'تم رد الفرع',
    'flagged': 'تم إضافة ملاحظة مسؤول',
    'followed_up': 'تمت المتابعة',
    'closed': 'أغلقت',
    'by': 'بواسطة',
    'category_type': 'النوع',
    'amount_spent': 'المبلغ المدفوع',
    'action_taken': 'الإجراء المتخذ',
    'responsible_party': 'الجهة المسؤولة',
    'catering': 'كاترينج',
    'preorder': 'إدارة الطلب المسبق',
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      theme, 
      setTheme, 
      toggleLanguage, 
      toggleTheme,
      t
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
