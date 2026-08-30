import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} • WATCHD` : 'WATCHD - Stream Movies & Series Online';

    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
