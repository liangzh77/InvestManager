'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getPageErrorLogger } from '@/utils/pageErrorLogger';

interface PageErrorLogViewerProps {
  pageId: string;
  className?: string;
}

const PageErrorLogViewer: React.FC<PageErrorLogViewerProps> = ({ pageId, className = '' }) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [hasNewErrors, setHasNewErrors] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const logger = getPageErrorLogger(pageId);

  useEffect(() => {
    const updateState = () => {
      setErrors(logger.getErrors());
      setHasNewErrors(logger.getHasNewErrors());
    };

    // 初始化状态
    updateState();

    // 订阅更新
    const unsubscribe = logger.subscribe(updateState);

    return unsubscribe;
  }, [logger]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 显示悬停窗口时标记为已查看
    if (hasNewErrors) {
      logger.markAsViewed();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // 延迟隐藏，给用户时间移动到窗口内容
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPinned) {
        setShowModal(false);
      }
    }, 300);
  };

  const handleClick = () => {
    setIsPinned(true);
    setShowModal(true);
    if (hasNewErrors) {
      logger.markAsViewed();
    }
  };

  const handleCloseModal = () => {
    setIsPinned(false);
    setShowModal(false);
  };

  const handleClearErrors = () => {
    logger.clearErrors();
  };

  // 当鼠标悬停或点击时显示窗口
  const shouldShowWindow = isHovered || isPinned;

  // 处理窗口内容区域的鼠标事件
  const handleWindowMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleWindowMouseLeave = () => {
    setIsHovered(false);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPinned) {
        setShowModal(false);
      }
    }, 200);
  };

  return (
    <>
      {/* Log图标按钮 */}
      <button
        className={`relative p-2 rounded transition-colors ${
          hasNewErrors
            ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        } ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title={`错误日志 (${errors.length}条${hasNewErrors ? ', 有新错误' : ''})`}
      >
        {/* Log图标 */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>

        {/* 新错误指示器 */}
        {hasNewErrors && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        )}

        {/* 错误数量徽章 */}
        {errors.length > 0 && (
          <div className="absolute -bottom-1 -right-1 min-w-4 h-4 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center px-1">
            {errors.length > 99 ? '99+' : errors.length}
          </div>
        )}
      </button>

      {/* 悬停显示的错误窗口 */}
      {shouldShowWindow && (
        <div
          className="absolute right-0 top-full w-96 max-h-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          onMouseEnter={handleWindowMouseEnter}
          onMouseLeave={handleWindowMouseLeave}
        >
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">错误日志</h3>
            <div className="flex gap-2">
              {errors.length > 0 && (
                <button
                  onClick={handleClearErrors}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                >
                  清空
                </button>
              )}
              {isPinned && (
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="p-3 max-h-48 overflow-y-auto">
            {errors.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无错误记录</p>
            ) : (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-700 p-2 bg-gray-50 rounded border-l-4 border-red-400 hover:bg-gray-100 cursor-text select-text"
                    title="点击选择文本"
                  >
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 固定的模态窗口 */}
      {showModal && isPinned && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">错误日志详情</h2>
              <div className="flex gap-2">
                {errors.length > 0 && (
                  <button
                    onClick={handleClearErrors}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
                  >
                    清空所有
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {errors.length === 0 ? (
                <p className="text-gray-500 text-center">暂无错误记录</p>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded border-l-4 border-red-400 hover:bg-gray-100 cursor-text select-text"
                      title="可选择复制"
                    >
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                        {error}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PageErrorLogViewer;