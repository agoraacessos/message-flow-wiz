-- Criar tabela de grupos de contatos
CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contact_groups_name ON contact_groups(name);
CREATE INDEX IF NOT EXISTS idx_contact_groups_created_at ON contact_groups(created_at);

-- Adicionar comentários para documentação
COMMENT ON TABLE contact_groups IS 'Tabela para armazenar grupos de contatos para campanhas';
COMMENT ON COLUMN contact_groups.name IS 'Nome do grupo de contatos';
COMMENT ON COLUMN contact_groups.description IS 'Descrição opcional do grupo';
COMMENT ON COLUMN contact_groups.contact_ids IS 'Array de IDs dos contatos pertencentes ao grupo';

