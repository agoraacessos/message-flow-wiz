-- Script para criar tabelas de recuperação de conversas
-- Execute este script no Supabase SQL Editor

-- 1. TABELA DE REGRAS DE RECUPERAÇÃO
CREATE TABLE IF NOT EXISTS recovery_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_text TEXT NOT NULL, -- Texto que deve conter na mensagem recebida
    trigger_type TEXT DEFAULT 'contains' CHECK (trigger_type IN ('contains', 'exact', 'regex', 'starts_with', 'ends_with')),
    is_active BOOLEAN DEFAULT true,
    timeout_minutes INTEGER DEFAULT 60, -- Tempo para aguardar resposta
    max_attempts INTEGER DEFAULT 3, -- Máximo de tentativas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE FLUXOS DE RECUPERAÇÃO
CREATE TABLE IF NOT EXISTS recovery_flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID REFERENCES recovery_rules(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL, -- Ordem de execução (1, 2, 3...)
    delay_minutes INTEGER DEFAULT 0, -- Delay antes de enviar esta mensagem
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    webhook_url TEXT, -- URL específica para este passo do fluxo
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE CONVERSAS MONITORADAS
CREATE TABLE IF NOT EXISTS monitored_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES recovery_rules(id) ON DELETE CASCADE,
    trigger_message TEXT NOT NULL, -- Mensagem que ativou a regra
    trigger_received_at TIMESTAMPTZ DEFAULT NOW(),
    current_flow_step INTEGER DEFAULT 1, -- Qual passo do fluxo está executando
    attempts_count INTEGER DEFAULT 0, -- Quantas tentativas já foram feitas
    last_message_sent_at TIMESTAMPTZ,
    next_message_scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'waiting_response' CHECK (status IN ('waiting_response', 'sending_message', 'completed', 'failed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE LOGS DE RECUPERAÇÃO
CREATE TABLE IF NOT EXISTS recovery_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES monitored_conversations(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('rule_triggered', 'message_sent', 'response_received', 'timeout_reached', 'flow_completed', 'flow_failed')),
    message TEXT,
    data JSONB, -- Dados adicionais (mensagem enviada, resposta recebida, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_recovery_rules_active ON recovery_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recovery_rules_trigger_text ON recovery_rules(trigger_text);
CREATE INDEX IF NOT EXISTS idx_recovery_flows_rule_order ON recovery_flows(rule_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_monitored_conversations_status ON monitored_conversations(status);
CREATE INDEX IF NOT EXISTS idx_monitored_conversations_next_scheduled ON monitored_conversations(next_message_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_monitored_conversations_contact ON monitored_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_conversation ON recovery_logs(conversation_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para updated_at
CREATE TRIGGER update_recovery_rules_updated_at 
    BEFORE UPDATE ON recovery_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitored_conversations_updated_at 
    BEFORE UPDATE ON monitored_conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE recovery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir todas as operações
CREATE POLICY "Allow all operations on recovery_rules" ON recovery_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations on recovery_flows" ON recovery_flows FOR ALL USING (true);
CREATE POLICY "Allow all operations on monitored_conversations" ON monitored_conversations FOR ALL USING (true);
CREATE POLICY "Allow all operations on recovery_logs" ON recovery_logs FOR ALL USING (true);

-- Inserir dados de exemplo
INSERT INTO recovery_rules (name, description, trigger_text, trigger_type, timeout_minutes, max_attempts) VALUES
('Cliente Interessado', 'Detecta quando cliente demonstra interesse', 'interessado', 'contains', 30, 2),
('Cliente Indeciso', 'Detecta quando cliente está indeciso', 'não sei', 'contains', 60, 3),
('Cliente Negativo', 'Detecta quando cliente recusa', 'não quero', 'contains', 120, 1),
('Cliente Pergunta Preço', 'Detecta quando cliente pergunta sobre preço', 'quanto custa', 'contains', 15, 2);

-- Inserir fluxos de exemplo para a regra "Cliente Interessado"
INSERT INTO recovery_flows (rule_id, sequence_order, delay_minutes, message_id) 
SELECT 
    r.id,
    1,
    0,
    (SELECT id FROM messages LIMIT 1) -- Usar primeira mensagem como exemplo
FROM recovery_rules r 
WHERE r.name = 'Cliente Interessado';

INSERT INTO recovery_flows (rule_id, sequence_order, delay_minutes, message_id) 
SELECT 
    r.id,
    2,
    30,
    (SELECT id FROM messages LIMIT 1 OFFSET 1) -- Usar segunda mensagem como exemplo
FROM recovery_rules r 
WHERE r.name = 'Cliente Interessado';

RAISE NOTICE 'Tabelas de recuperação de conversas criadas com sucesso!';
