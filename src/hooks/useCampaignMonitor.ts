import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignErrorNotifier } from '@/utils/campaignErrorNotifier';
import { N8nCallbackService } from '@/utils/n8nCallbackService';

export function useCampaignMonitor() {
  const checkForStuckCampaigns = useCallback(async () => {
    try {
      // Buscar TODAS as campanhas "sending" (sem filtro de tempo)
      const { data: sendingCampaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'sending')
        .order('updated_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao verificar campanhas travadas:', error);
        return;
      }

      if (!sendingCampaigns || sendingCampaigns.length === 0) {
        return;
      }

      console.log(`🔍 Verificando ${sendingCampaigns.length} campanha(s) em envio...`);

      // Verificar cada campanha individualmente com timeout inteligente
      for (const campaign of sendingCampaigns) {
        await checkIndividualCampaign(campaign);
      }
    } catch (error) {
      console.error('❌ Erro no monitoramento:', error);
    }
  }, []);

  const checkIndividualCampaign = useCallback(async (campaign: any) => {
    try {
      const now = new Date();
      const lastUpdate = new Date(campaign.updated_at);
      const timeSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60)); // minutos

      // Calcular timeout inteligente baseado no tipo de campanha
      const smartTimeout = N8nCallbackService.calculateSmartTimeout(campaign);
      
      console.log(`📊 Campanha "${campaign.name}": ${timeSinceUpdate}min desde última atualização (timeout: ${smartTimeout}min)`);

      // Se tem verificação agendada pelo n8n, aguardar
      if (N8nCallbackService.isScheduledForCheck(campaign.id)) {
        console.log(`⏰ Campanha "${campaign.name}" tem verificação agendada pelo n8n - aguardando...`);
        return;
      }

      // Se ainda não atingiu o timeout inteligente, aguardar
      if (timeSinceUpdate < smartTimeout) {
        console.log(`✅ Campanha "${campaign.name}" ainda dentro do prazo (${timeSinceUpdate}/${smartTimeout}min)`);
        return;
      }

      // Se atingiu timeout, verificar se é realmente travada
      console.warn(`⚠️ Campanha "${campaign.name}" atingiu timeout (${timeSinceUpdate}/${smartTimeout}min)`);

      // Enviar notificação de possível travamento
      await CampaignErrorNotifier.notifyCampaignStuck(
        campaign.id,
        campaign.webhook_url,
        timeSinceUpdate
      );

      // Se passou muito do timeout (2x), considerar travada
      if (timeSinceUpdate >= (smartTimeout * 2)) {
        console.error(`🚨 Campanha "${campaign.name}" muito travada (${timeSinceUpdate}min) - marcando como erro`);
        
        await supabase
          .from('campaigns')
          .update({ 
            status: 'error',
            error_message: `Campanha travada há ${timeSinceUpdate} minutos (timeout: ${smartTimeout}min)`,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        // Remover da lista de verificações agendadas
        N8nCallbackService.removeScheduledCheck(campaign.id);
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar campanha ${campaign.name}:`, error);
    }
  }, []);

  useEffect(() => {
    // Verificar a cada 2 minutos
    const interval = setInterval(checkForStuckCampaigns, 2 * 60 * 1000);
    
    // Verificar imediatamente
    checkForStuckCampaigns();

    console.log('🔍 Monitor de campanhas iniciado (verifica a cada 2 minutos)');

    return () => {
      clearInterval(interval);
      console.log('🔍 Monitor de campanhas parado');
    };
  }, [checkForStuckCampaigns]);

  return { checkForStuckCampaigns };
}
