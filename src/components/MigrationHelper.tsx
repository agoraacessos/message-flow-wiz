import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function MigrationHelper() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [migrationMessage, setMigrationMessage] = useState('');
  const { toast } = useToast();

  const migrateToSupabase = async () => {
    setIsMigrating(true);
    setMigrationStatus('idle');
    setMigrationMessage('');

    try {
      // 1. Verificar se a tabela existe
      const { data: tableCheck, error: tableError } = await supabase
        .from('custom_fields')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === 'PGRST116') {
        // Tabela não existe, criar
        setMigrationMessage('Criando tabela custom_fields...');
        
        // Como não podemos executar DDL diretamente, vamos tentar inserir um registro de teste
        // Se falhar, significa que a tabela não existe
        const { error: insertError } = await supabase
          .from('custom_fields')
          .insert([{
            name: 'test_migration',
            label: 'Teste de Migração',
            type: 'text',
            description: 'Campo temporário para testar migração'
          }]);

        if (insertError) {
          throw new Error('Tabela custom_fields não existe. Execute a migração SQL no Supabase Dashboard primeiro.');
        }

        // Remover o registro de teste
        await supabase
          .from('custom_fields')
          .delete()
          .eq('name', 'test_migration');
      }

      // 2. Migrar dados do localStorage
      setMigrationMessage('Migrando dados do localStorage...');
      
      const localFields = localStorage.getItem('custom_fields');
      if (localFields) {
        const fields = JSON.parse(localFields);
        
        if (fields.length > 0) {
          // Filtrar campos que não são do sistema (IDs numéricos)
          const customFields = fields.filter((field: any) => 
            field.id && field.id.toString().length > 10
          );

          if (customFields.length > 0) {
            // Preparar dados para inserção
            const fieldsToInsert = customFields.map((field: any) => ({
              name: field.name,
              label: field.label,
              type: field.type,
              options: field.options || [],
              required: field.required || false,
              description: field.description || ''
            }));

            const { error: insertError } = await supabase
              .from('custom_fields')
              .insert(fieldsToInsert);

            if (insertError) {
              throw new Error(`Erro ao inserir campos: ${insertError.message}`);
            }

            setMigrationMessage(`${customFields.length} campos migrados com sucesso!`);
          } else {
            setMigrationMessage('Nenhum campo personalizado encontrado no localStorage.');
          }
        } else {
          setMigrationMessage('Nenhum campo encontrado no localStorage.');
        }
      } else {
        setMigrationMessage('Nenhum dado encontrado no localStorage.');
      }

      // 3. Limpar localStorage
      localStorage.removeItem('custom_fields');
      
      setMigrationStatus('success');
      toast({
        title: "Migração Concluída!",
        description: "Dados migrados com sucesso para o Supabase.",
      });

    } catch (error: any) {
      console.error('Erro na migração:', error);
      setMigrationStatus('error');
      setMigrationMessage(error.message || 'Erro desconhecido durante a migração.');
      
      toast({
        title: "Erro na Migração",
        description: error.message || 'Erro desconhecido durante a migração.',
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('id')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        return { connected: true, tableExists: false };
      } else if (error) {
        return { connected: false, tableExists: false };
      } else {
        return { connected: true, tableExists: true };
      }
    } catch (error) {
      return { connected: false, tableExists: false };
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migração para Supabase
        </CardTitle>
        <CardDescription>
          Migre dados do localStorage para o Supabase para persistência completa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Antes de executar a migração, certifique-se de que a tabela 
            <code className="mx-1 px-1 bg-muted rounded">custom_fields</code> 
            foi criada no Supabase. Execute o SQL de migração no Supabase Dashboard.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button 
            onClick={migrateToSupabase}
            disabled={isMigrating}
            className="w-full"
          >
            {isMigrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Migrar para Supabase
              </>
            )}
          </Button>
        </div>

        {migrationMessage && (
          <Alert className={migrationStatus === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {migrationStatus === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : migrationStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <AlertDescription className={migrationStatus === 'error' ? 'text-red-800' : 'text-green-800'}>
              {migrationMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>O que será migrado:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Campos personalizados do localStorage</li>
            <li>Configurações de tipos e validações</li>
            <li>Opções para campos do tipo 'select'</li>
          </ul>
          <p className="mt-2"><strong>Após a migração:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Dados serão removidos do localStorage</li>
            <li>Sistema usará apenas Supabase</li>
            <li>Persistência completa garantida</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
