-- =====================================================
-- SCRIPT COMPLETO PARA CRIAR TODAS AS TABELAS DO SISTEMA
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Tabela de Campos Personalizados
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

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Campanhas
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

-- Tabela de Logs de Campanhas
CREATE TABLE IF NOT EXISTS public.campaign_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'read')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PERMISSIVAS
-- =====================================================

-- Políticas para custom_fields
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

-- Políticas para messages
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

-- Políticas para campaigns
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

-- Políticas para campaign_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'campaign_logs' 
        AND policyname = 'Allow all operations on campaign_logs'
    ) THEN
        CREATE POLICY "Allow all operations on campaign_logs" ON public.campaign_logs
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Políticas para system_settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'system_settings' 
        AND policyname = 'Allow all operations on system_settings'
    ) THEN
        CREATE POLICY "Allow all operations on system_settings" ON public.system_settings
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_custom_fields_updated_at' 
        AND event_object_table = 'custom_fields'
    ) THEN
        CREATE TRIGGER update_custom_fields_updated_at 
            BEFORE UPDATE ON public.custom_fields 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_messages_updated_at' 
        AND event_object_table = 'messages'
    ) THEN
        CREATE TRIGGER update_messages_updated_at 
            BEFORE UPDATE ON public.messages 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_campaigns_updated_at' 
        AND event_object_table = 'campaigns'
    ) THEN
        CREATE TRIGGER update_campaigns_updated_at 
            BEFORE UPDATE ON public.campaigns 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_system_settings_updated_at' 
        AND event_object_table = 'system_settings'
    ) THEN
        CREATE TRIGGER update_system_settings_updated_at 
            BEFORE UPDATE ON public.system_settings 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- DADOS INICIAIS DO SISTEMA
-- =====================================================

-- Inserir configurações iniciais do sistema se não existirem
INSERT INTO public.system_settings (key, value)
VALUES 
    ('welcome_message', '{"title": "Bem-vindo!", "content": "Olá {{nome}}, seja bem-vindo ao nosso sistema!"}'),
    ('default_tags', '["cliente", "lead"]')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'custom_fields', 'messages', 'campaigns', 'campaign_logs', 'system_settings')
ORDER BY table_name;
