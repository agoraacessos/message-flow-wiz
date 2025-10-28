import { supabase } from '@/integrations/supabase/client';

export interface CampaignErrorPayload {
  event: 'CAMPAIGN_ERROR';
  instance: string;
  campaign: {
    id: string;
    name: string;
    status: string;
    error_message?: string;
    created_at: string;
    updated_at: string;
  };
  error: {
    type: string;
    message: string;
    timestamp: string;
    timeStuck?: number; // minutos que estava travada
  };
  metadata: {
    detected_at: string;
    action_taken: string;
  };
}

export class CampaignErrorNotifier {
  /**
   * Notifica sobre uma campanha travada ou com erro
   */
  static async notifyCampaignStuck(
    campaignId: string,
    webhookUrl?: string,
    timeStuck?: number
  ): Promise<void> {
    try {
      // Buscar dados da campanha
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        console.error('❌ Erro ao buscar campanha para notificação:', error);
        return;
      }

      const payload: CampaignErrorPayload = {
        event: 'CAMPAIGN_ERROR',
        instance: 'message-flow-wiz',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          error_message: campaign.error_message || 'Campanha travada no status "enviando"',
          created_at: campaign.created_at,
          updated_at: campaign.updated_at
        },
        error: {
          type: 'STUCK_CAMPAIGN',
          message: `Campanha "${campaign.name}" está travada há ${timeStuck || 'desconhecido'} minutos`,
          timestamp: new Date().toISOString(),
          timeStuck: timeStuck
        },
        metadata: {
          detected_at: new Date().toISOString(),
          action_taken: timeStuck && timeStuck > 15 ? 'auto-reset' : 'monitoring'
        }
      };

      // Se tem webhook configurado, enviar notificação
      if (webhookUrl) {
        await this.sendErrorNotification(webhookUrl, payload);
      }

      console.log('📢 Notificação de erro de campanha enviada:', campaign.name);
    } catch (error) {
      console.error('❌ Erro ao notificar sobre campanha travada:', error);
    }
  }

  /**
   * Notifica sobre erro durante o processamento
   */
  static async notifyProcessingError(
    campaignId: string,
    errorMessage: string,
    webhookUrl?: string
  ): Promise<void> {
    try {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (!campaign) return;

      const payload: CampaignErrorPayload = {
        event: 'CAMPAIGN_ERROR',
        instance: 'message-flow-wiz',
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          error_message: errorMessage,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at
        },
        error: {
          type: 'PROCESSING_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        },
        metadata: {
          detected_at: new Date().toISOString(),
          action_taken: 'status_updated_to_error'
        }
      };

      if (webhookUrl) {
        await this.sendErrorNotification(webhookUrl, payload);
      }

      console.log('📢 Notificação de erro de processamento enviada:', campaign.name);
    } catch (error) {
      console.error('❌ Erro ao notificar sobre erro de processamento:', error);
    }
  }

  /**
   * Envia notificação de erro via webhook
   */
  private static async sendErrorNotification(
    webhookUrl: string,
    payload: CampaignErrorPayload
  ): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('⚠️ Webhook de erro retornou status:', response.status);
      } else {
        console.log('✅ Notificação de erro enviada com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de erro:', error);
    }
  }

  /**
   * Formata mensagem de erro para WhatsApp (via n8n)
   */
  static formatErrorMessageForWhatsApp(payload: CampaignErrorPayload): string {
    const { campaign, error, metadata } = payload;
    
    let message = `⚠️ *ERRO NA CAMPANHA*\n\n`;
    message += `📋 *Campanha:* ${campaign.name}\n`;
    message += `🆔 *ID:* ${campaign.id}\n`;
    message += `📊 *Status:* ${campaign.status}\n\n`;
    
    if (error.timeStuck) {
      message += `⏱️ *Tempo travada:* ${error.timeStuck} minutos\n`;
    }
    
    message += `❌ *Erro:* ${error.message}\n\n`;
    
    if (campaign.error_message) {
      message += `📝 *Detalhes:* ${campaign.error_message}\n\n`;
    }
    
    message += `⏰ *Detectado em:* ${new Date(metadata.detected_at).toLocaleString('pt-BR')}\n`;
    message += `🔧 *Ação:* ${metadata.action_taken === 'auto-reset' ? 'Campanha resetada automaticamente' : 'Monitorando'}\n`;
    
    return message;
  }
}
