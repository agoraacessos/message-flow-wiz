// Proxy backend para contornar CORS completamente
export class WebhookProxyBackend {
  private static readonly PROXY_ENDPOINTS = [
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  // Enviar webhook via proxy backend
  static async sendWebhook(url: string, payload: any): Promise<any> {
    console.log('🔄 Tentando proxy backend...');
    console.log('📡 URL original:', url);
    console.log('📦 Payload:', payload);

    // Tentar diferentes proxies
    for (const proxy of this.PROXY_ENDPOINTS) {
      try {
        console.log(`🔄 Tentando proxy: ${proxy}`);
        
        const proxyUrl = proxy + encodeURIComponent(url);
        console.log('📡 URL do proxy:', proxyUrl);

        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(payload)
        });

        console.log('📊 Resposta do proxy:', response.status, response.statusText);

        if (response.ok) {
          console.log('✅ Proxy backend funcionou!');
          return {
            success: true,
            status: response.status,
            method: 'proxy-backend',
            proxy: proxy
          };
        } else {
          console.warn(`❌ Proxy falhou: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`❌ Erro no proxy ${proxy}:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'Todos os proxies backend falharam',
      method: 'proxy-backend'
    };
  }

  // Testar webhook via proxy backend
  static async testWebhook(url: string): Promise<any> {
    const testPayload = {
      event: "TEST_WEBHOOK",
      instance: "message-flow-wiz",
      data: {
        test: true,
        message: "Teste via proxy backend",
        timestamp: new Date().toISOString()
      },
      contact: {
        id: "test-contact-id",
        name: "Contato Teste",
        phone: "+5511999999999",
        email: "teste@exemplo.com",
        tags: ["teste", "proxy"],
        company: "Empresa Teste",
        custom_fields: {
          idade: "30",
          cidade: "São Paulo"
        }
      },
      message: {
        id: "test-message-id",
        title: "Mensagem de Teste",
        content: "Esta é uma mensagem de teste via proxy backend",
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
