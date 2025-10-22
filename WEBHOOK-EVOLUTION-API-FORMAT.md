# 🔗 Formato do Webhook - Evolution API

## 📋 Visão Geral

O sistema agora envia webhooks no formato padrão da Evolution API, incluindo todas as informações necessárias sobre mensagens, contatos e campanhas.

## 🎯 Eventos Suportados

### 1. **MESSAGES_UPSERT** - Envio de Mensagem
Disparado quando uma mensagem é enviada para um contato.

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "message-flow-wiz",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "3EB0170123456789abcdef"
    },
    "message": {
      "conversation": "Olá João! Confira nossa promoção especial..."
    },
    "messageTimestamp": 1701234567,
    "status": "PENDING",
    "participant": "5511999999999@s.whatsapp.net",
    "pushName": "João Silva",
    "messageType": "conversation"
  },
  "destination": "5511999999999@s.whatsapp.net",
  "date_time": "2024-10-21T14:00:07.000Z",
  "sender": {
    "id": "uuid-do-contato",
    "name": "João Silva",
    "phone": "+5511999999999"
  },
  "message": {
    "id": "uuid-da-mensagem",
    "title": "Promoção Black Friday",
    "content": "Olá {{nome}}! Confira nossa promoção especial..."
  },
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "Promoção Black Friday"
  },
  "sent_at": "2024-10-21T14:00:07.000Z"
}
```

### 2. **CONNECTION_UPDATE** - Criação de Campanha
Disparado quando uma nova campanha é criada.

```json
{
  "event": "CONNECTION_UPDATE",
  "instance": "message-flow-wiz",
  "data": {
    "state": "open",
    "statusReason": "campaign_created"
  },
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "Promoção Black Friday",
    "status": "pending",
    "created_at": "2024-10-21T14:00:00.000Z"
  },
  "date_time": "2024-10-21T14:00:00.000Z"
}
```

## 🔧 Campos Principais

### **Estrutura Evolution API (data)**
- `key.remoteJid`: Número do WhatsApp formatado
- `key.fromMe`: Sempre `true` (mensagem enviada por nós)
- `key.id`: ID único da mensagem
- `message.conversation`: Conteúdo da mensagem
- `messageTimestamp`: Timestamp Unix
- `status`: Status da mensagem (PENDING, SENT, DELIVERED, READ)
- `participant`: Participante da conversa
- `pushName`: Nome do contato
- `messageType`: Tipo da mensagem (conversation, image, document, etc.)

### **Dados Adicionais do Sistema**
- `sender`: Informações do contato
- `message`: Dados da mensagem
- `campaign`: Dados da campanha
- `sent_at`: Timestamp de envio

## 🚀 Como Usar no n8n

### **1. Trigger Webhook**
```javascript
// No n8n, configure o webhook para receber POST
// URL: https://n8n-n8n.k5tlyc.easypanel.host/webhook-test/recebido-disparo
```

### **2. Processar Dados**
```javascript
// Acessar dados da mensagem
const messageContent = $json.data.message.conversation;
const contactName = $json.data.pushName;
const contactPhone = $json.sender.phone;
const campaignName = $json.campaign.name;

// Acessar dados da campanha
const campaignId = $json.campaign.id;
const messageId = $json.message.id;
```

### **3. Exemplo de Uso Completo**
```javascript
// Verificar tipo de evento
if ($json.event === "MESSAGES_UPSERT") {
  // Processar envio de mensagem
  const messageData = {
    contact: $json.sender.name,
    phone: $json.sender.phone,
    message: $json.data.message.conversation,
    campaign: $json.campaign.name,
    sentAt: $json.sent_at
  };
  
  // Fazer algo com os dados...
} else if ($json.event === "CONNECTION_UPDATE") {
  // Processar criação de campanha
  const campaignData = {
    id: $json.campaign.id,
    name: $json.campaign.name,
    status: $json.campaign.status
  };
  
  // Fazer algo com os dados...
}
```

## 📱 Formato de Telefone

O sistema automaticamente formata os números de telefone para o padrão WhatsApp:
- **Entrada**: `+5511999999999` ou `11999999999`
- **Saída**: `5511999999999@s.whatsapp.net`

## ⚡ Status da Mensagem

- `PENDING`: Mensagem enviada, aguardando confirmação
- `SENT`: Mensagem enviada com sucesso
- `DELIVERED`: Mensagem entregue ao destinatário
- `READ`: Mensagem lida pelo destinatário

## 🔄 Próximos Passos

Para implementar status de entrega e leitura, você pode:

1. **Configurar webhooks de retorno** da Evolution API
2. **Implementar eventos** `MESSAGES_UPDATE` e `MESSAGES_DELETE`
3. **Adicionar tracking** de status das mensagens
4. **Integrar com APIs** de terceiros para notificações

---

**📚 Documentação Evolution API**: https://docs.evoapicloud.com/
