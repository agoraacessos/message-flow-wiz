#!/bin/bash

# Script de teste para o endpoint WhatsApp Webhook
# Execute este script para testar o endpoint

echo "🧪 Testando endpoint WhatsApp Webhook..."
echo ""

# Verificar se o servidor está rodando
echo "📡 Verificando se o servidor está rodando..."
if curl -s http://localhost:3000/api/whatsapp-webhook > /dev/null 2>&1; then
    echo "✅ Servidor está rodando!"
else
    echo "❌ Servidor não está rodando. Execute 'npm run dev' primeiro."
    exit 1
fi

echo ""
echo "🔍 Testando diferentes mensagens..."
echo ""

# Teste 1 - Mensagem "interessado"
echo "Teste 1 - Mensagem 'interessado':"
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "interessado",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123456",
    "contactName": "João Silva"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Teste 2 - Mensagem "quanto custa"
echo "Teste 2 - Mensagem 'quanto custa':"
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "quanto custa",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123457"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Teste 3 - Mensagem "não sei"
echo "Teste 3 - Mensagem 'não sei':"
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "não sei",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123458"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Teste 4 - Mensagem inválida
echo "Teste 4 - Mensagem inválida (deve dar erro):"
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "",
    "timestamp": "2024-01-21T10:00:00Z"
  }' | jq '.'

echo ""
echo "🎉 Testes concluídos!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verifique os logs no terminal do servidor"
echo "2. Configure o n8n para enviar para http://localhost:3000/api/whatsapp-webhook"
echo "3. Teste o fluxo completo n8n → seu sistema"
