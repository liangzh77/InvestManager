'use client';

import { useState, useRef, useEffect } from 'react';

interface InlineEditTextProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function InlineEditText({
  value,
  onChange,
  onBlur,
  className = '',
  placeholder = '',
  disabled = false
}: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    onChange(tempValue);
    setEditing(false);
    onBlur?.();
  };

  const handleCancel = () => {
    setTempValue(value);
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
        {value || placeholder}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className={`${className} border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer hover:bg-gray-100 px-2 py-1 rounded border-2 border-transparent hover:border-gray-300 transition-colors`}
      title="点击编辑"
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </span>
  );
}