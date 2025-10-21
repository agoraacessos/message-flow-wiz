-- =====================================================
-- CORREÇÃO DE COLUNAS FALTANTES
-- =====================================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- para adicionar colunas que podem estar faltando

-- Adicionar coluna email se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN email TEXT;
    END IF;
END $$;

-- Adicionar coluna phone2 se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'phone2'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN phone2 TEXT;
    END IF;
END $$;

-- Adicionar coluna phone3 se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'phone3'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN phone3 TEXT;
    END IF;
END $$;

-- Adicionar coluna company se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'company'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN company TEXT;
    END IF;
END $$;

-- Adicionar coluna position se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'position'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN position TEXT;
    END IF;
END $$;

-- Adicionar coluna notes se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'notes'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.contacts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verificar estrutura atual da tabela contacts
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este SQL no Supabase Dashboard
-- 2. Verifique se todas as colunas foram adicionadas
-- 3. O sistema funcionará corretamente após a execução
-- =====================================================
