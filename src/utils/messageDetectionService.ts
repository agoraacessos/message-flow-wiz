import { supabase } from '@/integrations/supabase/client';

interface IncomingMessage {
  from: string; // Número do WhatsApp (ex: "5511999999999")
  message: string; // Texto da mensagem
  timestamp: string; // Quando foi enviada
  messageId?: string; // ID da mensagem no WhatsApp
}

interface RecoveryRule {
  id: string;
  name: string;
  trigger_text: string;
  trigger_type: 'contains' | 'exact' | 'starts_with' | 'ends_with' | 'regex';
  is_active: boolean;
  timeout_minutes: number;
  max_attempts: number;
}

export class MessageDetectionService {
  
  /**
   * Processa uma mensagem recebida do WhatsApp
   * Verifica se ela ativa alguma regra de recuperação
   */
  static async processIncomingMessage(messageData: IncomingMessage): Promise<void> {
    try {
      console.log(`🔍 Processando mensagem de ${messageData.from}: "${messageData.message}"`);
      
      // 1. Buscar todas as regras ativas
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
      
      // 2. Verificar cada regra
      for (const rule of rules) {
        const isTriggered = this.checkRuleTrigger(messageData.message, rule);
        
        if (isTriggered) {
          console.log(`✅ Regra "${rule.name}" ativada pela mensagem!`);
          await this.activateRecoveryFlow(messageData, rule);
          break; // Para na primeira regra que for ativada
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }
  
  /**
   * Verifica se uma mensagem ativa uma regra específica
   */
  private static checkRuleTrigger(message: string, rule: RecoveryRule): boolean {
    const triggerText = rule.trigger_text.toLowerCase();
    const messageText = message.toLowerCase();
    
    switch (rule.trigger_type) {
      case 'contains':
        return messageText.includes(triggerText);
        
      case 'exact':
        return messageText === triggerText;
        
      case 'starts_with':
        return messageText.startsWith(triggerText);
        
      case 'ends_with':
        return messageText.endsWith(triggerText);
        
      case 'regex':
        try {
          const regex = new RegExp(triggerText, 'i');
          return regex.test(messageText);
        } catch (error) {
          console.error(`❌ Regex inválida na regra "${rule.name}": ${triggerText}`);
          return false;
        }
        
      default:
        console.warn(`⚠️ Tipo de trigger desconhecido: ${rule.trigger_type}`);
        return false;
    }
  }
  
  /**
   * Ativa o fluxo de recuperação para uma regra
   */
  private static async activateRecoveryFlow(messageData: IncomingMessage, rule: RecoveryRule): Promise<void> {
    try {
      // 1. Verificar se já existe uma conversa monitorada para este contato e regra
      const { data: existingConversation } = await supabase
        .from('monitored_conversations')
        .select('*')
        .eq('contact_id', messageData.from)
        .eq('rule_id', rule.id)
        .eq('status', 'active')
        .single();
      
      if (existingConversation) {
        console.log(`ℹ️ Conversa já monitorada para ${messageData.from} com regra "${rule.name}"`);
        return;
      }
      
      // 2. Buscar o contato no banco
      let contactId = messageData.from;
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', messageData.from)
        .single();
      
      if (contact) {
        contactId = contact.id;
      } else {
        // Se não existe, criar um contato básico
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            phone: messageData.from,
            name: `Cliente ${messageData.from}`,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (contactError) {
          console.error('❌ Erro ao criar contato:', contactError);
          return;
        }
        
        contactId = newContact.id;
      }
      
      // 3. Criar conversa monitorada
      const { data: conversation, error: conversationError } = await supabase
        .from('monitored_conversations')
        .insert({
          contact_id: contactId,
          rule_id: rule.id,
          trigger_message: messageData.message,
          trigger_received_at: messageData.timestamp,
          current_flow_step: 1,
          attempts_count: 0,
          status: 'waiting_response',
          next_message_scheduled_at: new Date().toISOString() // Primeira mensagem imediata
        })
        .select('*')
        .single();
      
      if (conversationError) {
        console.error('❌ Erro ao criar conversa monitorada:', conversationError);
        return;
      }
      
      // 4. Log da ativação
      await supabase
        .from('recovery_logs')
        .insert({
          conversation_id: conversation.id,
          action: 'rule_triggered',
          message: `Regra "${rule.name}" ativada pela mensagem: "${messageData.message}"`,
          data: {
            trigger_text: rule.trigger_text,
            trigger_type: rule.trigger_type,
            message_data: messageData
          }
        });
      
      // 5. Enviar primeira mensagem imediatamente
      await this.sendFirstMessage(conversation.id, rule.id);
      
      console.log(`🚀 Fluxo de recuperação ativado para ${messageData.from} com regra "${rule.name}"`);
      
    } catch (error) {
      console.error('❌ Erro ao ativar fluxo de recuperação:', error);
    }
  }
  
  /**
   * Envia a primeira mensagem do fluxo
   */
  private static async sendFirstMessage(conversationId: string, ruleId: string): Promise<void> {
    try {
      // Buscar primeira mensagem do fluxo
      const { data: firstFlow, error: flowError } = await supabase
        .from('recovery_flows')
        .select(`
          *,
          messages(title, content, webhook_url)
        `)
        .eq('rule_id', ruleId)
        .eq('sequence_order', 1)
        .eq('is_active', true)
        .single();
      
      if (flowError || !firstFlow) {
        console.error('❌ Erro ao buscar primeira mensagem do fluxo:', flowError);
        return;
      }
      
      // Buscar dados da conversa
      const { data: conversation, error: conversationError } = await supabase
        .from('monitored_conversations')
        .select(`
          *,
          contacts(phone, name)
        `)
        .eq('id', conversationId)
        .single();
      
      if (conversationError || !conversation) {
        console.error('❌ Erro ao buscar conversa:', conversationError);
        return;
      }
      
      // Preparar payload para envio
      const messagePayload = {
        to: conversation.contacts.phone,
        message: firstFlow.messages.content,
        type: 'recovery_flow',
        rule_id: ruleId,
        conversation_id: conversationId,
        step: 1,
        timestamp: new Date().toISOString()
      };
      
      // Enviar via webhook
      const webhookUrl = firstFlow.webhook_url || firstFlow.messages.webhook_url;
      if (webhookUrl) {
        await this.sendWebhook(webhookUrl, messagePayload);
      }
      
      // Atualizar conversa
      await supabase
        .from('monitored_conversations')
        .update({
          last_message_sent_at: new Date().toISOString(),
          attempts_count: 1,
          status: 'waiting_response',
          next_message_scheduled_at: new Date(Date.now() + firstFlow.delay_minutes * 60 * 1000).toISOString()
        })
        .eq('id', conversationId);
      
      // Log do envio
      await supabase
        .from('recovery_logs')
        .insert({
          conversation_id: conversationId,
          action: 'message_sent',
          message: `Primeira mensagem enviada: "${firstFlow.messages.title}"`,
          data: messagePayload
        });
      
      console.log(`📤 Primeira mensagem enviada para ${conversation.contacts.phone}`);
      
    } catch (error) {
      console.error('❌ Erro ao enviar primeira mensagem:', error);
    }
  }
  
  /**
   * Envia webhook para n8n ou outro serviço
   */
  private static async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ Webhook enviado com sucesso para ${url}`);
      
    } catch (error) {
      console.error(`❌ Erro ao enviar webhook para ${url}:`, error);
      throw error;
    }
  }
}

// Exemplo de uso - endpoint para receber mensagens do WhatsApp
export async function handleWhatsAppMessage(requestBody: any): Promise<{ status: number; message: string }> {
  try {
    // Validar payload
    if (!requestBody || !requestBody.from || !requestBody.message) {
      return { status: 400, message: 'Payload inválido' };
    }
    
    // Processar mensagem
    await MessageDetectionService.processIncomingMessage({
      from: requestBody.from,
      message: requestBody.message,
      timestamp: requestBody.timestamp || new Date().toISOString(),
      messageId: requestBody.messageId
    });
    
    return { status: 200, message: 'Mensagem processada com sucesso' };
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem do WhatsApp:', error);
    return { status: 500, message: 'Erro interno do servidor' };
  }
}
