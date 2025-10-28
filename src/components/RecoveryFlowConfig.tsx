import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecoveryFlowConfigProps {
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

export function RecoveryFlowConfig({ ruleId, ruleName }: RecoveryFlowConfigProps) {
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
        description: 'Fluxo de recuperação foi configurado com sucesso.',
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
      delay_minutes: 0,
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
        title: 'Nenhum passo configurado',
        description: 'Adicione pelo menos um passo ao fluxo.',
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fluxo de Recuperação: {ruleName}</span>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <GripVertical className="h-4 w-4 mr-2" />
                Editar Fluxo
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={saveFlowsMutation.isPending}
                >
                  {saveFlowsMutation.isPending ? 'Salvando...' : 'Salvar Fluxo'}
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // Visualização do fluxo
          <div className="space-y-4">
            {existingFlows && existingFlows.length > 0 ? (
              existingFlows.map((flow, index) => (
                <div key={flow.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Badge variant="outline">{flow.sequence_order}</Badge>
                  <div className="flex-1">
                    <h4 className="font-medium">{flow.messages?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Delay: {flow.delay_minutes} minutos
                    </p>
                    {flow.webhook_url && (
                      <p className="text-xs text-muted-foreground">
                        Webhook: {flow.webhook_url}
                      </p>
                    )}
                  </div>
                  <Badge variant={flow.is_active ? "default" : "secondary"}>
                    {flow.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum fluxo configurado. Clique em "Editar Fluxo" para configurar.
              </p>
            )}
          </div>
        ) : (
          // Edição do fluxo
          <div className="space-y-4">
            {flows.map((flow, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Passo {flow.sequence_order}</h4>
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
                    <Label>Delay (minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={flow.delay_minutes}
                      onChange={(e) => handleStepChange(index, 'delay_minutes', Number(e.target.value))}
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
              Adicionar Passo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
