import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const [name, setName] = useState("");
  const [messageId, setMessageId] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const campaign = {
        name,
        message_id: messageId,
        contact_ids: selectedContacts,
        scheduled_at: scheduledAt || null,
        webhook_url: webhookUrl || null,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;

      // Call webhook if provided
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: data.id }),
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setName("");
      setMessageId("");
      setSelectedContacts([]);
      setScheduledAt("");
      setWebhookUrl("");
      toast({
        title: "Sucesso!",
        description: "Campanha criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar campanha.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && messageId && selectedContacts.length > 0) {
      createMutation.mutate();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: "default" | "secondary" | "destructive" }> = {
      pending: { icon: Clock, variant: "secondary" },
      sent: { icon: CheckCircle2, variant: "default" },
      error: { icon: XCircle, variant: "destructive" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status === "pending" ? "Pendente" : status === "sent" ? "Enviado" : "Erro"}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Campanhas</h1>
          <p className="mt-2 text-muted-foreground">
            Crie e gerencie suas campanhas de disparo
          </p>
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Nova Campanha</CardTitle>
            <CardDescription>
              Configure uma campanha de disparo para seus contatos
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

              <div className="space-y-2">
                <Label>Contatos ({selectedContacts.length} selecionados)</Label>
                <div className="max-h-48 overflow-y-auto rounded-lg border p-4 space-y-2">
                  {contacts?.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded p-2"
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
                      <span className="text-sm">{contact.name} - {contact.phone}</span>
                    </label>
                  ))}
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

              <div className="space-y-2">
                <Label htmlFor="webhook">URL do Webhook n8n (opcional)</Label>
                <Input
                  id="webhook"
                  type="url"
                  placeholder="https://seu-n8n.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Campanha
              </Button>
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
                        {getStatusBadge(campaign.status || "pending")}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mensagem: {campaign.messages?.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Contatos: {campaign.contact_ids?.length || 0}
                      </p>
                      {campaign.scheduled_at && (
                        <p className="text-xs text-muted-foreground">
                          Agendado para: {new Date(campaign.scheduled_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                      </p>
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
