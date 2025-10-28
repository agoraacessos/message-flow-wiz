// Endpoint para receber callbacks do n8n
// Este arquivo deve ser usado como exemplo para criar um endpoint real

import { N8nCallbackService } from './n8nCallbackService';

/**
 * Exemplo de endpoint para receber callbacks do n8n
 * 
 * Como usar:
 * 1. Crie um endpoint em seu backend (Node.js, Python, etc.)
 * 2. Configure para receber POST requests
 * 3. Use este código como referência
 */

export async function handleN8nCallback(request: Request): Promise<Response> {
  try {
    // Verificar método HTTP
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse do JSON
    const payload = await request.json();
    
    // Validar payload básico
    if (!payload.event || !payload.campaign_id || !payload.callback_type) {
      return new Response('Invalid payload', { status: 400 });
    }

    // Verificar se é callback do n8n
    if (payload.event !== 'N8N_CALLBACK') {
      return new Response('Invalid event type', { status: 400 });
    }

    // Processar callback
    await N8nCallbackService.processCallback(payload);

    // Resposta de sucesso
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Callback processed successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro ao processar callback do n8n:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Exemplo de uso com Express.js (Node.js)
 */
export function setupExpressEndpoint(app: any) {
  app.post('/api/n8n-callback', async (req: any, res: any) => {
    try {
      const response = await handleN8nCallback(req);
      res.status(response.status).json(await response.json());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

/**
 * Exemplo de uso com Next.js API Route
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await handleN8nCallback(req);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
