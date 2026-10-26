import React, { useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppData } from '../../contexts/AppDataContext';
import { notificationService, summarizePublishAndDispatch, summarizeDelivery } from '../../services/notificationService';

interface AdminElectricityNoticeFormProps {
  municipalityId: string;
  createdBy: string;
}

const inputClassName = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export const AdminElectricityNoticeForm: React.FC<AdminElectricityNoticeFormProps> = ({ municipalityId, createdBy }) => {
  const { showToast } = useAppData();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [ward, setWard] = useState('0');
  const [affectedArea, setAffectedArea] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingNoticeId, setPendingNoticeId] = useState<string | null>(null);
  const [lastPublishedNoticeId, setLastPublishedNoticeId] = useState<string | null>(null);
  const [lastDeliverySummary, setLastDeliverySummary] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const wardNumber = Number(ward);
    if (!municipalityId || !createdBy || !Number.isInteger(wardNumber) || (wardNumber !== 0 && (wardNumber < 1 || wardNumber > 19))) {
      showToast({ type: 'error', title: 'Invalid notice target', message: 'Select a valid Bheemdatta ward or municipality-wide targeting.' });
      return;
    }

    setSaving(true);
    try {
      let noticeId = pendingNoticeId;
      if (!noticeId) {
        const { data: notice, error } = await supabase
          .from('electricity_notices')
          .insert({
            municipality_id: municipalityId,
            ward_number: wardNumber,
            title: title.trim(),
            message: message.trim(),
            notice_type: 'general',
            category: 'electricity',
            affected_area: affectedArea.trim() || null,
            priority,
            status: 'active',
            start_at: startAt ? new Date(startAt).toISOString() : null,
            end_at: endAt ? new Date(endAt).toISOString() : null,
            created_by: createdBy,
          })
          .select('id')
          .single();

        if (error || !notice) {
          showToast({ type: 'error', title: 'Notice not saved', message: error?.message ?? 'The notice record was not created.' });
          return;
        }
        noticeId = notice.id;
        setPendingNoticeId(noticeId);
      }

      if (!noticeId) throw new Error('The saved notice reference is unavailable.');
      const result = await notificationService.publishAndDispatch(noticeId, 'notice');
      const summary = summarizePublishAndDispatch(result);
      showToast({
        type: result.published ? summary.type : 'warning',
        title: result.published ? 'Electricity notice published' : 'Notice saved but not published',
        message: result.published
          ? summary.message
          : `Reference ${noticeId}. ${summary.message}`,
      });

      if (result.published) {
        setPendingNoticeId(null);
        setLastPublishedNoticeId(noticeId);
        setLastDeliverySummary(summary.message);
        setTitle('');
        setMessage('');
        setAffectedArea('');
        setStartAt('');
        setEndAt('');
      }
    } catch (error: unknown) {
      showToast({ type: 'error', title: 'Notice workflow failed', message: error instanceof Error ? error.message : 'Unable to publish the electricity notice.' });
    } finally {
      setSaving(false);
    }
  };

  const retryNoticeDelivery = async (noticeId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await notificationService.dispatchDelivery(noticeId, 'notice');
      const summary = summarizeDelivery(result);
      showToast({
        type: summary.type,
        title: 'Notice Delivery Dispatched',
        message: summary.message,
      });
      setLastDeliverySummary(summary.message);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err instanceof Error ? err.message : 'Unable to dispatch notice notifications.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <BellRing className="mt-1 h-5 w-5 shrink-0 text-orange-500" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Publish General Electricity Notice</h2>
          <p className="mt-1 text-xs text-slate-500">Official notices are emailed to every active resident in the selected municipality and ward; email preferences do not suppress these alerts.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <fieldset disabled={saving || Boolean(pendingNoticeId)} className="contents">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Title
            <input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Target ward
            <select value={ward} onChange={(event) => setWard(event.target.value)} className={inputClassName}>
              <option value="0">All municipality residents</option>
              {Array.from({ length: 19 }, (_, index) => index + 1).map((wardNumber) => <option key={wardNumber} value={wardNumber}>Ward {wardNumber}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">Notice message
            <textarea required rows={4} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} className={inputClassName} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Affected area
            <input maxLength={300} value={affectedArea} onChange={(event) => setAffectedArea(event.target.value)} className={inputClassName} placeholder="Tole / feeder / service area" />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClassName}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Start time (optional)
            <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className={inputClassName} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">End time (optional)
            <input type="datetime-local" min={startAt || undefined} value={endAt} onChange={(event) => setEndAt(event.target.value)} className={inputClassName} />
          </label>
        </fieldset>
        {pendingNoticeId && <p className="text-xs text-amber-800 dark:text-amber-300 sm:col-span-2">Saved notice {pendingNoticeId} is awaiting publication. Retry will publish this record without creating a duplicate.</p>}
        <div className="sm:col-span-2 sm:justify-self-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-500 dark:text-slate-950 dark:hover:bg-orange-400">
            <Send className="h-4 w-4" />{saving ? 'Publishing...' : pendingNoticeId ? 'Retry publication' : 'Publish general notice'}
          </button>
        </div>
      </form>

      {lastPublishedNoticeId && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/60">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Notice Reference: <span className="font-mono text-slate-600 dark:text-slate-400">{lastPublishedNoticeId}</span>
            </p>
            {lastDeliverySummary && (
              <p className="text-slate-600 dark:text-slate-300">{lastDeliverySummary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void retryNoticeDelivery(lastPublishedNoticeId)}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Send className="h-3.5 w-3.5 text-sky-500" />
            <span>Retry Notice Delivery</span>
          </button>
        </div>
      )}
    </section>
  );
};