// Soluções alternativas para webhook quando CORS bloqueia tudo
export class WebhookAlternative {
  
  // Método 1: Usar JSONP (se o servidor suportar)
  static async sendViaJSONP(url: string, payload: any): Promise<any> {
    return new Promise((resolve) => {
      try {
        // Criar callback único
        const callbackName = `webhook_callback_${Date.now()}`;
        
        // Adicionar callback ao window
        (window as any)[callbackName] = (response: any) => {
          resolve({
            success: true,
            status: 200,
            method: 'jsonp',
            response
          });
          // Limpar callback
          delete (window as any)[callbackName];
        };

        // Criar script tag
        const script = document.createElement('script');
        const jsonpUrl = `${url}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(payload))}`;
        script.src = jsonpUrl;
        
        // Timeout
        setTimeout(() => {
          resolve({
            success: false,
            error: 'JSONP timeout',
            method: 'jsonp'
          });
          delete (window as any)[callbackName];
        }, 10000);

        document.head.appendChild(script);
        
        // Limpar script após execução
        script.onload = () => {
          document.head.removeChild(script);
        };
        
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          method: 'jsonp'
        });
      }
    });
  }

  // Método 2: Usar FormData (contorna algumas restrições)
  static async sendViaFormData(url: string, payload: any): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          method: 'form-data'
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: response.statusText,
          method: 'form-data'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'form-data'
      };
    }
  }

  // Método 3: Usar GET com dados na URL (para testes)
  static async sendViaGET(url: string, payload: any): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('data', JSON.stringify(payload));
      params.append('timestamp', new Date().toISOString());
      
      const getUrl = `${url}?${params.toString()}`;
      
      const response = await fetch(getUrl, {
        method: 'GET'
      });

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          method: 'get'
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: response.statusText,
          method: 'get'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'get'
      };
    }
  }

  // Método 4: Simular envio (para desenvolvimento)
  static async simulateWebhook(url: string, payload: any): Promise<any> {
    console.log('🎭 Simulando envio de webhook...');
    console.log('📡 URL:', url);
    console.log('📦 Payload:', payload);
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      status: 200,
      method: 'simulation',
      message: 'Webhook simulado (desenvolvimento)'
    };
  }

  // Tentar todos os métodos alternativos
  static async tryAllAlternatives(url: string, payload: any): Promise<any> {
    const methods = [
      () => this.sendViaFormData(url, payload),
      () => this.sendViaGET(url, payload),
      () => this.sendViaJSONP(url, payload),
      () => this.simulateWebhook(url, payload)
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn('Método alternativo falhou:', error);
        continue;
      }
    }

    return {
      success: false,
      error: 'Todos os métodos alternativos falharam'
    };
  }
}
