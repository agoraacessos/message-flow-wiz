# 🧪 Guia de Teste - Sistema n8n Message Flow Wiz

## ✅ **Correções Implementadas:**

### **1. Removido Webhook de Criação**
- ❌ **Antes:** Enviava webhook quando campanha era criada
- ✅ **Agora:** Webhook só é enviado durante o processamento

### **2. Processamento Manual**
- ✅ Botão individual para processar cada campanha
- ✅ Botão para processar todas as campanhas pendentes
- ✅ Logs detalhados para debug

### **3. Formato n8n Correto**
- ✅ Webhook no formato: `{ session, number, flow: [...] }`
- ✅ Suporte a múltiplos tipos: text, image, audio, document
- ✅ Delays configuráveis por mensagem

## 🚀 **Como Testar:**

### **Teste 1: Campanha com 1 Contato**

1. **Crie um fluxo de mensagem:**
   - Vá em "Mensagens" → "Novo Fluxo"
   - Adicione: Texto → Imagem → Texto
   - Configure delays: 0s, 5s, 10s

2. **Crie uma campanha:**
   - Vá em "Campanhas" → "Nova Campanha"
   - Selecione o fluxo criado
   - Escolha **1 contato**
   - Configure webhook n8n: `https://n8n-n8n.k5tlyc.easypanel.host/webhook/recebido-disparo`

3. **Processe a campanha:**
   - Clique no botão **verde** (▶️) ao lado da campanha
   - Ou clique em "Processar Imediatas"

4. **Verifique no n8n:**
   - Deve receber **1 webhook** com formato:
   ```json
   {
     "session": "message-flow-wiz",
     "number": "5511999999999",
     "flow": [
       { "type": "text", "content": "Olá!", "delay": 0 },
       { "type": "image", "content": "https://...", "delay": 5 },
       { "type": "text", "content": "Tchau!", "delay": 10 }
     ]
   }
   ```

### **Teste 2: Campanha com Múltiplos Contatos**

1. **Crie uma campanha com 3+ contatos**
2. **Processe a campanha**
3. **Verifique no n8n:**
   - Deve receber **3 webhooks separados**
   - Um para cada contato
   - Cada webhook independente

## 🔧 **Configuração no n8n:**

### **Switch Node (Filtro):**
```javascript
// Rota 1: Processar fluxo
{{ $json.body.flow !== undefined && $json.body.flow.length > 0 }}

// Rota 2: Ignorar (não deve mais aparecer)
{{ $json.body.flow === undefined }}
```

### **Loop Node:**
```javascript
// Loop sobre o array flow
{{ $json.body.flow }}
```

### **Wait Node:**
```javascript
// Aguardar delay antes de cada mensagem
{{ $json.delay }} segundos
```

### **Switch por Tipo:**
```javascript
// Texto
{{ $json.type === "text" }}

// Imagem
{{ $json.type === "image" }}

// Áudio
{{ $json.type === "audio" }}

// Documento
{{ $json.type === "document" }}
```

## 📊 **Logs Esperados:**

### **No Console do Sistema:**
```
🚀 Iniciando processamento da campanha: Teste (campaign-id)
📋 Processando 1 contatos
📨 Enviando para João Silva (1/1)
🔗 Enviando webhook n8n para João Silva...
📦 Payload n8n: { "session": "message-flow-wiz", "number": "5511999999999", "flow": [...] }
✅ Webhook n8n enviado com sucesso para João Silva (200) via n8n-direct
✅ Campanha Teste processada com sucesso!
```

### **No n8n:**
- **1 execução** para 1 contato
- **3 execuções** para 3 contatos
- Cada execução processa o fluxo completo

## 🎯 **Resultado Esperado:**

### **Para 1 Contato:**
- ✅ 1 webhook recebido no n8n
- ✅ Fluxo processado sequencialmente
- ✅ Delays respeitados

### **Para Múltiplos Contatos:**
- ✅ 1 webhook por contato
- ✅ Processamento independente
- ✅ Não há interferência entre contatos

## 🚨 **Troubleshooting:**

### **Se não receber webhook:**
1. Verifique se a URL está correta
2. Verifique se o n8n está ativo
3. Verifique os logs do console

### **Se receber webhook antigo:**
1. Limpe o cache do navegador
2. Verifique se as alterações foram aplicadas
3. Reinicie o servidor se necessário

### **Se webhook não processar:**
1. Verifique o Switch Node no n8n
2. Verifique se o loop está configurado corretamente
3. Verifique os logs do n8n

## 🎉 **Sistema Funcionando:**

- ✅ **Webhook correto:** Formato n8n
- ✅ **Timing correto:** Só no processamento
- ✅ **Múltiplos contatos:** 1 webhook por contato
- ✅ **Fluxos complexos:** Suporte completo
- ✅ **Delays:** Configuráveis por mensagem




