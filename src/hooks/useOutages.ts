import { useEffect, useState } from 'react';
import { outageService } from '../services/outageService';

export function useOutages() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOutages = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: outages, error: outageError } =
          await outageService.getOutages();

        if (!isMounted) return;

        if (outageError) {
          console.error('Failed to load outages:', outageError);
          setError(outageError.message);
          setData([]);
          return;
        }

        console.log('Outages loaded for current user:', outages);

        setData(outages ?? []);
      } catch (err) {
        if (!isMounted) return;

        console.error('Unexpected outage loading error:', err);

        setError('Unable to load outages right now.');
        setData([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOutages();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
  };
}