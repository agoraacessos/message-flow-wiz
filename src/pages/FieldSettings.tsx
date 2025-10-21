import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Settings, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function FieldSettings() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    type: 'text',
    options: [] as string[],
    required: false,
    description: ''
  });
  const [newOption, setNewOption] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Campos do sistema (pré-definidos)
  const systemFields = [
    { id: 'system_name', name: 'name', label: 'Nome', type: 'text', required: true, description: 'Nome do contato', isSystem: true },
    { id: 'system_phone', name: 'phone', label: 'Telefone', type: 'phone', required: true, description: 'Número de telefone principal', isSystem: true },
    { id: 'system_phone2', name: 'phone2', label: 'Telefone 2', type: 'phone', required: false, description: 'Segundo número de telefone', isSystem: true },
    { id: 'system_phone3', name: 'phone3', label: 'Telefone 3', type: 'phone', required: false, description: 'Terceiro número de telefone', isSystem: true },
    { id: 'system_email', name: 'email', label: 'E-mail', type: 'email', required: false, description: 'Endereço de e-mail', isSystem: true },
    { id: 'system_tags', name: 'tags', label: 'Tags', type: 'text', required: false, description: 'Tags ou categorias (separadas por ;)', isSystem: true },
    { id: 'system_company', name: 'company', label: 'Empresa', type: 'text', required: false, description: 'Nome da empresa', isSystem: true },
    { id: 'system_position', name: 'position', label: 'Cargo', type: 'text', required: false, description: 'Cargo ou posição', isSystem: true },
    { id: 'system_notes', name: 'notes', label: 'Observações', type: 'text', required: false, description: 'Observações adicionais', isSystem: true },
  ];

  // Buscar campos personalizados
  const { data: customFields, isLoading } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('custom_fields')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar campos personalizados:', error);
          // Se a tabela não existe, usar localStorage como fallback
          const localFields = localStorage.getItem('custom_fields');
          return localFields ? JSON.parse(localFields) : [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error);
        // Fallback para localStorage
        const localFields = localStorage.getItem('custom_fields');
        return localFields ? JSON.parse(localFields) : [];
      }
    },
  });

  // Combinar campos do sistema com campos personalizados
  const allFields = [...systemFields, ...(customFields || [])];

  // Mutação para adicionar campo
  const addFieldMutation = useMutation({
    mutationFn: async (field: any) => {
      try {
        const { error } = await supabase
          .from('custom_fields')
          .insert([field]);
        
        if (error) {
          // Se a tabela não existe, usar localStorage como fallback
          const localFields = localStorage.getItem('custom_fields');
          const fields = localFields ? JSON.parse(localFields) : [];
          
          const newField = {
            id: Date.now().toString(),
            ...field,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          fields.push(newField);
          localStorage.setItem('custom_fields', JSON.stringify(fields));
          return;
        }
      } catch (error) {
        // Fallback para localStorage
        const localFields = localStorage.getItem('custom_fields');
        const fields = localFields ? JSON.parse(localFields) : [];
        
        const newField = {
          id: Date.now().toString(),
          ...field,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        fields.push(newField);
        localStorage.setItem('custom_fields', JSON.stringify(fields));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      setIsAddDialogOpen(false);
      setNewField({
        name: '',
        label: '',
        type: 'text',
        options: [],
        required: false,
        description: ''
      });
      toast({
        title: "Sucesso!",
        description: "Campo personalizado criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar campo:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar campo personalizado.",
        variant: "destructive",
      });
    },
  });

  // Mutação para editar campo
  const editFieldMutation = useMutation({
    mutationFn: async ({ id, field }: { id: string, field: any }) => {
      try {
        const { error } = await supabase
          .from('custom_fields')
          .update(field)
          .eq('id', id);
        
        if (error) {
          // Se a tabela não existe, usar localStorage como fallback
          const localFields = localStorage.getItem('custom_fields');
          const fields = localFields ? JSON.parse(localFields) : [];
          
          const fieldIndex = fields.findIndex((f: any) => f.id === id);
          if (fieldIndex !== -1) {
            fields[fieldIndex] = {
              ...fields[fieldIndex],
              ...field,
              updated_at: new Date().toISOString()
            };
            localStorage.setItem('custom_fields', JSON.stringify(fields));
          }
          return;
        }
      } catch (error) {
        // Fallback para localStorage
        const localFields = localStorage.getItem('custom_fields');
        const fields = localFields ? JSON.parse(localFields) : [];
        
        const fieldIndex = fields.findIndex((f: any) => f.id === id);
        if (fieldIndex !== -1) {
          fields[fieldIndex] = {
            ...fields[fieldIndex],
            ...field,
            updated_at: new Date().toISOString()
          };
          localStorage.setItem('custom_fields', JSON.stringify(fields));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      setIsEditDialogOpen(false);
      setEditingField(null);
      toast({
        title: "Sucesso!",
        description: "Campo personalizado atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao editar campo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar campo personalizado.",
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir campo
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('custom_fields')
          .delete()
          .eq('id', id);
        
        if (error) {
          // Se a tabela não existe, usar localStorage como fallback
          const localFields = localStorage.getItem('custom_fields');
          const fields = localFields ? JSON.parse(localFields) : [];
          
          const filteredFields = fields.filter((f: any) => f.id !== id);
          localStorage.setItem('custom_fields', JSON.stringify(filteredFields));
          return;
        }
      } catch (error) {
        // Fallback para localStorage
        const localFields = localStorage.getItem('custom_fields');
        const fields = localFields ? JSON.parse(localFields) : [];
        
        const filteredFields = fields.filter((f: any) => f.id !== id);
        localStorage.setItem('custom_fields', JSON.stringify(filteredFields));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({
        title: "Sucesso!",
        description: "Campo personalizado excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir campo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const handleAddField = () => {
    if (!newField.name || !newField.label) {
      toast({
        title: "Erro",
        description: "Nome e rótulo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validar nome (deve ser único e sem espaços)
    const fieldName = newField.name.toLowerCase().replace(/\s+/g, '_');
    
    addFieldMutation.mutate({
      name: fieldName,
      label: newField.label,
      type: newField.type,
      options: newField.type === 'select' ? newField.options : [],
      required: newField.required,
      description: newField.description
    });
  };

  const handleEditField = () => {
    if (!editingField?.name || !editingField?.label) {
      toast({
        title: "Erro",
        description: "Nome e rótulo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    editFieldMutation.mutate({
      id: editingField.id,
      field: {
        name: editingField.name,
        label: editingField.label,
        type: editingField.type,
        options: editingField.type === 'select' ? editingField.options : [],
        required: editingField.required,
        description: editingField.description
      }
    });
  };

  const handleDeleteField = (id: string) => {
    deleteFieldMutation.mutate(id);
  };

  const handleEditClick = (field: any) => {
    setEditingField({ ...field });
    setIsEditDialogOpen(true);
  };

  const addOption = () => {
    if (newOption.trim()) {
      if (isEditDialogOpen) {
        setEditingField(prev => ({
          ...prev,
          options: [...(prev?.options || []), newOption.trim()]
        }));
      } else {
        setNewField(prev => ({
          ...prev,
          options: [...prev.options, newOption.trim()]
        }));
      }
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    if (isEditDialogOpen) {
      setEditingField(prev => ({
        ...prev,
        options: prev?.options?.filter((_: any, i: number) => i !== index) || []
      }));
    } else {
      setNewField(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      text: 'Texto',
      number: 'Número',
      email: 'E-mail',
      phone: 'Telefone',
      date: 'Data',
      boolean: 'Sim/Não',
      select: 'Lista de Opções'
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando campos personalizados...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuração de Campos</h1>
            <p className="text-muted-foreground">
              Gerencie campos personalizados para usar em campanhas e conversas
            </p>
            {customFields && customFields.length > 0 && customFields[0]?.id?.toString().length > 10 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Modo Offline:</strong> Os campos personalizados estão sendo salvos localmente. 
                  Para persistência completa, aplique a migração no Supabase.
                </p>
              </div>
            )}
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Campo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Todos os Campos Disponíveis
            </CardTitle>
            <CardDescription>
              Visualize todos os campos disponíveis (sistema + personalizados) que podem ser usados no mapeamento de contatos e nas conversas com variáveis do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allFields && allFields.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Campo</TableHead>
                    <TableHead>Rótulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {field.name}
                          </code>
                          {field.isSystem && (
                            <Badge variant="outline" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getFieldTypeLabel(field.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.required ? (
                          <Badge variant="destructive">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {field.description || '-'}
                      </TableCell>
                      <TableCell>
                        {!field.isSystem ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(field)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialog>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialog>
                            </AlertDialog>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Campo do sistema
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum campo personalizado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie campos personalizados para usar em campanhas e conversas.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Campo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Adicionar Campo */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Campo Personalizado</DialogTitle>
              <DialogDescription>
                Configure um novo campo que pode ser usado no mapeamento de contatos e nas conversas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-name">Nome do Campo *</Label>
                  <Input
                    id="field-name"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="ex: cargo_funcionario"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nome único para referenciar o campo (sem espaços)
                  </p>
                </div>
                <div>
                  <Label htmlFor="field-label">Rótulo *</Label>
                  <Input
                    id="field-label"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    placeholder="ex: Cargo do Funcionário"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-type">Tipo do Campo</Label>
                  <Select
                    value={newField.type}
                    onValueChange={(value) => setNewField({ ...newField, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                      <SelectItem value="select">Lista de Opções</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="field-required">Campo obrigatório</Label>
                </div>
              </div>

              {newField.type === 'select' && (
                <div>
                  <Label>Opções da Lista</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Digite uma opção"
                        onKeyPress={(e) => e.key === 'Enter' && addOption()}
                      />
                      <Button type="button" onClick={addOption} variant="outline">
                        Adicionar
                      </Button>
                    </div>
                    {newField.options.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newField.options.map((option, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {option}
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="field-description">Descrição</Label>
                <Textarea
                  id="field-description"
                  value={newField.description}
                  onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                  placeholder="Descrição opcional do campo"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddField}
                disabled={addFieldMutation.isPending}
              >
                {addFieldMutation.isPending ? 'Criando...' : 'Criar Campo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar Campo */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Campo Personalizado</DialogTitle>
              <DialogDescription>
                Modifique as configurações do campo personalizado.
              </DialogDescription>
            </DialogHeader>
            {editingField && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-field-name">Nome do Campo *</Label>
                    <Input
                      id="edit-field-name"
                      value={editingField.name}
                      onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                      placeholder="ex: cargo_funcionario"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-field-label">Rótulo *</Label>
                    <Input
                      id="edit-field-label"
                      value={editingField.label}
                      onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                      placeholder="ex: Cargo do Funcionário"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-field-type">Tipo do Campo</Label>
                    <Select
                      value={editingField.type}
                      onValueChange={(value) => setEditingField({ ...editingField, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="boolean">Sim/Não</SelectItem>
                        <SelectItem value="select">Lista de Opções</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-field-required"
                      checked={editingField.required}
                      onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="edit-field-required">Campo obrigatório</Label>
                  </div>
                </div>

                {editingField.type === 'select' && (
                  <div>
                    <Label>Opções da Lista</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          placeholder="Digite uma opção"
                          onKeyPress={(e) => e.key === 'Enter' && addOption()}
                        />
                        <Button type="button" onClick={addOption} variant="outline">
                          Adicionar
                        </Button>
                      </div>
                      {editingField.options && editingField.options.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {editingField.options.map((option: string, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {option}
                              <button
                                type="button"
                                onClick={() => removeOption(index)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="edit-field-description">Descrição</Label>
                  <Textarea
                    id="edit-field-description"
                    value={editingField.description || ''}
                    onChange={(e) => setEditingField({ ...editingField, description: e.target.value })}
                    placeholder="Descrição opcional do campo"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleEditField}
                disabled={editFieldMutation.isPending}
              >
                {editFieldMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
