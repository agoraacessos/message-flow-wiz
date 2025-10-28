import { supabase } from '@/integrations/supabase/client';
import { WebhookService } from './webhookService';

export interface IncomingMessage {
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  message_text: string;
  received_at: string;
  message_id?: string;
}

export interface RecoveryRule {
  id: string;
  name: string;
  description: string | null;
  trigger_text: string;
  trigger_type: string;
  is_active: boolean;
  timeout_minutes: number;
  max_attempts: number;
}

export interface RecoveryFlow {
  id: string;
  rule_id: string;
  sequence_order: number;
  delay_minutes: number;
  message_id: string;
  webhook_url: string | null;
  is_active: boolean;
}

export class ConversationRecoveryService {
  /**
   * Processa uma mensagem recebida e verifica se ativa alguma regra
   */
  static async processIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      console.log(`📨 Processando mensagem recebida de ${message.contact_name}: "${message.message_text}"`);

      // Buscar todas as regras ativas
      const { data: rules, error: rulesError } = await supabase
        .from('recovery_rules')
        .select('*')
        .eq('is_active', true);

      if (rulesError) {
        console.error('❌ Erro ao buscar regras:', rulesError);
        return;
      }

      if (!rules || rules.length === 0) {
        console.log('ℹ️ Nenhuma regra ativa encontrada');
        return;
      }

      // Verificar cada regra
      for (const rule of rules) {
        if (this.matchesRule(message.message_text, rule)) {
          console.log(`🎯 Regra "${rule.name}" ativada pela mensagem!`);
          await this.activateRecoveryFlow(message, rule);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
    }
  }

  /**
   * Verifica se uma mensagem corresponde a uma regra
   */
  private static matchesRule(messageText: string, rule: RecoveryRule): boolean {
    const text = messageText.toLowerCase();
    const trigger = rule.trigger_text.toLowerCase();

    switch (rule.trigger_type) {
      case 'contains':
        return text.includes(trigger);
      case 'exact':
        return text === trigger;
      case 'starts_with':
        return text.startsWith(trigger);
      case 'ends_with':
        return text.endsWith(trigger);
      case 'regex':
        try {
          const regex = new RegExp(trigger, 'i');
          return regex.test(text);
        } catch (error) {
          console.error('❌ Regex inválida:', error);
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Ativa o fluxo de recuperação para uma conversa
   */
  private static async activateRecoveryFlow(message: IncomingMessage, rule: RecoveryRule): Promise<void> {
    try {
      // Verificar se já existe uma conversa ativa para este contato e regra
      const { data: existingConversation } = await supabase
        .from('monitored_conversations')
        .select('*')
        .eq('contact_id', message.contact_id)
        .eq('rule_id', rule.id)
        .in('status', ['waiting_response', 'sending_message'])
        .single();

      if (existingConversation) {
        console.log(`ℹ️ Conversa já está sendo monitorada para ${message.contact_name} com regra "${rule.name}"`);
        return;
      }

      // Buscar fluxos da regra
      const { data: flows, error: flowsError } = await supabase
        .from('recovery_flows')
        .select('*')
        .eq('rule_id', rule.id)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true });

      if (flowsError || !flows || flows.length === 0) {
        console.error('❌ Erro ao buscar fluxos da regra:', flowsError);
        return;
      }

      // Criar nova conversa monitorada
      const { data: conversation, error: conversationError } = await supabase
        .from('monitored_conversations')
        .insert({
          contact_id: message.contact_id,
          rule_id: rule.id,
          trigger_message: message.message_text,
          trigger_received_at: message.received_at,
          current_flow_step: 1,
          attempts_count: 0,
          status: 'waiting_response',
          next_message_scheduled_at: new Date(Date.now() + (rule.timeout_minutes * 60 * 1000)).toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Erro ao criar conversa monitorada:', conversationError);
        return;
      }

      // Log da ativação
      await this.logAction(conversation.id, 'rule_triggered', `Regra "${rule.name}" ativada`, {
        trigger_message: message.message_text,
        rule_name: rule.name,
        timeout_minutes: rule.timeout_minutes
      });

      console.log(`✅ Fluxo de recuperação ativado para ${message.contact_name} com regra "${rule.name}"`);
    } catch (error) {
      console.error('❌ Erro ao ativar fluxo de recuperação:', error);
    }
  }

  /**
   * Processa conversas que atingiram timeout
   */
  static async processTimeoutConversations(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Buscar conversas que atingiram timeout
      const { data: timeoutConversations, error } = await supabase
        .from('monitored_conversations')
        .select(`
          *,
          contacts(name, phone),
          recovery_rules(name, max_attempts),
          recovery_flows(*, messages(title, content))
        `)
        .eq('status', 'waiting_response')
        .lte('next_message_scheduled_at', now);

      if (error) {
        console.error('❌ Erro ao buscar conversas com timeout:', error);
        return;
      }

      if (!timeoutConversations || timeoutConversations.length === 0) {
        return;
      }

      console.log(`⏰ Processando ${timeoutConversations.length} conversa(s) com timeout`);

      for (const conversation of timeoutConversations) {
        await this.processTimeoutConversation(conversation);
      }
    } catch (error) {
      console.error('❌ Erro ao processar conversas com timeout:', error);
    }
  }

  /**
   * Processa uma conversa específica que atingiu timeout
   */
  private static async processTimeoutConversation(conversation: any): Promise<void> {
    try {
      const { recovery_rules, recovery_flows } = conversation;
      const maxAttempts = recovery_rules?.max_attempts || 3;

      // Verificar se ainda pode tentar
      if (conversation.attempts_count >= maxAttempts) {
        console.log(`🚫 Máximo de tentativas atingido para ${conversation.contacts?.name}`);
        
        await supabase
          .from('monitored_conversations')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `Máximo de tentativas atingido (${maxAttempts})`
          })
          .eq('id', conversation.id);

        await this.logAction(conversation.id, 'flow_failed', 'Máximo de tentativas atingido', {
          attempts_count: conversation.attempts_count,
          max_attempts: maxAttempts
        });

        return;
      }

      // Buscar próximo passo do fluxo
      const currentFlow = recovery_flows?.find((flow: any) => 
        flow.sequence_order === conversation.current_flow_step
      );

      if (!currentFlow) {
        console.log(`✅ Fluxo concluído para ${conversation.contacts?.name}`);
        
        await supabase
          .from('monitored_conversations')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', conversation.id);

        await this.logAction(conversation.id, 'flow_completed', 'Fluxo de recuperação concluído');
        return;
      }

      // Enviar próxima mensagem
      await this.sendRecoveryMessage(conversation, currentFlow);

    } catch (error) {
      console.error('❌ Erro ao processar conversa com timeout:', error);
    }
  }

  /**
   * Envia mensagem de recuperação
   */
  private static async sendRecoveryMessage(conversation: any, flow: any): Promise<void> {
    try {
      console.log(`📤 Enviando mensagem de recuperação para ${conversation.contacts?.name}`);

      // Atualizar status para "enviando"
      await supabase
        .from('monitored_conversations')
        .update({
          status: 'sending_message',
          attempts_count: conversation.attempts_count + 1,
          last_message_sent_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      // Preparar payload para webhook
      const webhookPayload = {
        event: "RECOVERY_MESSAGE",
        instance: "message-flow-wiz",
        contact: {
          id: conversation.contact_id,
          name: conversation.contacts?.name,
          phone: conversation.contacts?.phone
        },
        message: {
          id: flow.message_id,
          title: flow.messages?.title,
          content: flow.messages?.content
        },
        recovery: {
          conversation_id: conversation.id,
          rule_name: conversation.recovery_rules?.name,
          current_step: conversation.current_flow_step,
          attempts_count: conversation.attempts_count + 1,
          trigger_message: conversation.trigger_message
        },
        metadata: {
          sent_at: new Date().toISOString(),
          flow_step: flow.sequence_order,
          delay_minutes: flow.delay_minutes
        }
      };

      // Enviar via webhook se configurado
      if (flow.webhook_url) {
        const webhookResult = await WebhookService.sendWebhook(flow.webhook_url, webhookPayload);
        
        if (!webhookResult.success) {
          console.warn(`⚠️ Webhook falhou para ${conversation.contacts?.name}:`, webhookResult.error);
        }
      }

      // Calcular próxima verificação
      const nextCheckTime = new Date(Date.now() + (conversation.recovery_rules?.timeout_minutes || 60) * 60 * 1000);
      
      // Atualizar conversa
      await supabase
        .from('monitored_conversations')
        .update({
          status: 'waiting_response',
          current_flow_step: conversation.current_flow_step + 1,
          next_message_scheduled_at: nextCheckTime.toISOString()
        })
        .eq('id', conversation.id);

      // Log da mensagem enviada
      await this.logAction(conversation.id, 'message_sent', `Mensagem enviada (passo ${flow.sequence_order})`, {
        message_title: flow.messages?.title,
        webhook_url: flow.webhook_url,
        next_check: nextCheckTime.toISOString()
      });

      console.log(`✅ Mensagem de recuperação enviada para ${conversation.contacts?.name}`);

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem de recuperação:', error);
      
      // Marcar como erro
      await supabase
        .from('monitored_conversations')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    }
  }

  /**
   * Registra uma ação no log
   */
  private static async logAction(
    conversationId: string, 
    action: string, 
    message: string, 
    data?: any
  ): Promise<void> {
    try {
      await supabase
        .from('recovery_logs')
        .insert({
          conversation_id: conversationId,
          action,
          message,
          data
        });
    } catch (error) {
      console.error('❌ Erro ao registrar log:', error);
    }
  }

  /**
   * Processa resposta recebida (para cancelar fluxo se necessário)
   */
  static async processResponseReceived(contactId: string, messageText: string): Promise<void> {
    try {
      // Buscar conversas ativas para este contato
      const { data: activeConversations } = await supabase
        .from('monitored_conversations')
        .select('*')
        .eq('contact_id', contactId)
        .in('status', ['waiting_response', 'sending_message']);

      if (!activeConversations || activeConversations.length === 0) {
        return;
      }

      // Verificar se a resposta indica que o cliente respondeu positivamente
      const positiveResponses = ['sim', 'ok', 'quero', 'interessado', 'vamos', 'beleza'];
      const isPositiveResponse = positiveResponses.some(response => 
        messageText.toLowerCase().includes(response)
      );

      if (isPositiveResponse) {
        // Cancelar fluxos de recuperação
        for (const conversation of activeConversations) {
          await supabase
            .from('monitored_conversations')
            .update({
              status: 'cancelled',
              completed_at: new Date().toISOString(),
              error_message: 'Cliente respondeu positivamente'
            })
            .eq('id', conversation.id);

          await this.logAction(conversation.id, 'response_received', 'Cliente respondeu positivamente - fluxo cancelado', {
            response_message: messageText
          });
        }

        console.log(`✅ Fluxos de recuperação cancelados para contato ${contactId} - cliente respondeu positivamente`);
      }
    } catch (error) {
      console.error('❌ Erro ao processar resposta recebida:', error);
    }
  }
}
