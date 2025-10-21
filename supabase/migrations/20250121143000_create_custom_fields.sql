-- Criar tabela para campos personalizados
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

-- Habilitar RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva
CREATE POLICY "Allow all operations on custom_fields" ON public.custom_fields
    FOR ALL USING (true) WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_custom_fields_updated_at 
    BEFORE UPDATE ON public.custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
