// Utilitário para enviar webhooks via proxy (contorna CORS)
export async function sendWebhookViaProxy(webhookUrl: string, payload: any) {
  try {
    // Usar um serviço de proxy público para contornar CORS
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const targetUrl = webhookUrl;
    
    const response = await fetch(proxyUrl + targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': window.location.origin
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Webhook enviado via proxy com sucesso');
      return { success: true, status: response.status };
    } else {
      console.warn('❌ Webhook via proxy falhou:', response.status, response.statusText);
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (error) {
    console.warn('❌ Erro ao enviar webhook via proxy:', error);
    return { success: false, error: error.message };
  }
}

// Função alternativa usando fetch direto (pode falhar por CORS)
export async function sendWebhookDirect(webhookUrl: string, payload: any) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Webhook enviado diretamente com sucesso');
      return { success: true, status: response.status };
    } else {
      console.warn('❌ Webhook direto falhou:', response.status, response.statusText);
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (error) {
    console.warn('❌ Erro ao enviar webhook direto:', error);
    return { success: false, error: error.message };
  }
}

// Função principal que tenta ambas as abordagens
export async function sendWebhook(webhookUrl: string, payload: any) {
  console.log('🔗 Tentando enviar webhook...');
  console.log('📡 URL:', webhookUrl);
  console.log('📦 Payload:', payload);

  // Primeiro, tentar envio direto
  const directResult = await sendWebhookDirect(webhookUrl, payload);
  
  if (directResult.success) {
    return directResult;
  }

  // Se falhar por CORS, tentar via proxy
  console.log('🔄 Tentando via proxy devido ao erro de CORS...');
  const proxyResult = await sendWebhookViaProxy(webhookUrl, payload);
  
  return proxyResult;
}
