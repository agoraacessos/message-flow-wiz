-- =====================================================
-- MIGRAÇÃO PARA SUPABASE - CAMPOS PERSONALIZADOS
-- =====================================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- para criar a tabela custom_fields e migrar dados

-- 1. Criar tabela para campos personalizados
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

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- 3. Criar política permissiva para todas as operações
CREATE POLICY "Allow all operations on custom_fields" ON public.custom_fields
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_custom_fields_updated_at 
    BEFORE UPDATE ON public.custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Inserir alguns campos de exemplo (opcional)
-- Descomente as linhas abaixo se quiser inserir campos de exemplo
/*
INSERT INTO public.custom_fields (name, label, type, required, description) VALUES
('cargo_funcionario', 'Cargo do Funcionário', 'text', false, 'Cargo ou posição do funcionário'),
('departamento', 'Departamento', 'text', false, 'Departamento da empresa'),
('data_admissao', 'Data de Admissão', 'date', false, 'Data de admissão do funcionário'),
('salario', 'Salário', 'number', false, 'Salário do funcionário'),
('status_funcionario', 'Status do Funcionário', 'select', false, 'Status atual do funcionário')
ON CONFLICT (name) DO NOTHING;

-- Atualizar opções para o campo select
UPDATE public.custom_fields 
SET options = ARRAY['Ativo', 'Inativo', 'Férias', 'Licença']
WHERE name = 'status_funcionario';
*/

-- 7. Verificar se a tabela foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_fields' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'custom_fields';

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Copie todo este SQL
-- 2. Acesse o Supabase Dashboard
-- 3. Vá para SQL Editor
-- 4. Cole o SQL e execute
-- 5. Verifique se a tabela foi criada
-- 6. Use o componente de migração no frontend para migrar dados do localStorage
-- =====================================================
