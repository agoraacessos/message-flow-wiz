import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      // Buscar contatos
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
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
        
        // Gerar delay aleatório entre contatos (não desde o início)
        const delayBetweenContacts = Math.floor(
          Math.random() * (campaign.max_delay_between_clients - campaign.min_delay_between_clients + 1)
        ) + campaign.min_delay_between_clients;

        console.log(`📨 Enviando para ${contact.name} (${i + 1}/${contacts.length})`);

        // Simular envio (aqui você integraria com WhatsApp API, SMS, etc.)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Chamar webhook se configurado
        if (campaign.webhook_url) {
          try {
            console.log(`🔗 Enviando webhook para ${contact.name}...`);
            console.log(`📡 URL: ${campaign.webhook_url}`);
            
            const webhookResponse = await fetch(campaign.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contact_id: contact.id,
                contact_name: contact.name,
                contact_phone: contact.phone,
                message_id: message.id,
                message_title: message.title,
                message_content: message.content,
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                sent_at: new Date().toISOString()
              })
            });
            
            if (webhookResponse.ok) {
              console.log(`✅ Webhook enviado com sucesso para ${contact.name} (${webhookResponse.status})`);
            } else {
              console.warn(`❌ Webhook falhou para ${contact.name}:`);
              console.warn(`   Status: ${webhookResponse.status} ${webhookResponse.statusText}`);
              console.warn(`   URL: ${campaign.webhook_url}`);
              
              // Tentar ler resposta de erro
              try {
                const errorText = await webhookResponse.text();
                console.warn(`   Resposta: ${errorText}`);
              } catch (e) {
                console.warn(`   Não foi possível ler resposta de erro`);
              }
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
      }

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

  // Verificar campanhas imediatas a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(checkAndProcessImmediateCampaigns, 5000);
    
    // Verificar imediatamente
    checkAndProcessImmediateCampaigns();

    return () => clearInterval(interval);
  }, [checkAndProcessImmediateCampaigns]);

  return {
    processImmediateCampaign,
    checkAndProcessImmediateCampaigns
  };
}
