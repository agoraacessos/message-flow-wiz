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
  "contact": {
    "id": "uuid-do-contato",
    "name": "João Silva",
    "phone": "+5511999999999",
    "phone2": "+5511888888888",
    "phone3": "+5511777777777",
    "email": "joao@empresa.com",
    "tags": ["vip", "cliente-premium"],
    "company": "Empresa ABC",
    "position": "Gerente",
    "notes": "Cliente importante",
    "custom_fields": {
      "idade": "35",
      "cidade": "São Paulo",
      "interesse": "tecnologia"
    },
    "created_at": "2024-10-01T10:00:00.000Z",
    "updated_at": "2024-10-21T14:00:00.000Z"
  },
  "message": {
    "id": "uuid-da-mensagem",
    "title": "Promoção Black Friday",
    "content": "Olá {{nome}}! Confira nossa promoção especial...",
    "type": "text",
    "media_url": null,
    "variables": ["nome", "empresa"],
    "created_at": "2024-10-20T15:00:00.000Z",
    "updated_at": "2024-10-20T15:00:00.000Z"
  },
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "Promoção Black Friday",
    "status": "sending",
    "scheduled_at": null,
    "min_delay_between_clients": 5,
    "max_delay_between_clients": 10,
    "webhook_url": "https://n8n-n8n.k5tlyc.easypanel.host/webhook-test/recebido-disparo",
    "created_at": "2024-10-21T14:00:00.000Z",
    "updated_at": "2024-10-21T14:00:00.000Z"
  },
  "metadata": {
    "sent_at": "2024-10-21T14:00:07.000Z",
    "contact_index": 1,
    "total_contacts": 5,
    "delay_applied": 7
  }
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
const contactName = $json.contact.name;
const contactPhone = $json.contact.phone;
const campaignName = $json.campaign.name;

// Acessar dados completos do contato
const contactData = {
  id: $json.contact.id,
  name: $json.contact.name,
  phone: $json.contact.phone,
  phone2: $json.contact.phone2,
  phone3: $json.contact.phone3,
  email: $json.contact.email,
  tags: $json.contact.tags,
  company: $json.contact.company,
  position: $json.contact.position,
  notes: $json.contact.notes,
  custom_fields: $json.contact.custom_fields
};

// Acessar dados da campanha
const campaignId = $json.campaign.id;
const messageId = $json.message.id;

// Acessar metadados do envio
const sentAt = $json.metadata.sent_at;
const contactIndex = $json.metadata.contact_index;
const totalContacts = $json.metadata.total_contacts;
const delayApplied = $json.metadata.delay_applied;
```

### **3. Exemplo de Uso Completo**
```javascript
// Verificar tipo de evento
if ($json.event === "MESSAGES_UPSERT") {
  // Processar envio de mensagem com TODOS os dados
  const messageData = {
    // Dados do contato (completos)
    contact: {
      id: $json.contact.id,
      name: $json.contact.name,
      phone: $json.contact.phone,
      phone2: $json.contact.phone2,
      phone3: $json.contact.phone3,
      email: $json.contact.email,
      tags: $json.contact.tags,
      company: $json.contact.company,
      position: $json.contact.position,
      notes: $json.contact.notes,
      custom_fields: $json.contact.custom_fields
    },
    // Dados da mensagem
    message: {
      id: $json.message.id,
      title: $json.message.title,
      content: $json.data.message.conversation,
      type: $json.message.type,
      media_url: $json.message.media_url,
      variables: $json.message.variables
    },
    // Dados da campanha
    campaign: {
      id: $json.campaign.id,
      name: $json.campaign.name,
      status: $json.campaign.status,
      scheduled_at: $json.campaign.scheduled_at,
      delays: {
        min: $json.campaign.min_delay_between_clients,
        max: $json.campaign.max_delay_between_clients
      }
    },
    // Metadados do envio
    metadata: {
      sent_at: $json.metadata.sent_at,
      contact_index: $json.metadata.contact_index,
      total_contacts: $json.metadata.total_contacts,
      delay_applied: $json.metadata.delay_applied
    }
  };
  
  // Exemplo: Salvar no banco de dados
  // await saveMessageLog(messageData);
  
  // Exemplo: Enviar para outro sistema
  // await sendToCRM(messageData.contact);
  
  // Exemplo: Processar tags
  if (messageData.contact.tags.includes('vip')) {
    // Lógica especial para clientes VIP
  }
  
} else if ($json.event === "CONNECTION_UPDATE") {
  // Processar criação de campanha
  const campaignData = {
    id: $json.campaign.id,
    name: $json.campaign.name,
    status: $json.campaign.status,
    created_at: $json.campaign.created_at
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
