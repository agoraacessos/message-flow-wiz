import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Edit, Trash2, Search, X } from "lucide-react";

interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contact_ids: string[];
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags?: string[];
}

interface ContactGroupsProps {
  selectedContacts?: Set<string>;
  onGroupSelect?: (contactIds: string[]) => void;
  onGroupToggle?: (groupId: string) => void;
  selectedGroups?: string[];
  mode?: "select" | "manage";
}

export function ContactGroups({ selectedContacts, onGroupSelect, onGroupToggle, selectedGroups = [], mode = "manage" }: ContactGroupsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<ContactGroup | null>(null);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    contact_ids: [] as string[]
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar grupos
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["contact-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ContactGroup[];
    },
  });

  // Buscar contatos
  const { data: contacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, email, company, tags")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Contact[];
    },
  });

  // Filtrar grupos por busca
  const filteredGroups = groups?.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filtrar contatos por busca
  const filteredContacts = contacts?.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Mutação para criar grupo
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: typeof newGroup) => {
      const { data, error } = await supabase
        .from("contact_groups")
        .insert([{
          name: groupData.name,
          description: groupData.description || null,
          contact_ids: groupData.contact_ids
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Adicionar tags de grupo aos contatos
      if (groupData.contact_ids.length > 0) {
        await addGroupTagToContacts(groupData.contact_ids, groupData.name);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsCreateDialogOpen(false);
      setNewGroup({ name: "", description: "", contact_ids: [] });
      toast({
        title: "Sucesso!",
        description: "Grupo criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar grupo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar grupo
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, ...groupData }: ContactGroup) => {
      // Buscar grupo atual para comparar mudanças
      const { data: currentGroup, error: fetchError } = await supabase
        .from("contact_groups")
        .select("name, contact_ids")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Atualizar grupo
      const { error } = await supabase
        .from("contact_groups")
        .update({
          name: groupData.name,
          description: groupData.description || null,
          contact_ids: groupData.contact_ids,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
      
      // Gerenciar tags de grupo
      const oldContactIds = currentGroup.contact_ids || [];
      const newContactIds = groupData.contact_ids || [];
      const oldGroupName = currentGroup.name;
      const newGroupName = groupData.name;
      
      // Contatos removidos do grupo
      const removedContactIds = oldContactIds.filter(id => !newContactIds.includes(id));
      if (removedContactIds.length > 0) {
        await removeGroupTagFromContacts(removedContactIds, oldGroupName);
      }
      
      // Contatos adicionados ao grupo
      const addedContactIds = newContactIds.filter(id => !oldContactIds.includes(id));
      if (addedContactIds.length > 0) {
        await addGroupTagToContacts(addedContactIds, newGroupName);
      }
      
      // Se o nome do grupo mudou, atualizar tags dos contatos que permaneceram
      if (oldGroupName !== newGroupName) {
        const remainingContactIds = newContactIds.filter(id => oldContactIds.includes(id));
        if (remainingContactIds.length > 0) {
          await removeGroupTagFromContacts(remainingContactIds, oldGroupName);
          await addGroupTagToContacts(remainingContactIds, newGroupName);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      toast({
        title: "Sucesso!",
        description: "Grupo atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar grupo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir grupo
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // Buscar grupo antes de excluir para remover tags
      const { data: group, error: fetchError } = await supabase
        .from("contact_groups")
        .select("name, contact_ids")
        .eq("id", groupId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Remover tags de grupo dos contatos
      if (group.contact_ids && group.contact_ids.length > 0) {
        await removeGroupTagFromContacts(group.contact_ids, group.name);
      }
      
      // Excluir grupo
      const { error } = await supabase
        .from("contact_groups")
        .delete()
        .eq("id", groupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Sucesso!",
        description: "Grupo excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao excluir grupo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Funções para gerenciar contatos do grupo
  const handleContactToggle = (contactId: string, isSelected: boolean) => {
    if (isSelected) {
      setNewGroup(prev => ({
        ...prev,
        contact_ids: [...prev.contact_ids, contactId]
      }));
    } else {
      setNewGroup(prev => ({
        ...prev,
        contact_ids: prev.contact_ids.filter(id => id !== contactId)
      }));
    }
  };

  const handleEditContactToggle = (contactId: string, isSelected: boolean) => {
    if (!editingGroup) return;
    
    if (isSelected) {
      setEditingGroup(prev => prev ? {
        ...prev,
        contact_ids: [...prev.contact_ids, contactId]
      } : null);
    } else {
      setEditingGroup(prev => prev ? {
        ...prev,
        contact_ids: prev.contact_ids.filter(id => id !== contactId)
      } : null);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do grupo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate(newGroup);
  };

  const handleUpdateGroup = () => {
    if (!editingGroup?.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do grupo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    updateGroupMutation.mutate(editingGroup);
  };

  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setIsEditDialogOpen(true);
  };

  const handleViewGroup = (group: ContactGroup) => {
    setViewingGroup(group);
    setIsViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    if (viewingGroup) {
      setEditingGroup(viewingGroup);
      setIsViewDialogOpen(false);
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    deleteGroupMutation.mutate(groupId);
  };

  // Função para adicionar tag de grupo aos contatos
  const addGroupTagToContacts = async (contactIds: string[], groupName: string) => {
    const groupTag = `group_${groupName}`;
    
    for (const contactId of contactIds) {
      try {
        // Buscar contato atual
        const { data: contact, error: fetchError } = await supabase
          .from('contacts')
          .select('tags')
          .eq('id', contactId)
          .single();
        
        if (fetchError) {
          console.error('Erro ao buscar contato:', fetchError);
          continue;
        }
        
        // Adicionar tag se não existir
        const currentTags = contact.tags || [];
        if (!currentTags.includes(groupTag)) {
          const updatedTags = [...currentTags, groupTag];
          
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ tags: updatedTags })
            .eq('id', contactId);
          
          if (updateError) {
            console.error('Erro ao adicionar tag de grupo:', updateError);
          }
        }
      } catch (error) {
        console.error('Erro ao processar contato:', error);
      }
    }
  };

  // Função para remover tag de grupo dos contatos
  const removeGroupTagFromContacts = async (contactIds: string[], groupName: string) => {
    const groupTag = `group_${groupName}`;
    
    for (const contactId of contactIds) {
      try {
        // Buscar contato atual
        const { data: contact, error: fetchError } = await supabase
          .from('contacts')
          .select('tags')
          .eq('id', contactId)
          .single();
        
        if (fetchError) {
          console.error('Erro ao buscar contato:', fetchError);
          continue;
        }
        
        // Remover tag se existir
        const currentTags = contact.tags || [];
        if (currentTags.includes(groupTag)) {
          const updatedTags = currentTags.filter(tag => tag !== groupTag);
          
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ tags: updatedTags })
            .eq('id', contactId);
          
          if (updateError) {
            console.error('Erro ao remover tag de grupo:', updateError);
          }
        }
      } catch (error) {
        console.error('Erro ao processar contato:', error);
      }
    }
  };

  const handleSelectGroup = (group: ContactGroup) => {
    if (onGroupToggle) {
      onGroupToggle(group.id);
    } else if (onGroupSelect) {
      onGroupSelect(group.contact_ids);
    }
  };

  const handleSelectAllContacts = () => {
    if (newGroup.contact_ids.length === filteredContacts.length) {
      setNewGroup(prev => ({ ...prev, contact_ids: [] }));
    } else {
      setNewGroup(prev => ({ ...prev, contact_ids: filteredContacts.map(c => c.id) }));
    }
  };

  const handleSelectAllEditContacts = () => {
    if (!editingGroup) return;
    
    if (editingGroup.contact_ids.length === filteredContacts.length) {
      setEditingGroup(prev => prev ? { ...prev, contact_ids: [] } : null);
    } else {
      setEditingGroup(prev => prev ? { ...prev, contact_ids: filteredContacts.map(c => c.id) } : null);
    }
  };

  // Obter contatos do grupo
  const getGroupContacts = (contactIds: string[]) => {
    return contacts?.filter(contact => contactIds.includes(contact.id)) || [];
  };

  if (mode === "select") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Grupo
          </CardTitle>
          <CardDescription>
            Escolha um grupo de contatos para a campanha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const isSelected = selectedGroups.includes(group.id);
                return (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer ${
                      isSelected ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => handleSelectGroup(group)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}} // Controlado pelo onClick do container
                      />
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {group.contact_ids.length} contato(s)
                        </p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant={isSelected ? "default" : "outline"} 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGroup(group);
                      }}
                    >
                      {isSelected ? "Selecionado" : "Selecionar"}
                    </Button>
                  </div>
                );
              })}
              
              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum grupo encontrado</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos de Contatos
              </CardTitle>
              <CardDescription>
                Organize seus contatos em grupos para facilitar o envio de campanhas
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Grupo</DialogTitle>
                  <DialogDescription>
                    Crie um grupo de contatos para facilitar o envio de campanhas
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">Nome do Grupo *</Label>
                    <Input
                      id="group-name"
                      placeholder="Ex: Clientes VIP"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="group-description">Descrição</Label>
                    <Textarea
                      id="group-description"
                      placeholder="Descrição opcional do grupo"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Selecionar Contatos</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllContacts}
                      >
                        {newGroup.contact_ids.length === filteredContacts.length ? "Desmarcar Todos" : "Selecionar Todos"}
                      </Button>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {filteredContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={newGroup.contact_ids.includes(contact.id)}
                            onCheckedChange={(checked) => handleContactToggle(contact.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {contact.phone}
                              {contact.company && ` • ${contact.company}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                    Criar Grupo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid gap-4">
              {filteredGroups.map((group) => {
                const groupContacts = getGroupContacts(group.contact_ids);
                return (
                  <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent 
                      className="pt-4"
                      onClick={() => handleViewGroup(group)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          {group.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {group.contact_ids.length} contato(s)
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Criado em {new Date(group.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          
                          {groupContacts.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Contatos:</p>
                              <div className="flex flex-wrap gap-1">
                                {groupContacts.slice(0, 5).map((contact) => (
                                  <Badge key={contact.id} variant="outline" className="text-xs">
                                    {contact.name}
                                  </Badge>
                                ))}
                                {groupContacts.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{groupContacts.length - 5} mais
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGroup(group)}
                            title="Editar grupo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Excluir grupo">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o grupo "{group.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredGroups.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum grupo criado</h3>
                  <p className="mt-2 text-sm">
                    Crie seu primeiro grupo de contatos para facilitar o envio de campanhas
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Grupo</DialogTitle>
            <DialogDescription>
              Detalhes do grupo de contatos
            </DialogDescription>
          </DialogHeader>
          
          {viewingGroup && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="view-group-name">Nome do Grupo</Label>
                <Input
                  id="view-group-name"
                  value={viewingGroup.name}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              <div>
                <Label htmlFor="view-group-description">Descrição</Label>
                <Textarea
                  id="view-group-description"
                  value={viewingGroup.description || "Sem descrição"}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contatos do Grupo ({viewingGroup.contact_ids.length})</Label>
                </div>
                
                <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {getGroupContacts(viewingGroup.contact_ids).map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.phone}
                          {contact.company && ` • ${contact.company}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {getGroupContacts(viewingGroup.contact_ids).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum contato neste grupo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleEditFromView}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Edite as informações do grupo de contatos
            </DialogDescription>
          </DialogHeader>
          
          {editingGroup && (
            <div className="space-y-6">
              {/* Seção 1: Informações do Grupo */}
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-2">Informações do Grupo</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-group-name">Nome do Grupo *</Label>
                      <Input
                        id="edit-group-name"
                        placeholder="Ex: Clientes VIP"
                        value={editingGroup.name}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-group-description">Descrição</Label>
                      <Textarea
                        id="edit-group-description"
                        placeholder="Descrição opcional do grupo"
                        value={editingGroup.description || ""}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Contatos Atuais do Grupo */}
              <div className="space-y-3">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-2">Contatos Atuais do Grupo</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {editingGroup.contact_ids.length} contato(s) selecionado(s)
                  </p>
                  
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-3 space-y-2 bg-gray-50">
                    {getGroupContacts(editingGroup.contact_ids).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3 p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contact.phone}
                            {contact.company && ` • ${contact.company}`}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Selecionado
                        </Badge>
                      </div>
                    ))}
                    
                    {getGroupContacts(editingGroup.contact_ids).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <Users className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-sm">Nenhum contato selecionado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 3: Gerenciar Contatos */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Gerenciar Contatos</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Adicione ou remova contatos do grupo
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Label>Selecionar Contatos</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllEditContacts}
                    >
                      {editingGroup.contact_ids.length === filteredContacts.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </Button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {filteredContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={editingGroup.contact_ids.includes(contact.id)}
                          onCheckedChange={(checked) => handleEditContactToggle(contact.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contact.phone}
                            {contact.company && ` • ${contact.company}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGroup} disabled={updateGroupMutation.isPending}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
