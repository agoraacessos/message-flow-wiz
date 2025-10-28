import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Trash2, Image, FileText, Link, Type, GripVertical, X, Upload, Eye, EyeOff, Edit, Volume2, Play, Pause } from "lucide-react";
import { WhatsAppSimulator } from "@/components/WhatsAppSimulator";
import { TextFormatToolbar } from "@/components/TextFormatToolbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Tipos de conteúdo disponíveis
type ContentType = 'text' | 'image' | 'file' | 'link' | 'audio';

interface MessageContent {
  id: string;
  type: ContentType;
  content: string;
  metadata?: {
    filename?: string;
    url?: string;
    alt?: string;
    audioFile?: File;
    audioBase64?: string;
  };
  delay?: number; // Pausa em segundos antes desta mensagem
}

export default function Messages() {
  const [title, setTitle] = useState("");
  const [messageFlow, setMessageFlow] = useState<MessageContent[]>([]);
  const [showImagePreview, setShowImagePreview] = useState<{ [key: string]: boolean }>({});
  
  // Estados para edição
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Estados para formatação de texto
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [activeTextareaId, setActiveTextareaId] = useState<string | null>(null);
  
  // Estados para preview
  const [audioPreview, setAudioPreview] = useState<{ [key: string]: boolean }>({});
  
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Função para lidar com upload de áudio
  const handleAudioUpload = async (blockId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de áudio válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (limite de 16MB)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: "O arquivo de áudio deve ter no máximo 16MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Converter para base64
      const base64 = await fileToBase64(file);
      
      // Atualizar o bloco com o arquivo
      updateContentBlock(blockId, base64, {
        audioFile: file,
        audioBase64: base64,
        filename: file.name
      });

      toast({
        title: "Sucesso",
        description: `Áudio "${file.name}" carregado com sucesso!`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar o arquivo de áudio.",
        variant: "destructive",
      });
    }
  };

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const messageData = {
        title,
        content: JSON.stringify(messageFlow) // Salvar como JSON
      };
      
      const { error } = await supabase
        .from("messages")
        .insert(messageData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setTitle("");
      setMessageFlow([]);
      toast({
        title: "Sucesso!",
        description: "Fluxo de mensagem criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar fluxo de mensagem.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingMessageId) throw new Error("ID da mensagem não encontrado");
      
      const messageData = {
        title,
        content: JSON.stringify(messageFlow)
      };
      
      const { error } = await supabase
        .from("messages")
        .update(messageData)
        .eq("id", editingMessageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setTitle("");
      setMessageFlow([]);
      setIsEditMode(false);
      setEditingMessageId(null);
      setIsEditDialogOpen(false);
      toast({
        title: "Sucesso!",
        description: "Fluxo de mensagem atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar fluxo de mensagem.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({
        title: "Sucesso!",
        description: "Mensagem excluída com sucesso.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && messageFlow.length > 0) {
      if (isEditMode) {
        updateMutation.mutate();
      } else {
      createMutation.mutate();
      }
    }
  };

  // Funções para edição
  const handleEditFlow = (message: any) => {
    try {
      // Tentar parsear como fluxo
      const flowContent = JSON.parse(message.content);
      setTitle(message.title);
      setMessageFlow(flowContent);
      setEditingMessageId(message.id);
      setIsEditMode(true);
      setIsEditDialogOpen(true);
    } catch {
      // Se não conseguir parsear, é uma mensagem simples
      toast({
        title: "Aviso",
        description: "Esta mensagem não é um fluxo e não pode ser editada com o editor de fluxos.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setTitle("");
    setMessageFlow([]);
    setIsEditMode(false);
    setEditingMessageId(null);
    setIsEditDialogOpen(false);
  };

  // Funções para formatação de texto
  const handleTextSelection = (e: React.MouseEvent<HTMLTextAreaElement>, blockId: string) => {
    const textarea = e.target as HTMLTextAreaElement;
    const selection = window.getSelection();
    
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      const rect = textarea.getBoundingClientRect();
      
      setSelectedText(selectedText);
      setActiveTextareaId(blockId);
      setToolbarPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setShowFormatToolbar(true);
    } else {
      setShowFormatToolbar(false);
    }
  };

  const handleFormatText = (formattedText: string) => {
    if (!activeTextareaId) return;
    
    const textarea = document.querySelector(`textarea[data-block-id="${activeTextareaId}"]`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + formattedText + after;
    
    updateContentBlock(activeTextareaId, newText);
    
    // Focar no textarea e posicionar cursor após o texto formatado
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const handleCloseFormatToolbar = () => {
    setShowFormatToolbar(false);
    setSelectedText('');
    setActiveTextareaId(null);
  };

  // Funções para gerenciar o fluxo
  const addContentBlock = (type: ContentType) => {
    const newBlock: MessageContent = {
      id: Date.now().toString(),
      type,
      content: '',
      metadata: {}
    };
    setMessageFlow(prev => [...prev, newBlock]);
  };

  const updateContentBlock = (id: string, content: string, metadata?: any, delay?: number) => {
    setMessageFlow(prev => prev.map(block => 
      block.id === id 
        ? { ...block, content, metadata: { ...block.metadata, ...metadata }, delay }
        : block
    ));
  };

  const removeContentBlock = (id: string) => {
    setMessageFlow(prev => prev.filter(block => block.id !== id));
  };

  const moveContentBlock = (fromIndex: number, toIndex: number) => {
    setMessageFlow(prev => {
      const newFlow = [...prev];
      const [movedBlock] = newFlow.splice(fromIndex, 1);
      newFlow.splice(toIndex, 0, movedBlock);
      return newFlow;
    });
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  const getContentTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'image': return 'Imagem';
      case 'file': return 'Arquivo';
      case 'link': return 'Link';
      case 'audio': return 'Áudio';
      default: return 'Texto';
    }
  };

  // Funções para preview de imagem
  const toggleImagePreview = (blockId: string) => {
    setShowImagePreview(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  // Campos disponíveis para variáveis
  const availableFields = [
    { key: 'nome', label: 'Nome', color: 'bg-blue-100 text-blue-800' },
    { key: 'telefone', label: 'Telefone', color: 'bg-green-100 text-green-800' },
    { key: 'email', label: 'E-mail', color: 'bg-purple-100 text-purple-800' },
    { key: 'empresa', label: 'Empresa', color: 'bg-orange-100 text-orange-800' },
    { key: 'cargo', label: 'Cargo', color: 'bg-pink-100 text-pink-800' },
    { key: 'sobrenome', label: 'Sobrenome', color: 'bg-indigo-100 text-indigo-800' },
  ];

  // Função para inserir variável no textarea
  const insertVariable = (blockId: string, fieldKey: string) => {
    const variable = `{{${fieldKey}}}`;
    
    // Encontrar o textarea do bloco atual
    const textarea = document.querySelector(`textarea[data-block-id="${blockId}"]`) as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + variable + after;
      
      updateContentBlock(blockId, newText);
      
      // Focar no textarea e posicionar cursor após a variável
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  // Função para detectar quando digitar {{
  const handleTextareaKeyUp = (blockId: string, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    // Verificar se há {{ antes do cursor
    const beforeCursor = text.substring(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    const lastCloseBrace = beforeCursor.lastIndexOf('}}');
    
    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
      setActiveTextareaId(blockId);
    } else {
      setActiveTextareaId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Mensagens</h1>
          <p className="mt-2 text-muted-foreground">
            Crie e gerencie fluxos de mensagens com texto, imagens, arquivos e links
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
              <CardTitle>{isEditMode ? 'Editar Fluxo de Mensagem' : 'Novo Fluxo de Mensagem'}</CardTitle>
            <CardDescription>
                {isEditMode ? 'Edite o fluxo de mensagens existente' : 'Crie um fluxo de mensagens com diferentes tipos de conteúdo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Fluxo</Label>
                <Input
                  id="title"
                  placeholder="Ex: Promoção de Verão"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>


              {/* Botões para adicionar tipos de conteúdo */}
              <div className="space-y-2">
                <Label>Adicionar Conteúdo</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addContentBlock('text')}
                  >
                    <Type className="mr-2 h-4 w-4" />
                    Texto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addContentBlock('image')}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Imagem
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addContentBlock('audio')}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Áudio
                  </Button>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Arquivo
                    </Button>
                    <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs px-1 py-0">
                      Em breve
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Fluxo de conteúdo */}
              <div className="space-y-4">
                <Label>Fluxo de Mensagem</Label>
                {messageFlow.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum conteúdo adicionado ainda</p>
                    <p className="text-sm">Clique nos botões acima para adicionar conteúdo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messageFlow.map((block, index) => (
                      <div key={block.id} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className="flex items-center gap-1">
                              {getContentTypeIcon(block.type)}
                              {getContentTypeLabel(block.type)}
                            </Badge>
                            {block.delay && block.delay > 0 && (
                              <Badge variant="outline" className="text-xs">
                                ⏸️ {block.delay}s
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {index > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => moveContentBlock(index, index - 1)}
                              >
                                ↑
                              </Button>
                            )}
                            {index < messageFlow.length - 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => moveContentBlock(index, index + 1)}
                              >
                                ↓
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContentBlock(block.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Renderizar conteúdo baseado no tipo */}
                        {block.type === 'text' && (
                          <div className="space-y-2">
                <Textarea
                              placeholder="Digite o texto da mensagem..."
                              value={block.content}
                              onChange={(e) => updateContentBlock(block.id, e.target.value)}
                              onKeyUp={(e) => {
                                handleTextareaKeyUp(block.id, e);
                                // Verificar seleção após teclas de navegação
                                setTimeout(() => handleTextSelection(e as any, block.id), 0);
                              }}
                              onMouseUp={(e) => handleTextSelection(e, block.id)}
                              data-block-id={block.id}
                              rows={3}
                            />
                            
                {/* Campos disponíveis para variáveis */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Campos disponíveis:</p>
                    <span className="text-xs text-blue-600 font-medium">💡 Clique para inserir</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableFields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className={`px-2 py-1 rounded text-xs font-medium ${field.color} hover:opacity-80 transition-opacity cursor-pointer border border-transparent hover:border-gray-300`}
                        onClick={() => insertVariable(block.id, field.key)}
                        title={`Clique para inserir {{${field.key}}}`}
                      >
                        {field.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Dica de formatação */}
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
                    <p className="font-medium text-blue-800 mb-1">💡 Formatação de texto:</p>
                    <p className="mb-1">Para formatar texto, <strong>selecione o texto</strong> que deseja formatar e clique nos botões que aparecerão.</p>
                    <p><strong>*negrito*</strong> → <strong>negrito</strong></p>
                    <p><em>_itálico_</em> → <em>itálico</em></p>
                    <p><del>~riscado~</del> → <del>riscado</del></p>
                  </div>
                </div>
                          </div>
                        )}

                        {block.type === 'image' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder="URL da imagem"
                                value={block.content}
                                onChange={(e) => updateContentBlock(block.id, e.target.value)}
                                className="flex-1"
                              />
                              {block.content && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleImagePreview(block.id)}
                                >
                                  {showImagePreview[block.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            
                            <Input
                              placeholder="Texto alternativo (opcional)"
                              value={block.metadata?.alt || ''}
                              onChange={(e) => updateContentBlock(block.id, block.content, { alt: e.target.value })}
                            />
                            
                            {/* Preview da imagem */}
                            {block.content && showImagePreview[block.id] && (
                              <div className="mt-2 p-2 border rounded-lg bg-gray-50">
                                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                                <div className="flex justify-center">
                                  <img
                                    src={block.content}
                                    alt={block.metadata?.alt || 'Preview da imagem'}
                                    className="max-w-full max-h-48 rounded border"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'text-red-500 text-sm p-4 text-center';
                                      errorDiv.textContent = 'Erro ao carregar imagem. Verifique a URL.';
                                      target.parentNode?.appendChild(errorDiv);
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {block.type === 'file' && (
                          <div className="space-y-2">
                            <Input
                              placeholder="Nome do arquivo"
                              value={block.metadata?.filename || ''}
                              onChange={(e) => updateContentBlock(block.id, block.content, { filename: e.target.value })}
                            />
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="URL do arquivo"
                                value={block.content}
                                onChange={(e) => updateContentBlock(block.id, e.target.value)}
                              />
                              <Button type="button" variant="outline" size="sm">
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {block.type === 'link' && (
                          <div className="space-y-2">
                            <Input
                              placeholder="URL do link"
                              value={block.content}
                              onChange={(e) => updateContentBlock(block.id, e.target.value)}
                            />
                            <Input
                              placeholder="Texto do link (opcional)"
                              value={block.metadata?.url || ''}
                              onChange={(e) => updateContentBlock(block.id, block.content, { url: e.target.value })}
                            />
                          </div>
                        )}

                        {block.type === 'audio' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Arquivo de Áudio</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="file"
                                  accept="audio/*"
                                  onChange={(e) => handleAudioUpload(block.id, e)}
                                  className="flex-1"
                                />
                                {block.metadata?.audioFile && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAudioPreview(prev => ({ ...prev, [block.id]: !prev[block.id] }))}
                                  >
                                    {audioPreview[block.id] ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {audioPreview[block.id] ? 'Pausar' : 'Preview'}
                                  </Button>
                                )}
                              </div>
                              {block.metadata?.audioFile && (
                                <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="h-4 w-4" />
                                    <span>📁 {block.metadata.audioFile.name}</span>
                                    <span className="text-xs">({(block.metadata.audioFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Preview do áudio */}
                            {audioPreview[block.id] && block.metadata?.audioBase64 && (
                              <div className="bg-gray-50 p-3 rounded border">
                                <Label className="text-sm font-medium">Preview do Áudio</Label>
                                <audio 
                                  controls 
                                  className="w-full mt-2"
                                  src={block.metadata.audioBase64}
                                >
                                  Seu navegador não suporta o elemento de áudio.
                                </audio>
                              </div>
                            )}
                            
                            {/* Fallback para URL (caso não tenha upload) */}
                            {!block.metadata?.audioFile && (
                              <div className="space-y-2">
                                <Label>Ou URL do áudio</Label>
                                <Input
                                  placeholder="https://exemplo.com/audio.mp3"
                                  value={block.content}
                                  onChange={(e) => updateContentBlock(block.id, e.target.value)}
                                />
                              </div>
                            )}
                            
                            <Input
                              placeholder="Descrição do áudio (opcional)"
                              value={block.metadata?.alt || ''}
                              onChange={(e) => updateContentBlock(block.id, block.content, { alt: e.target.value })}
                            />
                          </div>
                        )}

                        {/* Campo de pausa para cada bloco (exceto o primeiro) */}
                        {index > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="space-y-2">
                              <Label htmlFor={`pause-${block.id}`}>Pausa antes desta mensagem (segundos)</Label>
                              <Input
                                id={`pause-${block.id}`}
                                type="number"
                                min="0"
                                max="60"
                                value={block.delay || 0}
                                onChange={(e) => updateContentBlock(block.id, block.content, block.metadata, Number(e.target.value))}
                                placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                                Pausa de {block.delay || 0} segundos antes desta mensagem
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div className="flex gap-2">
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                )}
              <Button
                type="submit"
                  className={isEditMode ? "flex-1" : "w-full"}
                  disabled={createMutation.isPending || updateMutation.isPending || messageFlow.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Atualizar Fluxo' : 'Criar Fluxo de Mensagem'}
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>

          {/* Simulador WhatsApp */}
          <div className="flex flex-col items-center justify-start">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-center mb-2">Preview WhatsApp</h3>
              <p className="text-sm text-muted-foreground text-center">
                Veja como sua mensagem aparecerá no WhatsApp
              </p>
            </div>
            <WhatsAppSimulator 
              messageFlow={messageFlow} 
              title={title || undefined}
            />
          </div>
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Fluxos Salvos ({messages?.length || 0})</CardTitle>
            <CardDescription>
              Fluxos de mensagens disponíveis para suas campanhas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => {
                  let flowContent: MessageContent[] = [];
                  let isFlow = false;
                  
                  try {
                    // Tentar parsear como JSON (fluxo)
                    flowContent = JSON.parse(message.content);
                    isFlow = true;
                  } catch {
                    // Se não conseguir parsear, é uma mensagem simples
                    isFlow = false;
                  }

                  return (
                  <div
                    key={message.id}
                    className="flex items-start gap-4 rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{message.title}</h3>
                          {isFlow && (
                            <Badge variant="outline" className="text-xs">
                              Fluxo ({flowContent.length} blocos)
                            </Badge>
                          )}
                        </div>
                        
                        {isFlow ? (
                          <div className="space-y-3">
                            {/* Fluxo Visual */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {flowContent.map((block, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  {/* Bloco visual */}
                                  <div className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-primary/30 bg-primary/10 shadow-sm">
                                    {getContentTypeIcon(block.type)}
                                  </div>
                                  
                                  {/* Conector com seta (exceto no último item) */}
                                  {index < flowContent.length - 1 && (
                                    <div className="flex items-center mx-1">
                                      <div className="w-6 h-0.5 bg-primary/40"></div>
                                      <div className="w-0 h-0 border-l-2 border-l-primary/40 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-0.5"></div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {/* Preview do conteúdo */}
                            <div className="space-y-1">
                              {flowContent.slice(0, 2).map((block, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="flex items-center justify-center w-6 h-6 rounded border border-primary/20 bg-primary/5">
                                    {getContentTypeIcon(block.type)}
                                  </div>
                                  <span className="truncate max-w-xs">
                                    {block.type === 'text' 
                                      ? block.content.substring(0, 40) + (block.content.length > 40 ? '...' : '')
                                      : block.content || block.metadata?.filename || 'Sem conteúdo'
                                    }
                                  </span>
                                </div>
                              ))}
                              {flowContent.length > 2 && (
                                <div className="text-xs text-muted-foreground ml-8">
                                  +{flowContent.length - 2} bloco{flowContent.length - 2 !== 1 ? 's' : ''} adicional{flowContent.length - 2 !== 1 ? 'is' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                        )}
                        
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(message.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                      <div className="flex items-center gap-1">
                        {isFlow && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFlow(message)}
                            disabled={deleteMutation.isPending}
                            title="Editar fluxo"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(message.id)}
                      disabled={deleteMutation.isPending}
                          title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                      </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nenhum fluxo criado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie seu primeiro fluxo de mensagem para começar
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Toolbar de formatação de texto */}
        {showFormatToolbar && (
          <TextFormatToolbar
            selectedText={selectedText}
            onFormat={handleFormatText}
            position={toolbarPosition}
            onClose={handleCloseFormatToolbar}
          />
        )}
      </div>
    </Layout>
  );
}
