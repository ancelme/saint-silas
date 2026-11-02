import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchSystemSettings } from '../services/api';

interface SchoolSettingsContextValue {
  settings: Record<string, string>;
  refresh: () => Promise<void>;
  getSuccessRecords: Array<{ year: string; passRate: string; meanScore: string; transition: string }>;
}

const SchoolSettingsContext = createContext<SchoolSettingsContextValue | undefined>(undefined);

export const SchoolSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      setSettings(await fetchSystemSettings());
    } catch {
      // Public pages keep their built-in defaults when settings are unavailable.
    }
  };

  useEffect(() => {
    void refresh();
    const handleRefresh = () => void refresh();
    window.addEventListener('st-silas:school-settings-updated', handleRefresh);
    return () => window.removeEventListener('st-silas:school-settings-updated', handleRefresh);
  }, []);

  let successRecords: Array<{ year: string; passRate: string; meanScore: string; transition: string }> = [];
  try {
    const parsed = JSON.parse(settings.school_success_records || '[]');
    if (Array.isArray(parsed)) successRecords = parsed;
  } catch {
    successRecords = [];
  }

  return (
    <SchoolSettingsContext.Provider value={{ settings, refresh, getSuccessRecords: successRecords }}>
      {children}
    </SchoolSettingsContext.Provider>
  );
};

export const useSchoolSettings = () => {
  const context = useContext(SchoolSettingsContext);
  if (!context) throw new Error('useSchoolSettings must be used within SchoolSettingsProvider');
  return context;
};
