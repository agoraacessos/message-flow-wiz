-- Script simples para adicionar colunas à tabela campaigns
-- Execute este script se a tabela já existe

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
    -- Verificar e adicionar min_delay_between_clients
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'min_delay_between_clients') THEN
        ALTER TABLE campaigns ADD COLUMN min_delay_between_clients INTEGER DEFAULT 5;
        RAISE NOTICE 'Coluna min_delay_between_clients adicionada.';
    ELSE
        RAISE NOTICE 'Coluna min_delay_between_clients já existe.';
    END IF;
    
    -- Verificar e adicionar max_delay_between_clients
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'max_delay_between_clients') THEN
        ALTER TABLE campaigns ADD COLUMN max_delay_between_clients INTEGER DEFAULT 15;
        RAISE NOTICE 'Coluna max_delay_between_clients adicionada.';
    ELSE
        RAISE NOTICE 'Coluna max_delay_between_clients já existe.';
    END IF;
    
    -- Verificar e adicionar sent_at
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'sent_at') THEN
        ALTER TABLE campaigns ADD COLUMN sent_at TIMESTAMPTZ;
        RAISE NOTICE 'Coluna sent_at adicionada.';
    ELSE
        RAISE NOTICE 'Coluna sent_at já existe.';
    END IF;
    
    -- Verificar e adicionar error_message
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'error_message') THEN
        ALTER TABLE campaigns ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Coluna error_message adicionada.';
    ELSE
        RAISE NOTICE 'Coluna error_message já existe.';
    END IF;
    
    -- Atualizar constraint de status
    BEGIN
        ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
        ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
            CHECK (status IN ('pending', 'sending', 'sent', 'error'));
        RAISE NOTICE 'Constraint de status atualizada.';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar constraint de status: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Atualização da tabela campaigns concluída!';
END $$;
