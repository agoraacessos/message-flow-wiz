import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CheckCircle2, XCircle, Plus, Search, Filter, Users, Calendar, Building, Edit, Trash2 } from "lucide-react";
import { CampaignStatus } from "@/components/CampaignStatus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignProcessor } from "@/hooks/useCampaignProcessor";

export default function Campaigns() {
  const [name, setName] = useState("");
  const [messageId, setMessageId] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [minDelayBetweenClients, setMinDelayBetweenClients] = useState(5);
  const [maxDelayBetweenClients, setMaxDelayBetweenClients] = useState(15);
  
  // Estados para filtros de contatos
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "company">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Estados para edição e exclusão
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Hook para processar campanhas imediatas automaticamente
  useCampaignProcessor();

  const { data: messages } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, messages(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      console.log('Criando campanha com dados:', {
        name,
        messageId,
        selectedContacts,
        scheduledAt,
        webhookUrl
      });

      const campaign = {
        name,
        message_id: messageId,
        contact_ids: selectedContacts,
        scheduled_at: scheduledAt || null,
        webhook_url: webhookUrl || null,
        min_delay_between_clients: minDelayBetweenClients,
        max_delay_between_clients: maxDelayBetweenClients,
        status: "pending",
      };

      console.log('Dados da campanha a serem inseridos:', campaign);

      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar campanha:', error);
        throw error;
      }

      console.log('Campanha criada com sucesso:', data);

      // Call webhook if provided
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaign_id: data.id }),
          });
        } catch (webhookError) {
          console.warn('Erro ao chamar webhook:', webhookError);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      resetForm();
      
      // Verificar se é campanha imediata
      const isImmediate = !scheduledAt;
      
      toast({
        title: "Sucesso!",
        description: isImmediate 
          ? "Campanha criada e será processada imediatamente!" 
          : "Campanha criada com sucesso.",
      });
      
      if (isImmediate) {
        // Notificação adicional para campanhas imediatas
        setTimeout(() => {
          toast({
            title: "⚡ Processamento Automático",
            description: "Sua campanha imediata está sendo processada agora!",
          });
        }, 2000);
      }
    },
    onError: (error) => {
      console.error('Erro na criação da campanha:', error);
      toast({
        title: "Erro",
        description: `Falha ao criar campanha: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCampaign) throw new Error("Campanha não encontrada");
      
      const campaignData = {
        name,
        message_id: messageId,
        contact_ids: selectedContacts,
        scheduled_at: scheduledAt || null,
        webhook_url: webhookUrl || null,
        min_delay_between_clients: minDelayBetweenClients,
        max_delay_between_clients: maxDelayBetweenClients,
      };

      const { error } = await supabase
        .from("campaigns")
        .update(campaignData)
        .eq("id", editingCampaign.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditingCampaign(null);
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Campanha atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar campanha: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setCampaignToDelete(null);
      toast({
        title: "Sucesso!",
        description: "Campanha excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao excluir campanha: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da campanha é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (!messageId) {
      toast({
        title: "Erro",
        description: "Selecione uma mensagem.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedContacts.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um contato.",
        variant: "destructive",
      });
      return;
    }
    
    if (minDelayBetweenClients >= maxDelayBetweenClients) {
      toast({
        title: "Erro",
        description: "Delay mínimo deve ser menor que o máximo.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingCampaign) {
        updateMutation.mutate();
      } else {
        createMutation.mutate();
      }
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar campanha.",
        variant: "destructive",
      });
    }
  };

  const handleEditCampaign = (campaign: any) => {
    setEditingCampaign(campaign);
    setName(campaign.name);
    setMessageId(campaign.message_id);
    setSelectedContacts(campaign.contact_ids || []);
    setScheduledAt(campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : "");
    setWebhookUrl(campaign.webhook_url || "");
    setMinDelayBetweenClients(campaign.min_delay_between_clients || 5);
    setMaxDelayBetweenClients(campaign.max_delay_between_clients || 15);
    setIsEditDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingCampaign(null);
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(campaignId);
    }
  };

  const resetForm = () => {
    setName("");
    setMessageId("");
    setSelectedContacts([]);
    setScheduledAt("");
    setWebhookUrl("");
    setMinDelayBetweenClients(5);
    setMaxDelayBetweenClients(15);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { icon: Clock, variant: "secondary" },
      sending: { icon: Send, variant: "outline" },
      sent: { icon: CheckCircle2, variant: "default" },
      error: { icon: XCircle, variant: "destructive" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status === "pending" ? "Pendente" : 
         status === "sending" ? "Enviando" :
         status === "sent" ? "Enviado" : "Erro"}
      </Badge>
    );
  };

  // Lógica de filtros e ordenação para contatos
  const filteredAndSortedContacts = contacts ? contacts
    .filter((contact) => {
      // Filtro por busca
      if (contactSearchTerm) {
        const searchLower = contactSearchTerm.toLowerCase();
        return (
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.company?.toLowerCase().includes(searchLower) ||
          contact.tags?.some((tag: any) => String(tag).toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .filter((contact) => {
      // Filtro por tag (comparação exata)
      if (tagFilter && tagFilter !== "all") {
        return contact.tags?.some((tag: any) => 
          String(tag).toLowerCase() === tagFilter.toLowerCase()
        );
      }
      return true;
    })
    .filter((contact) => {
      // Filtro por empresa
      if (companyFilter && companyFilter !== "all") {
        return contact.company?.toLowerCase().includes(companyFilter.toLowerCase());
      }
      return true;
    })
    .filter((contact) => {
      // Filtro por data
      if (dateFilter && dateFilter !== "all") {
        const contactDate = new Date(contact.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            return contactDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return contactDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return contactDate >= monthAgo;
          default:
            return true;
        }
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "company":
          aValue = (a.company || "").toLowerCase();
          bValue = (b.company || "").toLowerCase();
          break;
        default:
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
      }
      
      if (sortOrder === "asc") {
        // Para strings, usar localeCompare para ordenação alfabética correta
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue, 'pt-BR');
        }
        return aValue > bValue ? 1 : -1;
      } else {
        // Para strings, usar localeCompare para ordenação alfabética correta
        if (typeof aValue === "string" && typeof bValue === "string") {
          return bValue.localeCompare(aValue, 'pt-BR');
        }
        return aValue < bValue ? 1 : -1;
      }
    }) : [];

  // Obter dados únicos para os filtros
  const allTags = contacts ? Array.from(new Set(
    contacts.flatMap(contact => contact.tags || [])
  )).sort() : [];

  const allCompanies = contacts ? Array.from(new Set(
    contacts.map(contact => contact.company).filter(Boolean)
  )).sort() : [];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Campanhas</h1>
            <p className="mt-2 text-muted-foreground">
              Crie e gerencie suas campanhas de disparo
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Processamento automático ativo</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["campaigns"] });
                toast({
                  title: "Atualizado!",
                  description: "Lista de campanhas atualizada.",
                });
              }}
            >
              <Clock className="mr-2 h-4 w-4" />
              Atualizar Status
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  // Buscar campanhas pendentes imediatas
                  const { data: campaigns } = await supabase
                    .from('campaigns')
                    .select('*')
                    .eq('status', 'pending')
                    .is('scheduled_at', null);

                  if (campaigns && campaigns.length > 0) {
                    toast({
                      title: "Processando!",
                      description: `${campaigns.length} campanha(s) imediata(s) sendo processada(s).`,
                    });
                  } else {
                    toast({
                      title: "Nenhuma campanha pendente",
                      description: "Não há campanhas imediatas para processar.",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro",
                    description: "Erro ao verificar campanhas pendentes.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Processar Imediatas
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  // Buscar campanhas presas no status "enviando"
                  const { data: stuckCampaigns } = await supabase
                    .from('campaigns')
                    .select('*')
                    .eq('status', 'sending');

                  if (stuckCampaigns && stuckCampaigns.length > 0) {
                    // Resetar para pendente
                    const { error } = await supabase
                      .from('campaigns')
                      .update({ status: 'pending' })
                      .eq('status', 'sending');

                    if (error) {
                      throw error;
                    }

                    toast({
                      title: "Campanhas Resetadas!",
                      description: `${stuckCampaigns.length} campanha(s) resetada(s) para pendente.`,
                    });

                    // Atualizar lista
                    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
                  } else {
                    toast({
                      title: "Nenhuma campanha presa",
                      description: "Não há campanhas presas no status 'Enviando'.",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro",
                    description: "Erro ao resetar campanhas presas.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Resetar Presas
            </Button>
          </div>
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</CardTitle>
            <CardDescription>
              {editingCampaign ? 'Edite os dados da campanha' : 'Configure uma campanha de disparo para seus contatos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nome da Campanha</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex: Black Friday 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Select value={messageId} onValueChange={setMessageId} required>
                  <SelectTrigger id="message">
                    <SelectValue placeholder="Selecione uma mensagem" />
                  </SelectTrigger>
                  <SelectContent>
                    {messages?.map((msg) => (
                      <SelectItem key={msg.id} value={msg.id}>
                        {msg.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Contatos ({selectedContacts.length} selecionados)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = filteredAndSortedContacts.map(c => c.id);
                        setSelectedContacts(allIds);
                      }}
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedContacts([])}
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                </div>

                {/* Filtros de Contatos */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Busca */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-search">Buscar</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="contact-search"
                            placeholder="Nome, telefone, email..."
                            value={contactSearchTerm}
                            onChange={(e) => setContactSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {/* Filtro por Tag */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-tag-filter">Filtrar por Tag</Label>
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as tags" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as tags</SelectItem>
                            {allTags.map((tag) => (
                              <SelectItem key={tag} value={tag}>
                                {tag}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro por Empresa */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-company-filter">Filtrar por Empresa</Label>
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as empresas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as empresas</SelectItem>
                            {allCompanies.map((company) => (
                              <SelectItem key={company} value={company}>
                                {company}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro por Data */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-date-filter">Filtrar por Data</Label>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as datas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as datas</SelectItem>
                            <SelectItem value="today">Hoje</SelectItem>
                            <SelectItem value="week">Última semana</SelectItem>
                            <SelectItem value="month">Último mês</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ordenar por */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-sort-by">Ordenar por</Label>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Nome</SelectItem>
                            <SelectItem value="created_at">Data de Inclusão</SelectItem>
                            <SelectItem value="company">Empresa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ordem */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-sort-order">Ordem</Label>
                        <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Crescente</SelectItem>
                            <SelectItem value="desc">Decrescente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Contatos Filtrados */}
                <div className="max-h-64 overflow-y-auto rounded-lg border p-4 space-y-2">
                  {filteredAndSortedContacts.length > 0 ? (
                    filteredAndSortedContacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-accent rounded p-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact.id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{contact.name}</span>
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex gap-1">
                                {contact.tags.slice(0, 2).map((tag: any) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {contact.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{contact.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.phone}
                            {contact.company && ` • ${contact.company}`}
                            {contact.email && ` • ${contact.email}`}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum contato encontrado com os filtros aplicados</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled">Agendar Envio (opcional)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para enviar imediatamente
                </p>
              </div>

              {/* Configurações de Timing de Envio */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium">Configurações de Timing de Envio</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-delay">Delay Mínimo desde Início (segundos)</Label>
                    <Input
                      id="min-delay"
                      type="number"
                      min="1"
                      max="300"
                      value={minDelayBetweenClients}
                      onChange={(e) => setMinDelayBetweenClients(Number(e.target.value))}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-delay">Delay Máximo desde Início (segundos)</Label>
                    <Input
                      id="max-delay"
                      type="number"
                      min="1"
                      max="300"
                      value={maxDelayBetweenClients}
                      onChange={(e) => setMaxDelayBetweenClients(Number(e.target.value))}
                      placeholder="15"
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium mb-1">💡 Como funciona:</p>
                  <p className="text-xs text-blue-700">
                    Cada contato receberá a mensagem em um tempo aleatório entre {minDelayBetweenClients} e {maxDelayBetweenClients} segundos 
                    <strong> a partir do início do disparo da campanha</strong>. Isso evita que todos recebam ao mesmo tempo.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook">URL do Webhook n8n (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook"
                    type="url"
                    placeholder="https://seu-n8n.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                  {webhookUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch(webhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              test: true,
                              message: 'Teste de webhook',
                              timestamp: new Date().toISOString()
                            })
                          });
                          
                          if (response.ok) {
                            toast({
                              title: "✅ Webhook OK!",
                              description: `Status: ${response.status} - Webhook funcionando!`,
                            });
                          } else {
                            toast({
                              title: "❌ Webhook com Problema",
                              description: `Status: ${response.status} - Verifique a URL`,
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "❌ Erro no Webhook",
                            description: `Erro: ${error.message} - URL inválida ou inacessível`,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Testar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Teste a URL antes de criar a campanha. Use <a href="https://webhook.site" target="_blank" className="text-blue-600 underline">webhook.site</a> para testes.
                </p>
              </div>

              <div className="flex gap-2">
                {editingCampaign && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  className={editingCampaign ? "flex-1" : "w-full"}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {editingCampaign ? 'Atualizar Campanha' : 'Criar Campanha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Campanhas Criadas ({campaigns?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : campaigns && campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Send className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                        <CampaignStatus 
                          status={campaign.status || "pending"}
                          sentAt={campaign.sent_at}
                          errorMessage={campaign.error_message}
                          scheduledAt={campaign.scheduled_at}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mensagem: {campaign.messages?.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Contatos: {campaign.contact_ids?.length || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Delay desde início: {campaign.min_delay_between_clients || 5}s - {campaign.max_delay_between_clients || 15}s
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCampaign(campaign)}
                        title="Editar campanha"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        disabled={deleteMutation.isPending}
                        title="Excluir campanha"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Send className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhuma campanha criada</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie sua primeira campanha para começar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
