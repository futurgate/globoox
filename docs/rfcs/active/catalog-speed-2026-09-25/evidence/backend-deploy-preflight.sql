-- Read-only preflight for the catalog v2 deployment. No book contents or credentials.
begin read only;
set local statement_timeout = '15s';
select current_user as migration_role, version() as server_version;
select n.nspname as schema_name, c.relname as table_name, c.relkind, pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' and c.relname in ('books','reading_progress','user_book_preferences','share_links','share_link_books','catalog_v2_actors','catalog_v2_recency','catalog_v2_events','catalog_v2_book_versions'))
   or (n.nspname='auth' and c.relname='users') order by 1,2;
select table_schema, table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('books','reading_progress','user_book_preferences','share_links','share_link_books')
order by table_name,ordinal_position;
select conrelid::regclass::text as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid in ('public.books'::regclass,'public.reading_progress'::regclass,'public.user_book_preferences'::regclass,'public.share_links'::regclass,'public.share_link_books'::regclass)
order by 1,2;
select tgrelid::regclass::text as table_name,tgname,tgenabled,pg_get_triggerdef(oid) as definition
from pg_trigger where not tgisinternal and tgrelid in ('auth.users'::regclass,'public.books'::regclass,'public.reading_progress'::regclass)
order by 1,2;
select rolname,rolsuper,rolbypassrls from pg_roles where rolname in (current_user,'service_role','anon','authenticated');
select 'books' as table_name,count(*) as rows from public.books union all select 'reading_progress',count(*) from public.reading_progress;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'catalog_v2_%' order by 2;
rollback;
