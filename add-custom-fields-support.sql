-- Script para adicionar suporte a campos personalizados na tabela contacts
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna para campos personalizados usando JSONB
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Criar índice para busca eficiente nos campos personalizados
CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields ON public.contacts USING GIN (custom_fields);

-- Função para atualizar campos personalizados
CREATE OR REPLACE FUNCTION update_contact_custom_fields(
    contact_id UUID,
    field_name TEXT,
    field_value TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.contacts 
    SET custom_fields = custom_fields || jsonb_build_object(field_name, field_value)
    WHERE id = contact_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar contatos por campo personalizado
CREATE OR REPLACE FUNCTION search_contacts_by_custom_field(
    field_name TEXT,
    field_value TEXT
) RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    custom_fields JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.phone, c.custom_fields
    FROM public.contacts c
    WHERE c.custom_fields ? field_name 
    AND c.custom_fields->>field_name ILIKE '%' || field_value || '%';
END;
$$ LANGUAGE plpgsql;

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public' 
AND column_name = 'custom_fields';

-- Testar inserção com campo personalizado
INSERT INTO public.contacts (name, phone, custom_fields) 
VALUES ('Teste Campo Personalizado', '11999999999', '{"sobrenome": "Silva", "idade": "30"}')
ON CONFLICT DO NOTHING;

-- Verificar se funcionou
SELECT name, phone, custom_fields 
FROM public.contacts 
WHERE name = 'Teste Campo Personalizado';

RAISE NOTICE 'Suporte a campos personalizados adicionado com sucesso!';
