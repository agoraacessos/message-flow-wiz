# 🎯 FLUXO VISUAL - Sistema de Recuperação de Conversas

## 📱 **Cenário: Cliente digita "teste123"**

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHATSAPP - CONVERSATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cliente: teste123                                              │
│  ⏰ 10:00:00                                                    │
│                                                                 │
│  🤖 Sistema: Olá! Vi que você tem interesse. Como posso ajudar? │
│  ⏰ 10:00:01 (ENVIADO IMEDIATAMENTE)                           │
│                                                                 │
│  ⏳ Aguardando resposta... (30 minutos)                        │
│                                                                 │
│  🤖 Sistema: Oi! Você ainda tem interesse? Posso esclarecer     │
│              suas dúvidas.                                     │
│  ⏰ 10:30:01 (ENVIADO APÓS 30 MIN)                            │
│                                                                 │
│  ⏳ Aguardando resposta... (30 minutos)                        │
│                                                                 │
│  🤖 Sistema: Última tentativa! Temos uma oferta especial hoje. │
│              Quer saber mais?                                  │
│  ⏰ 11:00:01 (ENVIADO APÓS 60 MIN TOTAL)                      │
│                                                                 │
│  ⏳ Aguardando resposta... (30 minutos)                        │
│                                                                 │
│  ❌ FLUXO FINALIZADO - Máximo de tentativas atingido           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 **Cenário: Cliente responde após a primeira mensagem**

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHATSAPP - CONVERSATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cliente: teste123                                              │
│  ⏰ 10:00:00                                                    │
│                                                                 │
│  🤖 Sistema: Olá! Vi que você tem interesse. Como posso ajudar?│
│  ⏰ 10:00:01 (ENVIADO IMEDIATAMENTE)                           │
│                                                                 │
│  Cliente: Sim, quero saber mais sobre o produto!              │
│  ⏰ 10:05:00 (RESPOSTA RECEBIDA)                               │
│                                                                 │
│  ✅ FLUXO FINALIZADO - Cliente respondeu!                      │
│     (Não envia mais mensagens automáticas)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## ⚙️ **Configuração no Sistema**

### **1. Criar Regra**
```
Nome: Cliente Interessado
Texto: teste123
Tipo: Contém
Timeout: 30 minutos
Tentativas: 3
```

### **2. Configurar Sequência**
```
Mensagem 1: "Olá! Vi que você tem interesse. Como posso ajudar?"
Delay: 0 minutos (imediata)

Mensagem 2: "Oi! Você ainda tem interesse? Posso esclarecer suas dúvidas."
Delay: 30 minutos

Mensagem 3: "Última tentativa! Temos uma oferta especial hoje. Quer saber mais?"
Delay: 30 minutos
```

## 📊 **Estados do Sistema**

### **Estado: waiting_response**
```
Cliente digitou "teste123"
↓
Sistema enviou primeira mensagem
↓
Aguardando resposta do cliente...
```

### **Estado: sending_message**
```
Timeout atingido (30 min)
↓
Sistema preparando próxima mensagem
↓
Enviando mensagem...
```

### **Estado: completed**
```
Cliente respondeu!
↓
Fluxo finalizado com sucesso
↓
Não envia mais mensagens automáticas
```

### **Estado: failed**
```
Erro ao enviar mensagem
↓
Fluxo marcado como falha
↓
Log de erro criado
```

## 🎯 **Casos de Uso Reais**

### **Caso 1: Cliente Interessado**
```
Trigger: "interessado", "quero saber", "me interessa"
Fluxo:
1. "Olá! Vi que você tem interesse. Como posso ajudar?" (0min)
2. "Oi! Você ainda tem interesse? Posso esclarecer suas dúvidas." (30min)
3. "Última tentativa! Temos uma oferta especial hoje. Quer saber mais?" (60min)
```

### **Caso 2: Cliente Pergunta Preço**
```
Trigger: "quanto custa", "qual o preço", "valor"
Fluxo:
1. "O preço é R$ 299,00. Posso explicar o que está incluído!" (0min)
2. "Quer saber sobre nossos benefícios exclusivos?" (15min)
3. "Temos um desconto especial hoje. Quer aproveitar?" (60min)
```

### **Caso 3: Cliente Indeciso**
```
Trigger: "não sei", "talvez", "pensando"
Fluxo:
1. "Entendo sua indecisão. Posso esclarecer suas dúvidas!" (0min)
2. "Veja os benefícios que nossos clientes têm relatado..." (45min)
3. "Que tal uma conversa rápida para esclarecer tudo?" (2h)
```

## 🔧 **Configurações Avançadas**

### **Timeouts Personalizados**
```
Mensagem 1: 0 minutos (imediata)
Mensagem 2: 15 minutos (urgente)
Mensagem 3: 60 minutos (paciente)
Mensagem 4: 120 minutos (última chance)
```

### **Webhooks Específicos**
```
Mensagem 1: https://webhook1.com/send
Mensagem 2: https://webhook2.com/send
Mensagem 3: https://webhook3.com/send
```

### **Tipos de Ativação**
```
Contém: "teste123" (qualquer lugar)
Exato: "teste123" (exatamente isso)
Começa com: "teste" (mensagem começa com "teste")
Termina com: "123" (mensagem termina com "123")
Regex: ^teste\d+$ (padrão personalizado)
```

## 📈 **Monitoramento e Logs**

### **Log de Ativação**
```
[10:00:00] rule_triggered: Cliente "5511999999999" digitou "teste123"
[10:00:01] message_sent: Mensagem 1 enviada com sucesso
[10:30:01] timeout_reached: Cliente não respondeu em 30min
[10:30:02] message_sent: Mensagem 2 enviada com sucesso
[11:00:01] timeout_reached: Cliente não respondeu em 30min
[11:00:02] message_sent: Mensagem 3 enviada com sucesso
[11:30:01] flow_completed: Fluxo finalizado - máximo de tentativas
```

### **Log de Sucesso**
```
[10:00:00] rule_triggered: Cliente "5511999999999" digitou "teste123"
[10:00:01] message_sent: Mensagem 1 enviada com sucesso
[10:05:00] response_received: Cliente respondeu "Sim, quero saber mais!"
[10:05:01] flow_completed: Fluxo finalizado - cliente respondeu
```

## 🚀 **Próximos Passos**

1. **Execute o script SQL** no Supabase
2. **Configure suas regras** na interface
3. **Teste com mensagens** reais
4. **Monitore os logs** para ajustar
5. **Otimize os timeouts** baseado nos resultados

---

**💡 Dica:** Comece com regras simples e timeouts curtos para testar. Depois ajuste baseado no comportamento real dos seus clientes!
