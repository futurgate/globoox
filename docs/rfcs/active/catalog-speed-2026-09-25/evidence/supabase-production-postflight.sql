begin isolation level repeatable read read only;
set local statement_timeout = '15s';
select
  (select count(*) from public.books) as books,
  (select count(*) from public.reading_progress) as reading_progress,
  (select count(*) from public.catalog_v2_book_versions) as versions,
  (select count(*) from public.catalog_v2_actors) as actors,
  (select count(*) from public.catalog_v2_recency) as recency,
  (select count(*) from public.catalog_v2_events) as events,
  (select count(*) from public.books b left join public.catalog_v2_book_versions v on v.book_id=b.id where v.book_id is null) as missing_book_versions,
  (select count(*) from public.reading_progress p left join public.catalog_v2_recency r on r.actor='user:'||p.user_id::text and r.book_id=p.book_id where p.user_id is not null and p.book_id is not null and (p.chapter_id is not null or p.block_id is not null or p.block_position is not null or p.current_cfi is not null or coalesce(p.progress_percentage,0)>0) and r.book_id is null) as missing_recency_seeds;
with expected(relation, trigger_name, function_name) as (values
  ('auth.users','catalog_v2_user_deleted','public.catalog_v2_delete_user()'),
  ('public.books','catalog_v2_book_version','public.catalog_v2_version_book()'),
  ('public.reading_progress','catalog_v2_legacy_progress','public.catalog_v2_project_legacy()')
)
select e.relation,e.trigger_name,coalesce(t.tgenabled='O',false) as enabled,
coalesce(t.tgfoid=e.function_name::regprocedure,false) as function_ok,pg_get_triggerdef(t.oid) as definition
from expected e left join pg_trigger t on t.tgrelid=e.relation::regclass and t.tgname=e.trigger_name and not t.tgisinternal;
with expected(relation) as (values
 ('public.catalog_v2_actors'),('public.catalog_v2_recency'),('public.catalog_v2_events'),('public.catalog_v2_book_versions')
)
select e.relation,c.relrowsecurity as rls_enabled,
(select bool_and(has_table_privilege('service_role',c.oid,privilege)) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as p(privilege)) as service_grants_ok,
not has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') and not has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as client_grants_blocked
from expected e join pg_class c on c.oid=e.relation::regclass;
with expected(signature,rpc) as (values
 ('public.catalog_v2_membership(uuid,text)',true),
 ('public.catalog_v2_manifest(text,uuid,text)',true),
 ('public.catalog_v2_record_activity(text,uuid,text,jsonb)',true),
 ('public.catalog_v2_prune_events(integer)',true),
 ('public.catalog_v2_cover(uuid,text,uuid,uuid,boolean)',true),
 ('public.catalog_v2_delete_user()',false),
 ('public.catalog_v2_version_book()',false),
 ('public.catalog_v2_project_legacy()',false)
)
select signature,case when rpc then has_function_privilege('service_role',signature::regprocedure,'EXECUTE') end as service_execute_ok,
not has_function_privilege('anon',signature::regprocedure,'EXECUTE') and not has_function_privilege('authenticated',signature::regprocedure,'EXECUTE') as client_execute_blocked from expected;
select tgrelid::regclass::text as relation,tgname,tgenabled from pg_trigger where not tgisinternal and tgrelid in ('auth.users'::regclass,'public.books'::regclass,'public.reading_progress'::regclass) and tgname not like 'catalog_v2_%' order by 1,2;
rollback;
