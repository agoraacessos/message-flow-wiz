-- Script simples para testar a conexão e criar apenas a tabela contacts
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela contacts existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contacts';

-- 2. Se não existir, criar a tabela contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    phone3 TEXT,
    email TEXT,
    tags TEXT[] DEFAULT '{}',
    company TEXT,
    position TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 4. Criar política permissiva
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contacts' 
        AND policyname = 'Allow all operations on contacts'
    ) THEN
        CREATE POLICY "Allow all operations on contacts" ON public.contacts
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Testar inserção
INSERT INTO public.contacts (name, phone, email) 
VALUES ('Teste Conexão', '11999999999', 'teste@exemplo.com')
ON CONFLICT DO NOTHING;

-- 7. Verificar se o registro foi inserido
SELECT * FROM public.contacts WHERE name = 'Teste Conexão';
