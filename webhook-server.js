import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001; // Porta diferente do Vite

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint para receber mensagens do WhatsApp via n8n
app.post('/api/whatsapp-webhook', async (req, res) => {
  try {
    console.log('📨 Mensagem recebida do n8n:', req.body);
    
    // Validar payload
    if (!req.body || !req.body.from || !req.body.message) {
      console.warn('⚠️ Payload inválido recebido:', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'Payload inválido - campos obrigatórios: from, message' 
      });
    }
    
    const { from, message, timestamp, messageId, contactName } = req.body;
    
    // Log dos dados recebidos
    console.log('📋 Dados processados:', {
      from,
      message,
      timestamp,
      messageId,
      contactName
    });
    
    // Simular processamento da mensagem
    console.log(`🔍 Verificando se "${message}" ativa alguma regra...`);
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simular resultado baseado na mensagem
    let result = {
      success: true,
      message: 'Mensagem processada com sucesso',
      data: {
        from,
        message,
        timestamp,
        messageId,
        contactName
      },
      detection: {
        rulesFound: 0,
        actions: []
      }
    };
    
    // Simular detecção de regras
    if (message.toLowerCase().includes('interessado')) {
      result.detection.rulesFound = 1;
      result.detection.actions.push('Regra "Cliente Interessado" ativada');
      console.log('✅ Regra "Cliente Interessado" detectada!');
    }
    
    if (message.toLowerCase().includes('preço') || message.toLowerCase().includes('custa')) {
      result.detection.rulesFound = 1;
      result.detection.actions.push('Regra "Cliente Pergunta Preço" ativada');
      console.log('✅ Regra "Cliente Pergunta Preço" detectada!');
    }
    
    if (message.toLowerCase().includes('não sei') || message.toLowerCase().includes('talvez')) {
      result.detection.rulesFound = 1;
      result.detection.actions.push('Regra "Cliente Indeciso" ativada');
      console.log('✅ Regra "Cliente Indeciso" detectada!');
    }
    
    console.log('📤 Resposta enviada para n8n:', result);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
});

// Endpoint de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor webhook funcionando!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor webhook rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/whatsapp-webhook`);
  console.log(`🧪 Teste: http://localhost:${PORT}/api/test`);
});

export default app;
