import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { MessageDetectionService } from '@/utils/messageDetectionService';
import { useToast } from '@/hooks/use-toast';

export function MessageDetectionTest() {
  const [testMessage, setTestMessage] = useState('interessado');
  const [testPhone, setTestPhone] = useState('5511999999999');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  
  const { toast } = useToast();

  const handleTestDetection = async () => {
    if (!testMessage.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma mensagem para testar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setLastResult(null);

    try {
      // Simular mensagem recebida do WhatsApp
      const messageData = {
        from: testPhone,
        message: testMessage,
        timestamp: new Date().toISOString(),
        messageId: `test_${Date.now()}`
      };

      console.log('🧪 Testando detecção com:', messageData);
      
      // Processar a mensagem
      await MessageDetectionService.processIncomingMessage(messageData);
      
      setLastResult({
        success: true,
        message: 'Mensagem processada com sucesso!',
        data: messageData
      });

      toast({
        title: 'Sucesso!',
        description: 'Mensagem processada e regras verificadas.',
      });

    } catch (error) {
      console.error('❌ Erro no teste:', error);
      
      setLastResult({
        success: false,
        message: 'Erro ao processar mensagem: ' + error.message,
        data: null
      });

      toast({
        title: 'Erro',
        description: 'Erro ao processar mensagem: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleMessages = [
    'interessado',
    'quero saber mais',
    'me interessa',
    'não sei',
    'talvez',
    'quanto custa',
    'não quero',
    'caro demais'
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Teste de Detecção de Mensagens
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Teste como o sistema detecta palavras-chave nas mensagens recebidas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Formulário de teste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="testPhone">Número do WhatsApp</Label>
            <Input
              id="testPhone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="testMessage">Mensagem para testar</Label>
            <Input
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
            />
          </div>
        </div>

        {/* Mensagens de exemplo */}
        <div className="space-y-2">
          <Label>Mensagens de exemplo:</Label>
          <div className="flex flex-wrap gap-2">
            {exampleMessages.map((msg) => (
              <Button
                key={msg}
                variant="outline"
                size="sm"
                onClick={() => setTestMessage(msg)}
                className="text-xs"
              >
                "{msg}"
              </Button>
            ))}
          </div>
        </div>

        {/* Botão de teste */}
        <Button
          onClick={handleTestDetection}
          disabled={isProcessing}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processando...' : 'Testar Detecção'}
        </Button>

        {/* Resultado do teste */}
        {lastResult && (
          <Alert variant={lastResult.success ? 'default' : 'destructive'}>
            {lastResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{lastResult.message}</p>
                {lastResult.data && (
                  <div className="text-sm space-y-1">
                    <p><strong>De:</strong> {lastResult.data.from}</p>
                    <p><strong>Mensagem:</strong> "{lastResult.data.message}"</p>
                    <p><strong>Timestamp:</strong> {new Date(lastResult.data.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Informações sobre como funciona */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. <strong>Digite uma mensagem</strong> (ex: "interessado")</li>
            <li>2. <strong>Clique em "Testar Detecção"</strong></li>
            <li>3. <strong>Sistema verifica</strong> se há regras ativas que correspondem</li>
            <li>4. <strong>Se encontrar:</strong> Ativa o fluxo de recuperação</li>
            <li>5. <strong>Se não encontrar:</strong> Ignora a mensagem</li>
          </ol>
        </div>

        {/* Tipos de detecção */}
        <div className="space-y-2">
          <Label>Tipos de detecção disponíveis:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Contém</Badge>
              <span className="text-muted-foreground">"interessado" em qualquer lugar</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Exato</Badge>
              <span className="text-muted-foreground">Exatamente "interessado"</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Começa com</Badge>
              <span className="text-muted-foreground">Mensagem começa com "interessado"</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Termina com</Badge>
              <span className="text-muted-foreground">Mensagem termina com "interessado"</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Regex</Badge>
              <span className="text-muted-foreground">Padrão personalizado</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
