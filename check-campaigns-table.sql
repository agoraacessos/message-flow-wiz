-- Verificar se a tabela campaigns existe e criar se necessário
DO $$ 
BEGIN
    -- Verificar se a tabela campaigns existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        -- Criar tabela campaigns
        CREATE TABLE campaigns (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
            contact_ids UUID[] DEFAULT '{}',
            scheduled_at TIMESTAMPTZ,
            webhook_url TEXT,
            min_delay_between_clients INTEGER DEFAULT 5,
            max_delay_between_clients INTEGER DEFAULT 15,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'error')),
            sent_at TIMESTAMPTZ,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Criar índices
        CREATE INDEX idx_campaigns_status ON campaigns(status);
        CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);
        CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at);

        -- Criar trigger para updated_at
        CREATE OR REPLACE FUNCTION update_campaigns_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_campaigns_updated_at 
            BEFORE UPDATE ON campaigns 
            FOR EACH ROW 
            EXECUTE FUNCTION update_campaigns_updated_at_column();

        -- Habilitar RLS
        ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

        -- Criar política para permitir todas as operações
        CREATE POLICY "Allow all operations on campaigns" ON campaigns
            FOR ALL USING (true);

        RAISE NOTICE 'Tabela campaigns criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela campaigns já existe.';
        
        -- Verificar se as colunas de delay existem e adicionar se necessário
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'min_delay_between_clients') THEN
            ALTER TABLE campaigns ADD COLUMN min_delay_between_clients INTEGER DEFAULT 5;
            RAISE NOTICE 'Coluna min_delay_between_clients adicionada.';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'max_delay_between_clients') THEN
            ALTER TABLE campaigns ADD COLUMN max_delay_between_clients INTEGER DEFAULT 15;
            RAISE NOTICE 'Coluna max_delay_between_clients adicionada.';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'sent_at') THEN
            ALTER TABLE campaigns ADD COLUMN sent_at TIMESTAMPTZ;
            RAISE NOTICE 'Coluna sent_at adicionada.';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'error_message') THEN
            ALTER TABLE campaigns ADD COLUMN error_message TEXT;
            RAISE NOTICE 'Coluna error_message adicionada.';
        END IF;
        
        -- Atualizar constraint de status se necessário
        ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
        ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
            CHECK (status IN ('pending', 'sending', 'sent', 'error'));
    END IF;
END $$;
