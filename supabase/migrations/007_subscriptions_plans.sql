-- ============================================================
-- BiblioTech - Subscription plans and semester packs
-- ============================================================

ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'school_s';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'school_l';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pack_informatique';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pack_droit';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pack_medecine';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'pack_economie';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly', 'semester')),
  ADD COLUMN IF NOT EXISTS max_students INTEGER,
  ADD COLUMN IF NOT EXISTS access_category TEXT,
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_transaction_id
  ON public.subscriptions (payment_transaction_id);
