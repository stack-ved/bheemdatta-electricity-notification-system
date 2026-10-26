# Supabase Setup for Bheemdatta Electricity Alert

This project is prepared to connect to Supabase for authentication, municipalities, outages, reports, and private photo storage.

## 1. Create a Supabase project

1. Go to https://supabase.com and sign in.
2. Click New Project.
3. Choose your organization and database region.
4. Set a database password and create the project.
5. Wait for the project to finish provisioning.

## 2. Get the project URL and public key

In the Supabase dashboard:

- Open Project Settings
- Open API
- Copy the Project URL
- Copy the anon/public key

## 3. Configure environment variables

Create a .env file in the project root using the example file:

```bash
cp .env.example .env
```

Then set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Important:

- Never store the service role secret in the frontend.
- Never commit real secrets to source control.
- Keep .env in .gitignore.

## 4. Run the database schema and address migration

For a new project, run `supabase/schema.sql` first, then run these migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/202610100001_lock_resident_permanent_address.sql`
2. `supabase/migrations/202610100002_harden_notification_delivery.sql`

For an existing project, inspect the current data and take a database backup before applying the migration. A read-only profile summary is:

```sql
select
  role,
  count(*) as profile_count,
  count(*) filter (where nullif(btrim(permanent_address), '') is null) as missing_address_count,
  count(*) filter (where ward_number is null or ward_number not between 1 and 19) as invalid_ward_count
from public.profiles
group by role
order by role;
```

The migrations add verification state and correction/audit tables without deleting profiles, addresses, or roles. Existing residents with a valid address-to-ward mapping remain available; profiles missing a valid address mapping are marked `verification_required` and can request administrator review. Existing municipality administrator roles are not rewritten by the auth signup trigger. The notification migration adds validated `ward_id`/`ward_number` resolution, municipality-scoped admin policies, publication markers, and retry-safe channel delivery claims.

This creates:

- municipalities
- wards
- locations
- profiles
- outages
- outage_locations
- problem_reports
- report_photos
- report_status_history
- auth trigger for profiles
- report numbering trigger
- RLS policies
- ward-scoped notification preferences and notifications
- idempotent notice/outage notification publishing RPCs

The migrations additionally enforce signup confirmation and municipality/ward mapping in the auth trigger, prevent direct profile address/ward/municipality/role updates, add administrator-approved corrections with audit history, and ensure publication markers are only set through database RPCs. The frontend and Edge Functions must not be deployed before both migrations are applied.

## 5. Create the private storage bucket

In the Supabase dashboard:

1. Open Storage
2. Create a bucket called `problem-photos`
3. Set the bucket visibility to Private
4. Keep the bucket private for resident-only and admin-authorized access

Recommended folder pattern:

```text
problem-photos/
  user-id/
    report-id/
      unique-photo-name.jpg
```

## 6. Configure Storage policies

The bucket should be private. Add policies like these for resident and admin access:

- Residents can upload to their own `user-id/report-id` prefix
- Residents can only read their own files
- Admins can read any authorized report photo paths

The project code expects `problem-photos` and uploads using a path pattern of:

```text
user-id/report-id/uuid.jpg
```

## 7. Configure Supabase Auth

1. Open Authentication -> Settings in Supabase.
2. Enable Email sign-in if needed.
3. Configure redirect URLs for your local development app, for example:
   - http://localhost:5173
4. Optional: enable email confirmation based on your workflow.

## 8. Create the first admin user

Use Supabase Auth to create a user in the dashboard or via the app.

Then update the `profiles` table directly:

```sql
update public.profiles
set role = 'admin'
where id = 'your-user-uuid';
```

## 9. Run the app

```bash
npm install
npm run dev
```

The app will use the Supabase project for auth, outage data, and resident report submissions.

## 10. Enable notification email testing

Deploy the email function with the Supabase CLI from the repository root:

```bash
supabase functions deploy send-notification-emails
supabase secrets set EMAIL_NOTIFICATIONS_ENABLED=true RESEND_API_KEY=your_resend_key EMAIL_FROM="Bheemdatta Electricity Alert <alerts@example.com>"
```

The service role key is used only by the Edge Function runtime. Never add it to `.env`, React code, or `VITE_*` variables. Email is sent only to active residents in the notice/outage ward who enabled email notifications.

Without the email secrets, website notifications and browser notifications still work; the email function returns a disabled/configuration response.

## 11. Enable closed-browser Web Push

Generate one VAPID key pair for the deployment:

```bash
npx web-push generate-vapid-keys
```

Add only the public key to the frontend environment:

```env
VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
```

Store the private key only in Supabase Edge Function secrets and deploy the push sender:

```bash
supabase functions deploy send-web-push
supabase secrets set 
VAPID_PUBLIC_KEY=BB_XnEotMT7E9reQT0HT4NsHxaqmoyFf-8YTZnmSaRXhNtbvUl_yOUtwel0T5FE11bSVElx1RbHoCM-jVvbjQSI
VAPID_PRIVATE_KEY=Vj0kIwv78ybiu_LgT6-8JyenBlWtiQVsoEJXpdPO_hk
VAPID_SUBJECT=mailto:hamro124421@gmail.com


Residents must click **Enable browser notifications** once while using HTTPS (or localhost). The service worker then stores a subscription, and Ward Admin publishes can reach that browser even when the website tab is closed. Browsers may still revoke subscriptions or stop delivery when the user blocks notifications or the operating system disables them.

## 12. Notes

- The app keeps the current bilingual UI and light/dark themes intact.
- The frontend uses the public anon key only.
- The app handles empty states, loading states, and Supabase connection issues gracefully.
- Residents with an unverified address or a pending correction may receive municipality-wide alerts, but are excluded from ward-specific in-app, email, and push targeting until the address is eligible again.
- Official outage and general electricity notice email delivery does not depend on `email_notifications`. Browser push still respects its separate browser preference and requires an active subscription.
- After applying the migration, verify signup without a selected ward is rejected, signup without address confirmation is rejected, resident updates to `ward_number`/`permanent_address`/`municipality_id`/`role` fail through the anon-key API, and name/phone updates still work. Submit a correction as a resident, approve it as a municipality admin, and confirm the audit row and new-ward targeting before releasing the change.
