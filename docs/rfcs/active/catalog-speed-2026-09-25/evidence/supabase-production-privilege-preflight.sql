begin read only;
set local statement_timeout='15s';
select current_database(), current_user, has_schema_privilege(current_user,'public','CREATE') as can_create_public,
has_table_privilege(current_user,'auth.users','TRIGGER') as can_trigger_users,
has_table_privilege(current_user,'public.books','TRIGGER') as can_trigger_books,
has_table_privilege(current_user,'public.reading_progress','TRIGGER') as can_trigger_progress,
to_regprocedure('gen_random_uuid()') is not null as uuid_function_present;
select count(*) as long_client_transactions from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and backend_type='client backend' and xact_start<now()-interval '30 seconds';
select relname,count(*) as waiting_locks from pg_locks l join pg_class c on c.oid=l.relation where not l.granted and c.relname in ('users','books','reading_progress') group by relname;
select count(*) as orphan_progress_books from public.reading_progress p left join public.books b on b.id=p.book_id where p.book_id is not null and b.id is null;
rollback;
