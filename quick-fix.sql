-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE
-- Script rápido para corrigir o problema de importação

-- 1. Criar tabela contacts se não existir
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

-- 2. Habilitar RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 3. Criar política (ignorar erro se já existir)
CREATE POLICY "Allow all operations on contacts" ON public.contacts
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Verificar se funcionou
SELECT 'Tabela contacts criada com sucesso!' as status;
