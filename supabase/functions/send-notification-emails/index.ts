import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SourceType = "notice" | "outage";
type Profile = { id: string; ward_number: number | null; ward_id: string | null; municipality_id: string | null };

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const validEmail = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const emailEnabled = Deno.env.get("EMAIL_NOTIFICATIONS_ENABLED");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const senderEmail = Deno.env.get("EMAIL_FROM");

  const missingServerConfig: string[] = [];
  if (!supabaseUrl) missingServerConfig.push("SUPABASE_URL");
  if (!serviceRoleKey) missingServerConfig.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!anonKey) missingServerConfig.push("SUPABASE_ANON_KEY");
  if (missingServerConfig.length > 0) {
    return json({
      error: `Supabase server configuration is incomplete. Missing: ${missingServerConfig.join(", ")}`,
      missing_secrets: missingServerConfig,
    }, 500);
  }

  if (emailEnabled !== "true") {
    return json({
      enabled: false,
      sent: 0,
      provider_accepted: 0,
      targeted: 0,
      eligible: 0,
      skipped: 0,
      failed: 0,
      missing_secrets: ["EMAIL_NOTIFICATIONS_ENABLED"],
      message: "Email notifications are disabled because EMAIL_NOTIFICATIONS_ENABLED secret is not set to 'true' in Supabase Edge Functions Secrets.",
    });
  }

  const missingProviderSecrets: string[] = [];
  if (!resendApiKey) missingProviderSecrets.push("RESEND_API_KEY");
  if (!senderEmail) missingProviderSecrets.push("EMAIL_FROM");
  if (missingProviderSecrets.length > 0) {
    return json({
      error: `Email provider configuration is incomplete. Missing secret(s): ${missingProviderSecrets.join(", ")}`,
      missing_secrets: missingProviderSecrets,
    }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  const userClient = createClient(supabaseUrl!, anonKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Authentication required" }, 401);
  }

  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id, role, municipality_id, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (actorError || !actor || actor.role !== "municipality_admin" || actor.is_active !== true || !actor.municipality_id) {
    return json({ error: "Active Municipality Admin access required" }, 403);
  }

  let body: { source_id?: string; source_type?: SourceType };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  if (!body.source_id || !["notice", "outage"].includes(body.source_type ?? "")) {
    return json({ error: "Provide a valid source_id and source_type (notice or outage)" }, 400);
  }
  const sourceType = body.source_type!;
  const sourceId = body.source_id;

  let targetWards: number[] = [];
  let source: Record<string, unknown> | null = null;
  let isMunicipalityWide = false;

  if (sourceType === "outage") {
    const { data: outage, error: sourceError } = await admin
      .from("outages")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError || !outage) {
      return json({ error: "Outage not found" }, 404);
    }
    if (outage.municipality_id !== actor.municipality_id) {
      return json({ error: "Outage is outside your municipality" }, 403);
    }
    source = outage;
    isMunicipalityWide = outage.is_municipality_wide === true;

    if (isMunicipalityWide) {
      targetWards = Array.from({ length: 19 }, (_, i) => i + 1);
    } else {
      const { data: wardTargets, error: wardTargetError } = await admin
        .from("outage_wards")
        .select("ward_number")
        .eq("outage_id", outage.id);
      if (wardTargetError) {
        return json({ error: "Unable to load selected outage wards" }, 500);
      }
      targetWards = [...new Set((wardTargets ?? []).map((r: { ward_number: number }) => r.ward_number).filter((n: number) => n >= 1 && n <= 19))];
      if (targetWards.length === 0 && Number.isInteger(outage.ward_number) && outage.ward_number >= 1 && outage.ward_number <= 19) {
        targetWards = [outage.ward_number];
      }
    }
  } else {
    // electricity_notices
    const { data: notice, error: sourceError } = await admin
      .from("electricity_notices")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError || !notice) {
      return json({ error: "Notice not found" }, 404);
    }
    if (notice.municipality_id && notice.municipality_id !== actor.municipality_id) {
      return json({ error: "Notice is outside your municipality" }, 403);
    }
    if (!notice.municipality_id) {
      const { data: creator, error: creatorError } = await admin
        .from("profiles")
        .select("municipality_id, role, is_active")
        .eq("id", notice.created_by)
        .maybeSingle();
      if (creatorError || !creator || creator.municipality_id !== actor.municipality_id || creator.is_active !== true) {
        return json({ error: "Notice is outside your municipality or has no authorized creator" }, 403);
      }
    }
    source = notice;

    if (notice.ward_number === 0) {
      isMunicipalityWide = true;
      targetWards = Array.from({ length: 19 }, (_, i) => i + 1);
    } else if (Number.isInteger(notice.ward_number) && notice.ward_number >= 1 && notice.ward_number <= 19) {
      targetWards = [notice.ward_number];
    }
  }

  if (targetWards.length === 0) {
    return json({ error: "No valid target wards were found. Check the outage or notice ward selections." }, 400);
  }

  const { data: wardRows, error: wardsError } = await admin
    .from("wards")
    .select("id, ward_number")
    .eq("municipality_id", actor.municipality_id)
    .in("ward_number", targetWards);

  if (wardsError) {
    return json({ error: "Unable to validate municipality wards" }, 500);
  }
  const wardIds = new Set((wardRows ?? []).map((w: { id: string }) => w.id));
  const validWards = new Set((wardRows ?? []).map((w: { ward_number: number }) => w.ward_number));
  targetWards = targetWards.filter((n) => validWards.has(n));

  if (targetWards.length === 0) {
    return json({ error: "Selected wards do not belong to this municipality" }, 400);
  }

  const allProfiles: Profile[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, ward_number, ward_id, municipality_id")
      .eq("role", "resident")
      .eq("is_active", true)
      .range(offset, offset + 999);
    if (error) {
      return json({ error: "Unable to load resident profiles" }, 500);
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
      message: "No active residents in the selected wards",
    });
  }

  // Required application behavior: Outage & electricity notice emails go to all active residents in affected wards
  const eligible = targetResidents;

  // Retrieve user email addresses securely through Supabase Auth Admin APIs
  const userById = new Map<string, { email?: string }>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      return json({ error: "Unable to load account email addresses" }, 500);
    }
    for (const u of data.users) {
      userById.set(u.id, { email: u.email });
    }
    if (data.users.length < 1000) break;
  }

  // Check existing delivery records for duplicate prevention & retry
  let deliveryQuery = admin
    .from("notification_deliveries")
    .select("id, user_id, recipient_user_id, status, attempt_count")
    .eq("channel", "email");
  if (sourceType === "outage") {
    deliveryQuery = deliveryQuery.eq("outage_id", sourceId);
  } else {
    deliveryQuery = deliveryQuery.eq("notice_id", sourceId);
  }
  const { data: existingRows, error: deliveryReadError } = await deliveryQuery;
  if (deliveryReadError) {
    return json({ error: "Unable to check notification delivery history" }, 500);
  }

  const deliveryByUser = new Map(
    (existingRows ?? []).map((r: { id: string; user_id?: string; recipient_user_id?: string; status: string; attempt_count?: number }) => [
      r.user_id ?? r.recipient_user_id ?? "",
      r,
    ])
  );

  const title = String(source.title ?? source.title_en ?? "Electricity Alert");
  const messageText = String(source.message ?? source.reason_en ?? "An electricity update was published.");
  const subject = `Bheemdatta Electricity Alert: ${title}`;
  const sentWardLabels = isMunicipalityWide ? "Municipality-wide (All Wards)" : targetWards.join(", ");

  const plainText = [
    "Bheemdatta Municipality — Electricity Alert",
    "",
    title,
    messageText,
    "",
    `Affected ward(s): ${sentWardLabels}`,
    `Affected area: ${source.affected_area ?? "Not specified"}`,
    `Start: ${source.start_at ?? source.start_time ?? "Not specified"}`,
    `Estimated restoration: ${source.end_at ?? source.expected_end_time ?? "Not specified"}`,
    `Priority: ${source.priority ?? "medium"}`,
    "",
    "Please plan accordingly and stay safe.",
    "This is an automated notification from Bheemdatta Electricity Services.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #e4e9f0;border-radius:12px;overflow:hidden"><div style="background:#102a43;color:#fff;padding:24px"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase">Bheemdatta Municipality</div><h1 style="font-size:22px;margin:10px 0 0">Electricity Alert</h1></div><div style="padding:24px"><h2 style="font-size:20px;margin-top:0">${escapeHtml(title)}</h2><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(messageText)}</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr><td style="padding:10px;border-bottom:1px solid #e4e9f0;color:#52606d">Affected ward(s)</td><td style="padding:10px;border-bottom:1px solid #e4e9f0;font-weight:bold">${escapeHtml(sentWardLabels)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #e4e9f0;color:#52606d">Affected area</td><td style="padding:10px;border-bottom:1px solid #e4e9f0">${escapeHtml(source.affected_area ?? "Not specified")}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #e4e9f0;color:#52606d">Start</td><td style="padding:10px;border-bottom:1px solid #e4e9f0">${escapeHtml(source.start_at ?? source.start_time ?? "Not specified")}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #e4e9f0;color:#52606d">Estimated restoration</td><td style="padding:10px;border-bottom:1px solid #e4e9f0">${escapeHtml(source.end_at ?? source.expected_end_time ?? "Not specified")}</td></tr><tr><td style="padding:10px;color:#52606d">Priority</td><td style="padding:10px">${escapeHtml(source.priority ?? "medium")}</td></tr></table><p style="line-height:1.6;margin-top:24px">Please plan accordingly and stay safe.</p><p style="color:#52606d;font-size:12px;border-top:1px solid #e4e9f0;padding-top:16px">Automated official notification for residents of Bheemdatta Municipality.</p></div></div></body></html>`;

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const recipient of eligible) {
    const existing = deliveryByUser.get(recipient.id);
    if (existing?.status === "sent") {
      skipped++;
      continue;
    }

    const account = userById.get(recipient.id);
    const email = account?.email;
    const now = new Date().toISOString();
    const attemptCount = (existing?.attempt_count ?? 0) + 1;

    if (!validEmail(email)) {
      failed++;
      const reason = "No valid email address on the resident account";
      failures.push({ user_id: recipient.id, error: reason });
      const failRow = {
        outage_id: sourceType === "outage" ? sourceId : null,
        notice_id: sourceType === "notice" ? sourceId : null,
        user_id: recipient.id,
        channel: "email",
        status: "failed",
        error_message: reason,
        last_error: reason,
        sent_at: now,
        source_type: sourceType,
        source_id: sourceId,
        recipient_user_id: recipient.id,
        attempted_at: now,
        updated_at: now,
        attempt_count: attemptCount,
      };
      if (existing?.id) {
        await admin.from("notification_deliveries").update(failRow).eq("id", existing.id);
      } else {
        await admin.from("notification_deliveries").insert(failRow);
      }
      continue;
    }

    // Set pending status for active attempt
    const pendingRow = {
      outage_id: sourceType === "outage" ? sourceId : null,
      notice_id: sourceType === "notice" ? sourceId : null,
      user_id: recipient.id,
      channel: "email",
      status: "pending",
      attempt_count: attemptCount,
      last_error: null,
      error_message: null,
      sent_at: now,
      attempted_at: now,
      updated_at: now,
      source_type: sourceType,
      source_id: sourceId,
      recipient_user_id: recipient.id,
    };

    let deliveryRecordId = existing?.id;
    if (deliveryRecordId) {
      await admin.from("notification_deliveries").update(pendingRow).eq("id", deliveryRecordId);
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("notification_deliveries")
        .insert(pendingRow)
        .select("id")
        .maybeSingle();
      if (insertError) {
        failed++;
        failures.push({ user_id: recipient.id, error: "Could not create delivery tracking record" });
        continue;
      }
      deliveryRecordId = inserted?.id;
    }

    // Send email via Resend
    let providerResponse: Response;
    let providerBody: Record<string, unknown> = {};
    try {
      providerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [email],
          subject,
          text: plainText,
          html,
        }),
      });
      providerBody = await providerResponse.json().catch(() => ({}));
    } catch (error) {
      const err = error instanceof Error ? error.message : "Email provider request failed";
      if (deliveryRecordId) {
        await admin
          .from("notification_deliveries")
          .update({
            status: "failed",
            error_message: err.slice(0, 1000),
            last_error: err.slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", deliveryRecordId);
      }
      failed++;
      failures.push({ user_id: recipient.id, error: err });
      continue;
    }

    if (!providerResponse.ok) {
      const err = String(providerBody.message ?? providerBody.error ?? `Email provider returned HTTP ${providerResponse.status}`);
      if (deliveryRecordId) {
        await admin
          .from("notification_deliveries")
          .update({
            status: "failed",
            error_message: err.slice(0, 1000),
            last_error: err.slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", deliveryRecordId);
      }
      failed++;
      failures.push({ user_id: recipient.id, error: err });
      continue;
    }

    // Provider accepted
    if (deliveryRecordId) {
      await admin
        .from("notification_deliveries")
        .update({
          status: "sent",
          provider_message_id: typeof providerBody.id === "string" ? providerBody.id : null,
          last_error: null,
          error_message: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryRecordId);
    }
    sent++;
  }

  return json({
    enabled: true,
    source_type: sourceType,
    source_id: sourceId,
    target_wards: targetWards,
    targeted: targetResidents.length,
    eligible: eligible.length,
    provider_accepted: sent,
    sent,
    skipped,
    failed,
    failures: failures.slice(0, 25),
    note: "sent means the email provider accepted the request; it does not guarantee inbox delivery.",
  }, failed > 0 ? 207 : 200);
});
