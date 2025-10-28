# Script PowerShell para testar o endpoint WhatsApp Webhook
# Execute este script para testar o endpoint

Write-Host "🧪 Testando endpoint WhatsApp Webhook..." -ForegroundColor Green
Write-Host ""

# Verificar se o servidor está rodando
Write-Host "📡 Verificando se o servidor está rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/whatsapp-webhook" -Method GET -TimeoutSec 5
    Write-Host "✅ Servidor está rodando!" -ForegroundColor Green
} catch {
    Write-Host "❌ Servidor não está rodando. Execute 'npm run dev' primeiro." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Testando diferentes mensagens..." -ForegroundColor Yellow
Write-Host ""

# Teste 1 - Mensagem "interessado"
Write-Host "Teste 1 - Mensagem 'interessado':" -ForegroundColor Cyan
$body1 = @{
    from = "5511999999999"
    message = "interessado"
    timestamp = "2024-01-21T10:00:00Z"
    messageId = "msg_123456"
    contactName = "João Silva"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp-webhook" -Method POST -Body $body1 -ContentType "application/json"
    $response1 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro no teste 1: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Teste 2 - Mensagem "quanto custa"
Write-Host "Teste 2 - Mensagem 'quanto custa':" -ForegroundColor Cyan
$body2 = @{
    from = "5511999999999"
    message = "quanto custa"
    timestamp = "2024-01-21T10:00:00Z"
    messageId = "msg_123457"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp-webhook" -Method POST -Body $body2 -ContentType "application/json"
    $response2 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro no teste 2: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Teste 3 - Mensagem "não sei"
Write-Host "Teste 3 - Mensagem 'não sei':" -ForegroundColor Cyan
$body3 = @{
    from = "5511999999999"
    message = "não sei"
    timestamp = "2024-01-21T10:00:00Z"
    messageId = "msg_123458"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp-webhook" -Method POST -Body $body3 -ContentType "application/json"
    $response3 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro no teste 3: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Teste 4 - Mensagem inválida
Write-Host "Teste 4 - Mensagem inválida (deve dar erro):" -ForegroundColor Cyan
$body4 = @{
    from = "5511999999999"
    message = ""
    timestamp = "2024-01-21T10:00:00Z"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp-webhook" -Method POST -Body $body4 -ContentType "application/json"
    $response4 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro esperado no teste 4: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Testes concluídos!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique os logs no terminal do servidor" -ForegroundColor White
Write-Host "2. Configure o n8n para enviar para http://localhost:3000/api/whatsapp-webhook" -ForegroundColor White
Write-Host "3. Teste o fluxo completo n8n → seu sistema" -ForegroundColor White
