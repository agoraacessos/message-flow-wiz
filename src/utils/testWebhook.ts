// Utilitário para testar webhooks
export async function testWebhook(webhookUrl: string) {
  const testPayload = {
    event: "TEST_WEBHOOK",
    instance: "message-flow-wiz",
    data: {
      test: true,
      message: "Teste de webhook com dados completos",
      timestamp: new Date().toISOString()
    },
    contact: {
      id: "test-contact-id",
      name: "Contato Teste",
      phone: "+5511999999999",
      phone2: "+5511888888888",
      phone3: "+5511777777777",
      email: "teste@exemplo.com",
      tags: ["teste", "webhook"],
      company: "Empresa Teste",
      position: "Desenvolvedor",
      notes: "Contato para teste de webhook",
      custom_fields: {
        idade: "30",
        cidade: "São Paulo",
        interesse: "tecnologia"
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    message: {
      id: "test-message-id",
      title: "Mensagem de Teste",
      content: "Esta é uma mensagem de teste para verificar o webhook",
      type: "text",
      media_url: null,
      variables: ["nome", "empresa"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    campaign: {
      id: "test-campaign-id",
      name: "Campanha de Teste",
      status: "sending",
      scheduled_at: null,
      min_delay_between_clients: 5,
      max_delay_between_clients: 10,
      webhook_url: webhookUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    metadata: {
      sent_at: new Date().toISOString(),
      contact_index: 1,
      total_contacts: 1,
      delay_applied: 0
    }
  };

  try {
    console.log('🧪 Testando webhook...');
    console.log('📡 URL:', webhookUrl);
    console.log('📦 Payload de teste:', testPayload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      console.log('✅ Webhook de teste enviado com sucesso!');
      console.log('📊 Status:', response.status);
      return { success: true, status: response.status };
    } else {
      console.warn('❌ Webhook de teste falhou:', response.status, response.statusText);
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (error) {
    console.warn('❌ Erro ao testar webhook:', error);
    return { success: false, error: error.message };
  }
}
