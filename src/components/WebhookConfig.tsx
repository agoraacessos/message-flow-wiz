import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { WebhookService } from "@/utils/webhookService";
import { WebhookFallback } from "@/utils/webhookFallback";
import { N8nWebhookService } from "@/utils/n8nWebhookService";
import { useToast } from "@/hooks/use-toast";

interface WebhookConfigProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  onTestWebhook: () => void;
}

export function WebhookConfig({ webhookUrl, onWebhookUrlChange, onTestWebhook }: WebhookConfigProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma URL de webhook primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Se for URL do n8n, usar o serviço específico
      const result = isN8nUrl 
        ? await N8nWebhookService.testN8nWebhook(webhookUrl)
        : await WebhookService.testWebhook(webhookUrl);
      setTestResult(result);

      if (result.success) {
        if (result.fallbackUrl) {
          toast({
            title: "✅ Webhook Funcionando (Fallback)!",
            description: `Enviado via ${result.method} usando webhook.site`,
          });
        } else {
          toast({
            title: "✅ Webhook Funcionando!",
            description: `Enviado com sucesso via ${result.method}`,
          });
        }
      } else {
        toast({
          title: "❌ Webhook Falhou",
          description: `Erro: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
      toast({
        title: "❌ Erro no Teste",
        description: `Falha ao testar webhook: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };


  const isN8nUrl = webhookUrl.includes('n8n') || webhookUrl.includes('easypanel');
  const isWebhookSiteUrl = webhookUrl.includes('webhook.site');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="webhook" className="text-sm font-medium">
          URL do Webhook
        </Label>
        {isN8nUrl && (
          <Badge variant="secondary" className="text-xs">
            n8n
          </Badge>
        )}
        {isWebhookSiteUrl && (
          <Badge variant="outline" className="text-xs">
            Teste
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          id="webhook"
          type="url"
          placeholder="https://seu-n8n.com/webhook/..."
          value={webhookUrl}
          onChange={(e) => onWebhookUrlChange(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={isTesting || !webhookUrl}
        >
          <TestTube className="w-4 h-4 mr-2" />
          {isTesting ? "Testando..." : "Testar"}
        </Button>
      </div>

      {/* Resultado do Teste */}
      {testResult && (
        <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
            {testResult.success ? (
              <>
                <strong>✅ Webhook funcionando!</strong><br />
                Status: {testResult.status} | Método: {testResult.method}
                {testResult.fallbackUrl && (
                  <>
                    <br />
                    <small>⚠️ Usando fallback para webhook.site</small>
                  </>
                )}
              </>
            ) : (
              <>
                <strong>❌ Webhook falhou:</strong><br />
                {testResult.error}
                {testResult.fallbackMessage && (
                  <>
                    <br />
                    <strong>💡 Solução:</strong><br />
                    {testResult.fallbackMessage}
                  </>
                )}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Sugestão de Fallback */}
      {testResult && !testResult.success && testResult.fallbackUrl && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>🚀 Teste Rápido:</strong><br />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onWebhookUrlChange(testResult.fallbackUrl!);
                handleTest();
              }}
              className="mt-2"
            >
              Usar webhook.site
            </Button>
          </AlertDescription>
        </Alert>
      )}


    </div>
  );
}
