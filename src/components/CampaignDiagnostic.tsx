import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StuckCampaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  timeStuck: number; // minutos
}

export function CampaignDiagnostic() {
  const [stuckCampaigns, setStuckCampaigns] = useState<StuckCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStuckCampaigns = async () => {
    setIsLoading(true);
    try {
      // Buscar campanhas que estão "sending" há mais de 5 minutos
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'sending')
        .lt('updated_at', fiveMinutesAgo)
        .order('updated_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar campanhas travadas:', error);
        return;
      }

      const stuckCampaigns = campaigns?.map(campaign => ({
        ...campaign,
        timeStuck: Math.floor((Date.now() - new Date(campaign.updated_at).getTime()) / (1000 * 60))
      })) || [];

      setStuckCampaigns(stuckCampaigns);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro ao verificar campanhas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetStuckCampaigns = async () => {
    if (stuckCampaigns.length === 0) return;

    try {
      const campaignIds = stuckCampaigns.map(c => c.id);
      
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString(),
          error_message: 'Resetado automaticamente - estava travado'
        })
        .in('id', campaignIds);

      if (error) {
        console.error('Erro ao resetar campanhas:', error);
        alert(`Erro ao resetar campanhas: ${error.message}`);
        return;
      }

      // Atualizar lista local
      setStuckCampaigns([]);
      alert(`${campaignIds.length} campanha(s) resetada(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao resetar:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Diagnóstico de Campanhas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={checkStuckCampaigns} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Verificar Campanhas Travadas
          </Button>
          
          {stuckCampaigns.length > 0 && (
            <Button 
              onClick={resetStuckCampaigns}
              variant="destructive"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Resetar {stuckCampaigns.length} Campanha(s)
            </Button>
          )}
        </div>

        {lastCheck && (
          <p className="text-sm text-muted-foreground">
            Última verificação: {lastCheck.toLocaleString('pt-BR')}
          </p>
        )}

        {stuckCampaigns.length === 0 && lastCheck && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Nenhuma campanha travada encontrada!
            </AlertDescription>
          </Alert>
        )}

        {stuckCampaigns.length > 0 && (
          <div className="space-y-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Encontradas {stuckCampaigns.length} campanha(s) travada(s) há mais de 5 minutos!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {stuckCampaigns.map(campaign => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{campaign.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Travada há {campaign.timeStuck} minutos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Última atualização: {new Date(campaign.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    Travada
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
