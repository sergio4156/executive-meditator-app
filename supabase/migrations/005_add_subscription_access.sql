-- Convert access from a permanent one-time purchase to a recurring subscription.
--
-- WHY
-- The product moves from "$10 once, lifetime access" to "$19.99 every 3 months".
-- Nothing in the schema could previously take access away: is_paid was set true
-- by the Stripe webhook and never cleared. A subscription needs an expiry.
--
-- THE KEY DISTINCTION — paid_at vs access_expires_at
--   paid_at            = the FIRST purchase. Anchors the 21-day program, since
--                        deriveWeek() computes the current week from it.
--                        MUST NOT be rewritten on renewal, or every subscriber
--                        snaps back to Week 1 every three months.
--   access_expires_at  = when access ends. Extended on every renewal.
--
-- So access is `access_expires_at > now()`, NOT `is_paid = true`.
-- is_paid is kept because the app, the webhook and the send-reminders function
-- all still read it; it now means "has ever had access" and is no longer
-- sufficient on its own.

alter table public.profiles
  -- Null means no access. Access is granted while this is in the future.
  add column if not exists access_expires_at timestamptz,

  -- Which store granted the current access, so renewals and cancellations can
  -- be reconciled to the right provider. 'stripe' (website) or 'apple' (IAP).
  -- A user could legitimately switch providers over time.
  add column if not exists subscription_provider text
    check (subscription_provider in ('stripe', 'apple')),

  -- The provider's own identifier for the recurring subscription:
  --   Stripe → subscription id (sub_...)
  --   Apple  → originalTransactionId, which is stable across renewals
  -- Used to match incoming renewal/cancellation events to a profile.
  add column if not exists subscription_id text;

-- Renewal events arrive keyed by the provider's subscription id, not by user,
-- so this lookup happens on every webhook call.
create index if not exists profiles_subscription_id_idx
  on public.profiles (subscription_id)
  where subscription_id is not null;

-- The scheduler queries "who currently has access" every 15 minutes.
create index if not exists profiles_access_expires_at_idx
  on public.profiles (access_expires_at)
  where access_expires_at is not null;

-- ============================================================
-- Backfill: do not lock out anyone who already has access
-- ============================================================
-- Every existing is_paid row was sold under the "lifetime access" promise, so
-- honour it — grandfather them permanently rather than expiring them into a
-- product they never agreed to.
--
-- This also protects the App Review demo account
-- (appreview@theexecutivemeditator.com). If that account expired, the reviewer
-- would hit the paywall and reject the app for exactly the reason we are
-- trying to fix.
--
-- 2099 rather than null: the access check is a simple timestamp comparison, so
-- a far-future date needs no special case anywhere in the code.
update public.profiles
   set access_expires_at = timestamptz '2099-12-31 00:00:00+00',
       subscription_provider = null,
       subscription_id = null
 where is_paid = true
   and access_expires_at is null;
