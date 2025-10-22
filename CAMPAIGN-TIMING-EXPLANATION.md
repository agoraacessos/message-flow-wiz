# 🕐 Explicação do Sistema de Timing de Campanhas

## 📋 Como Funciona o Delay

### ⚡ Início Imediato vs Agendado

#### **Campanhas sem horário (Início Imediato):**
- ✅ **Status:** "Pendente" → "Enviando" → "Enviado"
- ✅ **Processamento:** Inicia imediatamente após criação
- ✅ **Timing:** Cada contato recebe em tempo aleatório desde o início

#### **Campanhas com horário (Agendadas):**
- ✅ **Status:** "Pendente" (aguarda horário) → "Enviando" → "Enviado"
- ✅ **Processamento:** Inicia no horário agendado
- ✅ **Timing:** Cada contato recebe em tempo aleatório desde o horário agendado

---

## 🎯 Exemplo Prático

### **Cenário:**
- **Campanha:** "Promoção Black Friday"
- **Contatos:** 5 pessoas
- **Delay:** 5s - 15s desde o início
- **Início:** 14:00:00

### **Timeline de Envio:**

```
14:00:00 - Início da campanha
14:00:07 - João recebe (delay: 7s)
14:00:12 - Maria recebe (delay: 12s)
14:00:05 - Pedro recebe (delay: 5s)
14:00:14 - Ana recebe (delay: 14s)
14:00:09 - Carlos recebe (delay: 9s)
```

### **Vantagens:**
- ✅ **Distribuição Natural:** Evita spam simultâneo
- ✅ **Menos Bloqueios:** Reduz chance de bloqueio por API
- ✅ **Experiência Melhor:** Clientes não recebem todos juntos
- ✅ **Controle Total:** Você define o intervalo

---

## 🔧 Configuração Recomendada

### **Para Pequenas Campanhas (1-50 contatos):**
- **Delay Mínimo:** 5 segundos
- **Delay Máximo:** 15 segundos
- **Resultado:** Envio em 5-15 minutos

### **Para Campanhas Médias (50-200 contatos):**
- **Delay Mínimo:** 10 segundos
- **Delay Máximo:** 30 segundos
- **Resultado:** Envio em 10-100 minutos

### **Para Campanhas Grandes (200+ contatos):**
- **Delay Mínimo:** 30 segundos
- **Delay Máximo:** 120 segundos
- **Resultado:** Envio em 1-4 horas

---

## 📊 Status das Campanhas

### **🕐 Pendente**
- Campanha criada, aguardando processamento
- Se agendada: aguarda horário
- Se imediata: será processada na próxima verificação

### **📤 Enviando**
- Campanha em processo de envio
- Contatos sendo processados com delays
- Não pode ser editada durante envio

### **✅ Enviado**
- Todos os contatos foram processados
- Campanha concluída com sucesso
- Timestamp de conclusão registrado

### **❌ Erro**
- Falha durante o processamento
- Mensagem de erro registrada
- Pode ser reeditada e reprocessada

---

## 🚀 Processamento Automático

### **Como Funciona:**
1. **Verificação Periódica:** Sistema verifica campanhas pendentes
2. **Filtro de Horário:** Só processa campanhas no horário ou sem agendamento
3. **Processamento Sequencial:** Uma campanha por vez
4. **Delays Calculados:** Cada contato tem seu tempo específico
5. **Webhooks:** Notificações enviadas para cada envio

### **Logs de Exemplo:**
```
[14:00:00] Processando campanha: Promoção Black Friday
[14:00:00] Início da campanha: 2024-10-21T14:00:00.000Z
[14:00:00] Enviando para 5 contatos
[14:00:05] Enviando para Pedro (1/5) - Delay: 5s desde o início
[14:00:07] Enviando para João (2/5) - Delay: 7s desde o início
[14:00:09] Enviando para Carlos (3/5) - Delay: 9s desde o início
[14:00:12] Enviando para Maria (4/5) - Delay: 12s desde o início
[14:00:14] Enviando para Ana (5/5) - Delay: 14s desde o início
[14:00:15] Campanha Promoção Black Friday processada com sucesso!
```

---

## 🔗 Integração com Webhooks

### **Payload Enviado:**
```json
{
  "contact_id": "uuid-do-contato",
  "contact_name": "João Silva",
  "contact_phone": "+5511999999999",
  "message_id": "uuid-da-mensagem",
  "message_title": "Promoção Black Friday",
  "message_content": "Olá {{nome}}! Confira nossa promoção...",
  "campaign_id": "uuid-da-campanha",
  "campaign_name": "Promoção Black Friday",
  "sent_at": "2024-10-21T14:00:07.000Z"
}
```

### **Uso no n8n:**
- ✅ **Trigger:** Webhook recebe dados do envio
- ✅ **Processamento:** Pode integrar com WhatsApp API, SMS, etc.
- ✅ **Logs:** Registrar cada envio individual
- ✅ **Analytics:** Coletar métricas de entrega

---

## ⚠️ Considerações Importantes

### **Limitações de API:**
- **WhatsApp Business:** ~1000 mensagens/dia (gratuito)
- **SMS:** Varia por provedor
- **Email:** Varia por provedor

### **Melhores Práticas:**
- ✅ **Teste Primeiro:** Sempre teste com poucos contatos
- ✅ **Delays Adequados:** Use delays maiores para campanhas grandes
- ✅ **Horários:** Evite horários de pico (12h-14h, 18h-20h)
- ✅ **Conteúdo:** Evite spam, use conteúdo relevante
- ✅ **Webhooks:** Configure para monitorar entregas

### **Monitoramento:**
- ✅ **Logs:** Acompanhe logs de processamento
- ✅ **Status:** Monitore status das campanhas
- ✅ **Erros:** Verifique mensagens de erro
- ✅ **Webhooks:** Confirme recebimento das notificações
