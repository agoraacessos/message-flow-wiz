# 🚀 Como Importar e Configurar no n8n

## 📋 **Passo a Passo:**

### **1. Importar o Workflow**
1. Abra o n8n
2. Clique em **"Import"** (ou use Ctrl+I)
3. Cole o conteúdo do arquivo `n8n-whatsapp-detection-workflow.json`
4. Clique em **"Import"**

### **2. Configurar a URL do Seu Sistema**
1. Abra o nó **"Enviar para Sistema"**
2. Altere a URL de:
   ```
   https://seu-sistema.com/api/whatsapp-webhook
   ```
   Para a URL real do seu sistema:
   ```
   https://seu-dominio.com/api/whatsapp-webhook
   ```

### **3. Configurar o Webhook**
1. Abra o nó **"Webhook WhatsApp"**
2. Copie a URL do webhook (ex: `https://seu-n8n.com/webhook/whatsapp-incoming`)
3. Use esta URL para configurar no WhatsApp Business API

### **4. Ativar o Workflow**
1. Clique no botão **"Active"** no canto superior direito
2. O workflow ficará ativo e pronto para receber mensagens

## 🔧 **Configurações Importantes:**

### **URL do Webhook (nó "Enviar para Sistema"):**
```json
{
  "url": "https://SEU-SISTEMA.com/api/whatsapp-webhook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "from": "{{ $json.from }}",
    "message": "{{ $json.message }}",
    "timestamp": "{{ $json.timestamp }}",
    "messageId": "{{ $json.messageId }}",
    "contactName": "{{ $json.contactName }}"
  }
}
```

### **Payload que será enviado para seu sistema:**
```json
{
  "from": "5511999999999",
  "message": "interessado",
  "timestamp": "2024-01-21T10:00:00Z",
  "messageId": "msg_123456",
  "contactName": "João Silva"
}
```

## 📱 **Integração com WhatsApp:**

### **1. WhatsApp Business API:**
```
Webhook URL: https://seu-n8n.com/webhook/whatsapp-incoming
Method: POST
```

### **2. Meta Business (Facebook):**
```
Webhook URL: https://seu-n8n.com/webhook/whatsapp-incoming
Verify Token: seu-token-de-verificacao
```

### **3. Twilio WhatsApp:**
```
Webhook URL: https://seu-n8n.com/webhook/whatsapp-incoming
Method: POST
```

## 🧪 **Como Testar:**

### **1. Teste Manual no n8n:**
1. Abra o nó **"Webhook WhatsApp"**
2. Clique em **"Test"**
3. Cole este payload de exemplo:
```json
{
  "from": "5511999999999",
  "message": "interessado",
  "timestamp": "2024-01-21T10:00:00Z",
  "messageId": "msg_123456",
  "contactName": "João Silva"
}
```

### **2. Teste com cURL:**
```bash
curl -X POST https://seu-n8n.com/webhook/whatsapp-incoming \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "interessado",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123456",
    "contactName": "João Silva"
  }'
```

### **3. Verificar Logs:**
- Abra o n8n
- Vá em **"Executions"**
- Veja os logs de cada execução
- Verifique se a mensagem foi enviada para seu sistema

## 🔍 **Estrutura do Workflow:**

### **Nós do Workflow:**
1. **Webhook WhatsApp** - Recebe mensagens do WhatsApp
2. **Filtrar Mensagem** - Verifica se a mensagem é válida
3. **Formatar Mensagem** - Extrai e formata os dados
4. **Enviar para Sistema** - Envia para seu sistema de detecção
5. **Verificar Resposta** - Verifica se o envio foi bem-sucedido
6. **Log Sucesso/Erro** - Registra o resultado
7. **Responder Webhook** - Retorna resposta para o WhatsApp

### **Fluxo de Execução:**
```
WhatsApp → Webhook → Filtrar → Formatar → Enviar → Verificar → Log → Responder
```

## ⚙️ **Configurações Avançadas:**

### **1. Timeout e Retry:**
```json
{
  "timeout": 10000,
  "retry": {
    "enabled": true,
    "maxRetries": 3
  }
}
```

### **2. Headers Personalizados:**
```json
{
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer seu-token",
    "X-Custom-Header": "valor"
  }
}
```

### **3. Validação de Dados:**
```javascript
// No nó "Formatar Mensagem"
const messageData = {
  from: $input.first().json.from || $input.first().json.phone,
  message: $input.first().json.message || $input.first().json.text,
  timestamp: $input.first().json.timestamp || new Date().toISOString(),
  messageId: $input.first().json.messageId || `msg_${Date.now()}`
};

// Validar se os campos obrigatórios estão presentes
if (!messageData.from || !messageData.message) {
  throw new Error('Campos obrigatórios ausentes: from ou message');
}

return { json: messageData };
```

## 🚨 **Troubleshooting:**

### **Erro 404 - Webhook não encontrado:**
- Verifique se o workflow está ativo
- Confirme a URL do webhook
- Teste manualmente no n8n

### **Erro 500 - Erro interno:**
- Verifique os logs do n8n
- Confirme se a URL do seu sistema está correta
- Teste a conectividade

### **Timeout:**
- Aumente o timeout no nó "Enviar para Sistema"
- Verifique se seu sistema está respondendo rapidamente

### **Mensagem não processada:**
- Verifique se o campo "message" está sendo enviado
- Confirme se o formato do payload está correto
- Verifique os logs de execução

## 📊 **Monitoramento:**

### **1. Logs do n8n:**
- Vá em **"Executions"**
- Veja o status de cada execução
- Verifique os logs de erro

### **2. Logs do seu sistema:**
- Verifique se as mensagens estão chegando
- Confirme se as regras estão sendo ativadas
- Monitore os logs de detecção

### **3. Métricas:**
- Quantas mensagens foram processadas
- Taxa de sucesso/erro
- Tempo de resposta

---

**🎉 Pronto!** Agora você tem um workflow completo no n8n para receber mensagens do WhatsApp e enviar para seu sistema de detecção!
