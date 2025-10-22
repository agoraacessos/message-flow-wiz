import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";

interface WebhookStatusProps {
  webhookUrl?: string;
  webhookStatus?: 'success' | 'error' | 'pending' | 'not_configured';
  errorMessage?: string;
}

export function WebhookStatus({ webhookUrl, webhookStatus, errorMessage }: WebhookStatusProps) {
  if (!webhookUrl) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        <span>Webhook não configurado</span>
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (webhookStatus) {
      case 'success':
        return {
          icon: CheckCircle2,
          variant: 'default' as const,
          label: 'Webhook OK',
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          label: 'Webhook Erro',
          color: 'text-red-600'
        };
      case 'pending':
        return {
          icon: AlertCircle,
          variant: 'secondary' as const,
          label: 'Webhook Pendente',
          color: 'text-yellow-600'
        };
      default:
        return {
          icon: AlertCircle,
          variant: 'outline' as const,
          label: 'Webhook Configurado',
          color: 'text-blue-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        <a 
          href={webhookUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
          title="Abrir URL do webhook"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      
      {errorMessage && (
        <p className="text-xs text-red-600">
          ❌ {errorMessage}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground truncate max-w-xs" title={webhookUrl}>
        {webhookUrl}
      </p>
    </div>
  );
}
