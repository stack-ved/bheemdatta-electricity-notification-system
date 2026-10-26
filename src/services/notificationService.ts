import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { NotificationDeliveryLog } from '../types';

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_notice_id: string | null;
  related_outage_id: string | null;
  ward_number: number;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferencesRecord {
  user_id: string;
  website_notifications: boolean;
  browser_notifications: boolean;
  email_notifications: boolean;
  updated_at: string;
}

export interface DispatchStepResult {
  data: Record<string, unknown> | null;
  error: string | null;
}

export interface PublishAndDispatchResult {
  published: boolean;
  publication: Record<string, unknown> | null;
  publicationError: string | null;
  email: DispatchStepResult | null;
  push: DispatchStepResult | null;
}

export interface DeliveryDispatchResult {
  email: DispatchStepResult | null;
  push: DispatchStepResult | null;
}

export const summarizeOutcomeForChannel = (label: 'Email' | 'Web Push', step: DispatchStepResult | null) => {
  if (!step) return { text: `${label}: not attempted.`, warning: true, isError: false };

  // Explicitly disabled state
  if (step.data?.enabled === false) {
    const reason = typeof step.data.message === 'string'
      ? step.data.message
      : typeof step.data.reason === 'string'
      ? step.data.reason
      : 'server configuration is disabled';
    return { text: `${label} unavailable: ${reason}.`, warning: true, isError: false };
  }

  // Error in data
  if (typeof step.data?.error === 'string') {
    return { text: `${label} error: ${step.data.error}`, warning: true, isError: true };
  }

  // Invocation error
  if (step.error) {
    return { text: `${label} request failed: ${step.error}`, warning: true, isError: true };
  }

  // No data returned
  if (!step.data) {
    return { text: `${label}: no response returned.`, warning: true, isError: true };
  }

  const accepted = Number(step.data.provider_accepted ?? step.data.sent ?? 0);
  const targeted = Number(step.data.targeted ?? step.data.eligible ?? step.data.total ?? 0);
  const failed = Number(step.data.failed ?? 0);
  const skipped = Number(step.data.skipped ?? 0);
  const trackingFailures = Number(step.data.tracking_failures ?? 0);

  if (targeted === 0 && accepted === 0 && failed === 0) {
    return { text: `${label}: 0 active residents in selected wards.`, warning: false, isError: false };
  }

  const pushSubs = label === 'Web Push' && typeof step.data.accepted_subscriptions === 'number'
    ? ` across ${step.data.accepted_subscriptions} browser subscription(s)`
    : '';
  const providerLabel = label === 'Email' ? 'accepted by Resend' : 'delivered to push service';

  return {
    text: `${label}: ${accepted}/${targeted} ${providerLabel}${pushSubs} (${failed} failed, ${skipped} skipped).`,
    warning: failed > 0 || trackingFailures > 0 || (accepted === 0 && targeted > 0),
    isError: failed > 0 && accepted === 0,
  };
};

export const summarizeDelivery = (result: DeliveryDispatchResult) => {
  const email = summarizeOutcomeForChannel('Email', result.email);
  const push = summarizeOutcomeForChannel('Web Push', result.push);
  const hasWarning = email.warning || push.warning;
  const hasError = email.isError && push.isError;

  return {
    type: hasError ? ('error' as const) : hasWarning ? ('warning' as const) : ('success' as const),
    message: `${email.text} ${push.text}`,
    emailText: email.text,
    pushText: push.text,
  };
};

export const summarizePublishAndDispatch = (result: PublishAndDispatchResult) => {
  if (!result.published) {
    return {
      type: 'warning' as const,
      message: `Publication failed: ${result.publicationError ?? 'The database did not confirm publication.'} No email or push request was sent.`,
    };
  }

  const delivery = summarizeDelivery({ email: result.email, push: result.push });
  const inAppCount = Number(result.publication?.recipient_count ?? 0);
  const inAppSummary = result.publication?.already_published === true
    ? 'already published (no duplicate in-app alerts created).'
    : `${inAppCount} in-app notification(s) created.`;

  return {
    type: delivery.type,
    message: `Published; ${inAppSummary} ${delivery.message}`,
  };
};

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

const decodeVapidKey = (key: string) => {
  const padding = '='.repeat((4 - (key.length % 4)) % 4);
  const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

const parseInvokeResult = async (res: { data: unknown; error: unknown }): Promise<DispatchStepResult> => {
  let data = res.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : null;
  let errorMsg = (res.error as { message?: string } | null)?.message ?? null;

  // Inspect error.context response body if available (FunctionsHttpError)
  const ctx = (res.error as { context?: unknown } | null)?.context;
  if (ctx && typeof (ctx as { clone?: () => Response }).clone === 'function') {
    try {
      const cloned = (ctx as Response).clone();
      const body = await cloned.json();
      if (body && typeof body === 'object') {
        if (!data) data = body as Record<string, unknown>;
        if (typeof body.error === 'string') {
          errorMsg = body.error;
        } else if (typeof body.message === 'string') {
          errorMsg = body.message;
        }
      }
    } catch {
      // not JSON
    }
  }

  return {
    data,
    error: errorMsg,
  };
};

export const notificationService = {
  async listForUser(userId: string) {
    return supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<DbNotification[]>();
  },

  async markRead(userId: string, notificationId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
  },

  async markAllRead(userId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  async getPreferences(userId: string) {
    return supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<NotificationPreferencesRecord>();
  },

  async savePreferences(userId: string, preferences: Partial<Omit<NotificationPreferencesRecord, 'user_id' | 'updated_at'>>) {
    const { data: current } = await this.getPreferences(userId);
    const nextWebsiteNotifications = preferences.website_notifications ?? current?.website_notifications ?? true;
    const nextBrowserNotifications = preferences.browser_notifications ?? current?.browser_notifications ?? true;
    const nextEmailNotifications = preferences.email_notifications ?? current?.email_notifications ?? false;
    return supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        website_notifications: nextWebsiteNotifications,
        browser_notifications: nextBrowserNotifications,
        email_notifications: nextEmailNotifications,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single<NotificationPreferencesRecord>();
  },

  subscribe(userId: string, onInsert: (notification: DbNotification) => void): RealtimeChannel {
    return supabase
      .channel(`notifications-for-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => onInsert(payload.new as DbNotification),
      )
      .subscribe();
  },

  async publishNotice(noticeId: string) {
    return supabase.rpc('publish_electricity_notice', { p_notice_id: noticeId });
  },

  async publishOutage(outageId: string) {
    return supabase.rpc('publish_outage_notifications', { p_outage_id: outageId });
  },

  async sendEmailNotifications(sourceId: string, sourceType: 'notice' | 'outage'): Promise<DispatchStepResult> {
    const res = await supabase.functions.invoke('send-notification-emails', {
      body: { source_id: sourceId, source_type: sourceType },
    });
    return parseInvokeResult(res);
  },

  async enableWebPush(userId: string, wardNumber: number) {
    if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { enabled: false, error: 'Web Push is not configured for this deployment.' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(vapidPublicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return { enabled: false, error: 'The browser returned an incomplete push subscription.' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      ward_number: wardNumber,
      endpoint: json.endpoint,
      p256dh_key: json.keys.p256dh,
      auth_key: json.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

    return { enabled: !error, error: error?.message ?? null };
  },

  async sendWebPushNotifications(sourceId: string, sourceType: 'notice' | 'outage'): Promise<DispatchStepResult> {
    const res = await supabase.functions.invoke('send-web-push', {
      body: { source_id: sourceId, source_type: sourceType },
    });
    return parseInvokeResult(res);
  },

  /**
   * Dispatches email and/or web push delivery directly without touching the database publication RPC.
   * Safe to call for retries on already published notices/outages.
   */
  async dispatchDelivery(
    sourceId: string,
    sourceType: 'notice' | 'outage',
    channels: ('email' | 'push')[] = ['email', 'push']
  ): Promise<DeliveryDispatchResult> {
    const [emailAttempt, pushAttempt] = await Promise.allSettled([
      channels.includes('email') ? this.sendEmailNotifications(sourceId, sourceType) : Promise.resolve(null),
      channels.includes('push') ? this.sendWebPushNotifications(sourceId, sourceType) : Promise.resolve(null),
    ]);

    const toStep = (attempt: PromiseSettledResult<DispatchStepResult | null>): DispatchStepResult | null => {
      if (attempt.status === 'rejected') {
        return {
          data: null,
          error: attempt.reason instanceof Error ? attempt.reason.message : 'Function invocation failed',
        };
      }
      return attempt.value;
    };

    return {
      email: toStep(emailAttempt),
      push: toStep(pushAttempt),
    };
  },

  async publishAndDispatch(sourceId: string, sourceType: 'notice' | 'outage'): Promise<PublishAndDispatchResult> {
    try {
      const publicationResult = sourceType === 'notice'
        ? await this.publishNotice(sourceId)
        : await this.publishOutage(sourceId);
      const publication = publicationResult.data as Record<string, unknown> | null;
      if (publicationResult.error) {
        return { published: false, publication, publicationError: publicationResult.error.message, email: null, push: null };
      }
      if (publication?.published !== true) {
        return { published: false, publication, publicationError: 'The database did not confirm publication.', email: null, push: null };
      }

      const dispatchResult = await this.dispatchDelivery(sourceId, sourceType);

      return {
        published: true,
        publication,
        publicationError: null,
        email: dispatchResult.email,
        push: dispatchResult.push,
      };
    } catch (error: unknown) {
      return {
        published: false,
        publication: null,
        publicationError: error instanceof Error ? error.message : 'Unable to publish notification source.',
        email: null,
        push: null,
      };
    }
  },

  async getDeliveryLogs(outageId?: string) {
    let query = supabase
      .from('notification_deliveries')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);

    if (outageId) {
      query = query.eq('outage_id', outageId);
    }

    return query.returns<NotificationDeliveryLog[]>();
  },

  async getEligibleRecipientCount(wardNumbers: number[], isMunicipalityWide: boolean, municipalityId: string) {
    if (!isMunicipalityWide && wardNumbers.length === 0) return { count: 0, error: null };
    let query = supabase
      .from('profiles')
      .select('id, ward_id, ward_number, permanent_address_status, permanent_address')
      .eq('role', 'resident')
      .eq('municipality_id', municipalityId)
      .eq('is_active', true);

    if (!isMunicipalityWide && wardNumbers.length > 0) {
      query = query.eq('permanent_address_status', 'verified').not('permanent_address', 'is', null).not('permanent_address', 'eq', '');
    }

    const { data: profiles, error } = await query;
    if (error || !profiles) return { count: 0, error };
    if (isMunicipalityWide || profiles.length === 0) return { count: profiles.length, error: null };

    const [{ data: wards, error: wardsError }, { data: pendingRequests, error: pendingError }] = await Promise.all([
      supabase.from('wards').select('id, ward_number').eq('municipality_id', municipalityId),
      supabase.from('address_correction_requests').select('resident_id').eq('status', 'pending'),
    ]);
    if (wardsError || pendingError) return { count: 0, error: wardsError ?? pendingError };
    const wardsById = new Map((wards ?? []).map((ward) => [ward.id, ward.ward_number]));
    const validWardNumbers = new Set((wards ?? []).map((ward) => ward.ward_number));
    const pendingResidentIds = new Set((pendingRequests ?? []).map((request) => request.resident_id));
    const count = profiles.filter((profile) => {
      const mappedWard = profile.ward_id ? wardsById.get(profile.ward_id) : null;
      if (profile.ward_id && (mappedWard == null || (profile.ward_number != null && profile.ward_number !== mappedWard))) return false;
      const residentWard = mappedWard ?? profile.ward_number;
      return residentWard != null
        && validWardNumbers.has(residentWard)
        && wardNumbers.includes(residentWard)
        && !pendingResidentIds.has(profile.id);
    }).length;
    return { count, error: null };
  },
};
