import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseSync() {
  useEffect(() => {
    // Limpar todo localStorage relacionado ao sistema
    const cleanupLocalStorage = () => {
      const keysToRemove = [
        'custom_fields',
        'contacts',
        'messages',
        'campaigns',
        'campaign_logs',
        'system_settings'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('LocalStorage limpo - sistema migrado para Supabase');
    };

    // Verificar se Supabase está conectado
    const checkSupabaseConnection = async () => {
      try {
        // Tentar fazer uma query simples para verificar conexão
        const { data, error } = await supabase
          .from('system_settings')
          .select('key')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          console.warn('Tabelas do sistema não encontradas. Execute o SQL de migração no Supabase Dashboard.');
          return false;
        } else if (error) {
          console.error('Erro de conexão com Supabase:', error);
          return false;
        }

        console.log('Supabase conectado com sucesso');
        return true;
      } catch (error) {
        console.error('Erro ao verificar conexão com Supabase:', error);
        return false;
      }
    };

    // Executar limpeza e verificação
    const initializeSystem = async () => {
      cleanupLocalStorage();
      await checkSupabaseConnection();
    };

    initializeSystem();
  }, []);
}
