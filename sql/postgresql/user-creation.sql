CREATE USER carexpenses_user WITH PASSWORD '...';

GRANT CONNECT ON DATABASE carexpensesdb TO carexpenses_user;

GRANT ALL PRIVILEGES ON DATABASE carexpensesdb TO carexpenses_user;


-- public schema
GRANT ALL ON SCHEMA public TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO carexpenses_user;

-- ============================================
-- SCHEMA: carexpenses (main)
-- ============================================
GRANT ALL ON SCHEMA carexpenses TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA carexpenses TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA carexpenses TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA carexpenses TO carexpenses_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA carexpenses GRANT ALL PRIVILEGES ON TABLES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA carexpenses GRANT ALL PRIVILEGES ON SEQUENCES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA carexpenses GRANT ALL PRIVILEGES ON FUNCTIONS TO carexpenses_user;

-- ============================================
-- SCHEMA: ms_auth
-- ============================================
GRANT ALL ON SCHEMA ms_auth TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ms_auth TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ms_auth TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ms_auth TO carexpenses_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA ms_auth GRANT ALL PRIVILEGES ON TABLES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_auth GRANT ALL PRIVILEGES ON SEQUENCES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_auth GRANT ALL PRIVILEGES ON FUNCTIONS TO carexpenses_user;

-- ============================================
-- SCHEMA: ms_storage
-- ============================================
GRANT ALL ON SCHEMA ms_storage TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ms_storage TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ms_storage TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ms_storage TO carexpenses_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA ms_storage GRANT ALL PRIVILEGES ON TABLES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_storage GRANT ALL PRIVILEGES ON SEQUENCES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_storage GRANT ALL PRIVILEGES ON FUNCTIONS TO carexpenses_user;

-- ============================================
-- SCHEMA: ms_sender
-- ============================================
GRANT ALL ON SCHEMA ms_sender TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ms_sender TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ms_sender TO carexpenses_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ms_sender TO carexpenses_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA ms_sender GRANT ALL PRIVILEGES ON TABLES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_sender GRANT ALL PRIVILEGES ON SEQUENCES TO carexpenses_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ms_sender GRANT ALL PRIVILEGES ON FUNCTIONS TO carexpenses_user;
