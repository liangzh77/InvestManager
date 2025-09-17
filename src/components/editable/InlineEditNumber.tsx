'use client';

import { useState, useRef, useEffect } from 'react';

interface InlineEditNumberProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  className?: string;
  precision?: number;
  suffix?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function InlineEditNumber({
  value,
  onChange,
  onBlur,
  className = '',
  precision = 2,
  suffix = '',
  min,
  max,
  disabled = false
}: InlineEditNumberProps) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const formatDisplayValue = (num: number) => {
    if (precision === 0) {
      return num.toLocaleString();
    }
    return num.toFixed(precision).replace(/\.?0+$/, '');
  };

  const handleSubmit = () => {
    const numValue = parseFloat(tempValue);
    if (!isNaN(numValue)) {
      let finalValue = numValue;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);
      onChange(finalValue);
    }
    setEditing(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setTempValue(value.toString());
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <span className={`${className} text-gray-600`}>
        {formatDisplayValue(value)}{suffix}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className={`${className} border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24`}
        min={min}
        max={max}
        step={precision > 0 ? Math.pow(10, -precision) : 1}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer hover:bg-gray-100 px-2 py-1 rounded border-2 border-transparent hover:border-gray-300 transition-colors`}
      title="点击编辑"
    >
      {formatDisplayValue(value)}{suffix}
    </span>
  );
}