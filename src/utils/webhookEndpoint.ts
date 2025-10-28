// =====================================================
// ENDPOINT PARA RECEBER MENSAGENS DO N8N
// =====================================================
// Este arquivo mostra como criar o endpoint no seu sistema

import { handleWhatsAppMessage } from './messageDetectionService';

// Exemplo para Express.js
export async function whatsappWebhookEndpoint(req: any, res: any) {
  try {
    console.log('📨 Mensagem recebida do n8n:', req.body);
    
    // Validar payload
    if (!req.body || !req.body.from || !req.body.message) {
      console.warn('⚠️ Payload inválido recebido:', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'Payload inválido - campos obrigatórios: from, message' 
      });
    }
    
    // Processar a mensagem
    const result = await handleWhatsAppMessage(req.body);
    
    console.log('✅ Mensagem processada:', result);
    
    res.status(result.status).json({ 
      success: result.status === 200,
      message: result.message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
}

// Exemplo para Next.js API Route
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  return await whatsappWebhookEndpoint(req, res);
}

// Exemplo para Vercel Functions
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

// Exemplo de middleware de validação
export function validateWebhookPayload(req: any, res: any, next: any) {
  const { from, message } = req.body;
  
  if (!from || !message) {
    return res.status(400).json({
      success: false,
      message: 'Campos obrigatórios ausentes: from, message'
    });
  }
  
  // Validar formato do número
  if (!/^\d{10,15}$/.test(from.replace(/\D/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Formato de número inválido'
    });
  }
  
  // Validar tamanho da mensagem
  if (message.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Mensagem muito longa (máximo 1000 caracteres)'
    });
  }
  
  next();
}

// Exemplo de middleware de autenticação
export function authenticateWebhook(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== process.env.WEBHOOK_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação inválido'
    });
  }
  
  next();
}

// Exemplo de configuração completa do Express
/*
const express = require('express');
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use('/api/whatsapp-webhook', authenticateWebhook);
app.use('/api/whatsapp-webhook', validateWebhookPayload);

app.post('/api/whatsapp-webhook', whatsappWebhookEndpoint);

app.listen(3000, () => {
  console.log('🚀 Servidor rodando na porta 3000');
});
*/

// Exemplo de configuração para Vercel
/*
// pages/api/whatsapp-webhook.ts
import { handleWhatsAppMessage } from '../../utils/messageDetectionService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const result = await handleWhatsAppMessage(req.body);
    res.status(result.status).json({ 
      success: result.status === 200,
      message: result.message 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno' 
    });
  }
}
*/
