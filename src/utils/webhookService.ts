// Serviço completo para envio de webhooks com fallbacks
import { WebhookFallback } from './webhookFallback';
import { WebhookProxyBackend } from './webhookProxyBackend';
import { WebhookAlternative } from './webhookAlternative';

export interface WebhookResult {
  success: boolean;
  status?: number;
  error?: string;
  method?: string;
  fallbackUrl?: string;
  fallbackMessage?: string;
}

export class WebhookService {
  private static async tryDirectWebhook(url: string, payload: any): Promise<WebhookResult> {
    try {
      console.log('🔄 Tentando envio direto...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Webhook enviado diretamente com sucesso!');
        return { success: true, status: response.status, method: 'direct' };
      } else {
        console.warn('❌ Webhook direto falhou:', response.status, response.statusText);
        return { success: false, status: response.status, error: response.statusText, method: 'direct' };
      }
    } catch (error) {
      console.warn('❌ Erro no webhook direto:', error);
      return { success: false, error: error.message, method: 'direct' };
    }
  }

  private static async tryProxyWebhook(url: string, payload: any): Promise<WebhookResult> {
    try {
      console.log('🔄 Tentando via proxy...');
      
      // Usar diferentes proxies públicos
      const proxies = [
        'https://cors-anywhere.herokuapp.com/',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
      ];

      for (const proxy of proxies) {
        try {
          const proxyUrl = proxy + encodeURIComponent(url);
          
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            console.log('✅ Webhook enviado via proxy com sucesso!');
            return { success: true, status: response.status, method: 'proxy' };
          }
        } catch (proxyError) {
          console.warn(`❌ Proxy ${proxy} falhou:`, proxyError);
          continue;
        }
      }

      return { success: false, error: 'Todos os proxies falharam', method: 'proxy' };
    } catch (error) {
      console.warn('❌ Erro geral no proxy:', error);
      return { success: false, error: error.message, method: 'proxy' };
    }
  }

  private static async tryWebhookSite(url: string, payload: any): Promise<WebhookResult> {
    try {
      console.log('🔄 Tentando via webhook.site...');
      
      // Se a URL já é do webhook.site, usar diretamente
      if (url.includes('webhook.site')) {
        return await this.tryDirectWebhook(url, payload);
      }

      // Se não, tentar criar um webhook.site temporário
      const webhookSiteUrl = 'https://webhook.site/unique-id';
      console.log('ℹ️ Para teste, use: https://webhook.site');
      
      return { success: false, error: 'Use webhook.site para teste', method: 'webhook-site' };
    } catch (error) {
      return { success: false, error: error.message, method: 'webhook-site' };
    }
  }

  static async sendWebhook(url: string, payload: any): Promise<WebhookResult> {
    console.log('🚀 Iniciando envio de webhook...');
    console.log('📡 URL:', url);
    console.log('📦 Payload:', payload);

    // Validar URL
    if (!url || !url.startsWith('http')) {
      return { success: false, error: 'URL inválida' };
    }

    // Tentar métodos em ordem de preferência
    const methods = [
      () => this.tryDirectWebhook(url, payload),
      () => this.tryProxyWebhook(url, payload),
      () => this.tryWebhookSite(url, payload),
      () => WebhookProxyBackend.sendWebhook(url, payload),
      () => WebhookAlternative.tryAllAlternatives(url, payload)
    ];

    let lastError: any = null;

    for (const method of methods) {
      const result = await method();
      if (result.success) {
        return result;
      }
      lastError = result;
    }

    // Se todos os métodos falharam e é n8n, sugerir webhook.site
    if (WebhookFallback.shouldUseFallback(url, lastError)) {
      const fallbackUrl = WebhookFallback.generateWebhookSiteUrl();
      const fallbackMessage = WebhookFallback.getFallbackMessage(url);
      
      console.log('🔄 Tentando fallback para webhook.site...');
      const fallbackResult = await this.tryDirectWebhook(fallbackUrl, payload);
      
      if (fallbackResult.success) {
        return {
          ...fallbackResult,
          fallbackUrl,
          fallbackMessage
        };
      }
    }

    return { 
      success: false, 
      error: 'Todos os métodos falharam',
      fallbackUrl: WebhookFallback.getFallbackUrl(),
      fallbackMessage: WebhookFallback.getFallbackMessage(url)
    };
  }

  static async testWebhook(url: string): Promise<WebhookResult> {
    const testPayload = {
      event: "TEST_WEBHOOK",
      instance: "message-flow-wiz",
      data: {
        test: true,
        message: "Teste de webhook com dados completos",
        timestamp: new Date().toISOString()
      },
      contact: {
        id: "test-contact-id",
        name: "Contato Teste",
        phone: "+5511999999999",
        email: "teste@exemplo.com",
        tags: ["teste", "webhook"],
        company: "Empresa Teste",
        custom_fields: {
          idade: "30",
          cidade: "São Paulo"
        }
      },
      message: {
        id: "test-message-id",
        title: "Mensagem de Teste",
        content: "Esta é uma mensagem de teste para verificar o webhook",
        type: "text"
      },
      campaign: {
        id: "test-campaign-id",
        name: "Campanha de Teste",
        status: "sending"
      },
      metadata: {
        sent_at: new Date().toISOString(),
        contact_index: 1,
        total_contacts: 1
      }
    };

    return await this.sendWebhook(url, testPayload);
  }
}
