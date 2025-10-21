-- Script simples para corrigir a tabela contacts
-- Execute no Supabase Dashboard > SQL Editor

-- Adicionar colunas que podem estar faltando
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone2 TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone3 TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verificar se funcionou
SELECT column_name FROM information_schema.columns WHERE table_name = 'contacts' AND table_schema = 'public' ORDER BY ordinal_position;
