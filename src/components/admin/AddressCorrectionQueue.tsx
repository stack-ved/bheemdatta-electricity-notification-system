import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPinned, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppData } from '../../contexts/AppDataContext';

interface CorrectionRequest {
  id: string;
  resident_id: string;
  old_ward_number: number | null;
  old_address: string | null;
  new_ward_number: number;
  new_address: string;
  resident_reason: string;
  created_at: string;
  resident_name: string;
}

export const AddressCorrectionQueue: React.FC = () => {
  const { showToast } = useAppData();
  const showToastRef = useRef(showToast);
  const [requests, setRequests] = useState<CorrectionRequest[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('address_correction_requests')
      .select('id, resident_id, old_ward_number, old_address, new_ward_number, new_address, resident_reason, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      showToastRef.current({ type: 'error', title: 'Unable to load requests', message: error.message });
      setRequests([]);
      return;
    }

    const rows = data ?? [];
    const residentIds = [...new Set(rows.map((row) => row.resident_id))];
    const { data: profiles } = residentIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', residentIds)
      : { data: [] };
    const residentNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || 'Resident']));

    setRequests(rows.map((row) => ({ ...row, resident_name: residentNames.get(row.resident_id) ?? 'Resident' })));
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const decide = async (request: CorrectionRequest, approved: boolean) => {
    const reason = reasons[request.id]?.trim();
    if (!reason) {
      showToast({ type: 'error', title: 'Decision reason required', message: 'Enter the municipality administrator’s reason before approving or rejecting.' });
      return;
    }

    setBusyId(request.id);
    const { error } = await supabase.rpc(
      approved ? 'approve_address_correction' : 'reject_address_correction',
      { p_request_id: request.id, p_reason: reason },
    );
    setBusyId(null);

    if (error) {
      showToast({ type: 'error', title: 'Request review failed', message: error.message });
      return;
    }

    showToast({
      type: 'success',
      title: approved ? 'Address correction approved' : 'Address correction rejected',
      message: approved ? 'The saved address and notification ward have been updated and audited.' : 'The resident’s saved address was not changed.',
    });
    setRequests((current) => (current ?? []).filter((item) => item.id !== request.id));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <MapPinned className="h-5 w-5 text-orange-500" /> Address correction requests
          </h2>
          <p className="mt-1 text-xs text-slate-500">Approvals update the resident’s address and ward and create an immutable audit record.</p>
        </div>
        <button type="button" onClick={() => { setRequests(null); void loadRequests(); }} disabled={requests === null} aria-label="Refresh correction requests" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <RefreshCw className={`h-4 w-4 ${requests === null ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {requests === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading requests</div>
      ) : requests.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">There are no pending address correction requests.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {requests.map((request) => (
            <article key={request.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">{request.resident_name}</h3>
                  <time className="text-xs text-slate-500" dateTime={request.created_at}>{new Date(request.created_at).toLocaleString()}</time>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Current</dt><dd className="mt-1 break-words text-slate-800 dark:text-slate-200">Ward {request.old_ward_number ?? 'not recorded'} · {request.old_address || 'Address not recorded'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-slate-500">Requested</dt><dd className="mt-1 break-words text-slate-800 dark:text-slate-200">Ward {request.new_ward_number} · {request.new_address}</dd></div>
                </dl>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Resident reason:</span> {request.resident_reason}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Administrator decision reason
                  <textarea value={reasons[request.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} rows={3} maxLength={1000} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void decide(request, true)} disabled={busyId === request.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                    {busyId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve correction
                  </button>
                  <button type="button" onClick={() => void decide(request, false)} disabled={busyId === request.id} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40">
                    <X className="h-4 w-4" />Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};