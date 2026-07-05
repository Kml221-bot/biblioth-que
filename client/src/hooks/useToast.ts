import { useCallback } from 'react';
import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      case 'info':
      default:
        toast.info(message);
        break;
    }
  }, []);

  return { showToast };
};
