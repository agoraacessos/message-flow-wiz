-- =====================================================
-- SCHEMA SEGURO - MESSAGE FLOW WIZ
-- =====================================================
-- Este SQL pode ser executado múltiplas vezes sem erros
-- Execute no Supabase Dashboard > SQL Editor

-- 1. TABELA DE CONTATOS
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

-- 2. TABELA DE CAMPOS PERSONALIZADOS
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

-- 3. TABELA DE MENSAGENS
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'template', 'media')),
    media_url TEXT,
    variables TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE CAMPANHAS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE LOGS DE CAMPANHA
CREATE TABLE IF NOT EXISTS public.campaign_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PERMISSIVAS (SEGURAS)
-- =====================================================

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow all operations on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all operations on custom_fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all operations on campaign_logs" ON public.campaign_logs;
DROP POLICY IF EXISTS "Allow all operations on system_settings" ON public.system_settings;

-- Criar políticas
CREATE POLICY "Allow all operations on contacts" ON public.contacts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on custom_fields" ON public.custom_fields
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on messages" ON public.messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on campaigns" ON public.campaigns
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on campaign_logs" ON public.campaign_logs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on system_settings" ON public.system_settings
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remover triggers existentes se houver
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
DROP TRIGGER IF EXISTS update_custom_fields_updated_at ON public.custom_fields;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;

-- Criar triggers
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON public.contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at 
    BEFORE UPDATE ON public.custom_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at 
    BEFORE UPDATE ON public.campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS DO SISTEMA
-- =====================================================

-- Inserir configurações padrão do sistema
INSERT INTO public.system_settings (key, value, description) VALUES
('app_name', 'Message Flow Wiz', 'Nome da aplicação'),
('app_version', '1.0.0', 'Versão da aplicação'),
('max_contacts_per_campaign', '1000', 'Máximo de contatos por campanha'),
('default_message_type', 'text', 'Tipo padrão de mensagem'),
('whatsapp_api_url', '', 'URL da API do WhatsApp'),
('whatsapp_api_token', '', 'Token da API do WhatsApp')
ON CONFLICT (key) DO NOTHING;

-- Inserir mensagem de exemplo
INSERT INTO public.messages (title, content, type, variables) VALUES
('Mensagem de Boas-vindas', 'Olá {{name}}! Bem-vindo ao nosso sistema. Seu telefone é {{phone}}.', 'text', ARRAY['name', 'phone'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at);

-- Índices para custom_fields
CREATE INDEX IF NOT EXISTS idx_custom_fields_name ON public.custom_fields(name);
CREATE INDEX IF NOT EXISTS idx_custom_fields_type ON public.custom_fields(type);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_title ON public.messages(title);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(type);

-- Índices para campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at);

-- Índices para campaign_logs
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON public.campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_contact_id ON public.campaign_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_status ON public.campaign_logs(status);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_created_at ON public.campaign_logs(created_at);

-- Índices para system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'custom_fields', 'messages', 'campaigns', 'campaign_logs', 'system_settings')
ORDER BY table_name;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Copie todo este SQL
-- 2. Acesse o Supabase Dashboard
-- 3. Vá para SQL Editor
-- 4. Cole o SQL e execute
-- 5. Verifique se todas as tabelas foram criadas
-- 6. O sistema estará pronto para uso completo
-- =====================================================
