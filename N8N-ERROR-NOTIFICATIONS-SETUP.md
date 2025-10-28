# 🔔 Configuração de Notificações de Erro no n8n

Este guia explica como configurar seu workflow n8n para receber notificações quando uma campanha der erro ou ficar travada, **E como responder de volta para evitar falsos positivos**.

## 🆕 NOVO: Sistema de Callback Inteligente

O sistema agora suporta **callbacks do n8n** para evitar falsos positivos:

- ✅ **n8n pode confirmar** se realmente há erro ou se está processando normalmente
- ✅ **n8n pode informar delays customizados** (ex: "aguardar 1 dia")
- ✅ **Timeout inteligente** baseado no tipo de campanha
- ✅ **Sem mais falsos positivos** para campanhas de longo prazo

## 📋 O que é enviado?

Quando uma campanha fica travada ou dá erro, o sistema envia um webhook com os seguintes dados:

```json
{
  "event": "CAMPAIGN_ERROR",
  "instance": "message-flow-wiz",
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "Nome da Campanha",
    "status": "error",
    "error_message": "Mensagem de erro",
    "created_at": "2025-01-21T18:00:00.000Z",
    "updated_at": "2025-01-21T18:15:00.000Z"
  },
  "error": {
    "type": "STUCK_CAMPAIGN",
    "message": "Campanha 'Nome da Campanha' está travada há 20 minutos",
    "timestamp": "2025-01-21T18:15:00.000Z",
    "timeStuck": 20
  },
  "metadata": {
    "detected_at": "2025-01-21T18:15:00.000Z",
    "action_taken": "auto-reset"
  }
}
```

## 🔧 Configuração no n8n

### Passo 1: Criar Webhook no n8n

1. Abra o n8n
2. Crie um novo workflow
3. Adicione o node **"Webhook"**
4. Configure:
   - **HTTP Method:** POST
   - **Path:** `/campaign-error` (ou o que preferir)
   - **Response:** Last Node

### Passo 2: Adicionar Node de Condição (Opcional)

Para filtrar diferentes tipos de erro:

1. Adicione node **"IF"**
2. Configure a condição:
   ```javascript
   {{ $json.error.type }} === 'STUCK_CAMPAIGN'
   ```

### Passo 3: 🆕 NOVO - Adicionar Callback de Resposta

**IMPORTANTE:** Agora você deve responder de volta ao sistema!

1. Adicione node **"HTTP Request"** após processar o erro
2. Configure para enviar POST para: `https://seu-dominio.com/api/n8n-callback`
3. Configure o payload de resposta:

```javascript
// Para confirmar que realmente há erro:
{
  "event": "N8N_CALLBACK",
  "instance": "message-flow-wiz",
  "campaign_id": "{{ $json.campaign.id }}",
  "callback_type": "ERROR_CONFIRMED",
  "message": "Erro confirmado: webhook falhou",
  "timestamp": "{{ new Date().toISOString() }}"
}

// Para informar que está processando normalmente:
{
  "event": "N8N_CALLBACK",
  "instance": "message-flow-wiz",
  "campaign_id": "{{ $json.campaign.id }}",
  "callback_type": "PROCESSING_NORMAL",
  "message": "Processamento normal - aguardando resposta do cliente",
  "timestamp": "{{ new Date().toISOString() }}"
}

// Para informar delay customizado:
{
  "event": "N8N_CALLBACK",
  "instance": "message-flow-wiz",
  "campaign_id": "{{ $json.campaign.id }}",
  "callback_type": "CUSTOM_DELAY",
  "message": "Campanha agendada para amanhã às 9h",
  "data": {
    "custom_delay_minutes": 1440, // 24 horas
    "estimated_completion_time": "2025-01-22T09:00:00.000Z"
  },
  "timestamp": "{{ new Date().toISOString() }}"
}
```

### Passo 4: Enviar Notificação para WhatsApp

1. Adicione node **"WhatsApp"** ou **"HTTP Request"** (para WhatsApp Business API)
2. Configure o envio da mensagem:

**Formato sugerido para WhatsApp:**

```javascript
const message = `⚠️ *ERRO NA CAMPANHA*\n\n` +
  `📋 *Campanha:* ${$json.campaign.name}\n` +
  `🆔 *ID:* ${$json.campaign.id}\n` +
  `📊 *Status:* ${$json.campaign.status}\n\n` +
  `${$json.error.timeStuck ? `⏱️ *Tempo travada:* ${$json.error.timeStuck} minutos\n` : ''}` +
  `❌ *Erro:* ${$json.error.message}\n\n` +
  `${$json.campaign.error_message ? `📝 *Detalhes:* ${$json.campaign.error_message}\n\n` : ''}` +
  `⏰ *Detectado em:* ${new Date($json.metadata.detected_at).toLocaleString('pt-BR')}\n` +
  `🔧 *Ação:* ${$json.metadata.action_taken === 'auto-reset' ? 'Campanha resetada automaticamente' : 'Monitorando'}\n`;

return { message };
```

### Passo 5: Ativar Workflow

1. Clique em **"Activate"** no workflow
2. Copie a URL do webhook gerada

### Passo 6: Configurar no Sistema

1. Abra o sistema de campanhas
2. Nas configurações de webhook, cole a URL do n8n
3. O sistema enviará notificações automaticamente quando houver erros

## 📨 Exemplo Completo de Workflow

```
Webhook (Recebe erro)
    ↓
IF (Verifica tipo de erro)
    ├─ SE: STUCK_CAMPAIGN → 
    │   ├─ Verificar se realmente há erro
    │   ├─ SE há erro → Enviar WhatsApp + Callback ERROR_CONFIRMED
    │   └─ SE normal → Callback PROCESSING_NORMAL
    └─ SE: PROCESSING_ERROR → Enviar WhatsApp + Callback ERROR_CONFIRMED
```

## 🔍 Tipos de Callback

### ERROR_CONFIRMED
- **Quando usar:** Quando realmente há erro na campanha
- **Resultado:** Sistema marca campanha como erro definitivamente
- **Exemplo:** Webhook falhou, API indisponível, dados inválidos

### PROCESSING_NORMAL
- **Quando usar:** Quando está processando normalmente mas demora
- **Resultado:** Sistema continua monitorando sem marcar como erro
- **Exemplo:** Aguardando resposta do cliente, processamento em lote

### CUSTOM_DELAY
- **Quando usar:** Quando há delay específico conhecido
- **Resultado:** Sistema agenda próxima verificação para o tempo informado
- **Exemplo:** Campanha agendada para amanhã, aguardando aprovação

## 🎯 Timeouts Inteligentes

O sistema agora usa timeouts baseados no tipo de campanha:

- **Imediata:** 5 minutos
- **Agendada:** 10 minutos  
- **Em lote:** 30 minutos
- **Longa duração:** 2 horas
- **Customizado:** Baseado no callback do n8n

## 🧪 Testar Notificação

Para testar se a notificação está funcionando:

1. Configure o webhook no n8n
2. No sistema, clique em "Resetar Presas" na página de campanhas
3. Verifique se a notificação chegou no WhatsApp/webhook configurado
4. **IMPORTANTE:** Responda com callback para evitar falsos positivos

## 📱 Formato Final da Mensagem no WhatsApp

```
⚠️ ERRO NA CAMPANHA

📋 Campanha: Promoção Black Friday
🆔 ID: 123e4567-e89b-12d3-a456-426614174000
📊 Status: error

⏱️ Tempo travada: 20 minutos

❌ Erro: Campanha "Promoção Black Friday" está travada há 20 minutos

📝 Detalhes: Auto-resetado: estava travado há mais de 15 minutos

⏰ Detectado em: 21/01/2025 15:30:00
🔧 Ação: Campanha resetada automaticamente
```

## 🚀 Próximos Passos

- [ ] Configurar workflow no n8n
- [ ] **NOVO:** Implementar callbacks de resposta
- [ ] Testar recebimento de notificações
- [ ] Testar callbacks para evitar falsos positivos
- [ ] Configurar webhook nas campanhas
- [ ] Ajustar mensagens conforme necessário

## ⚠️ IMPORTANTE: Callbacks Obrigatórios

**Sem callback, o sistema pode marcar campanhas como erro incorretamente!**

Sempre responda com um dos tipos de callback:
- `ERROR_CONFIRMED` - se realmente há erro
- `PROCESSING_NORMAL` - se está processando normalmente
- `CUSTOM_DELAY` - se tem delay específico
