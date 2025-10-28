import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Clock, CheckCircle2, XCircle, Plus, Search, Filter, Users, Calendar, Building, Edit, Trash2, TestTube, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { CampaignStatus } from "@/components/CampaignStatus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignProcessor } from "@/hooks/useCampaignProcessor";
import { WebhookConfig } from "@/components/WebhookConfig";
import { CampaignDiagnostic } from "@/components/CampaignDiagnostic";
import { useCampaignMonitor } from "@/hooks/useCampaignMonitor";

export default function Campaigns() {
  const [name, setName] = useState("");
  const [messageId, setMessageId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [minDelayBetweenClients, setMinDelayBetweenClients] = useState(5);
  const [maxDelayBetweenClients, setMaxDelayBetweenClients] = useState(15);
  
  // Estados para seleção de contatos
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
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
  
  // Estados para campanhas - filtros e paginação
  const [campaignSearchTerm, setCampaignSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"scheduled" | "running" | "completed">("scheduled");
  const [currentPage, setCurrentPage] = useState(1);
  const campaignsPerPage = 10;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Hook para processar campanhas imediatas automaticamente
  const { processImmediateCampaign } = useCampaignProcessor();
  
  // Hook para monitorar campanhas travadas automaticamente
  useCampaignMonitor();

  // Função para testar webhook (usada pelo componente WebhookConfig)
  const handleTestWebhook = () => {
    // Esta função será chamada pelo componente WebhookConfig
  };

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

  // Lógica para filtrar e separar campanhas
  const { scheduledCampaigns, runningCampaigns, completedCampaigns, filteredScheduledCampaigns, filteredRunningCampaigns, filteredCompletedCampaigns } = useMemo(() => {
    if (!campaigns) {
      return {
        scheduledCampaigns: [],
        runningCampaigns: [],
        completedCampaigns: [],
        filteredScheduledCampaigns: [],
        filteredRunningCampaigns: [],
        filteredCompletedCampaigns: []
      };
    }

    // Separar campanhas por status
    const scheduled = campaigns.filter(campaign => 
      campaign.status === 'pending'
    );
    
    const running = campaigns.filter(campaign => 
      campaign.status === 'sending'
    );
    
    const completed = campaigns.filter(campaign => 
      campaign.status === 'sent' || campaign.status === 'error'
    );

    // Aplicar filtro de busca
    const filterBySearch = (campaignList: any[]) => {
      if (!campaignSearchTerm) return campaignList;
      return campaignList.filter(campaign =>
        campaign.name.toLowerCase().includes(campaignSearchTerm.toLowerCase()) ||
        campaign.messages?.title.toLowerCase().includes(campaignSearchTerm.toLowerCase())
      );
    };

    return {
      scheduledCampaigns: scheduled,
      runningCampaigns: running,
      completedCampaigns: completed,
      filteredScheduledCampaigns: filterBySearch(scheduled),
      filteredRunningCampaigns: filterBySearch(running),
      filteredCompletedCampaigns: filterBySearch(completed)
    };
  }, [campaigns, campaignSearchTerm]);

  // Paginação
  const getPaginatedCampaigns = (campaignList: any[]) => {
    const startIndex = (currentPage - 1) * campaignsPerPage;
    const endIndex = startIndex + campaignsPerPage;
    return campaignList.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(
    activeTab === "scheduled" 
      ? filteredScheduledCampaigns.length / campaignsPerPage
      : activeTab === "running"
      ? filteredRunningCampaigns.length / campaignsPerPage
      : filteredCompletedCampaigns.length / campaignsPerPage
  );

  // Função para verificar se campanha pode ser editada/excluída
  const canEditOrDelete = (campaign: any) => {
    return campaign.status === 'pending';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      console.log('Criando campanha com dados:', {
        name,
        messageId,
        selectedContacts,
        scheduledAt,
        webhookUrl
      });
      
      console.log('🔍 Debug scheduledAt:', {
        scheduledAt,
        type: typeof scheduledAt,
        isEmpty: !scheduledAt,
        length: scheduledAt?.length
      });

      // Converter horário local para UTC se scheduledAt estiver preenchido
      let scheduledAtUTC = null;
      if (scheduledAt) {
        // scheduledAt vem no formato "YYYY-MM-DDTHH:MM" (horário local)
        // Precisamos converter para UTC
        const localDate = new Date(scheduledAt);
        scheduledAtUTC = localDate.toISOString();
        
        console.log('🕐 Conversão de fuso horário:', {
          input: scheduledAt,
          localDate: localDate.toString(),
          utcDate: scheduledAtUTC,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      }

      const campaign = {
        name,
        message_id: messageId,
        contact_ids: selectedContacts,
        contact_selection_mode: "contacts",
        scheduled_at: scheduledAtUTC,
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

      // Webhook será enviado apenas durante o processamento da campanha
      // Não enviamos webhook na criação, apenas no processamento

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
      
      // Converter horário local para UTC se scheduledAt estiver preenchido
      let scheduledAtUTC = null;
      if (scheduledAt) {
        const localDate = new Date(scheduledAt);
        scheduledAtUTC = localDate.toISOString();
        
        console.log('🕐 Conversão de fuso horário (update):', {
          input: scheduledAt,
          localDate: localDate.toString(),
          utcDate: scheduledAtUTC
        });
      }

      const campaignData = {
        name,
        message_id: messageId,
        contact_ids: selectedContacts,
        scheduled_at: scheduledAtUTC,
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
      resetFormForEdit();
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
    if (!canEditOrDelete(campaign)) {
      toast({
        title: "Não é possível editar",
        description: "Apenas campanhas pendentes podem ser editadas.",
        variant: "destructive",
      });
      return;
    }
    
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
    resetFormForEdit();
  };

  const handleDeleteCampaign = (campaign: any) => {
    if (!canEditOrDelete(campaign)) {
      toast({
        title: "Não é possível excluir",
        description: "Apenas campanhas pendentes podem ser excluídas.",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(campaign.id);
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

  const resetFormForEdit = () => {
    setName("");
    setMessageId("");
    setSelectedContacts([]);
    // Não limpar scheduledAt aqui - manter o valor atual
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
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Monitor de campanhas ativo (verifica a cada 2 minutos)</span>
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
                    
                    // Processar cada campanha manualmente
                    for (const campaign of campaigns) {
                      await processImmediateCampaign(campaign.id);
                    }
                    
                    // Atualizar lista
                    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
                  } else {
                    toast({
                      title: "Nenhuma campanha pendente",
                      description: "Não há campanhas imediatas para processar.",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro",
                    description: "Erro ao processar campanhas pendentes.",
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

        {/* Componente de Diagnóstico de Campanhas Travadas */}
        <CampaignDiagnostic />

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
                  <Label>
                    Contatos ({selectedContacts.length} selecionados)
                  </Label>
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

                {/* Seleção de Contatos */}
                <>
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
                  </>
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

              <WebhookConfig
                webhookUrl={webhookUrl}
                onWebhookUrlChange={setWebhookUrl}
                onTestWebhook={handleTestWebhook}
              />

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campanhas</CardTitle>
                <CardDescription>
                  Total: {campaigns?.length || 0} • Agendadas: {scheduledCampaigns.length} • Em Execução: {runningCampaigns.length} • Finalizadas: {completedCampaigns.length}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={campaignSearchTerm}
                    onChange={(e) => {
                      setCampaignSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset para primeira página ao buscar
                    }}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as "scheduled" | "running" | "completed");
              setCurrentPage(1); // Reset para primeira página ao trocar aba
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Agendadas ({filteredScheduledCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="running" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Em Execução ({filteredRunningCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizadas ({filteredCompletedCampaigns.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="scheduled" className="mt-6">
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Carregando...</p>
                ) : filteredScheduledCampaigns.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {getPaginatedCampaigns(filteredScheduledCampaigns).map((campaign) => (
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
                            {campaign.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => processImmediateCampaign(campaign.id)}
                                title="Processar campanha agora"
                              >
                                <Send className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCampaign(campaign)}
                              title={canEditOrDelete(campaign) ? "Editar campanha" : "Campanha não pode ser editada"}
                              disabled={!canEditOrDelete(campaign)}
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={deleteMutation.isPending || !canEditOrDelete(campaign)}
                              title={canEditOrDelete(campaign) ? "Excluir campanha" : "Campanha não pode ser excluída"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((currentPage - 1) * campaignsPerPage) + 1} a {Math.min(currentPage * campaignsPerPage, filteredScheduledCampaigns.length)} de {filteredScheduledCampaigns.length} campanhas
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhuma campanha agendada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {campaignSearchTerm ? "Nenhuma campanha agendada encontrada com esse filtro" : "Crie sua primeira campanha para começar"}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="running" className="mt-6">
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Carregando...</p>
                ) : filteredRunningCampaigns.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {getPaginatedCampaigns(filteredRunningCampaigns).map((campaign) => (
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
                              title="Campanha em execução"
                              disabled
                            >
                              <Send className="h-4 w-4 text-orange-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Campanha não pode ser editada durante execução"
                              disabled
                            >
                              <Edit className="h-4 w-4 text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Campanha não pode ser excluída durante execução"
                              disabled
                            >
                              <Trash2 className="h-4 w-4 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((currentPage - 1) * campaignsPerPage) + 1} a {Math.min(currentPage * campaignsPerPage, filteredRunningCampaigns.length)} de {filteredRunningCampaigns.length} campanhas
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Send className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhuma campanha em execução</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {campaignSearchTerm ? "Nenhuma campanha em execução encontrada com esse filtro" : "Campanhas em execução aparecerão aqui"}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="mt-6">
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Carregando...</p>
                ) : filteredCompletedCampaigns.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {getPaginatedCampaigns(filteredCompletedCampaigns).map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
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
                              title="Visualizar campanha finalizada"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((currentPage - 1) * campaignsPerPage) + 1} a {Math.min(currentPage * campaignsPerPage, filteredCompletedCampaigns.length)} de {filteredCompletedCampaigns.length} campanhas
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhuma campanha finalizada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {campaignSearchTerm ? "Nenhuma campanha finalizada encontrada com esse filtro" : "Campanhas finalizadas aparecerão aqui"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
