import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [contactsResult, messagesResult, campaignsResult, logsResult] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
        supabase.from("campaign_logs").select("status", { count: "exact" }),
      ]);

      const sentCount = logsResult.data?.filter((log) => log.status === "sent").length || 0;
      const errorCount = logsResult.data?.filter((log) => log.status === "error").length || 0;
      const pendingCount = logsResult.data?.filter((log) => log.status === "pending").length || 0;

      return {
        contacts: contactsResult.count || 0,
        messages: messagesResult.count || 0,
        campaigns: campaignsResult.count || 0,
        sent: sentCount,
        errors: errorCount,
        pending: pendingCount,
      };
    },
  });

  const cards = [
    {
      title: "Total de Contatos",
      value: stats?.contacts || 0,
      icon: Users,
      description: "Contatos cadastrados",
      color: "text-primary",
    },
    {
      title: "Mensagens Criadas",
      value: stats?.messages || 0,
      icon: MessageSquare,
      description: "Templates disponíveis",
      color: "text-secondary",
    },
    {
      title: "Campanhas Ativas",
      value: stats?.campaigns || 0,
      icon: Send,
      description: "Campanhas configuradas",
      color: "text-chart-4",
    },
    {
      title: "Mensagens Enviadas",
      value: stats?.sent || 0,
      icon: CheckCircle2,
      description: "Disparos bem-sucedidos",
      color: "text-primary",
    },
    {
      title: "Pendentes",
      value: stats?.pending || 0,
      icon: Clock,
      description: "Aguardando envio",
      color: "text-chart-4",
    },
    {
      title: "Erros",
      value: stats?.errors || 0,
      icon: XCircle,
      description: "Falhas no envio",
      color: "text-destructive",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Visão geral das suas campanhas de WhatsApp
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="shadow-[var(--shadow-elegant)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Bem-vindo ao Campaign Manager</CardTitle>
            <CardDescription>
              Sistema completo para gerenciar suas campanhas de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent/50 p-4">
              <h3 className="font-semibold text-accent-foreground">🚀 Como começar:</h3>
              <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>1. Importe seus contatos via CSV na seção <strong>Contatos</strong></li>
                <li>2. Crie templates de mensagens na seção <strong>Mensagens</strong></li>
                <li>3. Configure campanhas na seção <strong>Campanhas</strong></li>
                <li>4. Acompanhe o status dos disparos em tempo real</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
