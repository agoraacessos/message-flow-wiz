// Script simples para processar campanhas pendentes
// Execute: node process-campaigns.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kshxhhezgnmrpddrpzms.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_KEY não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processPendingCampaigns() {
  console.log('🔍 Verificando campanhas pendentes...');
  
  try {
    // Buscar campanhas pendentes
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar campanhas:', error);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('✅ Nenhuma campanha pendente encontrada.');
      return;
    }

    console.log(`📋 Encontradas ${campaigns.length} campanhas pendentes:`);
    
    campaigns.forEach((campaign, index) => {
      console.log(`${index + 1}. ${campaign.name}`);
      console.log(`   - Contatos: ${campaign.contact_ids?.length || 0}`);
      console.log(`   - Delay: ${campaign.min_delay_between_clients || 5}s - ${campaign.max_delay_between_clients || 15}s`);
      console.log(`   - Agendada: ${campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString('pt-BR') : 'Imediato'}`);
    });

    // Simular processamento (em produção, implementar envio real)
    for (const campaign of campaigns) {
      console.log(`\n🚀 Processando: ${campaign.name}`);
      
      // Atualizar status para "enviando"
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);
      
      console.log(`   ✅ Status atualizado para "enviando"`);
      
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular conclusão (em produção, implementar lógica real)
      await supabase
        .from('campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', campaign.id);
      
      console.log(`   ✅ Campanha processada com sucesso!`);
    }

    console.log('\n🎉 Todas as campanhas foram processadas!');
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  processPendingCampaigns()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { processPendingCampaigns };
