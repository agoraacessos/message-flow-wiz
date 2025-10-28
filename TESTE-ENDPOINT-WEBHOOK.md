# 🧪 Teste do Endpoint WhatsApp Webhook

## 📋 **Como testar:**

### **1. Certifique-se que o servidor está rodando:**
```bash
npm run dev
```

### **2. Teste o endpoint diretamente:**

**Teste 1 - Mensagem "interessado":**
```bash
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "interessado",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123456",
    "contactName": "João Silva"
  }'
```

**Teste 2 - Mensagem "quanto custa":**
```bash
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "quanto custa",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123457"
  }'
```

**Teste 3 - Mensagem "não sei":**
```bash
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "não sei",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123458"
  }'
```

**Teste 4 - Mensagem inválida (para testar erro):**
```bash
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "",
    "timestamp": "2024-01-21T10:00:00Z"
  }'
```

### **3. Resposta esperada:**

**Sucesso:**
```json
{
  "success": true,
  "message": "Mensagem processada com sucesso",
  "data": {
    "from": "5511999999999",
    "message": "interessado",
    "timestamp": "2024-01-21T10:00:00Z",
    "messageId": "msg_123456",
    "contactName": "João Silva"
  },
  "detection": {
    "rulesFound": 1,
    "actions": ["Regra \"Cliente Interessado\" ativada"]
  }
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Payload inválido - campos obrigatórios: from, message"
}
```

## 🔧 **Configuração no n8n:**

### **1. Configure o nó HTTP Request:**
- **URL:** `http://localhost:3000/api/whatsapp-webhook`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body:** Raw JSON

### **2. Body JSON:**
```json
{
  "from": "{{ $json.from }}",
  "message": "{{ $json.message }}",
  "timestamp": "{{ $json.timestamp }}",
  "messageId": "{{ $json.messageId }}",
  "contactName": "{{ $json.contactName }}"
}
```

### **3. Teste completo no n8n:**
1. **Clique em "Listen for test event"** no webhook
2. **Envie o cURL:**
```bash
curl -X POST \
  https://n8n-n8n.k5tlyc.easypanel.host/webhook-test/whatsapp-recuperação \
  -H 'Content-Type: application/json' \
  -d '{
        "from": "5511999999999",
        "message": "interessado",
        "timestamp": "2024-01-21T10:00:00Z",
        "messageId": "msg_123456"
      }'
```

## 📊 **Verificar logs:**

### **1. No terminal do seu sistema:**
Você deve ver logs como:
```
📨 Mensagem recebida do n8n: { from: '5511999999999', message: 'interessado', ... }
📋 Dados processados: { from: '5511999999999', message: 'interessado', ... }
🔍 Verificando se "interessado" ativa alguma regra...
✅ Regra "Cliente Interessado" detectada!
📤 Resposta enviada para n8n: { success: true, ... }
```

### **2. No n8n:**
- Veja o Output do nó HTTP Request
- Deve mostrar a resposta do seu sistema

## 🚨 **Troubleshooting:**

### **Erro 404:**
- Verifique se o servidor está rodando
- Confirme a URL: `http://localhost:3000/api/whatsapp-webhook`

### **Erro 500:**
- Verifique os logs do terminal
- Confirme se o JSON está correto

### **Timeout no n8n:**
- Aumente o timeout no nó HTTP Request
- Verifique se seu sistema está respondendo rapidamente

## 🎯 **Próximos passos:**

1. **Teste o endpoint** diretamente com cURL
2. **Configure o n8n** para enviar para seu sistema
3. **Teste o fluxo completo** n8n → seu sistema
4. **Verifique os logs** em ambos os lados

---

**🎉 Agora você tem o endpoint funcionando!** Teste primeiro diretamente, depois configure o n8n para enviar para ele.
