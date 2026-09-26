import json
import pathlib
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[2]
base = ['/opt/homebrew/opt/postgresql@15/bin/psql', '-h', '127.0.0.1', '-p', '55439', '-U', 'catalog_test', '-d', 'catalog_v2_rollback', '-v', 'ON_ERROR_STOP=1', '-At']

def query(sql):
    return subprocess.run(base + ['-c', sql], cwd=root, text=True, capture_output=True, check=True).stdout.strip()

before = query("select jsonb_agg(jsonb_build_array(oid,tgname,tgenabled) order by tgname) from pg_trigger where tgname in ('catalog_v2_user_deleted','catalog_v2_book_version','catalog_v2_legacy_progress')")
blocker = subprocess.Popen(base + ['-c', "set application_name='catalog_rollback_lock_fixture'; begin; lock table public.reading_progress in row exclusive mode; select pg_sleep(8); rollback;"], cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
try:
    deadline = time.monotonic() + 2
    while query("select count(*) from pg_locks l join pg_stat_activity a on a.pid=l.pid where a.application_name='catalog_rollback_lock_fixture' and l.relation='public.reading_progress'::regclass and l.mode='RowExclusiveLock' and l.granted") != '1':
        assert time.monotonic() < deadline, 'fixture did not acquire expected lock'
        time.sleep(0.05)
    started = time.monotonic()
    result = subprocess.run(base + ['-f', 'supabase/rollback/catalog_v2_disable_triggers.sql'], cwd=root, text=True, capture_output=True)
    elapsed = time.monotonic() - started
    assert result.returncode != 0 and 'lock timeout' in result.stderr, result.stderr
    after = query("select jsonb_agg(jsonb_build_array(oid,tgname,tgenabled) order by tgname) from pg_trigger where tgname in ('catalog_v2_user_deleted','catalog_v2_book_version','catalog_v2_legacy_progress')")
    assert before == after, 'partial rollback disabled earlier triggers'
    assert 4.8 < elapsed < 6, elapsed
    print(json.dumps({'case': 'third trigger table locked', 'elapsed_seconds': round(elapsed,3), 'psql_exit': result.returncode, 'expected_error': result.stderr.strip(), 'before': json.loads(before), 'after': json.loads(after), 'atomic': True}, indent=2))
finally:
    blocker.communicate(timeout=10)
