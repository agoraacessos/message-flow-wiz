import { supabase } from '@/integrations/supabase/client';

export interface N8nCallbackPayload {
  event: 'N8N_CALLBACK';
  instance: string;
  campaign_id: string;
  callback_type: 'ERROR_CONFIRMED' | 'PROCESSING_NORMAL' | 'CUSTOM_DELAY';
  message: string;
  data?: {
    estimated_completion_time?: string; // ISO string
    custom_delay_minutes?: number;
    additional_info?: any;
  };
  timestamp: string;
}

export interface CampaignTimeoutConfig {
  id: string;
  name: string;
  default_timeout_minutes: number;
  custom_timeout_minutes?: number;
  timeout_type: 'FIXED' | 'DYNAMIC' | 'CUSTOM';
  last_callback?: string;
  callback_status?: 'WAITING' | 'CONFIRMED' | 'ERROR';
}

export class N8nCallbackService {
  /**
   * Processa callback do n8n sobre status da campanha
   */
  static async processCallback(payload: N8nCallbackPayload): Promise<void> {
    try {
      console.log('📞 Processando callback do n8n:', payload);

      const { campaign_id, callback_type, message, data } = payload;

      // Buscar campanha
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaign_id)
        .single();

      if (error || !campaign) {
        console.error('❌ Erro ao buscar campanha para callback:', error);
        return;
      }

      switch (callback_type) {
        case 'ERROR_CONFIRMED':
          await this.handleErrorConfirmed(campaign, message, data);
          break;
        
        case 'PROCESSING_NORMAL':
          await this.handleProcessingNormal(campaign, message, data);
          break;
        
        case 'CUSTOM_DELAY':
          await this.handleCustomDelay(campaign, message, data);
          break;
      }

      // Atualizar timestamp do último callback
      await supabase
        .from('campaigns')
        .update({ 
          updated_at: new Date().toISOString(),
          error_message: `Callback ${callback_type}: ${message}`
        })
        .eq('id', campaign_id);

      console.log(`✅ Callback processado: ${callback_type} para campanha ${campaign.name}`);
    } catch (error) {
      console.error('❌ Erro ao processar callback do n8n:', error);
    }
  }

  /**
   * n8n confirma que realmente há erro
   */
  private static async handleErrorConfirmed(campaign: any, message: string, data?: any): Promise<void> {
    console.log(`🚨 n8n confirmou erro na campanha ${campaign.name}: ${message}`);
    
    await supabase
      .from('campaigns')
      .update({ 
        status: 'error',
        error_message: `Erro confirmado pelo n8n: ${message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign.id);
  }

  /**
   * n8n confirma que está processando normalmente
   */
  private static async handleProcessingNormal(campaign: any, message: string, data?: any): Promise<void> {
    console.log(`✅ n8n confirma processamento normal da campanha ${campaign.name}: ${message}`);
    
    // Manter status "sending" mas atualizar timestamp
    await supabase
      .from('campaigns')
      .update({ 
        updated_at: new Date().toISOString(),
        error_message: `Processamento normal confirmado: ${message}`
      })
      .eq('id', campaign.id);
  }

  /**
   * n8n informa delay customizado
   */
  private static async handleCustomDelay(campaign: any, message: string, data?: any): Promise<void> {
    console.log(`⏰ n8n informa delay customizado para campanha ${campaign.name}: ${message}`);
    
    const delayMinutes = data?.custom_delay_minutes || 60; // Default 1 hora
    const completionTime = data?.estimated_completion_time;
    
    await supabase
      .from('campaigns')
      .update({ 
        updated_at: new Date().toISOString(),
        error_message: `Delay customizado: ${delayMinutes} minutos. ${message}`
      })
      .eq('id', campaign.id);

    // Agendar próxima verificação baseada no delay informado
    this.scheduleNextCheck(campaign.id, delayMinutes);
  }

  /**
   * Agenda próxima verificação baseada no delay informado pelo n8n
   */
  private static scheduleNextCheck(campaignId: string, delayMinutes: number): void {
    const nextCheckTime = new Date(Date.now() + (delayMinutes * 60 * 1000));
    console.log(`📅 Próxima verificação da campanha ${campaignId} agendada para: ${nextCheckTime.toLocaleString('pt-BR')}`);
    
    // Armazenar no localStorage para persistir entre sessões
    const scheduledChecks = JSON.parse(localStorage.getItem('n8n_scheduled_checks') || '{}');
    scheduledChecks[campaignId] = nextCheckTime.toISOString();
    localStorage.setItem('n8n_scheduled_checks', JSON.stringify(scheduledChecks));
  }

  /**
   * Verifica se uma campanha tem verificação agendada pelo n8n
   */
  static isScheduledForCheck(campaignId: string): boolean {
    const scheduledChecks = JSON.parse(localStorage.getItem('n8n_scheduled_checks') || '{}');
    const scheduledTime = scheduledChecks[campaignId];
    
    if (!scheduledTime) return false;
    
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    
    return now >= scheduled;
  }

  /**
   * Remove campanha da lista de verificações agendadas
   */
  static removeScheduledCheck(campaignId: string): void {
    const scheduledChecks = JSON.parse(localStorage.getItem('n8n_scheduled_checks') || '{}');
    delete scheduledChecks[campaignId];
    localStorage.setItem('n8n_scheduled_checks', JSON.stringify(scheduledChecks));
  }

  /**
   * Obtém configuração de timeout para uma campanha
   */
  static getTimeoutConfig(campaign: any): CampaignTimeoutConfig {
    return {
      id: campaign.id,
      name: campaign.name,
      default_timeout_minutes: 15, // Default 15 minutos
      custom_timeout_minutes: campaign.custom_timeout_minutes,
      timeout_type: campaign.timeout_type || 'FIXED',
      last_callback: campaign.last_callback,
      callback_status: campaign.callback_status || 'WAITING'
    };
  }

  /**
   * Calcula timeout inteligente baseado no tipo de campanha
   */
  static calculateSmartTimeout(campaign: any): number {
    const config = this.getTimeoutConfig(campaign);
    
    // Se tem callback recente, usar delay customizado
    if (config.last_callback) {
      const lastCallbackTime = new Date(config.last_callback);
      const timeSinceCallback = Date.now() - lastCallbackTime.getTime();
      const minutesSinceCallback = Math.floor(timeSinceCallback / (1000 * 60));
      
      // Se callback foi há menos de 5 minutos, aguardar mais
      if (minutesSinceCallback < 5) {
        return config.custom_timeout_minutes || 60; // 1 hora
      }
    }

    // Timeout baseado no tipo de campanha
    switch (campaign.type || 'standard') {
      case 'immediate':
        return 5; // 5 minutos
      case 'scheduled':
        return 10; // 10 minutos
      case 'bulk':
        return 30; // 30 minutos
      case 'long_running':
        return 120; // 2 horas
      default:
        return config.default_timeout_minutes;
    }
  }
}
