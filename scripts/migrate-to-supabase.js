// Script para migrar dados do localStorage para Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kshxhhezgnmrpddrpzms.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaHhoaGV6Z25tcnBkZHJwem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjQ2MDEsImV4cCI6MjA3NjY0MDYwMX0.x6T9k84Dfgs_6xiIdutBksFGvL98FRLgypA8tFU2alw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCustomFieldsTable() {
  console.log('Criando tabela custom_fields...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  });

  if (error) {
    console.error('Erro ao criar tabela:', error);
    return false;
  }

  console.log('Tabela custom_fields criada com sucesso!');
  return true;
}

async function migrateLocalStorageData() {
  console.log('Migrando dados do localStorage...');
  
  // Simular dados do localStorage (em um ambiente real, isso viria do browser)
  const localFields = [
    // Exemplo de campos que poderiam estar no localStorage
  ];

  if (localFields.length === 0) {
    console.log('Nenhum dado encontrado no localStorage para migrar.');
    return;
  }

  const { error } = await supabase
    .from('custom_fields')
    .insert(localFields);

  if (error) {
    console.error('Erro ao migrar dados:', error);
    return false;
  }

  console.log(`${localFields.length} campos migrados com sucesso!`);
  return true;
}

async function main() {
  console.log('Iniciando migração para Supabase...');
  
  try {
    // 1. Criar tabela
    const tableCreated = await createCustomFieldsTable();
    if (!tableCreated) {
      console.error('Falha ao criar tabela. Abortando migração.');
      return;
    }

    // 2. Migrar dados
    await migrateLocalStorageData();

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createCustomFieldsTable, migrateLocalStorageData };
