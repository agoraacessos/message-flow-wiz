// Script para testar diferentes URLs de webhook
// Execute no console do navegador

const baseUrl = 'https://n8n-n8n.k5tlyc.easypanel.host';
const testPaths = [
  '/webhook/recebido-disparo',
  '/webhook-test/recebido-disparo', 
  '/webhook/disparo',
  '/webhook/test',
  '/recebido-disparo'
];

async function testWebhookUrls() {
  console.log('🔍 Testando URLs de webhook...');
  
  for (const path of testPaths) {
    const url = baseUrl + path;
    console.log(`\n📡 Testando: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });
      
      if (response.ok) {
        console.log(`✅ SUCESSO! Status: ${response.status}`);
        console.log(`🎯 URL CORRETA: ${url}`);
        return url;
      } else {
        console.log(`❌ Erro: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Erro de rede: ${error.message}`);
    }
  }
  
  console.log('\n❌ Nenhuma URL funcionou. Verifique se o n8n está rodando.');
  return null;
}

// Executar teste
testWebhookUrls();
