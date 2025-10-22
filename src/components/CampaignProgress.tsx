import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Send, CheckCircle2, XCircle } from "lucide-react";

interface CampaignProgressProps {
  status: string;
  totalContacts?: number;
  sentContacts?: number;
  errorContacts?: number;
}

export function CampaignProgress({ 
  status, 
  totalContacts = 0, 
  sentContacts = 0, 
  errorContacts = 0 
}: CampaignProgressProps) {
  
  if (status !== 'sending') {
    return null;
  }

  const progress = totalContacts > 0 ? ((sentContacts + errorContacts) / totalContacts) * 100 : 0;
  const remainingContacts = totalContacts - sentContacts - errorContacts;

  return (
    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">Enviando...</span>
        <Badge variant="outline" className="text-xs">
          {sentContacts + errorContacts}/{totalContacts}
        </Badge>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between text-xs text-blue-700">
        <span>Enviados: {sentContacts}</span>
        <span>Restantes: {remainingContacts}</span>
        {errorContacts > 0 && (
          <span className="text-red-600">Erros: {errorContacts}</span>
        )}
      </div>
    </div>
  );
}
