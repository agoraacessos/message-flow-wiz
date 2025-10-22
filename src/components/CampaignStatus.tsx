import { Badge } from "@/components/ui/badge";
import { Clock, Send, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface CampaignStatusProps {
  status: string;
  sentAt?: string;
  errorMessage?: string;
  scheduledAt?: string;
}

export function CampaignStatus({ status, sentAt, errorMessage, scheduledAt }: CampaignStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          variant: 'secondary' as const,
          label: 'Pendente',
          color: 'text-yellow-600'
        };
      case 'sending':
        return {
          icon: Send,
          variant: 'outline' as const,
          label: 'Enviando',
          color: 'text-blue-600'
        };
      case 'sent':
        return {
          icon: CheckCircle2,
          variant: 'default' as const,
          label: 'Enviado',
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          label: 'Erro',
          color: 'text-red-600'
        };
      default:
        return {
          icon: AlertCircle,
          variant: 'secondary' as const,
          label: 'Desconhecido',
          color: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      
      {status === 'pending' && !scheduledAt && (
        <p className="text-xs text-green-600 font-medium">
          ⚡ Início imediato
        </p>
      )}
      
      {status === 'pending' && scheduledAt && (
        <p className="text-xs text-muted-foreground">
          📅 Agendado para: {new Date(scheduledAt).toLocaleString("pt-BR")}
        </p>
      )}
      
      {status === 'sent' && sentAt && (
        <p className="text-xs text-green-600 font-medium">
          ✅ Enviado em: {new Date(sentAt).toLocaleString("pt-BR")}
        </p>
      )}
      
      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600 font-medium">
          ❌ Erro: {errorMessage}
        </p>
      )}
    </div>
  );
}
