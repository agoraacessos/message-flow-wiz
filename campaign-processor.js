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
  
  // Se a campanha tem webhook, chamar
  if (campaign.webhook_url) {
    try {
      // Formato Evolution API - MESSAGES_UPSERT com TODOS os dados
      const webhookPayload = {
        event: "MESSAGES_UPSERT",
        instance: "message-flow-wiz",
        data: {
          key: {
            remoteJid: contact.phone.replace(/\D/g, '') + "@s.whatsapp.net",
            fromMe: true,
            id: `3EB0${Date.now()}${Math.random().toString(36).substr(2, 9)}`
          },
          message: {
            conversation: message.content
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          status: "PENDING",
          participant: contact.phone.replace(/\D/g, '') + "@s.whatsapp.net",
          pushName: contact.name,
          messageType: "conversation"
        },
        destination: contact.phone.replace(/\D/g, '') + "@s.whatsapp.net",
        date_time: new Date().toISOString(),
        // DADOS COMPLETOS DO CONTATO
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          phone2: contact.phone2 || null,
          phone3: contact.phone3 || null,
          email: contact.email || null,
          tags: contact.tags || [],
          company: contact.company || null,
          position: contact.position || null,
          notes: contact.notes || null,
          custom_fields: contact.custom_fields || {},
          created_at: contact.created_at,
          updated_at: contact.updated_at
        },
        // DADOS COMPLETOS DA MENSAGEM
        message: {
          id: message.id,
          title: message.title,
          content: message.content,
          type: message.type || 'text',
          media_url: message.media_url || null,
          variables: message.variables || [],
          created_at: message.created_at,
          updated_at: message.updated_at
        },
        // DADOS COMPLETOS DA CAMPANHA
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          scheduled_at: campaign.scheduled_at,
          min_delay_between_clients: campaign.min_delay_between_clients,
          max_delay_between_clients: campaign.max_delay_between_clients,
          webhook_url: campaign.webhook_url,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at
        },
        // METADADOS DO ENVIO
        metadata: {
          sent_at: new Date().toISOString(),
          total_contacts: campaign.contact_ids?.length || 0
        }
      };

      await fetch(campaign.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      console.log(`Webhook chamado para ${contact.name}`);
    } catch (webhookError) {
      console.warn(`Erro ao chamar webhook para ${contact.name}:`, webhookError);
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
