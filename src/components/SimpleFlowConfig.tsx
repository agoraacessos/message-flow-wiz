import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight, Timer, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimpleFlowConfigProps {
  ruleId: string;
  ruleName: string;
}

interface FlowStep {
  id?: string;
  sequence_order: number;
  delay_minutes: number;
  message_id: string;
  webhook_url: string;
  is_active: boolean;
}

export function SimpleFlowConfig({ ruleId, ruleName }: SimpleFlowConfigProps) {
  const [flows, setFlows] = useState<FlowStep[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar fluxos existentes
  const { data: existingFlows, isLoading } = useQuery({
    queryKey: ['recovery-flows', ruleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recovery_flows')
        .select(`
          *,
          messages(title, content)
        `)
        .eq('rule_id', ruleId)
        .order('sequence_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Buscar mensagens disponíveis
  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('messages').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Mutation para salvar fluxos
  const saveFlowsMutation = useMutation({
    mutationFn: async (flowsToSave: FlowStep[]) => {
      // Deletar fluxos existentes
      await supabase
        .from('recovery_flows')
        .delete()
        .eq('rule_id', ruleId);

      // Inserir novos fluxos
      if (flowsToSave.length > 0) {
        const { error } = await supabase
          .from('recovery_flows')
          .insert(flowsToSave.map(flow => ({
            rule_id: ruleId,
            sequence_order: flow.sequence_order,
            delay_minutes: flow.delay_minutes,
            message_id: flow.message_id,
            webhook_url: flow.webhook_url || null,
            is_active: flow.is_active
          })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-flows', ruleId] });
      setIsEditing(false);
      toast({
        title: 'Fluxo salvo!',
        description: 'Sequência de mensagens configurada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar fluxo: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddStep = () => {
    const newStep: FlowStep = {
      sequence_order: flows.length + 1,
      delay_minutes: 30, // Default 30 minutos
      message_id: messages?.[0]?.id || '',
      webhook_url: '',
      is_active: true
    };
    setFlows([...flows, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const newFlows = flows.filter((_, i) => i !== index);
    // Reordenar sequence_order
    newFlows.forEach((flow, i) => {
      flow.sequence_order = i + 1;
    });
    setFlows(newFlows);
  };

  const handleStepChange = (index: number, field: keyof FlowStep, value: any) => {
    const newFlows = [...flows];
    newFlows[index] = { ...newFlows[index], [field]: value };
    setFlows(newFlows);
  };

  const handleSave = () => {
    if (flows.length === 0) {
      toast({
        title: 'Nenhuma mensagem configurada',
        description: 'Adicione pelo menos uma mensagem ao fluxo.',
        variant: 'destructive',
      });
      return;
    }

    saveFlowsMutation.mutate(flows);
  };

  const handleEdit = () => {
    if (existingFlows) {
      setFlows(existingFlows.map(flow => ({
        id: flow.id,
        sequence_order: flow.sequence_order,
        delay_minutes: flow.delay_minutes,
        message_id: flow.message_id,
        webhook_url: flow.webhook_url || '',
        is_active: flow.is_active
      })));
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFlows([]);
    setIsEditing(false);
  };

  if (isLoading) {
    return <p>Carregando fluxo...</p>;
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Sequência de Mensagens: {ruleName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as mensagens que serão enviadas quando alguém digitar "{ruleName}"
        </p>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // Visualização do fluxo
          <div className="space-y-4">
            {existingFlows && existingFlows.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MessageSquare className="h-4 w-4" />
                  <span>Fluxo atual:</span>
                </div>
                
                {existingFlows.map((flow, index) => (
                  <div key={flow.id} className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      {flow.sequence_order}
                    </Badge>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{flow.messages?.title}</h4>
                      <p className="text-sm text-blue-700">
                        {flow.messages?.content?.substring(0, 50)}...
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Timer className="h-4 w-4" />
                      <span>{flow.delay_minutes}min</span>
                    </div>
                    
                    {index < existingFlows.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    <strong>Como funciona:</strong> Quando alguém digitar "{ruleName}", 
                    o sistema enviará a primeira mensagem imediatamente, 
                    aguardará {existingFlows[0]?.delay_minutes || 30} minutos, 
                    e se não receber resposta, enviará a próxima mensagem.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma sequência configurada ainda.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure as mensagens que serão enviadas automaticamente quando alguém digitar "{ruleName}".
                </p>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleEdit}>
                <Plus className="h-4 w-4 mr-2" />
                {existingFlows && existingFlows.length > 0 ? 'Editar Sequência' : 'Configurar Sequência'}
              </Button>
            </div>
          </div>
        ) : (
          // Edição do fluxo
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Cliente digita "{ruleName}"</li>
                <li>2. Sistema envia primeira mensagem imediatamente</li>
                <li>3. Aguarda X minutos (configurado abaixo)</li>
                <li>4. Se não recebeu resposta → Envia próxima mensagem</li>
                <li>5. Repete até esgotar tentativas</li>
              </ol>
            </div>
            
            {flows.map((flow, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{flow.sequence_order}</Badge>
                    <span className="font-medium">Mensagem {flow.sequence_order}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Select
                      value={flow.message_id}
                      onValueChange={(value) => handleStepChange(index, 'message_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma mensagem" />
                      </SelectTrigger>
                      <SelectContent>
                        {messages?.map((message) => (
                          <SelectItem key={message.id} value={message.id}>
                            {message.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Aguardar antes de enviar (minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={flow.delay_minutes}
                      onChange={(e) => handleStepChange(index, 'delay_minutes', Number(e.target.value))}
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Webhook URL (opcional)</Label>
                  <Input
                    placeholder="https://seu-webhook.com/endpoint"
                    value={flow.webhook_url}
                    onChange={(e) => handleStepChange(index, 'webhook_url', e.target.value)}
                  />
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={handleAddStep}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Mensagem
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveFlowsMutation.isPending}
                className="flex-1"
              >
                {saveFlowsMutation.isPending ? 'Salvando...' : 'Salvar Sequência'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
