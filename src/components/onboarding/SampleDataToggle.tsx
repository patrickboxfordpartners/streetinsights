import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SampleDataToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export function SampleDataToggle({ enabled, onChange, label }: SampleDataToggleProps) {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <div className="flex items-center gap-2">
        {enabled ? (
          <Eye className="h-4 w-4 text-blue-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-500" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {label || (enabled ? 'Viewing sample data' : 'Show sample data')}
        </span>
      </div>
    </div>
  );
}

/**
 * Hook to manage sample data state
 */
export function useSampleData() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('sample_data_enabled');
    return stored === 'true';
  });

  function toggle(value: boolean) {
    setEnabled(value);
    localStorage.setItem('sample_data_enabled', value.toString());
  }

  return { enabled, toggle };
}
