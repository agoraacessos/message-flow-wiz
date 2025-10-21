import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Search, UserPlus, FileSpreadsheet, Edit, Trash2, CheckSquare, Square } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ExcelUpload } from "@/components/ExcelUpload";
import * as XLSX from 'xlsx';

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [localContacts, setLocalContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [editingContact, setEditingContact] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState<any>({
    name: '',
    phone: '',
    email: '',
    tags: [],
    company: '',
    position: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", localContacts],
    queryFn: async () => {
      // Apenas contatos importados (sem dados fake)
      return localContacts;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = text.split("\n").slice(1); // Skip header
      
      const contacts = rows
        .filter((row) => row.trim())
        .map((row, index) => {
          const [name, phone, tags] = row.split(",");
          return {
            id: Date.now() + index, // ID único baseado em timestamp
            name: name?.trim(),
            phone: phone?.trim(),
            tags: tags ? tags.split(";").map((t) => t.trim()) : [],
            created_at: new Date().toISOString()
          };
        })
        .filter((contact) => contact.name && contact.phone);

      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar os contatos no estado local
      setLocalContacts(prev => [...prev, ...contacts]);
      
      console.log('Contatos CSV processados e salvos:', contacts);
      return contacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Sucesso!",
        description: `${count} contatos importados com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao importar contatos. Verifique o formato do arquivo.",
        variant: "destructive",
      });
    },
  });

  const excelUploadMutation = useMutation({
    mutationFn: async (contacts: any[]) => {
      // Processar tags se necessário e validar campos obrigatórios
      const processedContacts = contacts
        .filter(contact => contact.name && contact.phone) // Filtrar contatos válidos
        .map((contact, index) => ({
          ...contact,
          id: Date.now() + index, // ID único baseado em timestamp
          name: contact.name?.trim() || '',
          phone: contact.phone?.trim() || '',
          tags: typeof contact.tags === 'string' 
            ? contact.tags.split(';').map((t: string) => t.trim()).filter(Boolean)
            : contact.tags || [],
          created_at: new Date().toISOString()
        }));

      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar os contatos no estado local
      setLocalContacts(prev => [...prev, ...processedContacts]);
      
      console.log('Contatos processados e salvos:', processedContacts);
      return processedContacts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({
        title: "Sucesso!",
        description: `${count} contatos importados do Excel com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Erro ao importar Excel:', error);
      toast({
        title: "Erro",
        description: "Falha ao importar contatos do Excel. Verifique os dados.",
        variant: "destructive",
      });
    },
  });

  const handleExcelDataProcessed = (data: any[], mapping: any) => {
    excelUploadMutation.mutate(data);
  };

  // Funções para gerenciar seleções
  const handleSelectContact = (contactId: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts?.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts?.map(c => c.id) || []));
    }
  };

  // Funções para edição
  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingContact) return;
    
    setLocalContacts(prev => 
      prev.map(contact => 
        contact.id === editingContact.id ? editingContact : contact
      )
    );
    
    setIsEditDialogOpen(false);
    setEditingContact(null);
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    toast({
      title: "Sucesso!",
      description: "Contato atualizado com sucesso.",
    });
  };

  // Funções para exclusão
  const handleDeleteContact = (contactId: number) => {
    setLocalContacts(prev => prev.filter(contact => contact.id !== contactId));
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(contactId);
      return newSelected;
    });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    toast({
      title: "Sucesso!",
      description: "Contato excluído com sucesso.",
    });
  };

  const handleDeleteSelected = () => {
    setLocalContacts(prev => 
      prev.filter(contact => !selectedContacts.has(contact.id))
    );
    setSelectedContacts(new Set());
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    toast({
      title: "Sucesso!",
      description: `${selectedContacts.size} contatos excluídos com sucesso.`,
    });
  };

  // Função para adicionar novo contato
  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const contact = {
      ...newContact,
      id: Date.now(),
      created_at: new Date().toISOString(),
      tags: typeof newContact.tags === 'string' 
        ? newContact.tags.split(';').map((t: string) => t.trim()).filter(Boolean)
        : newContact.tags || []
    };

    setLocalContacts(prev => [...prev, contact]);
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    // Reset form
    setNewContact({
      name: '',
      phone: '',
      email: '',
      tags: [],
      company: '',
      position: '',
      notes: ''
    });
    
    setIsAddDialogOpen(false);
    
    toast({
      title: "Sucesso!",
      description: "Contato adicionado com sucesso.",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleSmartFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detectar tipo de arquivo pela extensão
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      // Processar CSV com mapeamento automático
      try {
        const text = await file.text();
        const rows = text.split("\n").filter(row => row.trim());
        
        if (rows.length === 0) {
          toast({
            title: "Erro",
            description: "O arquivo CSV está vazio",
            variant: "destructive",
          });
          return;
        }

        // Detectar cabeçalhos automaticamente
        const firstRow = rows[0].split(',').map(h => h.trim().toLowerCase());
        const dataRows = rows.slice(1);
        
        // Mapeamento automático baseado nos cabeçalhos
        const autoMapping: { [key: string]: string } = {};
        
        firstRow.forEach((header, index) => {
          if (header.includes('nome') || header.includes('name')) {
            autoMapping[index] = 'name';
          } else if (header.includes('telefone') || header.includes('phone') || header.includes('celular')) {
            autoMapping[index] = 'phone';
          } else if (header.includes('email') || header.includes('e-mail')) {
            autoMapping[index] = 'email';
          } else if (header.includes('tag') || header.includes('etiqueta') || header.includes('categoria')) {
            autoMapping[index] = 'tags';
          } else if (header.includes('empresa') || header.includes('company')) {
            autoMapping[index] = 'company';
          } else if (header.includes('cargo') || header.includes('position')) {
            autoMapping[index] = 'position';
          } else if (header.includes('observação') || header.includes('note') || header.includes('comentário')) {
            autoMapping[index] = 'notes';
          }
        });

        // Se não encontrou mapeamento automático, usar formato padrão (primeiras 3 colunas)
        if (Object.keys(autoMapping).length === 0) {
          autoMapping[0] = 'name';
          autoMapping[1] = 'phone';
          autoMapping[2] = 'tags';
        }

        // Processar dados
        const processedContacts = dataRows
          .map((row, index) => {
            const columns = row.split(',').map(c => c.trim());
            const contact: any = {
              id: Date.now() + index,
              created_at: new Date().toISOString()
            };
            
            Object.entries(autoMapping).forEach(([columnIndex, systemField]) => {
              const value = columns[parseInt(columnIndex)];
              if (value !== undefined) {
                if (systemField === 'tags') {
                  contact[systemField] = value.split(';').map((t: string) => t.trim()).filter(Boolean);
                } else {
                  contact[systemField] = value;
                }
              }
            });

            return contact;
          })
          .filter(contact => contact.name && contact.phone);

        // Salvar os contatos
        setLocalContacts(prev => [...prev, ...processedContacts]);
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        
        toast({
          title: "Sucesso!",
          description: `${processedContacts.length} contatos importados do CSV com sucesso.`,
        });

      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao processar o arquivo CSV.",
          variant: "destructive",
        });
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Processar como Excel
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length === 0) {
              toast({
                title: "Erro",
                description: "A planilha está vazia",
                variant: "destructive",
              });
              return;
            }

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];

            // Mapeamento automático baseado nos nomes das colunas
            const autoMapping: { [key: string]: string } = {};
            
            headers.forEach(header => {
              const headerLower = header.toLowerCase();
              if (headerLower.includes('nome') || headerLower.includes('name')) {
                autoMapping[header] = 'name';
              } else if (headerLower.includes('telefone') || headerLower.includes('phone') || headerLower.includes('celular')) {
                autoMapping[header] = 'phone';
              } else if (headerLower.includes('email') || headerLower.includes('e-mail')) {
                autoMapping[header] = 'email';
              } else if (headerLower.includes('tag') || headerLower.includes('etiqueta') || headerLower.includes('categoria')) {
                autoMapping[header] = 'tags';
              } else if (headerLower.includes('empresa') || headerLower.includes('company')) {
                autoMapping[header] = 'company';
              } else if (headerLower.includes('cargo') || headerLower.includes('position')) {
                autoMapping[header] = 'position';
              } else if (headerLower.includes('observação') || headerLower.includes('note') || headerLower.includes('comentário')) {
                autoMapping[header] = 'notes';
              }
            });

            // Processar dados com mapeamento automático
            const processedData = rows.map((row, index) => {
              const contact: any = {
                id: Date.now() + index,
                created_at: new Date().toISOString()
              };
              
              Object.entries(autoMapping).forEach(([excelColumn, systemField]) => {
                const columnIndex = headers.indexOf(excelColumn);
                if (columnIndex !== -1 && row[columnIndex] !== undefined) {
                  if (systemField === 'tags') {
                    contact[systemField] = typeof row[columnIndex] === 'string' 
                      ? row[columnIndex].split(';').map((t: string) => t.trim()).filter(Boolean)
                      : [];
                  } else {
                    contact[systemField] = row[columnIndex];
                  }
                }
              });

              return contact;
            }).filter(contact => contact.name && contact.phone);

            // Salvar os contatos
            setLocalContacts(prev => [...prev, ...processedData]);
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
            
            toast({
              title: "Sucesso!",
              description: `${processedData.length} contatos importados do Excel com sucesso.`,
            });

          } catch (err) {
            console.error('Erro ao processar Excel:', err);
            toast({
              title: "Erro",
              description: "Erro ao processar a planilha Excel. Verifique se o arquivo está correto.",
              variant: "destructive",
            });
          }
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao ler o arquivo Excel.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Erro",
        description: "Formato de arquivo não suportado. Use CSV ou Excel (.xlsx/.xls).",
        variant: "destructive",
      });
    }
  };

  const allTags = Array.from(
    new Set(contacts?.flatMap((c) => c.tags || []))
  ).filter(Boolean);

  const filteredContacts = contacts?.filter((contact) => {
    const matchesSearch = (contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (contact.phone?.includes(searchTerm) || false);
    const matchesTag = !selectedTag || contact.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Contatos</h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie sua base de contatos para campanhas
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Contato
          </Button>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Lista de Contatos</TabsTrigger>
            <TabsTrigger value="import">Importar Contatos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Importar Contatos</CardTitle>
                <CardDescription>
                  Importe contatos de arquivos CSV ou Excel (.xlsx)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Importar Lista de Contatos</h3>
                    <p className="text-sm text-muted-foreground">
                      Faça upload de um arquivo CSV ou Excel (.xlsx) - o sistema detectará automaticamente o formato e mapeará os campos
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-4">
                    <Label htmlFor="smart-file-upload" className="cursor-pointer">
                      <div className="flex h-12 items-center gap-3 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
                        <Upload className="h-5 w-5" />
                        {uploadMutation.isPending || excelUploadMutation.isPending ? 'Processando...' : 'Selecionar Arquivo'}
                      </div>
                      <Input
                        id="smart-file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleSmartFileUpload}
                        disabled={uploadMutation.isPending || excelUploadMutation.isPending}
                      />
                    </Label>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Formatos suportados:</strong> CSV, Excel (.xlsx/.xls)</p>
                      <p><strong>Mapeamento automático:</strong> nome, telefone, email, tags, empresa, cargo, observações</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <CardTitle>Buscar e Filtrar</CardTitle>
                <CardDescription>
                  Encontre contatos por nome, telefone ou tag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedTag === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTag(null)}
                  >
                    Todas
                  </Badge>
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-elegant)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Contatos ({filteredContacts?.length || 0})</CardTitle>
                  {selectedContacts.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedContacts.size} selecionado(s)
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Selecionados
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir {selectedContacts.size} contato(s) selecionado(s)? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground">Carregando...</p>
                ) : filteredContacts && filteredContacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedContacts.has(contact.id)}
                              onCheckedChange={() => handleSelectContact(contact.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.phone}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(contact.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditContact(contact)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o contato "{contact.name}"? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Nenhum contato cadastrado</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Importe um arquivo CSV ou Excel para começar
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      CSV: nome,telefone,tag1;tag2;tag3 | Excel: mapeamento personalizado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Adicionar Contato */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Contato</DialogTitle>
              <DialogDescription>
                Preencha as informações do novo contato.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">Nome *</Label>
                <Input
                  id="add-name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    name: e.target.value
                  })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="add-phone">Telefone *</Label>
                <Input
                  id="add-phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    phone: e.target.value
                  })}
                  placeholder="11999999999"
                />
              </div>
              <div>
                <Label htmlFor="add-email">E-mail</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    email: e.target.value
                  })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="add-tags">Tags (separadas por ponto e vírgula)</Label>
                <Input
                  id="add-tags"
                  value={Array.isArray(newContact.tags) ? newContact.tags.join(';') : newContact.tags || ''}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    tags: e.target.value
                  })}
                  placeholder="cliente;vip;prospecto"
                />
              </div>
              <div>
                <Label htmlFor="add-company">Empresa</Label>
                <Input
                  id="add-company"
                  value={newContact.company}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    company: e.target.value
                  })}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="add-position">Cargo</Label>
                <Input
                  id="add-position"
                  value={newContact.position}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    position: e.target.value
                  })}
                  placeholder="Cargo/posição"
                />
              </div>
              <div>
                <Label htmlFor="add-notes">Observações</Label>
                <Input
                  id="add-notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({
                    ...newContact,
                    notes: e.target.value
                  })}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddContact}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Contato</DialogTitle>
              <DialogDescription>
                Edite as informações do contato abaixo.
              </DialogDescription>
            </DialogHeader>
            {editingContact && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    value={editingContact.name || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editingContact.phone || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      phone: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingContact.email || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      email: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tags">Tags (separadas por ponto e vírgula)</Label>
                  <Input
                    id="edit-tags"
                    value={Array.isArray(editingContact.tags) ? editingContact.tags.join(';') : editingContact.tags || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      tags: e.target.value.split(';').map(t => t.trim()).filter(Boolean)
                    })}
                    placeholder="cliente;vip;prospecto"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company">Empresa</Label>
                  <Input
                    id="edit-company"
                    value={editingContact.company || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      company: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Input
                    id="edit-notes"
                    value={editingContact.notes || ''}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      notes: e.target.value
                    })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
