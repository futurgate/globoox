\set ON_ERROR_STOP on
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %', message; end if; raise notice 'PASS: %', message; end $$;
create schema rollback_probe;
create table rollback_probe.book_writes(book_id uuid);
create function rollback_probe.audit_book() returns trigger language plpgsql as $$ begin insert into rollback_probe.book_writes values (NEW.id); return NEW; end $$;
create trigger existing_book_audit after insert or update on books for each row execute function rollback_probe.audit_book();
create function pg_temp.data_snapshot() returns jsonb language plpgsql as $$
declare item record; rows jsonb; result jsonb := '{}'::jsonb;
begin
  for item in select schemaname, tablename from pg_tables where schemaname in ('public', 'auth', 'rollback_probe') order by 1,2 loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), ''[]''::jsonb) from %I.%I t', item.schemaname, item.tablename) into rows;
    result := result || jsonb_build_object(item.schemaname || '.' || item.tablename, rows);
  end loop;
  return result;
end $$;
create temp table before_rollback as select pg_temp.data_snapshot() as data,
  (select jsonb_agg(to_jsonb(t) order by oid) from pg_trigger t where tgname not in ('catalog_v2_user_deleted','catalog_v2_book_version','catalog_v2_legacy_progress')) as other_triggers,
  (select jsonb_agg(to_jsonb(c) order by oid) from pg_constraint c) as constraints,
  (select jsonb_agg(to_jsonb(p) order by oid) from pg_proc p where proname like 'catalog_v2_%') as functions;
\ir ../../supabase/rollback/catalog_v2_disable_triggers.sql
\ir ../../supabase/rollback/catalog_v2_disable_triggers.sql
select pg_temp.assert((select data=pg_temp.data_snapshot() from before_rollback), 'rollback twice preserves every source and catalog row');
select pg_temp.assert((select count(*)=3 and bool_and(tgenabled='D') from pg_trigger where tgname in ('catalog_v2_user_deleted','catalog_v2_book_version','catalog_v2_legacy_progress')), 'exactly three catalog triggers disabled');
select pg_temp.assert((select other_triggers=(select jsonb_agg(to_jsonb(t) order by oid) from pg_trigger t where tgname not in ('catalog_v2_user_deleted','catalog_v2_book_version','catalog_v2_legacy_progress')) from before_rollback), 'all other triggers including FK triggers unchanged');
select pg_temp.assert((select constraints=(select jsonb_agg(to_jsonb(c) order by oid) from pg_constraint c) from before_rollback), 'constraints unchanged');
select pg_temp.assert((select functions=(select jsonb_agg(to_jsonb(p) order by oid) from pg_proc p where proname like 'catalog_v2_%') from before_rollback), 'catalog functions and grants unchanged');
insert into books(id,title) values('ffffffff-0000-0000-0000-000000000001','During rollback');
update books set title='Changed while disabled', cover_url='data:image/png;base64,eg==' where id='00000000-0000-0000-0000-000000000001';
update reading_progress set block_position=21, last_read_at=now() where book_id='00000000-0000-0000-0000-000000000002';
select pg_temp.assert(exists(select 1 from books where id='ffffffff-0000-0000-0000-000000000001') and exists(select 1 from reading_progress where book_id='00000000-0000-0000-0000-000000000002' and block_position=21), 'book and reading-position writes succeed after rollback');
select pg_temp.assert((select count(*)=2 from rollback_probe.book_writes), 'existing book trigger still executes');
select pg_temp.assert((select data->'public.catalog_v2_book_versions'=pg_temp.data_snapshot()->'public.catalog_v2_book_versions' and data->'public.catalog_v2_recency'=pg_temp.data_snapshot()->'public.catalog_v2_recency' from before_rollback), 'disabled projection triggers no longer run');
alter table auth.users enable trigger catalog_v2_user_deleted;
alter table books enable trigger catalog_v2_book_version;
alter table reading_progress enable trigger catalog_v2_legacy_progress;
select 'rollback data and behavior checks passed' as result;
