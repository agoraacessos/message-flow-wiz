-- Script para resetar campanhas presas no status "sending"
-- Execute este script no Supabase SQL Editor se necessário

-- Verificar campanhas presas
SELECT 
    id,
    name,
    status,
    created_at,
    updated_at
FROM campaigns 
WHERE status = 'sending'
ORDER BY created_at DESC;

-- Resetar campanhas presas para "pending"
UPDATE campaigns 
SET 
    status = 'pending',
    updated_at = NOW()
WHERE status = 'sending';

-- Verificar resultado
SELECT 
    COUNT(*) as total_campaigns,
    status,
    COUNT(*) as count
FROM campaigns 
GROUP BY status
ORDER BY status;
