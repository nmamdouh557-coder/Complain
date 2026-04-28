import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  X, 
  ArrowUp, 
  ArrowDown,
  LayoutGrid,
  Building2,
  FileText,
  Monitor,
  Share2,
  Users,
  CheckCircle2,
  ChevronRight,
  Package,
  Calendar,
  Hash,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DEFAULT_CATERING_FIELDS, DEFAULT_PREORDER_FIELDS } from '@/constants';

export function Configuration() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [manageDialog, setManageDialog] = useState<{ type: 'items', parent: string } | null>(null);

  const fetchConfigs = async () => {
    try {
      const data = await api.getConfigs();
      setConfigs(data);
      
      // Auto-select first brand and title if available
      const brands = data.find((c: any) => c.key === 'brands')?.value || [];
      const titles = data.find((c: any) => c.key === 'titles')?.value || [];
      if (brands.length > 0) setSelectedBrand(brands[0]);
      if (titles.length > 0) setSelectedTitle(titles[0]);
    } catch (error) {
      toast.error("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const getConfigValue = (key: string, defaultValue: any = []) => {
    return configs.find(c => c.key === key)?.value || defaultValue;
  };

  const updateConfig = async (key: string, newValue: any) => {
    try {
      await api.setConfig(key, newValue);
      setConfigs(prev => {
        const existing = prev.find(c => c.key === key);
        if (existing) {
          return prev.map(c => c.key === key ? { ...c, value: newValue } : c);
        } else {
          return [...prev, { key, value: newValue }];
        }
      });
      toast.success("Configuration updated");
    } catch (error) {
      toast.error("Failed to update configuration");
    }
  };

  const handleAdd = (key: string, val: string) => {
    const current = getConfigValue(key);
    if (!current.includes(val)) {
      updateConfig(key, [...current, val]);
    }
  };

  const handleRemove = (key: string, val: string) => {
    const current = getConfigValue(key);
    updateConfig(key, current.filter((v: string) => v !== val));
  };

  const handleAddNested = (key: string, parent: string, val: string) => {
    const current = getConfigValue(key, {});
    const parentItems = current[parent] || [];
    if (!parentItems.includes(val)) {
      updateConfig(key, { ...current, [parent]: [...parentItems, val] });
    }
  };

  const handleRemoveNested = (key: string, parent: string, val: string) => {
    const current = getConfigValue(key, {});
    const parentItems = current[parent] || [];
    updateConfig(key, { ...current, [parent]: parentItems.filter((v: string) => v !== val) });
  };

  const fieldLabels: Record<string, string> = {
    "customerPhone": "Phone Number",
    "customerName": "Customer Name",
    "brand": "Brand",
    "branch": "Branch",
    "title": "Title (Category)",
    "caseType": "Case Type",
    "platform": "Platform",
    "complaintSource": "Source",
    "orderId": "Order ID",
    "dateTime": "Order Date",
    "status": "Status",
    "item": "Item",
    "notes": "Complaint Details"
  };

  const fieldOrder = getConfigValue('form_field_ordering', Object.keys(fieldLabels));
  const customFields = getConfigValue('custom_fields_definition', []);

  const dynamicFieldLabels = {
    ...fieldLabels,
    ...Object.fromEntries(customFields.map((f: any) => [f.id, f.label]))
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...fieldOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      updateConfig('form_field_ordering', newOrder);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400 transition-colors" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">System Configuration</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Manage brands, branches, categories and other system parameters</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <BrandBranchManager 
          brands={getConfigValue('brands')}
          brandsBranches={getConfigValue('brands_branches', {})}
          onAddBrand={(val: string) => handleAdd('brands', val)}
          onRemoveBrand={(val: string) => handleRemove('brands', val)}
          onAddBranch={(brand: string, val: string) => handleAddNested('brands_branches', brand, val)}
          onRemoveBranch={(brand: string, val: string) => handleRemoveNested('brands_branches', brand, val)}
          onManageItems={(brand: string) => setManageDialog({ type: 'items', parent: brand })}
        />
        
        <CategoryManager 
          titles={getConfigValue('titles')}
          complaintCategories={getConfigValue('complaint_categories', {})}
          onAddTitle={(val: string) => handleAdd('titles', val)}
          onRemoveTitle={(val: string) => handleRemove('titles', val)}
          onAddCase={(title: string, val: string) => handleAddNested('complaint_categories', title, val)}
          onRemoveCase={(title: string, val: string) => handleRemoveNested('complaint_categories', title, val)}
        />

        <CaseTypeMappingManager 
          mapping={getConfigValue('case_type_mapping', {})}
          titles={getConfigValue('titles')}
          onUpdate={(newMapping: any) => updateConfig('case_type_mapping', newMapping)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ConfigCard 
          title="Platforms" 
          icon={Monitor} 
          items={getConfigValue('platforms')} 
          onAdd={(val: string) => handleAdd('platforms', val)}
          onRemove={(val: string) => handleRemove('platforms', val)}
        />
        <ConfigCard 
          title="Complaint Sources" 
          icon={Share2} 
          items={getConfigValue('sources')} 
          onAdd={(val: string) => handleAdd('sources', val)}
          onRemove={(val: string) => handleRemove('sources', val)}
        />
        <ConfigCard 
          title="Responsible Parties" 
          icon={Users} 
          items={getConfigValue('responsible_parties')} 
          onAdd={(val: string) => handleAdd('responsible_parties', val)}
          onRemove={(val: string) => handleRemove('responsible_parties', val)}
        />
        <ConfigCard 
          title="Action Taken Options" 
          icon={CheckCircle2} 
          items={getConfigValue('responses')} 
          onAdd={(val: string) => handleAdd('responses', val)}
          onRemove={(val: string) => handleRemove('responses', val)}
        />
        <ConfigCard 
          title="Complaint Status" 
          icon={LayoutGrid} 
          items={getConfigValue('complaint_status')} 
          onAdd={(val: string) => handleAdd('complaint_status', val)}
          onRemove={(val: string) => handleRemove('complaint_status', val)}
        />
        <ConfigCard 
          title="Validation Types" 
          icon={CheckCircle2} 
          items={getConfigValue('validation_types')} 
          onAdd={(val: string) => handleAdd('validation_types', val)}
          onRemove={(val: string) => handleRemove('validation_types', val)}
        />
        <ConfigCard 
          title="Manager Request Types" 
          icon={Users} 
          items={getConfigValue('manager_request_types')} 
          onAdd={(val: string) => handleAdd('manager_request_types', val)}
          onRemove={(val: string) => handleRemove('manager_request_types', val)}
        />
        <BrandItemManager 
          brands={getConfigValue('brands')}
          brandItems={getConfigValue('brand_items', {})}
          onAdd={(brand: string, val: string) => handleAddNested('brand_items', brand, val)}
          onRemove={(brand: string, val: string) => handleRemoveNested('brand_items', brand, val)}
        />
      </div>

      {/* Nested Management Dialog (Only for Brand Items now) */}
      <Dialog open={!!manageDialog} onOpenChange={(open) => !open && setManageDialog(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white transition-colors">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Manage Items for {manageDialog?.parent}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <NestedManager 
              type="items"
              parent={manageDialog?.parent || ''}
              items={getConfigValue('brand_items', {})[manageDialog?.parent || ''] || []}
              onAdd={(val: string) => handleAddNested('brand_items', manageDialog?.parent || '', val)}
              onRemove={(val: string) => handleRemoveNested('brand_items', manageDialog?.parent || '', val)}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setManageDialog(null)} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold transition-all">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CustomFieldManager 
          title="Complaint Form Fields"
          fields={customFields}
          onUpdate={(fields: any) => updateConfig('custom_fields_definition', fields)}
          fieldOrder={fieldOrder}
          onUpdateOrder={(order: string[]) => updateConfig('form_field_ordering', order)}
        />

        <FormFieldsManager
          title="Catering Form Fields"
          configKey="catering_form_fields"
          fields={getConfigValue('catering_form_fields', DEFAULT_CATERING_FIELDS)}
          onUpdate={(fields: any) => updateConfig('catering_form_fields', fields)}
        />
        
        <FormFieldsManager
          title="Pre-Order Form Fields"
          configKey="preorder_form_fields"
          fields={getConfigValue('preorder_form_fields', DEFAULT_PREORDER_FIELDS)}
          onUpdate={(fields: any) => updateConfig('preorder_form_fields', fields)}
        />

        <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
          <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 transition-colors">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Form Field Ordering</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
              {fieldOrder.map((fieldId: string, index: number) => (
                <div key={fieldId} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">{dynamicFieldLabels[fieldId] || fieldId}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                      onClick={() => handleMoveField(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                      onClick={() => handleMoveField(index, 'down')}
                      disabled={index === fieldOrder.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomFieldManager({ title = "Custom Input Fields", fields, onUpdate, fieldOrder, onUpdateOrder }: any) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const handleAddOption = () => {
    if (newOption.trim() && !newFieldOptions.includes(newOption.trim())) {
      setNewFieldOptions([...newFieldOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (opt: string) => {
    setNewFieldOptions(newFieldOptions.filter(o => o !== opt));
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      toast.error("Field name is required");
      return;
    }

    const fieldId = `custom_${Date.now()}`;
    const newField = {
      id: fieldId,
      label: newFieldName.trim(),
      type: newFieldType,
      required: isRequired,
      options: newFieldType === 'dropdown' ? newFieldOptions : []
    };

    const updatedFields = [...fields, newField];
    onUpdate(updatedFields);
    
    if (!fieldOrder.includes(fieldId)) {
      onUpdateOrder([...fieldOrder, fieldId]);
    }

    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions([]);
    setIsRequired(false);
  };

  const handleRemoveCustomField = (id: string) => {
    const updatedFields = fields.filter((f: any) => f.id !== id);
    onUpdate(updatedFields);
    onUpdateOrder(fieldOrder.filter((fid: string) => fid !== id));
  };

  const handleMoveCustomField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      onUpdate(newFields);
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 transition-colors">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6 transition-colors">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Field Name (Label)</Label>
            <Input 
              placeholder="e.g. Serial Number" 
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white transition-all" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Field Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'text', label: 'Text Input', icon: Type },
                { id: 'dropdown', label: 'Dropdown', icon: LayoutGrid },
                { id: 'date', label: 'Date Picker', icon: Calendar },
                { id: 'number', label: 'Number Input', icon: Hash },
              ].map((t) => (
                <Button 
                  key={t.id}
                  variant={newFieldType === t.id ? 'default' : 'outline'} 
                  onClick={() => setNewFieldType(t.id)}
                  className={cn(
                    "h-10 text-[10px] font-bold uppercase tracking-wider transition-all gap-2",
                    newFieldType === t.id ? "bg-blue-600 dark:bg-blue-500" : "border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {newFieldType === 'dropdown' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Dropdown Options</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Option name..." 
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
                />
                <Button onClick={handleAddOption} className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white h-10 w-10 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newFieldOptions.map(opt => (
                  <Badge key={opt} variant="secondary" className="gap-1 pl-2 pr-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-default">
                    {opt}
                    <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => handleRemoveOption(opt)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <Checkbox 
              id="required-field" 
              checked={isRequired} 
              onCheckedChange={(checked) => setIsRequired(!!checked)} 
              className="border-slate-300 dark:border-slate-700"
            />
            <Label htmlFor="required-field" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              This field is required
            </Label>
          </div>
        </div>

        <Button 
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-100 dark:shadow-none transition-all gap-2"
          onClick={handleAddCustomField}
        >
          <Plus className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Add Custom Field</span>
        </Button>

        <div className="pt-4 border-t border-slate-50 dark:border-slate-800 transition-colors">
          <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-4">Existing Custom Fields</p>
          <div className="space-y-2">
            {fields.length === 0 && (
              <p className="text-xs text-slate-300 dark:text-slate-600 italic">No custom fields added yet</p>
            )}
            {fields.map((field: any, index: number) => (
              <div key={field.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 group transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{field.label}</span>
                    <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 border-slate-200 dark:border-slate-700 font-bold">{field.type}</Badge>
                    {field.required && <Badge variant="destructive" className="text-[8px] h-4 px-1 uppercase font-bold">Req</Badge>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 disabled:opacity-30" onClick={() => handleMoveCustomField(index, 'up')} disabled={index === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 disabled:opacity-30" onClick={() => handleMoveCustomField(index, 'down')} disabled={index === fields.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => handleRemoveCustomField(field.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {field.options && field.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {field.options.map((opt: string) => (
                      <span key={opt} className="text-[9px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase font-medium">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FormFieldsManager({ title, configKey, fields, onUpdate }: any) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const handleAddOption = () => {
    if (newOption.trim() && !newFieldOptions.includes(newOption.trim())) {
      setNewFieldOptions([...newFieldOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (opt: string) => {
    setNewFieldOptions(newFieldOptions.filter(o => o !== opt));
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      toast.error("Field name is required");
      return;
    }

    const fieldId = `field_${Date.now()}`;
    const newField = {
      id: fieldId,
      label: newFieldName.trim(),
      type: newFieldType,
      required: isRequired,
      options: newFieldType === 'dropdown' ? newFieldOptions : []
    };

    onUpdate([...fields, newField]);

    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions([]);
    setIsRequired(false);
  };

  const handleRemoveField = (id: string) => {
    onUpdate(fields.filter((f: any) => f.id !== id));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      onUpdate(newFields);
    }
  };

  const handleToggleRequired = (id: string) => {
    onUpdate(fields.map((f: any) => f.id === id ? { ...f, required: !f.required } : f));
  };

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 transition-colors">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6 transition-colors">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Field Name</Label>
            <Input 
              placeholder="e.g. Number of Guests" 
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white" 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'text', label: 'Text', icon: Type },
                { id: 'dropdown', label: 'Dropdown', icon: LayoutGrid },
                { id: 'date', label: 'Date', icon: Calendar },
                { id: 'number', label: 'Number', icon: Hash },
              ].map((t) => (
                <Button 
                  key={t.id}
                  variant={newFieldType === t.id ? 'default' : 'outline'} 
                  onClick={() => setNewFieldType(t.id)}
                  className="h-9 text-[10px] font-bold uppercase tracking-wider gap-2"
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {newFieldType === 'dropdown' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Options</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add option..." 
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                />
                <Button onClick={handleAddOption} className="bg-slate-900 dark:bg-slate-800 h-10 w-10 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newFieldOptions.map(opt => (
                  <Badge key={opt} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                    {opt}
                    <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => handleRemoveOption(opt)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <Checkbox 
              id={`required-${configKey}`} 
              checked={isRequired} 
              onCheckedChange={(checked) => setIsRequired(!!checked)} 
            />
            <Label htmlFor={`required-${configKey}`} className="text-xs font-semibold cursor-pointer">
              Required field
            </Label>
          </div>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
          onClick={handleAddField}
        >
          <Plus className="h-4 w-4" />
          <span>Add Field</span>
        </Button>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-4">Configured Fields</p>
          <div className="space-y-2">
            {fields.map((field: any, index: number) => (
              <div key={field.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{field.label}</span>
                    <Badge variant="outline" className="text-[9px] uppercase">{field.type}</Badge>
                    {field.required && <Badge className="text-[8px] h-4 bg-amber-100 text-amber-700 hover:bg-amber-100">Required</Badge>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => handleMoveField(index, 'up')} disabled={index === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => handleMoveField(index, 'down')} disabled={index === fields.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => handleRemoveField(field.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandBranchManager({ 
  brands, 
  brandsBranches, 
  onAddBrand, 
  onRemoveBrand, 
  onAddBranch, 
  onRemoveBranch,
  onManageItems
}: any) {
  const [newBrand, setNewBrand] = useState("");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(brands[0] || null);
  const [newBranch, setNewBranch] = useState("");

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 flex flex-row items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Brands & Branches</CardTitle>
        </div>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newBrand.trim()) {
              onAddBrand(newBrand.trim());
              setNewBrand("");
            }
          }}
          className="flex gap-2"
        >
          <Input 
            placeholder="New Brand..." 
            className="h-8 text-xs w-32 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
          />
          <Button type="submit" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all">
            <Plus className="h-3 w-3" />
          </Button>
        </form>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
          {brands.map((brand: string) => (
            <div key={brand} className="group">
              <div 
                className={cn(
                  "p-4 px-6 flex items-center justify-between cursor-pointer transition-colors",
                  expandedBrand === brand ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
                onClick={() => setExpandedBrand(expandedBrand === brand ? null : brand)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    expandedBrand === brand ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-200 dark:bg-slate-700"
                  )} />
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-wide transition-colors",
                    expandedBrand === brand ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-400"
                  )}>{brand}</span>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 transition-colors">
                    {brandsBranches[brand]?.length || 0} Branches
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageItems(brand);
                    }}
                  >
                    <Package className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBrand(brand);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className={cn(
                    "h-4 w-4 text-slate-300 dark:text-slate-600 transition-transform",
                    expandedBrand === brand && "rotate-90 text-blue-400 dark:text-blue-300"
                  )} />
                </div>
              </div>
              
              <AnimatePresence>
                {expandedBrand === brand && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/30 transition-colors"
                  >
                    <div className="p-6 pt-2 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {brandsBranches[brand]?.map((branch: string) => (
                          <Badge 
                            key={branch} 
                            variant="secondary" 
                            className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 group/branch hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          >
                            <span className="text-[11px] font-bold">{branch}</span>
                            <button 
                              onClick={() => onRemoveBranch(brand, branch)}
                              className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {(!brandsBranches[brand] || brandsBranches[brand].length === 0) && (
                          <p className="text-xs text-slate-400 dark:text-slate-600 italic transition-colors">No branches added yet.</p>
                        )}
                      </div>
                      
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newBranch.trim()) {
                            onAddBranch(brand, newBranch.trim());
                            setNewBranch("");
                          }
                        }}
                        className="flex gap-2 max-w-xs"
                      >
                        <Input 
                          placeholder="Add new branch..." 
                          className="h-9 text-xs bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
                          value={newBranch}
                          onChange={(e) => setNewBranch(e.target.value)}
                        />
                        <Button type="submit" size="sm" className="h-9 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryManager({ 
  titles, 
  complaintCategories, 
  onAddTitle, 
  onRemoveTitle, 
  onAddCase, 
  onRemoveCase 
}: any) {
  const [newTitle, setNewTitle] = useState("");
  const [expandedTitle, setExpandedTitle] = useState<string | null>(titles[0] || null);
  const [newCase, setNewCase] = useState("");

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 flex flex-row items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Titles & Cases</CardTitle>
        </div>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) {
              onAddTitle(newTitle.trim());
              setNewTitle("");
            }
          }}
          className="flex gap-2"
        >
          <Input 
            placeholder="New Title..." 
            className="h-8 text-xs w-32 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button type="submit" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all">
            <Plus className="h-3 w-3" />
          </Button>
        </form>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
          {titles.map((title: string) => (
            <div key={title} className="group">
              <div 
                className={cn(
                  "p-4 px-6 flex items-center justify-between cursor-pointer transition-colors",
                  expandedTitle === title ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
                onClick={() => setExpandedTitle(expandedTitle === title ? null : title)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    expandedTitle === title ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-200 dark:bg-slate-700"
                  )} />
                  <span className={cn(
                    "text-sm font-bold uppercase tracking-wide transition-colors",
                    expandedTitle === title ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-400"
                  )}>{title}</span>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 transition-colors">
                    {complaintCategories[title]?.length || 0} Cases
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTitle(title);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className={cn(
                    "h-4 w-4 text-slate-300 dark:text-slate-600 transition-transform",
                    expandedTitle === title && "rotate-90 text-blue-400 dark:text-blue-300"
                  )} />
                </div>
              </div>
              
              <AnimatePresence>
                {expandedTitle === title && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/30 transition-colors"
                  >
                    <div className="p-6 pt-2 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {complaintCategories[title]?.map((c: string) => (
                          <Badge 
                            key={c} 
                            variant="secondary" 
                            className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 group/case hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          >
                            <span className="text-[11px] font-bold">{c}</span>
                            <button 
                              onClick={() => onRemoveCase(title, c)}
                              className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {(!complaintCategories[title] || complaintCategories[title].length === 0) && (
                          <p className="text-xs text-slate-400 dark:text-slate-600 italic transition-colors">No cases added yet.</p>
                        )}
                      </div>
                      
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newCase.trim()) {
                            onAddCase(title, newCase.trim());
                            setNewCase("");
                          }
                        }}
                        className="flex gap-2 max-w-xs"
                      >
                        <Input 
                          placeholder="Add new case..." 
                          className="h-9 text-xs bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
                          value={newCase}
                          onChange={(e) => setNewCase(e.target.value)}
                        />
                        <Button type="submit" size="sm" className="h-9 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandItemManager({ brands, brandItems, onAdd, onRemove }: any) {
  const [selectedBrand, setSelectedBrand] = useState(brands[0] || "");
  const [newItem, setNewItem] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim() && selectedBrand) {
      onAdd(selectedBrand, newItem.trim());
      setNewItem("");
    }
  };

  const currentItems = selectedBrand ? (brandItems[selectedBrand] || []) : [];

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 flex flex-row items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Brand Items</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6 transition-colors">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider transition-colors">Select Brand</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 h-10 dark:text-white transition-colors">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
                {brands.map((brand: string) => (
                  <SelectItem key={brand} value={brand} className="dark:text-white dark:focus:bg-slate-800">
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input 
              placeholder="New Item Name..." 
              className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all flex-1"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              disabled={!selectedBrand}
            />
            <Button type="submit" size="icon" className="h-10 w-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shrink-0 transition-all" disabled={!selectedBrand}>
              <Plus className="h-5 w-5" />
            </Button>
          </form>

          <div className="pt-2 border-t border-slate-50 dark:border-slate-800 transition-colors">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 block transition-colors">
              Items for {selectedBrand || '...'}
            </Label>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1 transition-colors">
              {currentItems.length === 0 && (
                <p className="text-xs text-slate-300 dark:text-slate-600 italic transition-colors">No items added to this brand yet</p>
              )}
              {currentItems.map((item: string) => (
                <Badge 
                  key={item} 
                  variant="secondary" 
                  className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 group hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-bold"
                >
                  <span className="text-[11px] font-bold">{item}</span>
                  <button 
                    onClick={() => onRemove(selectedBrand, item)}
                    className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigCard({ title, icon: Icon, items, onAdd, onRemove }: any) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 transition-colors">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6 transition-colors">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            placeholder={`New ${title.split(' ')[0].slice(0, -1)}`} 
            className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" size="icon" className="h-10 w-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shrink-0 transition-all">
            <Plus className="h-5 w-5" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2 transition-colors">
          {items.map((item: string) => (
            <Badge 
              key={item} 
              variant="secondary" 
              className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 group hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-bold"
            >
              <span className="text-[11px] font-bold">{item}</span>
              <button 
                onClick={() => onRemove(item)}
                className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NestedManager({ type, parent, items, onAdd, onRemove }: any) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input 
          placeholder={`Add new ${type.slice(0, -1)}`} 
          className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 dark:text-white transition-all"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Button type="submit" size="icon" className="h-10 w-10 bg-blue-600 dark:bg-blue-500 text-white transition-all">
          <Plus className="h-5 w-5" />
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1 transition-colors">
        {items.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600 italic transition-colors">No {type} added yet.</p>}
        {items.map((item: string) => (
          <Badge 
            key={item} 
            variant="secondary" 
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors font-bold"
          >
            <span className="text-[11px] font-bold">{item}</span>
            <button 
              onClick={() => onRemove(item)}
              className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CaseTypeMappingManager({ mapping, titles, onUpdate }: any) {
  const [newCase, setNewCase] = useState("");
  const [newTitle, setNewTitle] = useState(titles[0] || "");

  const handleAdd = () => {
    if (newCase.trim() && newTitle) {
      onUpdate({ ...mapping, [newCase.trim()]: newTitle });
      setNewCase("");
    }
  };

  const handleRemove = (caseToRemove: string) => {
    const { [caseToRemove]: _, ...rest } = mapping;
    onUpdate(rest);
  };

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-slate-950 overflow-hidden transition-colors xl:col-span-2">
      <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-950/50 py-4 px-6 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white transition-colors">Case Type to Category Mapping</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6 transition-colors">
        <div className="flex flex-wrap gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Case Type Name</Label>
            <Input 
              placeholder="e.g. Broken Item" 
              value={newCase}
              onChange={(e) => setNewCase(e.target.value)}
              className="h-10 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 dark:text-white transition-all font-bold"
            />
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Map to Category (Title)</Label>
            <Select value={newTitle} onValueChange={setNewTitle}>
              <SelectTrigger className="h-10 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 dark:text-white transition-all font-bold">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold transition-colors">
                {titles.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white h-10 px-6 transition-all font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(mapping).map(([caseType, category]: [any, any]) => (
            <div key={caseType} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl group hover:border-blue-100 dark:hover:border-blue-900 transition-all shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white transition-colors">{caseType}</p>
                <Badge variant="outline" className="text-[9px] font-bold uppercase transition-colors border-blue-100 text-blue-600 dark:border-blue-900/30 dark:text-blue-400">
                  {category}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => handleRemove(caseType)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {Object.keys(mapping).length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-400 italic py-8 transition-colors">No mappings defined yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
