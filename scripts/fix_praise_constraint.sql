DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- 1. Identify and drop existing Foreign Key constraint on 'praise_to' column
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        JOIN pg_catalog.pg_namespace nsp ON nsp.oid = con.connamespace
        JOIN pg_catalog.pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'praise'
          AND att.attname = 'praise_to'
          AND con.contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE public.praise DROP CONSTRAINT ' || quote_ident(constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;

    -- 2. Add new constraint with ON DELETE CASCADE
    -- Assumes reference to public.profiles(id)
    ALTER TABLE public.praise
    ADD CONSTRAINT praise_praise_to_fkey
    FOREIGN KEY (praise_to)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added new constraint praise_praise_to_fkey with ON DELETE CASCADE';
END $$;
