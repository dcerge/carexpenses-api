-- FormSubmits Project

-- Populating features for a plan:
insert into ms_auth.app_plan_features (plan_id, feature_id, feature_value)
      select 'f7d81dee-78aa-4ddf-ad73-8517fcadd607', id, feature_default_value
        from ms_auth.app_features as af 
      where space_id = 'formsubmits'
        and status in (50,100)
      order by order_no asc

-- insert missing feature to all the plans
INSERT INTO ms_auth.app_plan_features (plan_id, feature_id, feature_value)
SELECT 
    ap.id AS plan_id,
    af.id AS feature_id,
    af.feature_default_value AS feature_value
FROM ms_auth.app_plans ap
CROSS JOIN ms_auth.app_features af
WHERE ap.space_id = 'formsubmits'
  AND af.space_id = 'formsubmits'
  AND af.status IN (50, 100)
  AND NOT EXISTS (
    SELECT 1 
    FROM ms_auth.app_plan_features apf 
    WHERE apf.plan_id = ap.id 
      AND apf.feature_id = af.id
  )
ORDER BY ap.id, af.order_no;

-- Plan features editor
select apf.id, ap.plan_name, af.feature_code, af.feature_name, apf.feature_value, apf.status
  from ms_auth.app_plan_features as apf 
  join ms_auth.app_plans as ap on (ap.id = apf.plan_id)
  join ms_auth.app_features as af on (af.id = apf.feature_id)
  where ap.plan_code = 'free'
  order by af.order_no asc 
  
  
 //update ms_auth.account set current_plan = 'free' where current_plan = 'basic'
  
  select id, name, icon_name, description from formsubmits.form_field_types order by id
  select * from ms_auth.user where id = 'e7080415-132f-49dc-a238-022a1f862909'
  select * from ms_auth.account where id = '2158D0C0-1B8D-4D29-8C10-F01E481C5EE8'
  update formsubmits.form_fields set status = 100 where status = 10
  
  SELECT COUNT(1) AS qty FROM formsubmits.connectors 
        WHERE removed_at IS NULL AND account_id = '2158d0c0-1b8d-4d29-8c10-f01e481c5ee8'
  
  select "form_fields"."id" from "formsubmits"."form_fields" where "form_fields"."status" in (100) and "form_fields"."removed_at" is null and "form_id" in ('a457149f-fd82-4b08-9197-e5a652f4a2cd') order by "order_no" desc limit 1
  
INSERT INTO ms_auth.user_account (
    space_id,
    user_id,
    account_id,
    user_role_id,
    status
)
SELECT 
    u.space_id,
    u.id,
    u."Account_ID"::uuid,
    '59b30942-24c6-4b95-89e9-ffdac90e3b08'::uuid,
    100
FROM ms_auth."user" u
WHERE u."Account_ID" IS NOT null
  and u."Account_ID" != '00000000-0000-0000-0000-000000000000'
  AND u.status = 100
  AND NOT EXISTS (
    SELECT 1 
    FROM ms_auth.user_account ua 
    WHERE ua.user_id = u.id 
      AND ua.account_id = u."Account_ID"::uuid
      AND ua.removed_at IS NULL
  );



update ms_auth.app_plan_features set status = 50 where feature_id in (
'c99a60f2-9065-400d-b95d-5a27957c5750',
'6cb0eb5b-2f7f-4502-b32f-6a1955327ceb',
'587f6326-1092-485d-9762-236c4265068b',
'5059658c-7a06-45d9-aad3-70b44c37d745',
'c2d9a8a5-12a6-4674-8bb2-0ad51f2ad29d',
'11f7d61b-f01a-431d-a300-5885a5da4f81',
'2c448164-4bbc-47e2-9738-34cbbfb1d781',
'2d9d044f-0211-43e3-9272-a43ea97b6262')