import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough } from 'lucide-react';

interface TextFormatToolbarProps {
  selectedText: string;
  onFormat: (formattedText: string) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TextFormatToolbar({ selectedText, onFormat, position, onClose }: TextFormatToolbarProps) {
  const applyFormat = (format: string) => {
    let formattedText = selectedText;
    
    switch (format) {
      case 'bold':
        formattedText = `*${selectedText}*`;
        break;
      case 'italic':
        formattedText = `_${selectedText}_`;
        break;
      case 'strikethrough':
        formattedText = `~${selectedText}~`;
        break;
    }
    
    onFormat(formattedText);
    onClose();
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1"
      style={{ 
        left: position.x, 
        top: position.y - 50,
        transform: 'translateX(-50%)'
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat('bold')}
        title="Negrito (*texto*)"
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat('italic')}
        title="Itálico (_texto_)"
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => applyFormat('strikethrough')}
        title="Riscado (~texto~)"
        className="h-8 w-8 p-0"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
    </div>
  );
}
