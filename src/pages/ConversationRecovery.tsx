import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  Settings,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Timer
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { RecoveryFlowConfig } from "@/components/RecoveryFlowConfig";
import { SimpleFlowConfig } from "@/components/SimpleFlowConfig";
import { MessageDetectionTest } from "@/components/MessageDetectionTest";

export default function ConversationRecovery() {
  // Estados para formulário de nova regra
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [triggerText, setTriggerText] = useState("");
  const [triggerType, setTriggerType] = useState("contains");
  const [timeoutMinutes, setTimeoutMinutes] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isActive, setIsActive] = useState(true);

  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"rules" | "conversations" | "logs" | "test">("rules");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para controlar qual regra está sendo editada
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["recovery-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recovery_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["monitored-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitored_conversations")
        .select(`
          *,
          contacts(name, phone),
          recovery_rules(name, trigger_text)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const { data, error } = await supabase
        .from("recovery_rules")
        .insert(ruleData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-rules"] });
      toast({
        title: "Regra criada!",
        description: "Nova regra de recuperação foi criada com sucesso.",
      });
      // Limpar formulário
      setRuleName("");
      setRuleDescription("");
      setTriggerText("");
      setTriggerType("contains");
      setTimeoutMinutes(60);
      setMaxAttempts(3);
      setIsActive(true);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar regra: " + error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("recovery_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-rules"] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recovery_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-rules"] });
      toast({
        title: "Regra excluída!",
        description: "Regra de recuperação foi excluída com sucesso.",
      });
    },
  });

  // Handlers
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ruleName || !triggerText) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e texto de ativação são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    createRuleMutation.mutate({
      name: ruleName,
      description: ruleDescription,
      trigger_text: triggerText,
      trigger_type: triggerType,
      timeout_minutes: timeoutMinutes,
      max_attempts: maxAttempts,
      is_active: isActive,
    });
  };

  const handleToggleRule = (id: string, currentStatus: boolean) => {
    toggleRuleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta regra?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  // Filtros e paginação
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    return rules.filter(rule =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.trigger_text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter(conv =>
      conv.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.trigger_message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const getPaginatedItems = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_response':
        return <Badge variant="outline" className="text-yellow-600">Aguardando Resposta</Badge>;
      case 'sending_message':
        return <Badge variant="outline" className="text-blue-600">Enviando Mensagem</Badge>;
      case 'completed':
        return <Badge variant="default" className="text-green-600">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Recuperação de Conversas
            </h1>
            <p className="mt-2 text-muted-foreground">
              Configure regras automáticas para recuperar conversas perdidas
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rules">Regras de Recuperação</TabsTrigger>
              <TabsTrigger value="conversations">Conversas Monitoradas</TabsTrigger>
              <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
              <TabsTrigger value="test">Teste de Detecção</TabsTrigger>
            </TabsList>

          {/* TAB: Regras de Recuperação */}
          <TabsContent value="rules" className="space-y-6">
            {/* Formulário de Nova Regra */}
            <Card>
              <CardHeader>
                <CardTitle>Criar Nova Regra de Recuperação</CardTitle>
                <CardDescription>
                  Configure quando e como recuperar conversas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rule-name">Nome da Regra *</Label>
                      <Input
                        id="rule-name"
                        placeholder="Ex: Cliente Interessado"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trigger-text">Texto de Ativação *</Label>
                      <Input
                        id="trigger-text"
                        placeholder="Ex: interessado"
                        value={triggerText}
                        onChange={(e) => setTriggerText(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-description">Descrição</Label>
                    <Textarea
                      id="rule-description"
                      placeholder="Descreva quando esta regra deve ser ativada..."
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trigger-type">Tipo de Ativação</Label>
                      <Select value={triggerType} onValueChange={setTriggerType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="exact">Exato</SelectItem>
                          <SelectItem value="starts_with">Começa com</SelectItem>
                          <SelectItem value="ends_with">Termina com</SelectItem>
                          <SelectItem value="regex">Expressão Regular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (minutos)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="1"
                        value={timeoutMinutes}
                        onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-attempts">Máx. Tentativas</Label>
                      <Input
                        id="max-attempts"
                        type="number"
                        min="1"
                        max="10"
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                    <Label htmlFor="is-active">Regra ativa</Label>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createRuleMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createRuleMutation.isPending ? "Criando..." : "Criar Regra"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Regras */}
            <Card>
              <CardHeader>
                <CardTitle>Regras Configuradas</CardTitle>
                <CardDescription>
                  Gerencie suas regras de recuperação de conversas
                </CardDescription>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar regras..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <p>Carregando regras...</p>
                ) : getPaginatedItems(filteredRules).length > 0 ? (
                  <div className="space-y-4">
                    {getPaginatedItems(filteredRules).map((rule) => (
                      <div key={rule.id} className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{rule.name}</h3>
                              <Badge variant={rule.is_active ? "default" : "secondary"}>
                                {rule.is_active ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rule.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Ativação: "{rule.trigger_text}" ({rule.trigger_type})</span>
                              <span>Timeout: {rule.timeout_minutes}min</span>
                              <span>Máx. tentativas: {rule.max_attempts}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            >
                              {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Mostrar fluxo se esta regra está sendo editada */}
                        {editingRuleId === rule.id && (
                          <div className="mt-4">
                            <SimpleFlowConfig 
                              ruleId={rule.id} 
                              ruleName={rule.trigger_text}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma regra encontrada.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Conversas Monitoradas */}
          <TabsContent value="conversations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversas em Monitoramento</CardTitle>
                <CardDescription>
                  Acompanhe conversas que estão sendo monitoradas automaticamente
                </CardDescription>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar conversas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <p>Carregando conversas...</p>
                ) : getPaginatedItems(filteredConversations).length > 0 ? (
                  <div className="space-y-4">
                    {getPaginatedItems(filteredConversations).map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {conversation.contacts?.name || 'Contato Desconhecido'}
                            </h3>
                            {getStatusBadge(conversation.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Regra:</strong> {conversation.recovery_rules?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Mensagem que ativou:</strong> "{conversation.trigger_message}"
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Passo atual: {conversation.current_flow_step}</span>
                            <span>Tentativas: {conversation.attempts_count}</span>
                            <span>
                              Ativado em: {new Date(conversation.trigger_received_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma conversa sendo monitorada.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Logs */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Atividade</CardTitle>
                <CardDescription>
                  Histórico de todas as ações do sistema de recuperação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Logs serão implementados em breve...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Teste de Detecção */}
          <TabsContent value="test" className="space-y-6">
            <MessageDetectionTest />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
