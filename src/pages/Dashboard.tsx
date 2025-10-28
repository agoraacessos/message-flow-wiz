import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, CheckCircle2, Calendar, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      console.log("🔍 Buscando dados do Dashboard...");
      
      const [contactsResult, messagesResult, campaignsResult, logsResult] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("campaigns").select("id, status, created_at, contact_ids", { count: "exact" }),
        supabase.from("campaign_logs").select("status, contact_id, created_at", { count: "exact" }),
      ]);

      console.log("📊 Resultados das queries:", {
        contacts: contactsResult.count,
        messages: messagesResult.count,
        campaigns: campaignsResult.data?.length,
        logs: logsResult.data?.length
      });

      // Calcular estatísticas das campanhas
      const campaigns = campaignsResult.data || [];
      const completedCampaigns = campaigns.filter(c => c.status === 'sent').length;
      const scheduledCampaigns = campaigns.filter(c => c.status === 'pending').length;
      const runningCampaigns = campaigns.filter(c => c.status === 'sending').length;
      
      console.log("📈 Estatísticas das campanhas:", {
        total: campaigns.length,
        completed: completedCampaigns,
        scheduled: scheduledCampaigns,
        running: runningCampaigns
      });
      
      // Calcular estatísticas dos logs
      const logs = logsResult.data || [];
      const sentCount = logs.filter(log => log.status === "sent").length;
      const uniqueContactsReached = new Set(logs.filter(log => log.status === "sent").map(log => log.contact_id)).size;

      // Se não há logs, calcular contatos impactados baseado nas campanhas enviadas
      let contactsReached = uniqueContactsReached;
      let flowsSent = sentCount;
      
      if (logs.length === 0) {
        // Usar campanhas enviadas como proxy para fluxos enviados
        flowsSent = campaigns.filter(c => c.status === 'sent').length;
        
        // Calcular total de contatos impactados (não únicos)
        const sentCampaigns = campaigns.filter(c => c.status === 'sent');
        let totalContactsImpacted = 0;
        
        for (const campaign of sentCampaigns) {
          if (campaign.contact_ids && Array.isArray(campaign.contact_ids)) {
            totalContactsImpacted += campaign.contact_ids.length;
          }
        }
        
        contactsReached = totalContactsImpacted;
        
        console.log("📋 Contatos impactados calculados:", {
          sentCampaigns: sentCampaigns.length,
          totalContactsImpacted: totalContactsImpacted
        });
      }

      console.log("📤 Estatísticas dos logs:", {
        total: logs.length,
        sent: sentCount,
        uniqueContactsReached: uniqueContactsReached,
        contactsReached: contactsReached
      });

      // Criar dados históricos reais baseados nas datas de criação
      const now = new Date();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
        
        // Contar campanhas criadas neste mês
        const campaignsThisMonth = campaigns.filter(c => {
          const campaignDate = new Date(c.created_at);
          return campaignDate.getMonth() === date.getMonth() && 
                 campaignDate.getFullYear() === date.getFullYear();
        }).length;
        
        // Contar contatos atingidos neste mês
        const contactsThisMonth = logs.filter(log => {
          const logDate = new Date(log.created_at);
          return log.status === "sent" && 
                 logDate.getMonth() === date.getMonth() && 
                 logDate.getFullYear() === date.getFullYear();
        }).length;
        
        return {
          name: monthName,
          campanhas: campaignsThisMonth,
          contatos: contactsThisMonth
        };
      }).reverse();

      console.log("📅 Dados históricos:", last6Months);

      const result = {
        contacts: contactsResult.count || 0,
        messages: messagesResult.count || 0,
        completedCampaigns,
        scheduledCampaigns,
        runningCampaigns,
        sentCount: flowsSent,
        contactsReached: contactsReached,
        historicalData: last6Months,
      };

      console.log("✅ Resultado final:", result);
      return result;
    },
  });

  const cards = [
    {
      title: "Total de Contatos",
      value: stats?.contacts || 0,
      icon: Users,
      description: "Contatos cadastrados",
      color: "text-blue-600",
    },
    {
      title: "Fluxos Criados",
      value: stats?.messages || 0,
      icon: MessageSquare,
      description: "Templates disponíveis",
      color: "text-green-600",
    },
    {
      title: "Fluxos Enviados",
      value: stats?.sentCount || 0,
      icon: Send,
      description: "Mensagens enviadas",
      color: "text-purple-600",
    },
    {
      title: "Campanhas Realizadas",
      value: stats?.completedCampaigns || 0,
      icon: CheckCircle2,
      description: "Campanhas finalizadas",
      color: "text-emerald-600",
    },
    {
      title: "Campanhas Programadas",
      value: stats?.scheduledCampaigns || 0,
      icon: Calendar,
      description: "Campanhas agendadas",
      color: "text-orange-600",
    },
    {
      title: "Contatos Impactados",
      value: stats?.contactsReached || 0,
      icon: Target,
      description: "Total de contatos impactados",
      color: "text-red-600",
    },
  ];

  // Dados reais para os gráficos
  const chartData = stats?.historicalData || [];
  
  const pieData = [
    { name: 'Campanhas Realizadas', value: stats?.completedCampaigns || 0, color: '#10b981' },
    { name: 'Campanhas Programadas', value: stats?.scheduledCampaigns || 0, color: '#f59e0b' },
    { name: 'Campanhas em Execução', value: stats?.runningCampaigns || 0, color: '#3b82f6' },
  ].filter(item => item.value > 0); // Só mostrar categorias com dados

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

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

        {/* Seção de Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico de Barras - Desempenho Mensal */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Desempenho Mensal
              </CardTitle>
              <CardDescription>
                Campanhas realizadas e contatos atingidos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="campanhas" fill="#3b82f6" name="Campanhas" />
                    <Bar dataKey="contatos" fill="#10b981" name="Contatos Atingidos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">Nenhum dado disponível</p>
                    <p className="text-sm">Crie campanhas para ver o desempenho mensal</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Status das Campanhas */}
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 Status das Campanhas
              </CardTitle>
              <CardDescription>
                Distribuição por status atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
                    <p className="text-sm">Crie campanhas para ver a distribuição por status</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Linha - Crescimento */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Crescimento de Contatos
            </CardTitle>
            <CardDescription>
              Evolução do número de contatos atingidos ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="contatos" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                    name="Contatos Atingidos"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Nenhum dado disponível</p>
                  <p className="text-sm">Crie campanhas para ver o crescimento de contatos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
