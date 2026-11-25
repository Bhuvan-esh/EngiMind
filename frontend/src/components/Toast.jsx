import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const typeConfig = {
    success: { icon: <CheckCircle2 size={16} color="#10B981" />, border: '#10B981' },
    error: { icon: <AlertCircle size={16} color="#EF4444" />, border: '#EF4444' },
    info: { icon: <Info size={16} color="#8B5CF6" />, border: '#8B5CF6' }
  }[type] || { icon: <Info size={16} color="#8B5CF6" />, border: '#8B5CF6' };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#1F2937',
        border: `1px solid ${typeConfig.border}`,
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        color: '#F9FAFB',
        fontSize: '13px',
        maxWidth: '400px',
        animation: 'slideIn 0.25s ease-out'
      }}
    >
      {typeConfig.icon}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#9CA3AF',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
