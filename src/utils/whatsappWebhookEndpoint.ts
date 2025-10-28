// =====================================================
// ENDPOINT PARA RECEBER MENSAGENS DO WHATSAPP
// =====================================================
// Este arquivo mostra como integrar com n8n para receber mensagens

import { handleWhatsAppMessage } from './messageDetectionService';

// Exemplo de endpoint Express.js
export async function whatsappWebhookEndpoint(req: any, res: any) {
  try {
    console.log('📨 Mensagem recebida do WhatsApp:', req.body);
    
    // Processar a mensagem
    const result = await handleWhatsAppMessage(req.body);
    
    res.status(result.status).json({ message: result.message });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

// Exemplo de payload que o n8n enviará:
export const examplePayload = {
  from: "5511999999999", // Número do WhatsApp
  message: "interessado", // Texto da mensagem
  timestamp: "2024-01-21T10:00:00Z", // Quando foi enviada
  messageId: "msg_123456", // ID da mensagem no WhatsApp
  contactName: "João Silva" // Nome do contato (opcional)
};

// Exemplo de configuração no n8n:
export const n8nConfiguration = {
  webhookUrl: "https://seu-sistema.com/api/whatsapp-webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: {
    from: "{{ $json.from }}",
    message: "{{ $json.message }}",
    timestamp: "{{ $json.timestamp }}",
    messageId: "{{ $json.messageId }}"
  }
};