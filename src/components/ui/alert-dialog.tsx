import React, { useState, useEffect, ReactNode } from 'react';

// Types
interface AnimationState {
  shouldRender: boolean;
  isAnimating: boolean;
}

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

interface AlertDialogContentProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogHeaderProps {
  children: ReactNode;
}

interface AlertDialogTitleProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogFooterProps {
  children: ReactNode;
  className?: string;
}

interface AlertDialogCancelProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

interface AlertDialogActionProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
}

// Animation hook
const useAnimation = (isOpen: boolean): AnimationState => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [isOpen]);

  return { shouldRender, isAnimating };
};

// Alert Dialog Components
export const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  const { shouldRender, isAnimating } = useAnimation(open);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => onOpenChange(false)}
      />
      <div 
        className={`relative z-10 w-full max-w-screen flex items-center justify-center transition-all duration-300 ${
          isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-4'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children }) => {
  return (
    <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-2 sm:pb-4">
      {children}
    </div>
  );
};

export const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={`text-xl sm:text-2xl font-bold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
};

export const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 leading-relaxed ${className}`}>
      {children}
    </p>
  );
};

export const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-5 sm:px-8 py-5 sm:py-6 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 ${className}`}>
      {children}
    </div>
  );
};

export const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full sm:w-auto px-5 sm:px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
};

export const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ children, onClick, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500',
    success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:ring-green-500',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 focus:ring-amber-500',
    info: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full sm:w-auto px-5 sm:px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};