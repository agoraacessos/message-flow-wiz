-- =====================================================
-- VERIFICAR E CORRIGIR ESTRUTURA DA TABELA CONTACTS
-- =====================================================
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- 1. Verificar estrutura atual da tabela contacts
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar colunas faltantes uma por uma
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone2 TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone3 TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Verificar estrutura após correção
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Testar inserção de um registro de exemplo
INSERT INTO public.contacts (name, phone, email) 
VALUES ('Teste', '11999999999', 'teste@exemplo.com')
ON CONFLICT DO NOTHING;

-- 5. Verificar se o registro foi inserido
SELECT * FROM public.contacts WHERE name = 'Teste';

-- 6. Limpar registro de teste
DELETE FROM public.contacts WHERE name = 'Teste';

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este SQL no Supabase Dashboard
-- 2. Verifique se todas as colunas foram adicionadas
-- 3. O teste de inserção deve funcionar sem erros
-- =====================================================
