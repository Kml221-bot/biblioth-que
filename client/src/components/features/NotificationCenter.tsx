import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const notificationConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-100',
    borderColor: 'border-green-300 dark:border-green-800',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-100',
    borderColor: 'border-red-300 dark:border-red-800',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-800 dark:text-amber-100',
    borderColor: 'border-amber-300 dark:border-amber-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-100',
    borderColor: 'border-blue-300 dark:border-blue-800',
  },
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed top-6 right-6 z-50 max-w-md space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const config = notificationConfig[notification.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 400, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ duration: 0.3 }}
              className={`pointer-events-auto ${config.bgColor} border ${config.borderColor} rounded-lg p-4 shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
                <div className="flex-1">
                  <h4 className={`font-semibold ${config.textColor}`}>
                    {notification.title}
                  </h4>
                  <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(notification.id)}
                  className={`flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity ${config.textColor}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

/**
 * Hook pour gérer les notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (title: string, message: string) =>
    addNotification('success', title, message);
  const error = (title: string, message: string) =>
    addNotification('error', title, message);
  const warning = (title: string, message: string) =>
    addNotification('warning', title, message);
  const info = (title: string, message: string) =>
    addNotification('info', title, message);

  return {
    notifications,
    addNotification,
    dismissNotification,
    success,
    error,
    warning,
    info,
  };
};
