'use client';

import { useState, useRef, useEffect } from 'react';

interface InlineEditDateProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineEditDate({ 
  value, 
  onChange, 
  className = '', 
  placeholder = '选择日期' 
}: InlineEditDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 将日期字符串转换为YYYY-MM-DD格式
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    // 如果已经是YYYY-MM-DD格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // 如果是ISO格式，提取日期部分
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // 将YYYY-MM-DD格式直接返回（不转换为ISO字符串）
  const formatDateFromInput = (inputValue: string) => {
    if (!inputValue) return '';
    // 直接返回YYYY-MM-DD格式，不添加时间部分
    return inputValue;
  };

  useEffect(() => {
    if (isEditing) {
      setEditValue(formatDateForInput(value));
      inputRef.current?.focus();
    }
  }, [isEditing, value]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (editValue) {
      const formattedValue = formatDateFromInput(editValue);
      onChange(formattedValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(formatDateForInput(value));
      setIsEditing(false);
    }
  };

  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return placeholder;
    // 如果已经是YYYY-MM-DD格式，直接显示
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // 如果是ISO格式，提取日期部分显示
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return placeholder;
    return date.toISOString().split('T')[0];
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded min-h-[32px] flex items-center ${className}`}
      title="点击编辑日期"
    >
      {formatDisplayValue(value)}
    </div>
  );
}
