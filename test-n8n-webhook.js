// Script de teste para o formato de webhook n8n
// Execute com: node test-n8n-webhook.js

// Simular dados de uma campanha
const testCampaign = {
  id: 'test-campaign-123',
  name: 'Promoção Black Friday',
  webhook_url: 'https://webhook.site/unique-id', // Substitua pela sua URL
  contact_ids: ['contact-1', 'contact-2']
};

const testMessage = {
  id: 'test-message-456',
  title: 'Promoção Black Friday',
  content: JSON.stringify([
    {
      id: '1',
      type: 'text',
      content: 'Olá {{nome}}! Tudo bem?',
      delay: 0
    },
    {
      id: '2',
      type: 'image',
      content: 'https://cdn.exemplo.com/promocao.jpg',
      metadata: {
        alt: 'Promoção especial!'
      },
      delay: 8
    },
    {
      id: '3',
      type: 'text',
      content: 'Quer saber mais? 😄',
      delay: 12
    }
  ])
};

const testContacts = [
  {
    id: 'contact-1',
    name: 'João Silva',
    phone: '(11) 99999-9999',
    email: 'joao@exemplo.com'
  },
  {
    id: 'contact-2', 
    name: 'Maria Santos',
    phone: '+55 11 88888-8888',
    email: 'maria@exemplo.com'
  }
];

// Função para converter fluxo para formato n8n
function convertMessageFlowToN8nFlow(messageContent) {
  try {
    const flowContent = JSON.parse(messageContent);
    
    if (Array.isArray(flowContent)) {
      return flowContent.map((block, index) => {
        let n8nType;
        
        switch (block.type) {
          case 'text':
            n8nType = 'text';
            break;
          case 'image':
            n8nType = 'image';
            break;
          case 'file':
            n8nType = 'document';
            break;
          case 'audio':
            n8nType = 'audio';
            break;
          case 'link':
            n8nType = 'text';
            break;
          default:
            n8nType = 'text';
        }

        return {
          type: n8nType,
          content: block.type === 'audio' ? block.content : block.content, // Para áudio, usar content (URL)
          caption: block.metadata?.alt || block.metadata?.filename || undefined,
          delay: block.delay || (index === 0 ? 0 : 5)
        };
      });
    }
  } catch (error) {
    console.warn('Erro ao parsear fluxo JSON, tratando como mensagem simples:', error);
  }

  return [{
    type: 'text',
    content: messageContent,
    delay: 0
  }];
}

// Função para formatar número de telefone
function formatPhoneNumber(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
    return '55' + cleanPhone;
  }
  
  if (cleanPhone.length >= 12) {
    return cleanPhone;
  }
  
  if (cleanPhone.length === 10) {
    return '55' + cleanPhone;
  }
  
  return cleanPhone;
}

// Função para criar payload n8n
function createN8nPayload(session, phone, messageContent) {
  return {
    session,
    number: formatPhoneNumber(phone),
    flow: convertMessageFlowToN8nFlow(messageContent)
  };
}

// Função para enviar webhook
async function sendN8nWebhook(webhookUrl, session, phone, messageContent) {
  try {
    console.log('🚀 Enviando webhook para n8n...');
    
    const payload = createN8nPayload(session, phone, messageContent);
    
    console.log('📦 Payload n8n:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Webhook n8n enviado com sucesso!');
      return { 
        success: true, 
        status: response.status, 
        method: 'n8n-direct' 
      };
    } else {
      console.warn('❌ Webhook n8n falhou:', response.status, response.statusText);
      return { 
        success: false, 
        status: response.status, 
        error: response.statusText, 
        method: 'n8n-direct' 
      };
    }
  } catch (error) {
    console.warn('❌ Erro no webhook n8n:', error);
    return { 
      success: false, 
      error: error.message, 
      method: 'n8n-direct' 
    };
  }
}

// Função principal de teste
async function testN8nWebhook() {
  console.log('🧪 Iniciando teste do webhook n8n...\n');
  
  // Simular processamento de campanha
  for (let i = 0; i < testContacts.length; i++) {
    const contact = testContacts[i];
    
    console.log(`📨 Processando contato ${i + 1}/${testContacts.length}: ${contact.name}`);
    
    // Simular delay entre contatos
    if (i > 0) {
      console.log('⏳ Aguardando 2 segundos antes do próximo contato...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Enviar webhook n8n
    const result = await sendN8nWebhook(
      testCampaign.webhook_url,
      'message-flow-wiz',
      contact.phone,
      testMessage.content
    );
    
    if (result.success) {
      console.log(`✅ Webhook enviado com sucesso para ${contact.name} (${result.status}) via ${result.method}\n`);
    } else {
      console.warn(`❌ Webhook falhou para ${contact.name}:`);
      console.warn(`   Erro: ${result.error}`);
      console.warn(`   Método: ${result.method}\n`);
    }
  }
  
  console.log('🎉 Teste concluído!');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testN8nWebhook()
    .then(() => {
      console.log('✅ Teste finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no teste:', error);
      process.exit(1);
    });
}

module.exports = {
  convertMessageFlowToN8nFlow,
  formatPhoneNumber,
  createN8nPayload,
  sendN8nWebhook,
  testN8nWebhook
};
