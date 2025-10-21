# Implementation Plan - WhatsApp Campaign Manager

## 🧱 Build Sequence (passo a passo no Lovable)

### ⚙️ Setup Inicial
- [x] Criar projeto na Lovable
- [x] Conectar banco Supabase via conector nativo
- [ ] Conectar n8n via Webhook block (para execução dos disparos)

### 👥 Upload e Organização de Contatos
- [ ] Adicionar formulário para upload de CSV
- [ ] Mapear campos: nome, número, tags (multi-tag select opcional)
- [ ] Inserir contatos no banco Supabase
- [ ] Criar visualização tipo tabela com filtros por tag

### 💬 Criação de Mensagens
- [ ] Adicionar formulário com campos: título, conteúdo
- [ ] Salvar mensagens no Supabase
- [ ] Exibir lista com mensagens reutilizáveis (cards ou dropdown)

### 📆 Criação de Campanha de Disparo
- [ ] Formulário com:
  - Lista de contatos (dropdown)
  - Mensagens (dropdown ou multiselect, se for sequência)
  - Data/hora do envio (agora ou futuro)
- [ ] Botão "Agendar Disparo" salva no Supabase com status "pendente"

### 🔁 Integração com n8n
- [ ] Criar Webhook no n8n para disparos
- [ ] Acionar o webhook via Lovable (na criação ou no agendamento)
- [ ] Workflow no n8n:
  - Buscar contatos + mensagens da campanha no Supabase
  - Enviar via Evolution API
  - Atualizar status da campanha no Supabase

### 🧾 Visualização de Status e Histórico
- [ ] Página com lista de campanhas
- [ ] Exibir status (pendente, enviado, erro)
- [ ] Mostrar resumo: quantos contatos, qual mensagem, data agendada

---

## 👥 Papéis e Rotinas Recomendadas

### Você (PM/QA)
- Testar com dados reais (upload → criar campanha → enviar)
- Simular erros para validar mensagens e feedbacks

### Montador no Lovable (você ou designer)
- Criar UI sem código, usando blocks visuais e lógica condicional
- Verificar usabilidade e clareza do fluxo

### n8n Developer (você ou parceiro)
- Criar automações robustas com fallback e controle de erros

**Ritual sugerido:**  
🧪 Teste completo periódico com usuários reais subindo listas e disparando mensagens.

---

## 🧩 Integrações & Stretch Goals

### Integrações Futuras
- Pipedrive (puxar contatos direto)
- Google Drive (importar CSVs)
- Twilio, Telegram, Email (expansão de canais)

### Stretch Goals
- Builder visual de fluxo de mensagens
- Reenvio automático (se falhar)
- Relatórios de abertura, entrega, erro
