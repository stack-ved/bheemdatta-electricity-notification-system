import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SourceType = 'notice' | 'outage';
type Profile = { id: string; ward_number: number | null; ward_id: string | null; municipality_id: string | null };
type PushSub = { id: string; user_id: string; endpoint: string; p256dh_key: string; auth_key: string };

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:alerts@example.com';

  const missingConfig: string[] = [];
  if (!supabaseUrl) missingConfig.push('SUPABASE_URL');
  if (!serviceRoleKey) missingConfig.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!anonKey) missingConfig.push('SUPABASE_ANON_KEY');
  if (!vapidPublicKey) missingConfig.push('VAPID_PUBLIC_KEY');
  if (!vapidPrivateKey) missingConfig.push('VAPID_PRIVATE_KEY');
  if (missingConfig.length > 0) {+
    return json({
      error: `Web Push server configuration is incomplete. Missing secret(s): ${missingConfig.join(', ')}`,
      missing_secrets: missingConfig,
    }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required' }, 401);
  }

  const userClient = createClient(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Authentication required' }, 401);
  }

  const serviceClient = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: actor, error: actorError } = await serviceClient
    .from('profiles')
    .select('id, role, municipality_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (actorError || !actor || actor.role !== 'municipality_admin' || actor.is_active !== true || !actor.municipality_id) {
    return json({ error: 'Active Municipality Admin access required' }, 403);
  }

  let body: { source_id?: string; source_type?: SourceType };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }

  if (!body.source_id || !['notice', 'outage'].includes(body.source_type ?? '')) {
    return json({ error: 'Provide a valid source_id and source_type (notice or outage)' }, 400);
  }
  const sourceType = body.source_type!;
  const sourceId = body.source_id;

  let targetWards: number[] = [];
  let title = '';
  let message = '';
  let url = '/alerts';
  let isMunicipalityWide = false;

  if (sourceType === 'outage') {
    const { data: outage, error: outageError } = await serviceClient
      .from('outages')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (outageError || !outage) {
      return json({ error: 'Outage not found' }, 404);
    }
    if (outage.municipality_id !== actor.municipality_id) {
      return json({ error: 'Outage is outside your municipality' }, 403);
    }

    title = String(outage.title_en ?? outage.title_np ?? 'Electricity Alert');
    message = String(outage.reason_en ?? outage.reason_np ?? outage.affected_area ?? 'An electricity update is available.');
    url = `/outages/${outage.id}`;
    isMunicipalityWide = outage.is_municipality_wide === true;

    if (isMunicipalityWide) {
      targetWards = Array.from({ length: 19 }, (_, i) => i + 1);
    } else {
      const { data: wardTargets, error: wardTargetError } = await serviceClient
        .from('outage_wards')
        .select('ward_number')
        .eq('outage_id', outage.id);
      if (wardTargetError) {
        return json({ error: 'Unable to load selected outage wards' }, 500);
      }
      targetWards = [...new Set((wardTargets ?? []).map((r: { ward_number: number }) => r.ward_number).filter((n: number) => n >= 1 && n <= 19))];
      if (targetWards.length === 0 && Number.isInteger(outage.ward_number) && outage.ward_number >= 1 && outage.ward_number <= 19) {
        targetWards = [outage.ward_number];
      }
    }
  } else {
    // electricity_notices
    const { data: notice, error: noticeError } = await serviceClient
      .from('electricity_notices')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (noticeError || !notice) {
      return json({ error: 'Notice not found' }, 404);
    }
    if (notice.municipality_id && notice.municipality_id !== actor.municipality_id) {
      return json({ error: 'Notice is outside your municipality' }, 403);
    }
    if (!notice.municipality_id) {
      const { data: creator } = await serviceClient
        .from('profiles')
        .select('municipality_id, role, is_active')
        .eq('id', notice.created_by)
        .maybeSingle();
      if (!creator || creator.municipality_id !== actor.municipality_id || creator.is_active !== true) {
        return json({ error: 'Notice is outside your municipality or has no authorized creator' }, 403);
      }
    }

    title = String(notice.title ?? 'Electricity Update');
    message = String(notice.message ?? 'A new electricity update is available.');
    url = '/alerts';

    if (notice.ward_number === 0) {
      isMunicipalityWide = true;
      targetWards = Array.from({ length: 19 }, (_, i) => i + 1);
    } else if (Number.isInteger(notice.ward_number) && notice.ward_number >= 1 && notice.ward_number <= 19) {
      targetWards = [notice.ward_number];
    }
  }

  if (targetWards.length === 0) {
    return json({ error: 'No valid target wards were found. Check the outage or notice ward selections.' }, 400);
  }

  const { data: wardRows, error: wardsError } = await serviceClient
    .from('wards')
    .select('id, ward_number')
    .eq('municipality_id', actor.municipality_id)
    .in('ward_number', targetWards);

  if (wardsError) {
    return json({ error: 'Unable to validate municipality wards' }, 500);
  }
  const validWards = new Set((wardRows ?? []).map((w: { ward_number: number }) => w.ward_number));
  const wardIds = new Set((wardRows ?? []).map((w: { id: string }) => w.id));
  targetWards = targetWards.filter((n) => validWards.has(n));

  if (targetWards.length === 0) {
    return json({ error: 'Selected wards do not belong to this municipality' }, 400);
  }

  const allProfiles: Profile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id, ward_number, ward_id, municipality_id')
      .eq('role', 'resident')
      .eq('is_active', true)
      .range(offset, offset + 999);
    if (error) {
      return json({ error: 'Unable to load resident profiles' }, 500);
    }
    allProfiles.push(...((data ?? []) as Profile[]));
    if (!data || data.length < 1000) break;
  }

  const targetResidents = allProfiles.filter((p) => {
    const ward = p.ward_number ?? (p.ward_id && wardRows?.find((w: { id: string; ward_number: number }) => w.id === p.ward_id)?.ward_number) ?? null;
    const belongsToMunicipality = p.municipality_id === actor.municipality_id || (!!p.ward_id && wardIds.has(p.ward_id));
    return belongsToMunicipality && ward !== null && targetWards.includes(ward);
  });

  if (targetResidents.length === 0) {
    return json({
      enabled: true,
      source_type: sourceType,
      source_id: sourceId,
      target_wards: targetWards,
      targeted: 0,
      eligible: 0,
      sent: 0,
      provider_accepted: 0,
      skipped: 0,
      failed: 0,
      message: 'No active residents in the selected wards',
    });
  }

  const residentIds = targetResidents.map((p) => p.id);

  // Check notification preferences: default browser_notifications is true, only excluded if false
  const { data: disabledPreferences } = await serviceClient
    .from('notification_preferences')
    .select('user_id')
    .in('user_id', residentIds)
    .eq('browser_notifications', false);

  const disabledUserIds = new Set((disabledPreferences ?? []).map((p: { user_id: string }) => p.user_id));
  const eligibleResidents = targetResidents.filter((p) => !disabledUserIds.has(p.id));
  const eligibleResidentIds = eligibleResidents.map((p) => p.id);

  if (eligibleResidentIds.length === 0) {
    return json({
      enabled: true,
      source_type: sourceType,
      source_id: sourceId,
      target_wards: targetWards,
      targeted: targetResidents.length,
      eligible: 0,
      sent: 0,
      provider_accepted: 0,
      skipped: targetResidents.length,
      failed: 0,
      message: 'All residents in target wards have disabled browser notifications',
    });
  }

  // Load subscriptions for eligible residents
  const { data: subscriptions, error: subsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key, ward_number')
    .in('user_id', eligibleResidentIds);

  if (subsError) {
    return json({ error: 'Unable to load browser push subscriptions' }, 500);
  }

  const subsByUser = new Map<string, PushSub[]>();
  for (const sub of (subscriptions ?? [])) {
    if (!sub.endpoint || !sub.p256dh_key || !sub.auth_key) continue;
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub as PushSub);
    subsByUser.set(sub.user_id, list);
  }

  // Check existing delivery history for duplicate prevention & retry
  let deliveryQuery = serviceClient
    .from('notification_deliveries')
    .select('id, user_id, recipient_user_id, status, attempt_count')
    .eq('channel', 'push');
  if (sourceType === 'outage') {
    deliveryQuery = deliveryQuery.eq('outage_id', sourceId);
  } else {
    deliveryQuery = deliveryQuery.eq('notice_id', sourceId);
  }
  const { data: existingRows } = await deliveryQuery;
  const deliveryByUser = new Map((existingRows ?? []).map((r: { id: string; user_id?: string; recipient_user_id?: string; status: string; attempt_count?: number }) => [
    r.user_id ?? r.recipient_user_id ?? '',
    r,
  ]));

  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
  const scopeDescription = isMunicipalityWide ? 'Municipality-wide' : `Ward ${targetWards.join(', ')}`;
  const payload = JSON.stringify({
    title: `Bheemdatta Electricity Alert: ${title}`,
    body: `${message} (${scopeDescription})`,
    tag: `electricity-${sourceType}-${sourceId}`,
    url,
  });

  let sent = 0;
  let acceptedSubscriptions = 0;
  let failed = 0;
  let skipped = targetResidents.length - eligibleResidents.length;
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const resident of eligibleResidents) {
    const existingDelivery = deliveryByUser.get(resident.id);
    if (existingDelivery?.status === 'sent') {
      skipped++;
      continue;
    }

    const userSubs = subsByUser.get(resident.id) ?? [];
    const now = new Date().toISOString();
    const attemptCount = (existingDelivery?.attempt_count ?? 0) + 1;

    if (userSubs.length === 0) {
      skipped++;
      const skippedRow = {
        outage_id: sourceType === 'outage' ? sourceId : null,
        notice_id: sourceType === 'notice' ? sourceId : null,
        user_id: resident.id,
        channel: 'push',
        status: 'skipped',
        error_message: 'No active browser push subscription registered',
        sent_at: now,
        source_type: sourceType,
        source_id: sourceId,
        recipient_user_id: resident.id,
        attempted_at: now,
        updated_at: now,
        attempt_count: attemptCount,
      };
      if (existingDelivery?.id) {
        await serviceClient.from('notification_deliveries').update(skippedRow).eq('id', existingDelivery.id);
      } else {
        await serviceClient.from('notification_deliveries').insert(skippedRow);
      }
      continue;
    }

    let userSent = false;
    let userLastError = '';

    for (const subscription of userSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          },
          payload
        );
        userSent = true;
        acceptedSubscriptions++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Expired or unregistered subscription; prune from database
          await serviceClient.from('push_subscriptions').delete().eq('id', subscription.id);
        }
        userLastError = err instanceof Error ? err.message : String(err ?? 'Push delivery error');
      }
    }

    if (userSent) {
      sent++;
      const successRow = {
        outage_id: sourceType === 'outage' ? sourceId : null,
        notice_id: sourceType === 'notice' ? sourceId : null,
        user_id: resident.id,
        channel: 'push',
        status: 'sent',
        error_message: null,
        last_error: null,
        sent_at: now,
        source_type: sourceType,
        source_id: sourceId,
        recipient_user_id: resident.id,
        attempted_at: now,
        updated_at: now,
        attempt_count: attemptCount,
      };
      if (existingDelivery?.id) {
        await serviceClient.from('notification_deliveries').update(successRow).eq('id', existingDelivery.id);
      } else {
        await serviceClient.from('notification_deliveries').insert(successRow);
      }
    } else {
      failed++;
      failures.push({ user_id: resident.id, error: userLastError || 'Web Push delivery failed' });
      const failureRow = {
        outage_id: sourceType === 'outage' ? sourceId : null,
        notice_id: sourceType === 'notice' ? sourceId : null,
        user_id: resident.id,
        channel: 'push',
        status: 'failed',
        error_message: userLastError.slice(0, 1000),
        last_error: userLastError.slice(0, 1000),
        sent_at: now,
        source_type: sourceType,
        source_id: sourceId,
        recipient_user_id: resident.id,
        attempted_at: now,
        updated_at: now,
        attempt_count: attemptCount,
      };
      if (existingDelivery?.id) {
        await serviceClient.from('notification_deliveries').update(failureRow).eq('id', existingDelivery.id);
      } else {
        await serviceClient.from('notification_deliveries').insert(failureRow);
      }
    }
  }

  return json({
    enabled: true,
    source_type: sourceType,
    source_id: sourceId,
    target_wards: targetWards,
    targeted: targetResidents.length,
    eligible: eligibleResidents.length,
    provider_accepted: sent,
    sent,
    accepted_subscriptions: acceptedSubscriptions,
    skipped,
    failed,
    failures: failures.slice(0, 25),
    note: 'Web Push sent to resident browser push services; invalid/expired endpoints (404/410) pruned.',
  }, failed > 0 ? 207 : 200);
});
