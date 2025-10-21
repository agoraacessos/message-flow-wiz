import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

interface ExcelData {
  headers: string[];
  rows: any[][];
}

interface FieldMapping {
  [key: string]: string; // coluna da planilha -> campo do sistema
}

interface ExcelUploadProps {
  onDataProcessed: (data: any[], mapping: FieldMapping) => void;
}

const SYSTEM_FIELDS = [
  { value: 'name', label: 'Nome' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'tags', label: 'Tags' },
  { value: 'company', label: 'Empresa' },
  { value: 'position', label: 'Cargo' },
  { value: 'notes', label: 'Observações' },
  { value: 'custom', label: 'Campo Personalizado' }
];

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onDataProcessed }) => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

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
          setError('A planilha está vazia');
          setIsProcessing(false);
          return;
        }

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];

        setExcelData({ headers, rows });
        setFieldMapping({});
        setSuccess(`Planilha carregada com sucesso! ${rows.length} registros encontrados.`);
      } catch (err) {
        setError('Erro ao processar a planilha. Verifique se o arquivo está correto.');
        console.error('Erro ao processar Excel:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFieldMapping = (excelColumn: string, systemField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [excelColumn]: systemField
    }));
  };

  const processData = () => {
    if (!excelData) return;

    const processedData = excelData.rows.map(row => {
      const contact: any = {};
      
      Object.entries(fieldMapping).forEach(([excelColumn, systemField]) => {
        const columnIndex = excelData.headers.indexOf(excelColumn);
        if (columnIndex !== -1 && row[columnIndex] !== undefined) {
          contact[systemField] = row[columnIndex];
        }
      });

      return contact;
    });

    onDataProcessed(processedData, fieldMapping);
    setSuccess(`Dados processados com sucesso! ${processedData.length} contatos preparados.`);
  };

  const resetUpload = () => {
    setExcelData(null);
    setFieldMapping({});
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload de Planilha Excel
        </CardTitle>
        <CardDescription>
          Faça upload de uma planilha Excel (.xlsx) e mapeie os campos para importar contatos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Selecionar Planilha'}
            </Button>
            
            {excelData && (
              <Button variant="outline" onClick={resetUpload}>
                Limpar
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Field Mapping Section */}
        {excelData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mapeamento de Campos</h3>
            <p className="text-sm text-muted-foreground">
              Selecione qual campo do sistema corresponde a cada coluna da planilha:
            </p>
            
            <div className="grid gap-4">
              {excelData.headers.map((header, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <label className="text-sm font-medium">
                      Coluna da Planilha: <span className="text-blue-600">{header}</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Exemplo: {excelData.rows[0]?.[index] || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <Select
                      value={fieldMapping[header] || ''}
                      onValueChange={(value) => handleFieldMapping(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo do sistema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {SYSTEM_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={processData}
                disabled={Object.keys(fieldMapping).length === 0}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Processar Dados
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
