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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search, X, Plus } from "lucide-react";
import { Upload, UserPlus, FileSpreadsheet, Edit, Trash2, CheckSquare, Square, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ExcelUpload } from "@/components/ExcelUpload";
import { ContactGroups } from "@/components/ContactGroups";
import * as XLSX from 'xlsx';

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [localContacts, setLocalContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
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
    notes: '',
    custom_fields: {}
  });
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [mappingData, setMappingData] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<any>({});
  const [openPopovers, setOpenPopovers] = useState<{ [key: number]: boolean }>({});
  const [sortBy, setSortBy] = useState<"name" | "phone" | "created_at" | "tags">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [tagFilter, setTagFilter] = useState<string>("all");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Estados para edição em massa
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    tags: [] as string[],
    company: '',
    position: '',
    notes: ''
  });
  
  // Estados para sistema de tags melhorado
  const [newTag, setNewTag] = useState('');
  const [allAvailableTags, setAllAvailableTags] = useState<string[]>([]);
  const [openTagPopovers, setOpenTagPopovers] = useState<{ [key: string]: boolean }>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar contatos:', error);
        throw error;
      }
      
      return (data || []) as any[];
    },
  });

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

  // Buscar campos personalizados (temporariamente desabilitado até criar a tabela)
  const { data: customFields } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      // Temporariamente retornar array vazio até criar a tabela custom_fields
      return [];
    },
  });

  // Combinar campos do sistema com campos personalizados
  const allFields = [...systemFields, ...(customFields || [])];

  // Resetar paginação quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, tagFilter, sortBy, sortOrder]);

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

  // Funções para mapeamento de campos
  const handleFieldMappingChange = (columnIndex: number, systemField: string) => {
    setFieldMapping(prev => {
      const newMapping = { ...prev };
      
      // Se o campo não é "none", verificar se já existe
      if (systemField !== 'none') {
        // Remover o mapeamento anterior deste campo se existir
        Object.keys(newMapping).forEach(key => {
          if (newMapping[key] === systemField && key !== columnIndex.toString()) {
            delete newMapping[key];
          }
        });
      }
      
      // Atualizar o mapeamento
      if (systemField === 'none') {
        delete newMapping[columnIndex];
      } else {
        newMapping[columnIndex] = systemField;
      }
      
      return newMapping;
    });
  };

  const getFieldLabel = (fieldName: string) => {
    if (fieldName === 'none') return '-- Não mapear --';
    const field = allFields?.find(f => f.name === fieldName);
    return field ? `${field.label}${field.isSystem ? ' (Sistema)' : ''}` : fieldName;
  };

  const togglePopover = (index: number) => {
    setOpenPopovers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Lógica de filtros e ordenação
  const filteredAndSortedContacts = contacts ? contacts
    .filter((contact) => {
      // Filtro por termo de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          contact.name?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.company?.toLowerCase().includes(searchLower) ||
          contact.tags?.some((tag: any) => String(tag).toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .filter((contact) => {
      // Filtro por tag (comparação exata)
      if (tagFilter && tagFilter !== "all") {
        return contact.tags?.some((tag: any) => 
          String(tag).toLowerCase() === tagFilter.toLowerCase()
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "phone":
          aValue = (a.phone || "").toLowerCase();
          bValue = (b.phone || "").toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "tags":
          aValue = (a.tags?.join(", ") || "").toLowerCase();
          bValue = (b.tags?.join(", ") || "").toLowerCase();
          break;
        default:
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
      }
      
      if (sortOrder === "asc") {
        // Para strings, usar localeCompare para ordenação alfabética correta
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue, 'pt-BR');
        }
        return aValue > bValue ? 1 : -1;
      } else {
        // Para strings, usar localeCompare para ordenação alfabética correta
        if (typeof aValue === "string" && typeof bValue === "string") {
          return bValue.localeCompare(aValue, 'pt-BR');
        }
        return aValue < bValue ? 1 : -1;
      }
    }) : [];

  // Paginação no frontend
  const totalFilteredContacts = filteredAndSortedContacts.length;
  const displayedContacts = filteredAndSortedContacts.slice(0, currentPage * itemsPerPage);
  const hasMoreToShow = displayedContacts.length < totalFilteredContacts;

  // Obter todas as tags únicas para o filtro
  const allTags = contacts ? Array.from(new Set(
    contacts.flatMap(contact => contact.tags || [])
  )).sort() : [];

  // Atualizar tags disponíveis quando contatos mudarem
  React.useEffect(() => {
    if (contacts) {
      const uniqueTags = Array.from(new Set(
        contacts.flatMap(contact => contact.tags || [])
      )).sort();
      setAllAvailableTags(uniqueTags);
    }
  }, [contacts]);

  const processMappedData = async () => {
    if (!mappingData) return;

    // Lista de campos válidos que existem na tabela contacts
    const validFields = ['name', 'phone', 'phone2', 'phone3', 'email', 'tags', 'company', 'position', 'notes'];
    
    // Adicionar campos personalizados à lista de campos válidos
    const allValidFields = [...validFields];
    if (allFields && allFields.length > 0) {
      allFields.forEach(field => {
        if (!allValidFields.includes(field.name)) {
          allValidFields.push(field.name);
        }
      });
    }

    const processedContacts = mappingData.rows.map((row: any[], index: number) => {
      const contact: any = {};
      const customFields: any = {};
      
      Object.entries(fieldMapping).forEach(([columnIndex, systemField]) => {
        // Só processar se o campo for válido
        if (allValidFields.includes(systemField as string)) {
          const value = row[parseInt(columnIndex as string)];
          if (value !== undefined && value !== null && value !== '') {
            // Verificar se é um campo do sistema
            if (validFields.includes(systemField as string)) {
              if (systemField === 'tags') {
                contact[systemField] = typeof value === 'string' 
                  ? value.split(';').map((t: string) => t.trim()).filter(Boolean)
                  : [];
              } else {
                contact[systemField as string] = value;
              }
            } else {
              // É um campo personalizado, adicionar ao custom_fields
              customFields[systemField as string] = value;
            }
          }
        }
      });

      // Adicionar campos personalizados se existirem
      if (Object.keys(customFields).length > 0) {
        contact.custom_fields = customFields;
      }

      return contact;
    }).filter(contact => contact.name && contact.phone);

    // Salvar os contatos no Supabase
    const { error } = await supabase
      .from('contacts')
      .insert(processedContacts);
    
    if (error) {
      console.error('Erro ao salvar contatos:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar contatos no banco de dados.",
        variant: "destructive",
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    // Fechar modal e limpar dados
    setIsMappingDialogOpen(false);
    setMappingData(null);
    setFieldMapping({});
    
    toast({
      title: "Sucesso!",
      description: `${processedContacts.length} contatos importados com sucesso.`,
    });
  };

  // Funções para gerenciar seleções
  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredAndSortedContacts?.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredAndSortedContacts?.map(c => c.id) || []));
    }
  };

  // Funções para edição
  const handleEditContact = (contact: any) => {
    setEditingContact(contact);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    
    if (!editingContact.name || !editingContact.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      name: editingContact.name,
      phone: editingContact.phone,
      email: editingContact.email || null,
      tags: editingContact.tags || [],
      company: editingContact.company || null,
      position: editingContact.position || null,
      notes: editingContact.notes || null
    };

    // Adicionar campos personalizados se existirem
    if (editingContact.custom_fields && Object.keys(editingContact.custom_fields).length > 0) {
      updateData.custom_fields = editingContact.custom_fields;
    }

    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', editingContact.id);
    
    if (error) {
      console.error('Erro ao atualizar contato:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar contato.",
        variant: "destructive",
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    setIsEditDialogOpen(false);
    setEditingContact(null);
    
    toast({
      title: "Sucesso!",
      description: "Contato atualizado com sucesso.",
    });
  };

  // Funções para exclusão
  const handleDeleteContact = async (contactId: string) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);
    
    if (error) {
      console.error('Erro ao excluir contato:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir contato.",
        variant: "destructive",
      });
      return;
    }
    
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

  const handleDeleteSelected = async () => {
    const contactIds = Array.from(selectedContacts);
    
    try {
      // Processar em lotes de 100 para evitar timeout
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batch = contactIds.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('contacts')
          .delete()
          .in('id', batch);
        
        if (error) {
          console.error('Erro ao excluir lote de contatos:', error);
          toast({
            title: "Erro",
            description: `Erro ao excluir contatos. ${deletedCount} foram excluídos antes do erro.`,
            variant: "destructive",
          });
          return;
        }
        
        deletedCount += batch.length;
      }
      
      setSelectedContacts(new Set());
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      toast({
        title: "Sucesso!",
        description: `${deletedCount} contatos excluídos com sucesso.`,
      });
      
    } catch (error) {
      console.error('Erro geral ao excluir contatos:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir contatos.",
        variant: "destructive",
      });
    }
  };

  // Funções para edição em massa
  const handleBulkEdit = () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um contato para editar.",
        variant: "destructive",
      });
      return;
    }

    // Carregar tags atuais dos contatos selecionados
    const selectedContactsData = contacts?.filter(contact => selectedContacts.has(contact.id)) || [];
    const allCurrentTags = selectedContactsData.flatMap(contact => contact.tags || []);
    const uniqueCurrentTags = Array.from(new Set(allCurrentTags));

    // Inicializar dados do bulk edit com tags atuais
    setBulkEditData({
      tags: uniqueCurrentTags,
      company: '',
      position: '',
      notes: ''
    });

    setIsBulkEditDialogOpen(true);
  };

  const handleBulkEditSave = async () => {
    const contactIds = Array.from(selectedContacts);
    
    try {
      // Verificar se há campos para atualizar
      const hasTags = bulkEditData.tags.length > 0;
      const hasCompany = bulkEditData.company.trim();
      const hasPosition = bulkEditData.position.trim();
      const hasNotes = bulkEditData.notes.trim();

      if (!hasTags && !hasCompany && !hasPosition && !hasNotes) {
        toast({
          title: "Erro",
          description: "Preencha pelo menos um campo para atualizar.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar cada contato individualmente para tratar tags corretamente
      let updatedCount = 0;
      
      for (const contactId of contactIds) {
        const contact = contacts?.find(c => c.id === contactId);
        if (!contact) continue;

        const updateData: any = {};
        
        // Para tags, adicionar às existentes ao invés de substituir
        if (hasTags) {
          const currentTags = contact.tags || [];
          const newTags = bulkEditData.tags.filter(tag => !currentTags.includes(tag));
          updateData.tags = [...currentTags, ...newTags];
        }
        
        // Para outros campos, só atualizar se preenchidos
        if (hasCompany) {
          updateData.company = bulkEditData.company;
        }
        if (hasPosition) {
          updateData.position = bulkEditData.position;
        }
        if (hasNotes) {
          updateData.notes = bulkEditData.notes;
        }

        const { error } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contactId);
        
        if (error) {
          console.error('Erro ao atualizar contato:', error);
          toast({
            title: "Erro",
            description: `Erro ao atualizar contato ${contact.name}. ${updatedCount} foram atualizados antes do erro.`,
            variant: "destructive",
          });
          return;
        }
        
        updatedCount++;
      }
      
      setSelectedContacts(new Set());
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      // Resetar dados do bulk edit
      setBulkEditData({
        tags: [],
        company: '',
        position: '',
        notes: ''
      });
      
      setIsBulkEditDialogOpen(false);
      
      toast({
        title: "Sucesso!",
        description: `${updatedCount} contatos atualizados com sucesso.`,
      });
      
    } catch (error) {
      console.error('Erro geral ao atualizar contatos:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar contatos.",
        variant: "destructive",
      });
    }
  };

  // Funções para sistema de tags melhorado
  const addTagToBulkEdit = (tag: string) => {
    if (tag.trim() && !bulkEditData.tags.includes(tag.trim())) {
      setBulkEditData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTagFromBulkEdit = (tagToRemove: string) => {
    setBulkEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addNewTagToBulkEdit = () => {
    if (newTag.trim() && !bulkEditData.tags.includes(newTag.trim())) {
      setBulkEditData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const addTagToContact = (contactId: string, tag: string) => {
    if (tag.trim()) {
      const contact = contacts?.find(c => c.id === contactId);
      if (contact && !contact.tags?.includes(tag.trim())) {
        const updatedTags = [...(contact.tags || []), tag.trim()];
        updateContactTags(contactId, updatedTags);
      }
    }
  };

  const removeTagFromContact = (contactId: string, tagToRemove: string) => {
    const contact = contacts?.find(c => c.id === contactId);
    if (contact) {
      const updatedTags = contact.tags?.filter(tag => tag !== tagToRemove) || [];
      updateContactTags(contactId, updatedTags);
    }
  };

  const updateContactTags = async (contactId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ tags })
        .eq('id', contactId);
      
      if (error) {
        console.error('Erro ao atualizar tags do contato:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar tags do contato.",
          variant: "destructive",
        });
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar tags.",
        variant: "destructive",
      });
    }
  };

  const toggleTagPopover = (contactId: string) => {
    setOpenTagPopovers(prev => ({
      ...prev,
      [contactId]: !prev[contactId]
    }));
  };

  // Função para carregar mais contatos
  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Função para adicionar novo contato
  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const contact = {
      name: newContact.name,
      phone: newContact.phone,
      email: newContact.email || null,
      tags: typeof newContact.tags === 'string' 
        ? newContact.tags.split(';').map((t: string) => t.trim()).filter(Boolean)
        : newContact.tags || [],
      company: newContact.company || null,
      position: newContact.position || null,
      notes: newContact.notes || null,
      custom_fields: newContact.custom_fields || {}
    };

    const { error } = await supabase
      .from('contacts')
      .insert([contact]);
    
    if (error) {
      console.error('Erro ao adicionar contato:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar contato.",
        variant: "destructive",
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    
    // Reset form
    setNewContact({
      name: '',
      phone: '',
      email: '',
      tags: [],
      company: '',
      position: '',
      notes: '',
      custom_fields: {}
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
        const validFields = ['name', 'phone', 'phone2', 'phone3', 'email', 'tags', 'company', 'position', 'notes'];
        const usedFields = new Set<string>();
        
        let phoneCount = 0;
        firstRow.forEach((header, index) => {
          const headerLower = header.toLowerCase();
          
          if (headerLower.includes('nome') || headerLower.includes('name')) {
            if (!usedFields.has('name')) {
              autoMapping[index] = 'name';
              usedFields.add('name');
            }
          } else if (headerLower.includes('telefone') || headerLower.includes('phone') || headerLower.includes('celular')) {
            if (phoneCount === 0 && !usedFields.has('phone')) {
              autoMapping[index] = 'phone';
              usedFields.add('phone');
              phoneCount++;
            } else if (phoneCount === 1 && !usedFields.has('phone2')) {
              autoMapping[index] = 'phone2';
              usedFields.add('phone2');
              phoneCount++;
            } else if (phoneCount === 2 && !usedFields.has('phone3')) {
              autoMapping[index] = 'phone3';
              usedFields.add('phone3');
              phoneCount++;
            }
          } else if (headerLower.includes('email') || headerLower.includes('e-mail')) {
            if (!usedFields.has('email')) {
              autoMapping[index] = 'email';
              usedFields.add('email');
            }
          } else if (headerLower.includes('tag') || headerLower.includes('etiqueta') || headerLower.includes('categoria')) {
            if (!usedFields.has('tags')) {
              autoMapping[index] = 'tags';
              usedFields.add('tags');
            }
          } else if (headerLower.includes('empresa') || headerLower.includes('company')) {
            if (!usedFields.has('company')) {
              autoMapping[index] = 'company';
              usedFields.add('company');
            }
          } else if (headerLower.includes('cargo') || headerLower.includes('position')) {
            if (!usedFields.has('position')) {
              autoMapping[index] = 'position';
              usedFields.add('position');
            }
          } else if (headerLower.includes('observação') || headerLower.includes('note') || headerLower.includes('comentário')) {
            if (!usedFields.has('notes')) {
              autoMapping[index] = 'notes';
              usedFields.add('notes');
            }
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

        // Mostrar modal de mapeamento para confirmação
        setMappingData({
          headers: firstRow,
          rows: dataRows.map(row => row.split(',').map(c => c.trim())),
          type: 'csv'
        });
        setFieldMapping(autoMapping);
        setIsMappingDialogOpen(true);

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
            const validFields = ['name', 'phone', 'phone2', 'phone3', 'email', 'tags', 'company', 'position', 'notes'];
            const usedFields = new Set<string>();
            
            let phoneCount = 0;
            headers.forEach(header => {
              const headerLower = header.toLowerCase();
              if (headerLower.includes('nome') || headerLower.includes('name')) {
                if (!usedFields.has('name')) {
                  autoMapping[header] = 'name';
                  usedFields.add('name');
                }
              } else if (headerLower.includes('telefone') || headerLower.includes('phone') || headerLower.includes('celular')) {
                if (phoneCount === 0 && !usedFields.has('phone')) {
                  autoMapping[header] = 'phone';
                  usedFields.add('phone');
                  phoneCount++;
                } else if (phoneCount === 1 && !usedFields.has('phone2')) {
                  autoMapping[header] = 'phone2';
                  usedFields.add('phone2');
                  phoneCount++;
                } else if (phoneCount === 2 && !usedFields.has('phone3')) {
                  autoMapping[header] = 'phone3';
                  usedFields.add('phone3');
                  phoneCount++;
                }
              } else if (headerLower.includes('email') || headerLower.includes('e-mail')) {
                if (!usedFields.has('email')) {
                  autoMapping[header] = 'email';
                  usedFields.add('email');
                }
              } else if (headerLower.includes('tag') || headerLower.includes('etiqueta') || headerLower.includes('categoria')) {
                if (!usedFields.has('tags')) {
                  autoMapping[header] = 'tags';
                  usedFields.add('tags');
                }
              } else if (headerLower.includes('empresa') || headerLower.includes('company')) {
                if (!usedFields.has('company')) {
                  autoMapping[header] = 'company';
                  usedFields.add('company');
                }
              } else if (headerLower.includes('cargo') || headerLower.includes('position')) {
                if (!usedFields.has('position')) {
                  autoMapping[header] = 'position';
                  usedFields.add('position');
                }
              } else if (headerLower.includes('observação') || headerLower.includes('note') || headerLower.includes('comentário')) {
                if (!usedFields.has('notes')) {
                  autoMapping[header] = 'notes';
                  usedFields.add('notes');
                }
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

            // Mostrar modal de mapeamento para confirmação
            setMappingData({
              headers: headers,
              rows: rows,
              type: 'excel'
            });
            setFieldMapping(autoMapping);
            setIsMappingDialogOpen(true);

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

  // Remover lógica antiga - agora usando filteredAndSortedContacts

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

        {/* Controles de Filtro e Ordenação */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                    id="search"
                    placeholder="Nome, telefone, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por Tag */}
              <div className="space-y-2">
                <Label htmlFor="tag-filter">Filtrar por Tag</Label>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenar por */}
              <div className="space-y-2">
                <Label htmlFor="sort-by">Ordenar por</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Data de Inclusão</SelectItem>
                    <SelectItem value="name">Nome (A-Z)</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="tags">Tags</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordem */}
              <div className="space-y-2">
                <Label htmlFor="sort-order">Ordem</Label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Decrescente</SelectItem>
                    <SelectItem value="asc">Crescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Lista de Contatos</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
            <TabsTrigger value="import">Importar Contatos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="groups" className="space-y-6">
            <ContactGroups selectedContacts={selectedContacts} mode="manage" />
          </TabsContent>
          
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
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Contatos ({totalFilteredContacts || 0})</CardTitle>
                  {selectedContacts.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedContacts.size} selecionado(s)
                      </span>
                      <Button variant="outline" size="sm" onClick={handleBulkEdit}>
                        <Users className="h-4 w-4 mr-2" />
                        Editar em Massa
                      </Button>
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
                ) : displayedContacts && displayedContacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedContacts.size === displayedContacts.length && displayedContacts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Campos Personalizados</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {displayedContacts.map((contact) => (
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
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => removeTagFromContact(contact.id, tag)}
                              title="Clique para remover"
                            >
                              {tag}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                          <Popover open={openTagPopovers[contact.id]} onOpenChange={() => toggleTagPopover(contact.id)}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-6 w-6 p-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                title="Adicionar tag"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Adicionar Tag</Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Nova tag"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        addTagToContact(contact.id, newTag);
                                        setNewTag('');
                                        toggleTagPopover(contact.id);
                                      }
                                    }}
                                  />
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      addTagToContact(contact.id, newTag);
                                      setNewTag('');
                                      toggleTagPopover(contact.id);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                {allAvailableTags.length > 0 && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Tags existentes:</Label>
                                    <div className="flex flex-wrap gap-1">
                                      {allAvailableTags
                                        .filter(tag => !contact.tags?.includes(tag))
                                        .map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                            onClick={() => {
                                              addTagToContact(contact.id, tag);
                                              toggleTagPopover(contact.id);
                                            }}
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                          <TableCell>
                            {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(contact.custom_fields).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="font-medium text-muted-foreground">{key}:</span> {String(value)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.created_at ? new Date(contact.created_at).toLocaleDateString("pt-BR") : "Data não disponível"}
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
          
          {/* Botão Ver Mais */}
          {hasMoreToShow && displayedContacts && displayedContacts.length > 0 && (
            <div className="flex justify-center mt-6 pb-6">
              <Button 
                onClick={handleLoadMore}
                variant="outline"
                className="w-full max-w-xs"
              >
                Ver Mais Contatos
              </Button>
            </div>
          )}
        </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Mapeamento de Campos */}
        <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Confirmar Mapeamento de Campos</DialogTitle>
              <DialogDescription>
                Verifique e ajuste o mapeamento dos campos da sua planilha. O sistema detectou automaticamente os campos, mas você pode alterar conforme necessário.
              </DialogDescription>
            </DialogHeader>
            {mappingData && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {mappingData.headers.map((header: string, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <label className="text-sm font-medium">
                          Coluna da Planilha: <span className="text-blue-600">{header}</span>
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Exemplo: {mappingData.rows[0]?.[index] || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="flex-1">
                        <Popover open={openPopovers[index]} onOpenChange={() => togglePopover(index)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openPopovers[index]}
                              className="w-full justify-between"
                            >
                              {getFieldLabel(fieldMapping[index] || 'none')}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar campo..." />
                              <CommandList>
                                <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="none"
                                    onSelect={() => {
                                      handleFieldMappingChange(index, 'none');
                                      togglePopover(index);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        (fieldMapping[index] || 'none') === 'none' ? 'opacity-100' : 'opacity-0'
                                      }`}
                                    />
                                    -- Não mapear --
                                  </CommandItem>
                                  {allFields && allFields.length > 0 ? (
                                    allFields.map((field) => (
                                      <CommandItem
                                        key={field.id}
                                        value={field.name}
                                        onSelect={() => {
                                          handleFieldMappingChange(index, field.name);
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === field.name ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        {field.label} {field.isSystem && '(Sistema)'}
                                      </CommandItem>
                                    ))
                                  ) : (
                                    <>
                                      <CommandItem
                                        value="name"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'name');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'name' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Nome
                                      </CommandItem>
                                      <CommandItem
                                        value="phone"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'phone');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'phone' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Telefone
                                      </CommandItem>
                                      <CommandItem
                                        value="phone2"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'phone2');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'phone2' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Telefone 2
                                      </CommandItem>
                                      <CommandItem
                                        value="phone3"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'phone3');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'phone3' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Telefone 3
                                      </CommandItem>
                                      <CommandItem
                                        value="email"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'email');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'email' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        E-mail
                                      </CommandItem>
                                      <CommandItem
                                        value="tags"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'tags');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'tags' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Tags
                                      </CommandItem>
                                      <CommandItem
                                        value="company"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'company');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'company' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Empresa
                                      </CommandItem>
                                      <CommandItem
                                        value="position"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'position');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'position' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Cargo
                                      </CommandItem>
                                      <CommandItem
                                        value="notes"
                                        onSelect={() => {
                                          handleFieldMappingChange(index, 'notes');
                                          togglePopover(index);
                                        }}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            fieldMapping[index] === 'notes' ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        />
                                        Observações
                                      </CommandItem>
                                    </>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Preview dos Dados:</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>Total de registros: {mappingData.rows.length}</p>
                    <p>Primeiros 3 registros:</p>
                    <div className="mt-2 space-y-1">
                      {mappingData.rows.slice(0, 3).map((row: any[], rowIndex: number) => (
                        <div key={rowIndex} className="text-xs">
                          {row.slice(0, 3).join(' | ')}...
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={processMappedData}>
                Importar Contatos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label>Tags</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {newContact.tags?.map((tag: string) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => {
                          const updatedTags = newContact.tags?.filter((t: string) => t !== tag) || [];
                          setNewContact({
                            ...newContact,
                            tags: updatedTags
                          });
                        }}
                        title="Clique para remover"
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    <Popover open={openTagPopovers['add-new']} onOpenChange={() => toggleTagPopover('add-new')}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-6 w-6 p-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          title="Adicionar tag"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Adicionar Tag</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nova tag"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  if (newTag.trim() && !newContact.tags?.includes(newTag.trim())) {
                                    setNewContact({
                                      ...newContact,
                                      tags: [...(newContact.tags || []), newTag.trim()]
                                    });
                                  }
                                  setNewTag('');
                                  toggleTagPopover('add-new');
                                }
                              }}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => {
                                if (newTag.trim() && !newContact.tags?.includes(newTag.trim())) {
                                  setNewContact({
                                    ...newContact,
                                    tags: [...(newContact.tags || []), newTag.trim()]
                                  });
                                }
                                setNewTag('');
                                toggleTagPopover('add-new');
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {allAvailableTags.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Tags existentes:</Label>
                              <div className="flex flex-wrap gap-1">
                                {allAvailableTags
                                  .filter(tag => !newContact.tags?.includes(tag))
                                  .map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                      onClick={() => {
                                        if (!newContact.tags?.includes(tag)) {
                                          setNewContact({
                                            ...newContact,
                                            tags: [...(newContact.tags || []), tag]
                                          });
                                        }
                                        toggleTagPopover('add-new');
                                      }}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
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
              
              {/* Campos Personalizados */}
              {customFields && customFields.length > 0 && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Campos Personalizados</h4>
                    {customFields.map((field: any) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`add-custom-${field.name}`}>
                          {field.label}
                        </Label>
                        <Input
                          id={`add-custom-${field.name}`}
                          value={newContact.custom_fields?.[field.name] || ''}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            custom_fields: {
                              ...newContact.custom_fields,
                              [field.name]: e.target.value
                            }
                          })}
                          placeholder={`Digite ${field.label.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <Label>Tags</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {editingContact.tags?.map((tag: string) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          onClick={() => {
                            const updatedTags = editingContact.tags?.filter((t: string) => t !== tag) || [];
                            setEditingContact({
                              ...editingContact,
                              tags: updatedTags
                            });
                          }}
                          title="Clique para remover"
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                      <Popover open={openTagPopovers[`edit-${editingContact.id}`]} onOpenChange={() => toggleTagPopover(`edit-${editingContact.id}`)}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 w-6 p-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Adicionar tag"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Adicionar Tag</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Nova tag"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    if (newTag.trim() && !editingContact.tags?.includes(newTag.trim())) {
                                      setEditingContact({
                                        ...editingContact,
                                        tags: [...(editingContact.tags || []), newTag.trim()]
                                      });
                                    }
                                    setNewTag('');
                                    toggleTagPopover(`edit-${editingContact.id}`);
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (newTag.trim() && !editingContact.tags?.includes(newTag.trim())) {
                                    setEditingContact({
                                      ...editingContact,
                                      tags: [...(editingContact.tags || []), newTag.trim()]
                                    });
                                  }
                                  setNewTag('');
                                  toggleTagPopover(`edit-${editingContact.id}`);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {allAvailableTags.length > 0 && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Tags existentes:</Label>
                                <div className="flex flex-wrap gap-1">
                                  {allAvailableTags
                                    .filter(tag => !editingContact.tags?.includes(tag))
                                    .map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                        onClick={() => {
                                          if (!editingContact.tags?.includes(tag)) {
                                            setEditingContact({
                                              ...editingContact,
                                              tags: [...(editingContact.tags || []), tag]
                                            });
                                          }
                                          toggleTagPopover(`edit-${editingContact.id}`);
                                        }}
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
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
                
                {/* Campos Personalizados */}
                {editingContact.custom_fields && Object.keys(editingContact.custom_fields).length > 0 && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Campos Personalizados</h4>
                      {Object.entries(editingContact.custom_fields).map(([fieldName, fieldValue]) => (
                        <div key={fieldName} className="space-y-2">
                          <Label htmlFor={`edit-custom-${fieldName}`} className="capitalize">
                            {fieldName}
                          </Label>
                          <Input
                            id={`edit-custom-${fieldName}`}
                            value={fieldValue as string || ''}
                            onChange={(e) => setEditingContact({
                              ...editingContact,
                              custom_fields: {
                                ...editingContact.custom_fields,
                                [fieldName]: e.target.value
                              }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

        {/* Modal de Edição em Massa */}
        <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar em Massa ({selectedContacts.size} contatos)</DialogTitle>
              <DialogDescription>
                Edite os campos abaixo para aplicar a todos os contatos selecionados. 
                As tags serão adicionadas aos contatos (não substituirão as existentes).
                Deixe em branco os campos que não deseja alterar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Tags */}
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {bulkEditData.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => removeTagFromBulkEdit(tag)}
                        title="Clique para remover"
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    <Popover open={openTagPopovers['bulk-edit']} onOpenChange={() => toggleTagPopover('bulk-edit')}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-6 w-6 p-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          title="Adicionar tag"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Adicionar Tag</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nova tag"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addNewTagToBulkEdit();
                                  toggleTagPopover('bulk-edit');
                                }
                              }}
                            />
                            <Button 
                              size="sm" 
                              onClick={() => {
                                addNewTagToBulkEdit();
                                toggleTagPopover('bulk-edit');
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {allAvailableTags.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Tags existentes:</Label>
                              <div className="flex flex-wrap gap-1">
                                {allAvailableTags
                                  .filter(tag => !bulkEditData.tags.includes(tag))
                                  .map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                      onClick={() => {
                                        addTagToBulkEdit(tag);
                                        toggleTagPopover('bulk-edit');
                                      }}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    As tags serão adicionadas aos contatos selecionados (mantendo as existentes)
                  </p>
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <Label htmlFor="bulk-company">Empresa</Label>
                <Input
                  id="bulk-company"
                  placeholder="Deixe em branco para não alterar"
                  value={bulkEditData.company}
                  onChange={(e) => setBulkEditData(prev => ({
                    ...prev,
                    company: e.target.value
                  }))}
                />
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label htmlFor="bulk-position">Cargo</Label>
                <Input
                  id="bulk-position"
                  placeholder="Deixe em branco para não alterar"
                  value={bulkEditData.position}
                  onChange={(e) => setBulkEditData(prev => ({
                    ...prev,
                    position: e.target.value
                  }))}
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="bulk-notes">Observações</Label>
                <Input
                  id="bulk-notes"
                  placeholder="Deixe em branco para não alterar"
                  value={bulkEditData.notes}
                  onChange={(e) => setBulkEditData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleBulkEditSave}>
                Aplicar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
