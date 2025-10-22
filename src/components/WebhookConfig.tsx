import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { WebhookService } from "@/utils/webhookService";
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
      const result = await WebhookService.testWebhook(webhookUrl);
      setTestResult(result);

      if (result.success) {
        toast({
          title: "✅ Webhook Funcionando!",
          description: `Enviado com sucesso via ${result.method}`,
        });
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

  const openWebhookSite = () => {
    window.open('https://webhook.site', '_blank');
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
              </>
            ) : (
              <>
                <strong>❌ Webhook falhou:</strong><br />
                {testResult.error}
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos e Dicas */}
      {isN8nUrl && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>URL do n8n detectada:</strong><br />
            • Verifique se o webhook está ativo no n8n<br />
            • Configure CORS para permitir requisições do Vercel<br />
            • Certifique-se de que a URL está correta
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">💡 Dicas de Configuração</CardTitle>
          <CardDescription className="text-xs">
            Configure seu webhook corretamente para receber os dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Para testes rápidos:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openWebhookSite}
              className="text-xs h-6 px-2"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              webhook.site
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <strong>Para n8n:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>HTTP Method: POST</li>
              <li>Response: Immediately</li>
              <li>CORS: Permitir origem do Vercel</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        O webhook receberá dados completos no formato Evolution API, incluindo informações do contato, mensagem e campanha.
      </p>
    </div>
  );
}
