import { useEffect, useState } from 'react';
import { reportService } from '../services/reportService';

export function useReports(userId?: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setData([]);
      setLoading(false);
      return () => { isMounted = false; };
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await reportService.getReportsForUser(userId);
        if (!isMounted) return;
        if (error) {
          setError(error.message);
          setData([]);
          return;
        }
        setData(data ?? []);
      } catch {
        if (!isMounted) return;
        setError('Unable to load your reports right now.');
        setData([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { data, loading, error };
}
