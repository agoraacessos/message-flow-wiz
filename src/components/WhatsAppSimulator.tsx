import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Image, FileText, Link, Type, Phone, Paperclip, MoreVertical, Volume2 } from 'lucide-react';

interface MessageContent {
  id: string;
  type: 'text' | 'image' | 'file' | 'link' | 'audio';
  content: string;
  url?: string;
  alt?: string;
  metadata?: {
    filename?: string;
    url?: string;
    alt?: string;
    audioFile?: File;
    audioBase64?: string;
  };
}

interface WhatsAppSimulatorProps {
  messageFlow: MessageContent[];
  title?: string;
}

export function WhatsAppSimulator({ messageFlow, title }: WhatsAppSimulatorProps) {
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      case 'file': return <FileText className="h-3 w-3" />;
      case 'link': return <Link className="h-3 w-3" />;
      case 'audio': return <Volume2 className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'image': return 'Imagem';
      case 'file': return 'Arquivo';
      case 'link': return 'Link';
      case 'audio': return 'Áudio';
      default: return 'Mensagem';
    }
  };

  const formatWhatsAppText = (text: string) => {
    // Formatação do WhatsApp: *negrito*, _itálico_, ~riscado~
    return text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Negrito
      .replace(/_([^_]+)_/g, '<em>$1</em>') // Itálico
      .replace(/~([^~]+)~/g, '<del>$1</del>'); // Riscado
  };

  const renderMessageContent = (block: MessageContent) => {
    switch (block.type) {
      case 'text':
        return (
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: block.content.split('\n').map((line, index) => 
                `<div key="${index}">${formatWhatsAppText(line)}</div>`
              ).join('')
            }}
          />
        );
      case 'image':
        return (
          <div className="space-y-2">
            {(block.url || block.metadata?.url) ? (
              <div className="relative">
                <img 
                  src={block.url || block.metadata?.url} 
                  alt={block.metadata?.alt || 'Imagem'} 
                  className="w-full max-w-48 rounded-lg object-cover"
                  onError={(e) => {
                    // Fallback para ícone se a imagem não carregar
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="bg-gray-100 rounded-lg p-3 text-center hidden">
                  <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Imagem</p>
                  <p className="text-xs text-blue-500 mt-1 truncate">{block.url || block.metadata?.url}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Imagem</p>
              </div>
            )}
            {block.metadata?.alt && (
              <p className="text-xs text-gray-600 italic">{block.metadata.alt}</p>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-3">
            <FileText className="h-6 w-6 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Arquivo</p>
              <p className="text-xs text-gray-500">{block.content}</p>
            </div>
          </div>
        );
      case 'link':
        return (
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <Link className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-600">{block.content}</p>
                {block.url && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{block.url}</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Áudio</p>
              <p className="text-xs text-gray-500">
                {block.metadata?.audioFile?.name || block.metadata?.filename || 'Mensagem de voz'}
              </p>
              {block.metadata?.audioFile && (
                <p className="text-xs text-gray-400">
                  {(block.metadata.audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
              {!block.metadata?.audioFile && block.content && !block.content.startsWith('data:') && (
                <p className="text-xs text-blue-500 mt-1 truncate">{block.content}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
              <span className="text-xs text-gray-500">
                {block.metadata?.audioFile ? '0:00' : '0:15'}
              </span>
            </div>
          </div>
        );
      default:
        return <div className="text-sm">{block.content}</div>;
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Simulador de Celular */}
      <div className="bg-black rounded-3xl p-2 shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Status Bar */}
          <div className="bg-gray-900 h-6 flex items-center justify-between px-4 text-white text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-2 bg-white rounded-sm"></div>
              <span>100%</span>
            </div>
          </div>

          {/* Header do WhatsApp */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-600">👤</span>
              </div>
              <div>
                <h3 className="font-medium text-sm">Nome</h3>
                <p className="text-xs opacity-90">online</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5" />
              <Paperclip className="h-5 w-5" />
              <MoreVertical className="h-5 w-5" />
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="bg-[#ECE5DD] h-96 overflow-y-auto p-4 space-y-3" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}>
            {messageFlow.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              </div>
            ) : (
              messageFlow.map((block, index) => (
                <div key={block.id}>
                  {/* Mostrar pausa se existir */}
                  {block.delay && block.delay > 0 && (
                    <div className="flex justify-center my-2">
                      <div className="bg-gray-200 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-600">⏸️ Pausa {block.delay}s</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <div className="max-w-xs">
                      <div className="bg-[#DCF8C6] text-black rounded-lg p-3 shadow-sm" style={{
                        borderRadius: '18px 18px 4px 18px'
                      }}>
                        {renderMessageContent(block)}
                      </div>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span className="text-xs text-gray-500">11:55</span>
                        <div className="flex items-center space-x-0.5">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                            <path d="M1 4L4 7L11 1" stroke="#4FC3F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ marginLeft: '-6px' }}>
                            <path d="M1 4L4 7L11 1" stroke="#4FC3F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input do WhatsApp */}
          <div className="bg-white border-t border-gray-200 p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm">😊</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                <span className="text-sm text-gray-500">Digite aqui...</span>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm">📷</span>
              </div>
              <div className="w-8 h-8 bg-[#075E54] rounded-full flex items-center justify-center">
                <span className="text-sm text-white">🎤</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Fluxo */}
      {title && (
        <div className="mt-4 text-center">
          <Badge variant="outline" className="text-xs">
            {title}
          </Badge>
        </div>
      )}
      
      {messageFlow.length > 0 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {messageFlow.length} {messageFlow.length === 1 ? 'bloco' : 'blocos'} de conteúdo
          </p>
        </div>
      )}
    </div>
  );
}
