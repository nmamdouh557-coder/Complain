import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DEFAULT_CATERING_FIELDS, DEFAULT_PREORDER_FIELDS } from '@/constants';

export function useConfigs() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      const data = await api.getConfigs();
      setConfigs(data);
    } catch (error) {
      console.error("Failed to load configurations:", error);
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

  return {
    configs,
    loading,
    fetchConfigs,
    getConfigValue,
    brands: getConfigValue('brands'),
    platforms: getConfigValue('platforms'),
    sources: getConfigValue('sources'),
    brandsBranches: getConfigValue('brands_branches', {}),
    complaintCategories: getConfigValue('complaint_categories', {}),
    brandItems: getConfigValue('brand_items', {}),
    responses: getConfigValue('responses'),
    responsibleParties: getConfigValue('responsible_parties'),
    titles: getConfigValue('titles'),
    complaintStatus: getConfigValue('complaint_status'),
    validationTypes: getConfigValue('validation_types'),
     managerRequestTypes: getConfigValue('manager_request_types'),
    formFieldOrdering: getConfigValue('form_field_ordering'),
    customFieldsDefinition: getConfigValue('custom_fields_definition'),
    caseTypeMapping: getConfigValue('case_type_mapping', {}),
    cateringFormFields: getConfigValue('catering_form_fields', DEFAULT_CATERING_FIELDS),
    preorderFormFields: getConfigValue('preorder_form_fields', DEFAULT_PREORDER_FIELDS),
  };
}
