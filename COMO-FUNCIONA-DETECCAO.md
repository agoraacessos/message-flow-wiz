# 🔍 Sistema de Detecção de Mensagens - Como Funciona

## 📋 **Resumo do Fluxo**

```
WhatsApp → n8n → Seu Sistema → Detecção → Ação
```

## 🔄 **Fluxo Completo**

### **1. Cliente envia mensagem no WhatsApp**
```
Cliente: "interessado"
WhatsApp: Envia para n8n
```

### **2. n8n recebe a mensagem**
```javascript
// n8n recebe do WhatsApp
{
  "from": "5511999999999",
  "message": "interessado",
  "timestamp": "2024-01-21T10:00:00Z",
  "messageId": "msg_123456"
}
```

### **3. n8n envia para seu sistema**
```javascript
// Webhook do n8n para seu sistema
POST https://seu-sistema.com/api/whatsapp-webhook
{
  "from": "5511999999999",
  "message": "interessado",
  "timestamp": "2024-01-21T10:00:00Z",
  "messageId": "msg_123456"
}
```

### **4. Seu sistema processa a mensagem**
```javascript
// MessageDetectionService.processIncomingMessage()
1. Busca todas as regras ativas
2. Verifica se "interessado" ativa alguma regra
3. Se encontrar → Ativa o fluxo de recuperação
4. Se não encontrar → Ignora a mensagem
```

### **5. Sistema ativa o fluxo**
```javascript
// Se a regra for ativada:
1. Cria conversa monitorada
2. Envia primeira mensagem IMEDIATAMENTE
3. Agenda próxima mensagem para 30 minutos depois
4. Monitora se cliente responde
```

## ⚙️ **Configuração no n8n**

### **1. Webhook de Entrada (WhatsApp → n8n)**
```
Trigger: WhatsApp Webhook
URL: https://seu-n8n.com/webhook/whatsapp-incoming
Method: POST
```

### **2. Processamento no n8n**
```
Node 1: Receber mensagem do WhatsApp
Node 2: Extrair dados (from, message, timestamp)
Node 3: Enviar para seu sistema
```

### **3. Webhook de Saída (n8n → Seu Sistema)**
```
URL: https://seu-sistema.com/api/whatsapp-webhook
Method: POST
Headers: Content-Type: application/json
Body: {
  "from": "{{ $json.from }}",
  "message": "{{ $json.message }}",
  "timestamp": "{{ $json.timestamp }}",
  "messageId": "{{ $json.messageId }}"
}
```

## 🔍 **Tipos de Detecção**

### **1. Contém (Padrão)**
```
Regra: "interessado"
Mensagem: "Estou interessado no produto"
Resultado: ✅ ATIVADA
```

### **2. Exato**
```
Regra: "interessado"
Mensagem: "interessado"
Resultado: ✅ ATIVADA

Mensagem: "Estou interessado"
Resultado: ❌ NÃO ATIVADA
```

### **3. Começa com**
```
Regra: "interessado"
Mensagem: "interessado no produto"
Resultado: ✅ ATIVADA

Mensagem: "Estou interessado"
Resultado: ❌ NÃO ATIVADA
```

### **4. Termina com**
```
Regra: "interessado"
Mensagem: "Estou interessado"
Resultado: ✅ ATIVADA

Mensagem: "interessado no produto"
Resultado: ❌ NÃO ATIVADA
```

### **5. Regex**
```
Regra: "^interessado.*produto$"
Mensagem: "interessado no produto"
Resultado: ✅ ATIVADA

Mensagem: "interessado no serviço"
Resultado: ❌ NÃO ATIVADA
```

## 📱 **Exemplos Práticos**

### **Exemplo 1: Cliente Interessado**
```
Cliente: "interessado"
Sistema: Detecta regra "Cliente Interessado"
Ação: Envia "Olá! Vi que você tem interesse. Como posso ajudar?"
```

### **Exemplo 2: Cliente Pergunta Preço**
```
Cliente: "quanto custa"
Sistema: Detecta regra "Cliente Pergunta Preço"
Ação: Envia "O preço é R$ 299,00. Posso explicar o que está incluído!"
```

### **Exemplo 3: Cliente Indeciso**
```
Cliente: "não sei"
Sistema: Detecta regra "Cliente Indeciso"
Ação: Envia "Entendo sua indecisão. Posso esclarecer suas dúvidas!"
```

## 🧪 **Como Testar**

### **1. Usar o Teste de Detecção**
- Acesse `/conversation-recovery`
- Clique na aba "Teste de Detecção"
- Digite uma mensagem (ex: "interessado")
- Clique em "Testar Detecção"

### **2. Verificar no Console**
```javascript
// Logs que aparecem no console:
🔍 Processando mensagem de 5511999999999: "interessado"
✅ Regra "Cliente Interessado" ativada pela mensagem!
🚀 Fluxo de recuperação ativado para 5511999999999 com regra "Cliente Interessado"
📤 Primeira mensagem enviada para 5511999999999
```

### **3. Verificar no Banco de Dados**
```sql
-- Verificar conversas monitoradas
SELECT * FROM monitored_conversations 
WHERE trigger_message = 'interessado';

-- Verificar logs de atividade
SELECT * FROM recovery_logs 
WHERE action = 'rule_triggered';
```

## 🔧 **Configuração Avançada**

### **1. Múltiplas Palavras-Chave**
```
Regra: "Cliente Interessado"
Triggers: "interessado", "quero saber", "me interessa"
Tipo: Contém
```

### **2. Regex Complexa**
```
Regra: "Cliente Pergunta Preço"
Trigger: "quanto.*custa|qual.*preço|valor.*produto"
Tipo: Regex
```

### **3. Contexto Específico**
```
Regra: "Cliente Negativo"
Trigger: "não quero|não preciso|caro demais"
Tipo: Contém
```

## 📊 **Monitoramento**

### **1. Logs de Detecção**
```javascript
// Cada detecção gera um log:
{
  "action": "rule_triggered",
  "message": "Regra 'Cliente Interessado' ativada pela mensagem: 'interessado'",
  "data": {
    "trigger_text": "interessado",
    "trigger_type": "contains",
    "message_data": {
      "from": "5511999999999",
      "message": "interessado",
      "timestamp": "2024-01-21T10:00:00Z"
    }
  }
}
```

### **2. Conversas Monitoradas**
```javascript
// Cada conversa ativada é registrada:
{
  "contact_id": "uuid-do-contato",
  "rule_id": "uuid-da-regra",
  "trigger_message": "interessado",
  "status": "waiting_response",
  "current_flow_step": 1,
  "attempts_count": 0
}
```

## 🚀 **Próximos Passos**

1. **Execute o script SQL** no Supabase
2. **Configure suas regras** na interface
3. **Teste a detecção** com o componente de teste
4. **Configure o webhook** no n8n
5. **Monitore os logs** para ajustar

---

**💡 Dica:** Comece testando com mensagens simples como "interessado" e depois expanda para casos mais complexos!
