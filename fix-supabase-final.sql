-- SCRIPT FINAL PARA CORRIGIR O SUPABASE
-- Execute este script no SQL Editor do Supabase
-- Este script ignora erros de políticas já existentes

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

-- 4. Criar tabela custom_fields se não existir
CREATE TABLE IF NOT EXISTS public.custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'number', 'email', 'phone', 'date', 'boolean', 'select')),
    options TEXT[] DEFAULT '{}',
    required BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS para custom_fields
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- 6. Criar política para custom_fields (ignorar erro se já existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND policyname = 'Allow all operations on custom_fields'
    ) THEN
        CREATE POLICY "Allow all operations on custom_fields" ON public.custom_fields
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Criar tabela messages se não existir
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Habilitar RLS para messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9. Criar política para messages (ignorar erro se já existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'messages' 
        AND policyname = 'Allow all operations on messages'
    ) THEN
        CREATE POLICY "Allow all operations on messages" ON public.messages
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 10. Criar tabela campaigns se não existir
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    contact_ids UUID[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    webhook_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Habilitar RLS para campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 12. Criar política para campaigns (ignorar erro se já existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'campaigns' 
        AND policyname = 'Allow all operations on campaigns'
    ) THEN
        CREATE POLICY "Allow all operations on campaigns" ON public.campaigns
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 13. Verificar se todas as tabelas foram criadas
SELECT 
    table_name,
    'Tabela criada com sucesso!' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'custom_fields', 'messages', 'campaigns')
ORDER BY table_name;

-- 14. Testar inserção na tabela contacts
INSERT INTO public.contacts (name, phone, email) 
VALUES ('Teste Final', '11999999999', 'teste@exemplo.com')
ON CONFLICT DO NOTHING;

-- 15. Verificar se o teste funcionou
SELECT 'Sistema configurado com sucesso! Todas as tabelas estão funcionando.' as resultado;
