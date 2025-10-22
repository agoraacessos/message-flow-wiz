import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from "lucide-react";

interface DiagnosticResult {
  test: string;
  success: boolean;
  error?: string;
  details?: string;
}

export function WebhookDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const diagnostics: DiagnosticResult[] = [];

    // Teste 1: Verificar se fetch está disponível
    try {
      if (typeof fetch !== 'undefined') {
        diagnostics.push({
          test: "Fetch API",
          success: true,
          details: "Disponível"
        });
      } else {
        diagnostics.push({
          test: "Fetch API",
          success: false,
          error: "Não disponível"
        });
      }
    } catch (error) {
      diagnostics.push({
        test: "Fetch API",
        success: false,
        error: error.message
      });
    }

    // Teste 2: Verificar origem atual
    try {
      const origin = window.location.origin;
      diagnostics.push({
        test: "Origem Atual",
        success: true,
        details: origin
      });
    } catch (error) {
      diagnostics.push({
        test: "Origem Atual",
        success: false,
        error: error.message
      });
    }

    // Teste 3: Testar requisição simples
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        diagnostics.push({
          test: "Requisição HTTP Simples",
          success: true,
          details: `Status: ${response.status}`
        });
      } else {
        diagnostics.push({
          test: "Requisição HTTP Simples",
          success: false,
          error: `Status: ${response.status}`
        });
      }
    } catch (error) {
      diagnostics.push({
        test: "Requisição HTTP Simples",
        success: false,
        error: error.message
      });
    }

    // Teste 4: Testar webhook.site
    try {
      const webhookUrl = 'https://webhook.site/unique-id';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });
      
      if (response.ok) {
        diagnostics.push({
          test: "Webhook.site",
          success: true,
          details: `Status: ${response.status}`
        });
      } else {
        diagnostics.push({
          test: "Webhook.site",
          success: false,
          error: `Status: ${response.status}`
        });
      }
    } catch (error) {
      diagnostics.push({
        test: "Webhook.site",
        success: false,
        error: error.message
      });
    }

    // Teste 5: Verificar extensões do navegador
    try {
      const hasExtensions = window.chrome && window.chrome.runtime;
      diagnostics.push({
        test: "Extensões Chrome",
        success: true,
        details: hasExtensions ? "Detectadas" : "Não detectadas"
      });
    } catch (error) {
      diagnostics.push({
        test: "Extensões Chrome",
        success: false,
        error: error.message
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        OK
      </Badge>
    ) : (
      <Badge variant="destructive">
        ERRO
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Diagnóstico de Webhook
        </CardTitle>
        <CardDescription className="text-xs">
          Execute este diagnóstico para identificar problemas de CORS e conectividade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full"
          variant="outline"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Executando Diagnóstico...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Executar Diagnóstico
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Resultados:</h4>
            {results.map((result, index) => (
              <Alert key={index} className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.success)}
                    <span className="text-sm font-medium">{result.test}</span>
                  </div>
                  {getStatusBadge(result.success)}
                </div>
                {result.details && (
                  <AlertDescription className="text-xs mt-1">
                    {result.details}
                  </AlertDescription>
                )}
                {result.error && (
                  <AlertDescription className="text-xs mt-1 text-red-700">
                    <strong>Erro:</strong> {result.error}
                  </AlertDescription>
                )}
              </Alert>
            ))}
          </div>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>💡 Dicas:</strong><br />
            • Se "Webhook.site" falhar, o problema é de CORS global<br />
            • Se "Requisição HTTP Simples" falhar, há problema de rede<br />
            • Extensões do navegador podem bloquear requisições<br />
            • Tente em modo incógnito para testar
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
