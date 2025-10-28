import { useEffect, useCallback } from 'react';
import { ConversationRecoveryService } from '@/utils/conversationRecoveryService';

export function useConversationRecoveryMonitor() {
  const processTimeoutConversations = useCallback(async () => {
    try {
      await ConversationRecoveryService.processTimeoutConversations();
    } catch (error) {
      console.error('❌ Erro no monitor de recuperação de conversas:', error);
    }
  }, []);

  useEffect(() => {
    // Verificar conversas com timeout a cada 1 minuto
    const interval = setInterval(processTimeoutConversations, 60 * 1000);
    
    // Verificar imediatamente
    processTimeoutConversations();

    console.log('🔍 Monitor de recuperação de conversas iniciado (verifica a cada 1 minuto)');

    return () => {
      clearInterval(interval);
      console.log('🔍 Monitor de recuperação de conversas parado');
    };
  }, [processTimeoutConversations]);

  return { processTimeoutConversations };
}

/**
 * Hook para processar mensagens recebidas via webhook
 * Use este hook quando receber mensagens do WhatsApp/n8n
 */
export function useIncomingMessageProcessor() {
  const processIncomingMessage = useCallback(async (messageData: {
    contact_id: string;
    contact_name: string;
    contact_phone: string;
    message_text: string;
    received_at?: string;
    message_id?: string;
  }) => {
    try {
      const message = {
        ...messageData,
        received_at: messageData.received_at || new Date().toISOString()
      };

      // Processar mensagem para ativar regras
      await ConversationRecoveryService.processIncomingMessage(message);

      // Processar resposta para cancelar fluxos se necessário
      await ConversationRecoveryService.processResponseReceived(
        message.contact_id, 
        message.message_text
      );

      console.log(`✅ Mensagem processada: ${message.contact_name} - "${message.message_text}"`);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
    }
  }, []);

  return { processIncomingMessage };
}
