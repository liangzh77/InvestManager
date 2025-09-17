'use client';

import { useState, useRef, useEffect } from 'react';

interface InlineEditSelectProps<T = string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

export function InlineEditSelect<T = string>({
  value,
  options,
  onChange,
  onBlur,
  className = '',
  disabled = false
}: InlineEditSelectProps<T>) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editing]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = options.find(opt => opt.value.toString() === e.target.value);
    if (selectedOption) {
      onChange(selectedOption.value);
    }
    setEditing(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  const getCurrentLabel = () => {
    const currentOption = options.find(opt => opt.value === value);
    return currentOption?.label || value?.toString() || '';
  };

  const getOptionColor = (optionValue: T) => {
    if (typeof optionValue === 'string') {
      switch (optionValue) {
        case '做多':
        case '空头平仓':
        case '进行':
        case '完成':
          return 'text-green-700';
        case '做空':
        case '多头平仓':
        case '计划':
          return 'text-red-700';
        case '向上':
          return 'text-blue-700';
        case '向下':
          return 'text-orange-700';
        default:
          return 'text-gray-700';
      }
    }
    return 'text-gray-700';
  };

  const getDisplayColor = () => {
    return getOptionColor(value);
  };

  if (disabled) {
    return (
      <span className={`${className} text-gray-600`}>
        {getCurrentLabel()}
      </span>
    );
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value?.toString() || ''}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onKeyDown={handleKeyDown}
        className={`${className} border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value?.toString()}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`${className} ${getDisplayColor()} cursor-pointer hover:bg-gray-100 px-2 py-1 rounded border-2 border-transparent hover:border-gray-300 transition-colors`}
      title="点击编辑"
    >
      {getCurrentLabel()}
    </span>
  );
}