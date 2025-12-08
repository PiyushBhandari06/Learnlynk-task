alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO ✔️: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
-- - admins can see all leads of their tenant

create policy "leads_select_policy"
on public.leads
for select
using (
  -- Admin can read all leads within their tenant
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
    AND tenant_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
  )
  OR
  -- Counselor rules
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
    AND (
      -- Counselor can read their own leads
      owner_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid)
      OR
      -- Counselor can read leads owned by a teammate
      EXISTS (
        SELECT 1
        FROM public.user_teams my_team
        JOIN public.user_teams owner_team
          ON my_team.team_id = owner_team.team_id
        WHERE my_team.user_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid)
          AND owner_team.user_id = public.leads.owner_id
      )
    )
  )
);

-- TODO ✔️: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated
create policy "leads_insert_policy"
on public.leads
for insert
with check (
  -- Must be admin or counselor
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin', 'counselor')
  AND
  -- Inserted row must match user's tenant_id
  tenant_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid)
);