-- ============================================================
-- 1. COPY THIS ENTIRE SCRIPT
-- 2. GO TO: https://supabase.com/dashboard/project/fhcrlsbszsietmvtzaby/sql/new
-- 3. PASTE AND RUN
-- ============================================================

-- Enable Row Level Security
ALTER TABLE public.discipline_settings ENABLE ROW LEVEL SECURITY;

-- Clean up old policies (safe to re-run)
DROP POLICY IF EXISTS "authenticated_users_can_select_discipline_settings" ON public.discipline_settings;
DROP POLICY IF EXISTS "admins_can_insert_discipline_settings" ON public.discipline_settings;
DROP POLICY IF EXISTS "admins_can_update_discipline_settings" ON public.discipline_settings;
DROP POLICY IF EXISTS "admins_can_delete_discipline_settings" ON public.discipline_settings;

-- 1. SELECT: All authenticated users (admin + teacher) can read settings
CREATE POLICY "authenticated_users_can_select_discipline_settings"
ON public.discipline_settings
FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT: Only admin can insert settings
CREATE POLICY "admins_can_insert_discipline_settings"
ON public.discipline_settings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() = 'admin_md@smd.com'
  OR auth.email() ILIKE 'admin_%@smd.com'
);

-- 3. UPDATE: Only admin can update settings
CREATE POLICY "admins_can_update_discipline_settings"
ON public.discipline_settings
FOR UPDATE
TO authenticated
USING (
  auth.email() = 'admin_md@smd.com'
  OR auth.email() ILIKE 'admin_%@smd.com'
)
WITH CHECK (
  auth.email() = 'admin_md@smd.com'
  OR auth.email() ILIKE 'admin_%@smd.com'
);

-- 4. DELETE: Only admin can delete settings
CREATE POLICY "admins_can_delete_discipline_settings"
ON public.discipline_settings
FOR DELETE
TO authenticated
USING (
  auth.email() = 'admin_md@smd.com'
  OR auth.email() ILIKE 'admin_%@smd.com'
);

-- Grant sequence usage for identity column
GRANT USAGE ON SEQUENCE public.discipline_settings_id_seq TO authenticated;