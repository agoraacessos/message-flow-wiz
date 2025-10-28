// Script para processar campanhas pendentes
// Este script deve ser executado periodicamente (cron job ou similar)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para gerar delay aleatório entre min e max
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para processar uma campanha
async function processCampaign(campaign) {
  console.log(`Processando campanha: ${campaign.name}`);
  
  try {
    // Atualizar status para "enviando"
    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id);

    // Buscar a mensagem
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', campaign.message_id)
      .single();

    if (messageError) {
      throw new Error(`Erro ao buscar mensagem: ${messageError.message}`);
    }

    // Buscar contatos
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', campaign.contact_ids);

    if (contactsError) {
      throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
    }

    console.log(`Enviando para ${contacts.length} contatos`);

    // Marcar início da campanha
    const campaignStartTime = new Date();
    console.log(`Início da campanha: ${campaignStartTime.toISOString()}`);

    // Processar cada contato com delay a partir do início
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Gerar delay aleatório a partir do início do disparo
      const delayFromStart = getRandomDelay(
        campaign.min_delay_between_clients || 5,
        campaign.max_delay_between_clients || 15
      );

      // Calcular quando este contato deve receber a mensagem
      const sendTime = new Date(campaignStartTime.getTime() + (delayFromStart * 1000));
      const now = new Date();
      
      // Se o tempo de envio já passou, enviar imediatamente
      // Se não, aguardar até o momento correto
      if (sendTime > now) {
        const waitTime = sendTime.getTime() - now.getTime();
        console.log(`Aguardando ${Math.round(waitTime / 1000)} segundos para enviar para ${contact.name}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log(`Enviando para ${contact.name} (${i + 1}/${contacts.length}) - Delay: ${delayFromStart}s desde o início`);
      
      // Aqui você implementaria a lógica de envio real
      // Por exemplo, integração com WhatsApp API, SMS, etc.
      await sendMessageToContact(contact, message, campaign);
    }

    // Atualizar status para "enviado"
    await supabase
      .from('campaigns')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign.id);

    console.log(`Campanha ${campaign.name} processada com sucesso!`);

  } catch (error) {
    console.error(`Erro ao processar campanha ${campaign.name}:`, error);
    
    // Atualizar status para "erro"
    await supabase
      .from('campaigns')
      .update({ 
        status: 'error',
        error_message: error.message
      })
      .eq('id', campaign.id);
  }
}

// Função para enviar mensagem para um contato
async function sendMessageToContact(contact, message, campaign) {
  // Aqui você implementaria a lógica real de envio
  // Por exemplo:
  // - Integração com WhatsApp Business API
  // - Integração com SMS
  // - Integração com email
  // - Webhook para n8n
  
  console.log(`Enviando mensagem para ${contact.name} (${contact.phone}):`);
  console.log(`Título: ${message.title}`);
  console.log(`Conteúdo: ${message.content}`);
  
  // Simular envio (remover em produção)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Se a campanha tem webhook, chamar no formato n8n
  if (campaign.webhook_url) {
    try {
      // Converter fluxo de mensagem para formato n8n
      let n8nFlow = [];
      
      try {
        // Tentar parsear como JSON (fluxo estruturado)
        const flowContent = JSON.parse(message.content);
        
        if (Array.isArray(flowContent)) {
          n8nFlow = flowContent.map((block, index) => {
            // Mapear tipos do sistema para tipos n8n
            let n8nType;
            
            switch (block.type) {
              case 'text':
                n8nType = 'text';
                break;
              case 'image':
                n8nType = 'image';
                break;
              case 'file':
                n8nType = 'document';
                break;
              case 'audio':
                n8nType = 'audio';
                break;
              case 'link':
                n8nType = 'text';
                break;
              default:
                n8nType = 'text';
            }

            return {
              type: n8nType,
              content: block.type === 'audio' ? block.content : block.content, // Para áudio, usar content (URL)
              caption: block.metadata?.alt || block.metadata?.filename || undefined,
              delay: block.delay || (index === 0 ? 0 : 5)
            };
          });
        }
      } catch (error) {
        // Se não conseguir parsear como JSON, tratar como mensagem simples
        n8nFlow = [{
          type: 'text',
          content: message.content,
          delay: 0
        }];
      }

      // Formatar número de telefone para n8n
      const cleanPhone = contact.phone.replace(/\D/g, '');
      let formattedPhone = cleanPhone;
      
      if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
        formattedPhone = '55' + cleanPhone;
      } else if (cleanPhone.length >= 12) {
        formattedPhone = cleanPhone;
      } else if (cleanPhone.length === 10) {
        formattedPhone = '55' + cleanPhone;
      }

      // Payload no formato n8n
      const n8nPayload = {
        session: 'message-flow-wiz',
        number: formattedPhone,
        flow: n8nFlow
      };

      console.log(`Enviando webhook n8n para ${contact.name}:`, JSON.stringify(n8nPayload, null, 2));

      await fetch(campaign.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload)
      });
      console.log(`Webhook n8n chamado para ${contact.name}`);
    } catch (webhookError) {
      console.warn(`Erro ao chamar webhook n8n para ${contact.name}:`, webhookError);
    }
  }
}

// Função principal para processar campanhas pendentes
async function processPendingCampaigns() {
  console.log('Verificando campanhas pendentes...');
  
  const now = new Date().toISOString();
  
  // Buscar campanhas que devem ser processadas
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'pending')
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar campanhas:', error);
    return;
  }

  if (campaigns.length === 0) {
    console.log('Nenhuma campanha pendente encontrada.');
    return;
  }

  console.log(`Encontradas ${campaigns.length} campanhas para processar.`);

  // Processar cada campanha
  for (const campaign of campaigns) {
    await processCampaign(campaign);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  processPendingCampaigns()
    .then(() => {
      console.log('Processamento de campanhas concluído.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro no processamento:', error);
      process.exit(1);
    });
}

export { processPendingCampaigns, processCampaign };
