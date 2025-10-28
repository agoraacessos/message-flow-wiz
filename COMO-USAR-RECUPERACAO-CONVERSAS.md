# 🎯 Sistema de Recuperação de Conversas - Como Funciona

## 📋 **Exemplo Prático: "teste123"**

### 1. **Configuração da Regra**
- **Nome:** "Cliente Interessado"
- **Texto de Ativação:** "teste123"
- **Tipo:** "Contém"
- **Timeout:** 30 minutos
- **Máx. Tentativas:** 3

### 2. **Sequência de Mensagens Configurada**

#### **Mensagem 1** (Enviada imediatamente)
- **Delay:** 0 minutos
- **Conteúdo:** "Olá! Vi que você tem interesse. Como posso ajudar?"

#### **Mensagem 2** (Se não responder em 30min)
- **Delay:** 30 minutos
- **Conteúdo:** "Oi! Você ainda tem interesse? Posso esclarecer suas dúvidas."

#### **Mensagem 3** (Se não responder em mais 30min)
- **Delay:** 30 minutos
- **Conteúdo:** "Última tentativa! Temos uma oferta especial hoje. Quer saber mais?"

### 3. **Fluxo de Execução**

```
Cliente digita "teste123"
         ↓
Sistema detecta a regra
         ↓
Envia Mensagem 1 IMEDIATAMENTE
         ↓
Aguarda 30 minutos
         ↓
Cliente respondeu? 
    ├─ SIM → Para o fluxo ✅
    └─ NÃO → Envia Mensagem 2
         ↓
Aguarda mais 30 minutos
         ↓
Cliente respondeu?
    ├─ SIM → Para o fluxo ✅
    └─ NÃO → Envia Mensagem 3
         ↓
Aguarda mais 30 minutos
         ↓
Cliente respondeu?
    ├─ SIM → Para o fluxo ✅
    └─ NÃO → Fluxo finalizado ❌
```

## 🔧 **Como Configurar**

### **Passo 1: Criar a Regra**
1. Acesse `/conversation-recovery`
2. Preencha o formulário:
   - Nome: "Cliente Interessado"
   - Texto: "teste123"
   - Timeout: 30
   - Tentativas: 3
3. Clique em "Criar Regra"

### **Passo 2: Configurar o Fluxo**
1. Clique no botão "Editar" da regra criada
2. Clique em "Configurar Sequência"
3. Adicione as mensagens:
   - **Mensagem 1:** Delay 0min
   - **Mensagem 2:** Delay 30min
   - **Mensagem 3:** Delay 30min
4. Clique em "Salvar Sequência"

### **Passo 3: Testar**
1. Simule uma mensagem WhatsApp com "teste123"
2. O sistema deve enviar a primeira mensagem
3. Aguarde 30 minutos
4. Se não responder, enviará a segunda mensagem

## 📱 **Integração com WhatsApp**

### **Webhook de Entrada**
```javascript
// Quando uma mensagem chega do WhatsApp
{
  "from": "5511999999999",
  "message": "teste123",
  "timestamp": "2024-01-21T10:00:00Z"
}
```

### **Processamento**
1. Sistema verifica se "teste123" ativa alguma regra
2. Se sim, cria uma conversa monitorada
3. Envia primeira mensagem imediatamente
4. Agenda próxima mensagem para 30 minutos depois

### **Webhook de Saída**
```javascript
// Mensagem enviada pelo sistema
{
  "to": "5511999999999",
  "message": "Olá! Vi que você tem interesse. Como posso ajudar?",
  "type": "recovery_flow",
  "rule_id": "uuid-da-regra",
  "step": 1
}
```

## ⚙️ **Configurações Avançadas**

### **Tipos de Ativação**
- **Contém:** "teste123" (qualquer lugar na mensagem)
- **Exato:** "teste123" (exatamente isso)
- **Começa com:** "teste" (mensagem começa com "teste")
- **Termina com:** "123" (mensagem termina com "123")
- **Regex:** `^teste\d+$` (padrão personalizado)

### **Timeouts Personalizados**
- **Mensagem 1:** 0 minutos (imediata)
- **Mensagem 2:** 15 minutos (urgente)
- **Mensagem 3:** 60 minutos (paciente)
- **Mensagem 4:** 120 minutos (última tentativa)

### **Webhooks Específicos**
Cada mensagem pode ter seu próprio webhook:
- **Mensagem 1:** `https://webhook1.com/send`
- **Mensagem 2:** `https://webhook2.com/send`
- **Mensagem 3:** `https://webhook3.com/send`

## 📊 **Monitoramento**

### **Status das Conversas**
- **waiting_response:** Aguardando resposta do cliente
- **sending_message:** Enviando próxima mensagem
- **completed:** Cliente respondeu, fluxo finalizado
- **failed:** Erro no envio
- **cancelled:** Fluxo cancelado manualmente

### **Logs de Atividade**
- `rule_triggered`: Regra foi ativada
- `message_sent`: Mensagem foi enviada
- `response_received`: Cliente respondeu
- `timeout_reached`: Timeout atingido
- `flow_completed`: Fluxo finalizado
- `flow_failed`: Erro no fluxo

## 🎯 **Casos de Uso**

### **1. Cliente Interessado**
- **Trigger:** "interessado", "quero saber", "me interessa"
- **Fluxo:** Mensagem imediata → Follow-up em 30min → Oferta especial em 1h

### **2. Cliente Indeciso**
- **Trigger:** "não sei", "talvez", "pensando"
- **Fluxo:** Esclarecimento imediato → Benefícios em 45min → Testemunho em 2h

### **3. Cliente Negativo**
- **Trigger:** "não quero", "não preciso", "caro demais"
- **Fluxo:** Entendimento imediato → Objeções em 1h → Última chance em 1 dia

### **4. Cliente Pergunta Preço**
- **Trigger:** "quanto custa", "qual o preço", "valor"
- **Fluxo:** Preço imediato → Benefícios em 15min → Desconto em 1h

## 🚀 **Próximos Passos**

1. **Execute o script SQL** no Supabase
2. **Configure suas regras** na interface
3. **Teste com mensagens** reais
4. **Monitore os logs** para ajustar
5. **Otimize os timeouts** baseado nos resultados

---

**💡 Dica:** Comece com regras simples e timeouts curtos para testar. Depois ajuste baseado no comportamento real dos seus clientes!
