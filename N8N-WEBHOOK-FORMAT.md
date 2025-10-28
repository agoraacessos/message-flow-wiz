# 🚀 Formato de Webhook para n8n - Message Flow Wiz

## 📋 Visão Geral

O sistema agora envia webhooks no formato específico para n8n, seguindo exatamente as especificações fornecidas. Cada campanha envia **um único webhook por destinatário** contendo todo o fluxo de mensagens.

## 🎯 Como Funciona

### 1. **Disparo Único por Destinatário**
- ✅ **NÃO** é um webhook por mensagem
- ✅ **É** um único webhook por execução de fluxo por destinatário
- ✅ Cada contato recebe um webhook com o fluxo completo

### 2. **Formato do Payload**

```json
{
  "session": "message-flow-wiz",
  "number": "5531999999999",
  "flow": [
    { "type": "text", "content": "Olá! Tudo bem?", "delay": 0 },
    { "type": "image", "content": "https://cdn.meusite.com/imagem1.jpg", "caption": "Olha essa promoção!", "delay": 5 },
    { "type": "text", "content": "Gostou? 😄", "delay": 10 },
    { "type": "audio", "content": "https://cdn.meusite.com/audio.mp3", "delay": 15 }
  ]
}
```

### 3. **Parâmetros Detalhados**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `session` | string | ✅ | Nome/ID da sessão Evolution (ex: "message-flow-wiz") |
| `number` | string | ✅ | Número de destino (com DDI, DDD e sem +, ex: 5531999999999) |
| `flow` | array | ✅ | Lista de etapas do fluxo que o cliente criou |
| `flow[].type` | string | ✅ | Tipo da mensagem (text, image, audio, video, document) |
| `flow[].content` | string | ✅ | Conteúdo da mensagem (texto puro ou URL do arquivo) |
| `flow[].caption` | string | ❌ | Legenda opcional (usada para mídia) |
| `flow[].delay` | number | ✅ | Tempo (em segundos) que o sistema deve aguardar antes do envio dessa etapa em relação à anterior |

## 🔄 Mapeamento de Tipos

### **Sistema → n8n**
- `text` → `text`
- `image` → `image`
- `file` → `document`
- `audio` → `audio`
- `link` → `text` (tratado como texto com URL)

## 📱 Formatação de Números

### **Regras de Formatação:**
- Remove todos os caracteres não numéricos
- Se tem 11 dígitos e começa com 11: adiciona DDI 55
- Se tem 10 dígitos: adiciona DDI 55
- Se já tem 12+ dígitos: mantém como está

### **Exemplos:**
- `(11) 99999-9999` → `5511999999999`
- `+55 11 99999-9999` → `5511999999999`
- `11999999999` → `5511999999999`

## ⏱️ Lógica de Delays

### **Como Funciona:**
1. **Primeira mensagem:** `delay: 0` (envio imediato)
2. **Mensagens subsequentes:** delay em relação à anterior
3. **n8n controla:** O sistema não controla delays - responsabilidade do n8n

### **Exemplo de Timeline:**
```
T+0s:  "Olá! Tudo bem?" (delay: 0)
T+5s:  Imagem com legenda (delay: 5)
T+15s: "Gostou? 😄" (delay: 10)
T+30s: Áudio (delay: 15)
```

## 🧠 Fluxo Completo

### **1. Cliente monta fluxo (front-end)**
- Cria sequência de mensagens com delays
- Salva no banco como JSON

### **2. Sistema salva fluxo**
- Armazena no campo `content` da tabela `messages`
- Formato JSON com array de blocos

### **3. Usuário confirma envio**
- Clica em "Iniciar disparo" ou "Enviar campanha"
- Sistema processa cada destinatário

### **4. Para cada destinatário:**
- Sistema envia **um único webhook** com payload completo
- n8n recebe e processa o fluxo inteiro
- Cada fluxo é processado independentemente

## 🔧 Configuração no n8n

### **Webhook Node:**
- **HTTP Method:** POST
- **Response:** Immediately
- **CORS:** Permitir origem do sistema

### **Workflow Sugerido:**
1. **Webhook Trigger** - recebe payload
2. **Loop** - para cada item do array `flow`
3. **Wait** - aguarda `delay` especificado
4. **HTTP Request** - chama Evolution API
   - `/message/sendText` para `text`
   - `/message/sendMedia` para `image`, `audio`, `video`, `document`

## 📦 Exemplo Completo

### **Fluxo no Sistema:**
```json
[
  {
    "id": "1",
    "type": "text",
    "content": "Olá {{nome}}! Tudo bem?",
    "delay": 0
  },
  {
    "id": "2", 
    "type": "image",
    "content": "https://cdn.exemplo.com/promocao.jpg",
    "metadata": {
      "alt": "Promoção especial!"
    },
    "delay": 8
  },
  {
    "id": "3",
    "type": "text", 
    "content": "Quer saber mais? 😄",
    "delay": 12
  }
]
```

### **Payload Enviado para n8n:**
```json
{
  "session": "message-flow-wiz",
  "number": "5511999999999",
  "flow": [
    {
      "type": "text",
      "content": "Olá {{nome}}! Tudo bem?",
      "delay": 0
    },
    {
      "type": "image", 
      "content": "https://cdn.exemplo.com/promocao.jpg",
      "caption": "Promoção especial!",
      "delay": 8
    },
    {
      "type": "text",
      "content": "Quer saber mais? 😄", 
      "delay": 12
    }
  ]
}
```

## 🚀 Vantagens do Novo Sistema

### **✅ Para o Sistema:**
- Envio simples e direto
- Não precisa controlar delays
- Menos complexidade de código
- Melhor performance

### **✅ Para o n8n:**
- Controle total sobre timing
- Processamento independente por destinatário
- Flexibilidade para lógicas complexas
- Melhor tratamento de erros

### **✅ Para o Usuário:**
- Fluxos mais confiáveis
- Melhor controle de timing
- Processamento paralelo
- Logs detalhados no n8n

## 🔍 Teste do Sistema

### **URL de Teste:**
Use `https://webhook.site` para testar o formato antes de configurar no n8n.

### **Comando cURL:**
```bash
curl -X POST https://seu-n8n.com/webhook/enviarFluxo \
  -H "Content-Type: application/json" \
  -d '{
    "session": "message-flow-wiz",
    "number": "5531999999999",
    "flow": [
      { "type": "text", "content": "Olá, tudo bem?", "delay": 0 },
      { "type": "image", "content": "https://cdn.meusite.com/oferta.jpg", "caption": "Oferta de hoje!", "delay": 8 },
      { "type": "text", "content": "Quer saber mais? 😄", "delay": 12 }
    ]
  }'
```

## 📝 Observações Importantes

### **Múltiplos Destinatários:**
- Se forem 200 contatos, o sistema envia **200 requisições separadas**
- Cada execução é independente no n8n
- Delays e mensagens não se misturam entre destinatários

### **Tratamento de Erros:**
- Sistema não controla falhas individuais
- n8n deve implementar retry e fallback
- Logs de erro ficam no n8n

### **Variáveis:**
- Variáveis como `{{nome}}` são enviadas como estão
- n8n deve fazer a substituição usando dados do contato
- Sistema não processa variáveis antes do envio

