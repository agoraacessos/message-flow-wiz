import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WebhookService } from '@/utils/webhookService';

// Função para substituir variáveis do sistema pelos valores reais do contato
function replaceSystemVariables(content: string, contact: any): string {
  if (!content || typeof content !== 'string') return content;
  
  // Mapeamento das variáveis do sistema
  const systemVariables: { [key: string]: string } = {
    '{{nome}}': contact.name || '',
    '{{name}}': contact.name || '',
    '{{telefone}}': contact.phone || '',
    '{{phone}}': contact.phone || '',
    '{{telefone2}}': contact.phone2 || '',
    '{{phone2}}': contact.phone2 || '',
    '{{telefone3}}': contact.phone3 || '',
    '{{phone3}}': contact.phone3 || '',
    '{{email}}': contact.email || '',
    '{{empresa}}': contact.company || '',
    '{{company}}': contact.company || '',
    '{{cargo}}': contact.position || '',
    '{{position}}': contact.position || '',
    '{{observacoes}}': contact.notes || '',
    '{{notes}}': contact.notes || '',
    '{{tags}}': Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
  };

  // Adicionar campos customizados
  if (contact.custom_fields && typeof contact.custom_fields === 'object') {
    Object.entries(contact.custom_fields).forEach(([key, value]) => {
      systemVariables[`{{${key}}}`] = String(value || '');
    });
  }

  // Substituir todas as variáveis
  let processedContent = content;
  Object.entries(systemVariables).forEach(([variable, value]) => {
    const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
    processedContent = processedContent.replace(regex, value);
  });

  return processedContent;
}

export function useCampaignProcessor() {
  const queryClient = useQueryClient();

  const processImmediateCampaign = useCallback(async (campaignId: string) => {
    try {
      console.log(`🚀 Processando campanha imediata: ${campaignId}`);
      
      // Verificar se a campanha ainda está pendente
      const { data: currentCampaign, error: checkError } = await supabase
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (checkError || !currentCampaign) {
        console.error('❌ Erro ao verificar status da campanha:', checkError);
        return;
      }

      if (currentCampaign.status !== 'pending') {
        console.log(`⏭️ Campanha ${campaignId} já está sendo processada ou foi processada`);
        return;
      }
      
      // Buscar dados completos da campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        console.error('❌ Erro ao buscar campanha:', campaignError);
        return;
      }

      // Atualizar status para "enviando" com timeout
      const updateResult = await Promise.race([
        supabase
          .from('campaigns')
          .update({ status: 'sending' })
          .eq('id', campaignId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao atualizar status')), 5000)
        )
      ]);

      if (updateResult.error) {
        throw new Error(`Erro ao atualizar status: ${updateResult.error.message}`);
      }

      // Buscar mensagem
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', campaign.message_id)
        .single();

      if (messageError || !message) {
        console.error('❌ Erro ao buscar mensagem:', messageError);
        await supabase
          .from('campaigns')
          .update({ 
            status: 'error',
            error_message: 'Mensagem não encontrada'
          })
          .eq('id', campaignId);
        return;
      }

      // Buscar contatos com TODOS os dados (incluindo campos customizados)
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          custom_fields
        `)
        .in('id', campaign.contact_ids || []);

      if (contactsError || !contacts || contacts.length === 0) {
        console.error('❌ Erro ao buscar contatos:', contactsError);
        await supabase
          .from('campaigns')
          .update({ 
            status: 'error',
            error_message: 'Contatos não encontrados'
          })
          .eq('id', campaignId);
        return;
      }

      console.log(`📋 Processando ${contacts.length} contatos`);

      console.log(`⏰ Início da campanha: ${new Date().toISOString()}`);

      // Processar cada contato com delay simples entre envios
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        try {
          // Gerar delay aleatório entre contatos (não desde o início)
          const delayBetweenContacts = Math.floor(
            Math.random() * (campaign.max_delay_between_clients - campaign.min_delay_between_clients + 1)
          ) + campaign.min_delay_between_clients;

          console.log(`📨 [${i + 1}/${contacts.length}] Processando contato: ${contact.name} (${contact.phone})`);

          // Simular envio (aqui você integraria com WhatsApp API, SMS, etc.)
          await new Promise(resolve => setTimeout(resolve, 1000));

        // Chamar webhook se configurado
        if (campaign.webhook_url) {
          try {
            console.log(`🔗 Enviando webhook para ${contact.name}...`);
            console.log(`📡 URL: ${campaign.webhook_url}`);
            
            // Processar variáveis do sistema no conteúdo da mensagem
            const processedMessageContent = replaceSystemVariables(message.content, contact);
            
            console.log(`🔄 Variáveis processadas para ${contact.name}:`);
            console.log(`   Original: ${message.content}`);
            console.log(`   Processado: ${processedMessageContent}`);

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
                  conversation: processedMessageContent
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
                content: processedMessageContent, // Conteúdo com variáveis processadas
                original_content: message.content, // Conteúdo original com variáveis
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
                contact_index: i + 1,
                total_contacts: contacts.length,
                delay_applied: delayBetweenContacts
              }
            };

            console.log(`📤 Enviando webhook para ${contact.name}...`);
            const webhookResult = await WebhookService.sendWebhook(campaign.webhook_url, webhookPayload);
            
            if (webhookResult.success) {
              console.log(`✅ Webhook enviado com sucesso para ${contact.name} (${webhookResult.status}) via ${webhookResult.method}`);
            } else {
              console.warn(`❌ Webhook falhou para ${contact.name}:`);
              console.warn(`   Erro: ${webhookResult.error}`);
              console.warn(`   Método: ${webhookResult.method}`);
              console.warn(`   URL: ${campaign.webhook_url}`);
            }
          } catch (webhookError) {
            console.warn(`❌ Erro de rede ao chamar webhook para ${contact.name}:`);
            console.warn(`   Erro: ${webhookError.message}`);
            console.warn(`   URL: ${campaign.webhook_url}`);
          }
        } else {
          console.log(`ℹ️ Nenhum webhook configurado para ${contact.name}`);
        }

          // Aguardar delay antes do próximo contato (exceto no último)
          if (i < contacts.length - 1) {
            console.log(`⏳ Aguardando ${delayBetweenContacts}s antes do próximo contato...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenContacts * 1000));
          }
          
          console.log(`✅ Contato ${i + 1}/${contacts.length} processado com sucesso: ${contact.name}`);
          
        } catch (contactError) {
          console.error(`❌ Erro ao processar contato ${i + 1}/${contacts.length} (${contact.name}):`, contactError);
          // Continuar com o próximo contato mesmo se este falhar
          continue;
        }
      }

      console.log(`🎉 Campanha concluída! Processados ${contacts.length} contatos.`);

      // Marcar como concluído com timeout
      const finalUpdate = await Promise.race([
        supabase
          .from('campaigns')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', campaignId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao finalizar campanha')), 10000)
        )
      ]);

      if (finalUpdate.error) {
        throw new Error(`Erro ao finalizar campanha: ${finalUpdate.error.message}`);
      }

      console.log(`✅ Campanha ${campaign.name} processada com sucesso!`);

      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

    } catch (error) {
      console.error(`❌ Erro ao processar campanha ${campaignId}:`, error);
      
      // Marcar como erro com timeout
      try {
        await Promise.race([
          supabase
            .from('campaigns')
            .update({ 
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido'
            })
            .eq('id', campaignId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao marcar erro')), 5000)
          )
        ]);
      } catch (updateError) {
        console.error('❌ Erro ao atualizar status de erro:', updateError);
      }

      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  }, [queryClient]);

  const checkAndProcessImmediateCampaigns = useCallback(async () => {
    try {
      // Buscar campanhas pendentes sem agendamento
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'pending')
        .is('scheduled_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar campanhas imediatas:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      console.log(`🔍 Encontradas ${campaigns.length} campanhas imediatas pendentes`);

      // Processar cada campanha
      for (const campaign of campaigns) {
        await processImmediateCampaign(campaign.id);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar campanhas imediatas:', error);
    }
  }, [processImmediateCampaign]);

  const checkAndProcessScheduledCampaigns = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const nowLocal = new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      console.log(`🕐 Verificando campanhas agendadas:`);
      console.log(`   Horário local (Brasília): ${nowLocal}`);
      console.log(`   Horário UTC: ${now}`);
      
      // Buscar TODAS as campanhas agendadas pendentes (para debug)
      const { data: allScheduledCampaigns, error: allError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'pending')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (allError) {
        console.error('❌ Erro ao buscar todas as campanhas agendadas:', allError);
        return;
      }

      if (allScheduledCampaigns && allScheduledCampaigns.length > 0) {
        console.log(`📋 Todas as campanhas agendadas pendentes:`);
        allScheduledCampaigns.forEach(campaign => {
          const scheduledTime = new Date(campaign.scheduled_at);
          const currentTime = new Date(now);
          const timeDiff = scheduledTime.getTime() - currentTime.getTime();
          const minutesDiff = Math.round(timeDiff / (1000 * 60));
          
          // Converter horário agendado para horário local para debug
          const scheduledLocal = scheduledTime.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          console.log(`   - ${campaign.name}:`);
          console.log(`     Agendada para (UTC): ${campaign.scheduled_at}`);
          console.log(`     Agendada para (Local): ${scheduledLocal}`);
          console.log(`     Horário atual (Local): ${nowLocal}`);
          console.log(`     Diferença: ${minutesDiff} minutos (${timeDiff > 0 ? 'ainda não chegou' : 'já passou'})`);
        });
      }

      // Buscar campanhas agendadas que devem ser executadas
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'pending')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar campanhas agendadas:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      console.log(`📅 Encontradas ${campaigns.length} campanhas agendadas para executar:`);
      campaigns.forEach(campaign => {
        console.log(`   - ${campaign.name}: agendada para ${campaign.scheduled_at}`);
      });

      // Processar cada campanha agendada
      for (const campaign of campaigns) {
        console.log(`🚀 Processando campanha agendada: ${campaign.name} (ID: ${campaign.id})`);
        await processImmediateCampaign(campaign.id);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar campanhas agendadas:', error);
    }
  }, [processImmediateCampaign]);

  // Verificar campanhas imediatas e agendadas a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndProcessImmediateCampaigns();
      checkAndProcessScheduledCampaigns();
    }, 5000);
    
    // Verificar imediatamente
    checkAndProcessImmediateCampaigns();
    checkAndProcessScheduledCampaigns();

    return () => clearInterval(interval);
  }, [checkAndProcessImmediateCampaigns, checkAndProcessScheduledCampaigns]);

  return {
    processImmediateCampaign,
    checkAndProcessImmediateCampaigns,
    checkAndProcessScheduledCampaigns
  };
}
