// Utilitário para forçar uso de webhook.site quando n8n falha
export class WebhookFallback {
  private static readonly WEBHOOK_SITE_BASE = 'https://webhook.site';
  private static readonly FALLBACK_URL = 'https://webhook.site/unique-id';

  // Verificar se a URL é do n8n e está falhando
  static isN8nUrl(url: string): boolean {
    return url.includes('n8n') || url.includes('easypanel');
  }

  // Verificar se a URL é do webhook.site
  static isWebhookSiteUrl(url: string): boolean {
    return url.includes('webhook.site');
  }

  // Obter URL de fallback para webhook.site
  static getFallbackUrl(): string {
    return this.FALLBACK_URL;
  }

  // Gerar URL única do webhook.site
  static generateWebhookSiteUrl(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${this.WEBHOOK_SITE_BASE}/${timestamp}-${random}`;
  }

  // Verificar se deve usar fallback
  static shouldUseFallback(url: string, error: any): boolean {
    if (this.isWebhookSiteUrl(url)) {
      return false; // webhook.site não precisa de fallback
    }

    if (this.isN8nUrl(url)) {
      // Se for n8n e tiver erro de CORS ou 404, usar fallback
      const errorMessage = error?.message || error?.error || '';
      return errorMessage.includes('CORS') || 
             errorMessage.includes('404') || 
             errorMessage.includes('Failed to fetch');
    }

    return false;
  }

  // Obter mensagem de fallback
  static getFallbackMessage(originalUrl: string): string {
    if (this.isN8nUrl(originalUrl)) {
      return `n8n com problema (CORS/404). Use webhook.site para teste: ${this.getFallbackUrl()}`;
    }
    return `URL com problema. Use webhook.site para teste: ${this.getFallbackUrl()}`;
  }
}
