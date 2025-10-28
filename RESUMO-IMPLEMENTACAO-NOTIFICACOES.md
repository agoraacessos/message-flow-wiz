# 📢 Resumo: Sistema de Notificações de Erro Implementado

## ✅ O que foi implementado:

### 1. **Componente de Diagnóstico de Campanhas** (`src/components/CampaignDiagnostic.tsx`)
- Detecta campanhas travadas há mais de 5 minutos
- Permite verificar manualmente campanhas travadas
- Permite resetar campanhas travadas com um clique
- Mostra tempo que a campanha está travada
- Interface visual com alertas e badges

### 2. **Monitoramento Automático** (`src/hooks/useCampaignMonitor.ts`)
- Monitora campanhas automaticamente a cada 2 minutos
- Detecta campanhas travadas há mais de 10 minutos
- Auto-reseta campanhas travadas há mais de 15 minutos
- Envia notificações automáticas via webhook quando detecta problemas
- Logs detalhados no console do navegador

### 3. **Serviço de Notificações** (`src/utils/campaignErrorNotifier.ts`)
- Envia notificações para webhook do n8n quando há erros
- Suporta diferentes tipos de erro:
  - **STUCK_CAMPAIGN**: Campanha travada
  - **PROCESSING_ERROR**: Erro durante processamento
- Formata mensagens para WhatsApp
- Inclui todos os dados relevantes (campanha, erro, metadata)

### 4. **Integração com n8n**
- Payload estruturado com todos os dados necessários
- Evento identificável: `CAMPAIGN_ERROR`
- Metadados incluem ação tomada e timestamp
- Documentação completa em `N8N-ERROR-NOTIFICATIONS-SETUP.md`

### 5. **Interface do Usuário**
- Componente de diagnóstico na página de campanhas
- Indicador visual mostrando que o monitor está ativo
- Botões para ação manual quando necessário
- Lista de campanhas travadas com detalhes

## 🎯 Como Funciona:

### Monitoramento Automático:
```
Cada 2 minutos → Verifica campanhas "sending"
  ├─ Travada > 10 min → Log no console + Notificação webhook
  └─ Travada > 15 min → Auto-reseta para "error" + Notificação webhook
```

### Notificações:
```
Erro Detectado
  ↓
CampaignErrorNotifier.notify()
  ↓
Busca dados da campanha
  ↓
Monta payload estruturado
  ↓
Envia para webhook_url da campanha
  ↓
n8n recebe e pode enviar WhatsApp/Email/etc
```

## 📋 Payload Enviado ao n8n:

```json
{
  "event": "CAMPAIGN_ERROR",
  "instance": "message-flow-wiz",
  "campaign": {
    "id": "...",
    "name": "Nome da Campanha",
    "status": "error",
    "error_message": "...",
    "created_at": "...",
    "updated_at": "..."
  },
  "error": {
    "type": "STUCK_CAMPAIGN",
    "message": "...",
    "timestamp": "...",
    "timeStuck": 20
  },
  "metadata": {
    "detected_at": "...",
    "action_taken": "auto-reset"
  }
}
```

## 🔧 Configuração Necessária:

### 1. No Sistema (já implementado):
- ✅ Monitor automático rodando
- ✅ Notificações sendo enviadas
- ✅ Interface de diagnóstico disponível

### 2. No n8n (você precisa configurar):
1. Criar workflow com Webhook
2. Configurar para receber POST com dados acima
3. Adicionar node para enviar WhatsApp/Email
4. Copiar URL do webhook
5. Colar URL no campo `webhook_url` das campanhas (opcional)

**Veja detalhes em:** `N8N-ERROR-NOTIFICATIONS-SETUP.md`

## 🚀 Como Usar:

### Para o Sistema Detectar Problemas Automaticamente:
- **Não precisa fazer nada!** O monitor já está ativo
- Verifique o console do navegador (F12) para ver logs
- Campanhas travadas >15 min serão resetadas automaticamente

### Para Receber Notificações no WhatsApp/Email:
1. Configure o webhook no n8n (veja guia)
2. Cole a URL nas campanhas (campo `webhook_url`)
3. Receberá notificações quando houver problemas

### Para Diagnosticar Manualmente:
1. Vá para página "Campanhas"
2. Clique em "Verificar Campanhas Travadas"
3. Veja quais estão travadas
4. Clique em "Resetar" se necessário

## 📊 Recursos Implementados:

✅ Detecção automática de campanhas travadas  
✅ Auto-reset após 15 minutos  
✅ Notificações via webhook  
✅ Interface de diagnóstico visual  
✅ Logs detalhados no console  
✅ Suporte a diferentes tipos de erro  
✅ Formatação de mensagens para WhatsApp  
✅ Documentação completa  

## 🎉 Benefícios:

1. **Não perde mais campanhas** - Sistema detecta e resolve automaticamente
2. **Recebe alertas imediatos** - Notificações no WhatsApp quando houver problema
3. **Interface clara** - Vê exatamente o que está acontecendo
4. **Ação manual disponível** - Pode resetar campanhas manualmente se quiser
5. **Logs completos** - Pode debugar problemas facilmente

## 📝 Próximos Passos Recomendados:

1. ✅ Monitor automático já está funcionando
2. ⏳ Configurar webhook no n8n (você precisa fazer)
3. ✅ Testar com campanhas travadas
4. ⏳ Ajustar intervalos de monitoramento se necessário

## 🔍 Como Testar:

1. **Testar detecção automática:**
   - Crie uma campanha que vai ficar travada
   - Observe o console (F12) - verá logs a cada 2 minutos
   - Após 15 minutos, será resetada automaticamente

2. **Testar notificações:**
   - Configure webhook no n8n
   - Adicione URL na campanha
   - Force um erro (ex: desative webhook temporariamente)
   - Verifique se notificação chegou

3. **Testar interface:**
   - Vá para página de campanhas
   - Clique em "Verificar Campanhas Travadas"
   - Veja a lista de campanhas travadas
   - Teste o botão "Resetar"
