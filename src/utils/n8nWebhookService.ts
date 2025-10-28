// Serviço específico para envio de webhooks no formato n8n
// Segue exatamente as especificações fornecidas pelo usuário

export interface N8nFlowStep {
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  caption?: string;
  delay: number; // Tempo em segundos antes desta etapa
}

export interface N8nWebhookPayload {
  session: string;
  number: string;
  flow: N8nFlowStep[];
}

export interface N8nWebhookResult {
  success: boolean;
  status?: number;
  error?: string;
  method?: string;
}

export class N8nWebhookService {
  /**
   * Converte um fluxo de mensagem do sistema para o formato n8n
   */
  static convertMessageFlowToN8nFlow(messageContent: string): N8nFlowStep[] {
    try {
      // Tentar parsear como JSON (fluxo estruturado)
      const flowContent = JSON.parse(messageContent);
      
      if (Array.isArray(flowContent)) {
        return flowContent.map((block, index) => {
          // Mapear tipos do sistema para tipos n8n
          let n8nType: N8nFlowStep['type'];
          
          switch (block.type) {
            case 'text':
              n8nType = 'text';
              break;
            case 'image':
              n8nType = 'image';
              break;
            case 'file':
              n8nType = 'document';
              break;
            case 'audio':
              n8nType = 'audio';
              break;
            case 'link':
              // Links são tratados como texto com URL
              n8nType = 'text';
              break;
            default:
              n8nType = 'text';
          }

          return {
            type: n8nType,
            content: block.type === 'audio' ? block.content : block.content, // Para áudio, usar content (URL)
            caption: block.metadata?.alt || block.metadata?.filename || undefined,
            delay: block.delay || (index === 0 ? 0 : 5) // Primeira mensagem sem delay, outras com 5s padrão
          };
        });
      }
    } catch (error) {
      console.warn('Erro ao parsear fluxo JSON, tratando como mensagem simples:', error);
    }

    // Se não conseguir parsear como JSON, tratar como mensagem simples
    return [{
      type: 'text',
      content: messageContent,
      delay: 0
    }];
  }

  /**
   * Formata número de telefone para o padrão n8n (sem + e com DDI)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se não tem DDI, adiciona 55 (Brasil)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
      return '55' + cleanPhone;
    }
    
    // Se já tem DDI, retorna como está
    if (cleanPhone.length >= 12) {
      return cleanPhone;
    }
    
    // Se tem 10 dígitos, adiciona DDI 55
    if (cleanPhone.length === 10) {
      return '55' + cleanPhone;
    }
    
    return cleanPhone;
  }

  /**
   * Cria o payload no formato exato especificado para n8n
   */
  static createN8nPayload(
    session: string,
    phone: string,
    messageContent: string
  ): N8nWebhookPayload {
    return {
      session,
      number: this.formatPhoneNumber(phone),
      flow: this.convertMessageFlowToN8nFlow(messageContent)
    };
  }

  /**
   * Envia webhook para n8n no formato especificado
   */
  static async sendN8nWebhook(
    webhookUrl: string,
    session: string,
    phone: string,
    messageContent: string
  ): Promise<N8nWebhookResult> {
    try {
      console.log('🚀 Enviando webhook para n8n...');
      
      const payload = this.createN8nPayload(session, phone, messageContent);
      
      console.log('📦 Payload n8n:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Webhook n8n enviado com sucesso!');
        return { 
          success: true, 
          status: response.status, 
          method: 'n8n-direct' 
        };
      } else {
        console.warn('❌ Webhook n8n falhou:', response.status, response.statusText);
        return { 
          success: false, 
          status: response.status, 
          error: response.statusText, 
          method: 'n8n-direct' 
        };
      }
    } catch (error) {
      console.warn('❌ Erro no webhook n8n:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido', 
        method: 'n8n-direct' 
      };
    }
  }

  /**
   * Testa webhook n8n com dados de exemplo
   */
  static async testN8nWebhook(webhookUrl: string): Promise<N8nWebhookResult> {
    const testFlow: N8nFlowStep[] = [
      { type: 'text', content: 'Olá! Tudo bem?', delay: 0 },
      { type: 'image', content: 'https://cdn.meusite.com/imagem1.jpg', caption: 'Olha essa promoção!', delay: 5 },
      { type: 'text', content: 'Gostou? 😄', delay: 10 },
      { type: 'audio', content: 'https://cdn.meusite.com/audio.mp3', delay: 15 }
    ];

    const testPayload: N8nWebhookPayload = {
      session: 'teste_empresa123',
      number: '5531999999999',
      flow: testFlow
    };

    try {
      console.log('🧪 Testando webhook n8n...');
      console.log('📦 Payload de teste:', JSON.stringify(testPayload, null, 2));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        console.log('✅ Teste de webhook n8n bem-sucedido!');
        return { 
          success: true, 
          status: response.status, 
          method: 'n8n-test' 
        };
      } else {
        console.warn('❌ Teste de webhook n8n falhou:', response.status, response.statusText);
        return { 
          success: false, 
          status: response.status, 
          error: response.statusText, 
          method: 'n8n-test' 
        };
      }
    } catch (error) {
      console.warn('❌ Erro no teste de webhook n8n:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido', 
        method: 'n8n-test' 
      };
    }
  }
}
