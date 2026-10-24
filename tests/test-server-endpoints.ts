/**
 * Testes de Integração de Endpoints HTTP de Autenticação por SMS e Isolamento Multiempresa
 * MZ SISTEMA DE VENDAS
 */

async function runEndpointTests() {
  console.log('====================================================');
  console.log('TESTES DE ENDPOINTS: REGISTO, LOGIN SMS & ISOLAMENTO');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(`✅ [PASSOU] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] ${msg}`);
      failed++;
    }
  }

  // 1. Diagnóstico do Gateway SMS
  try {
    const res = await fetch(`${BASE_URL}/api/sms/gateway-status`);
    const data = await res.json();
    assert(res.ok && data.status === 'online', 'Endpoint /api/sms/gateway-status está online e operacional');
    assert(data.gateway.otpValiditySeconds === 300, 'Gateway confirma expiração de 300 segundos');
  } catch (e: any) {
    console.error('Falha de conexão com servidor em :3000:', e.message);
  }

  // 2. Pedido de registo com telemóvel inválido
  const invalidPhoneRes = await fetch(`${BASE_URL}/api/auth/register/request-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Cliente Teste',
      companyName: 'Minha Loja Lda',
      phone: '12345',
      password: 'password123',
      confirmPassword: 'password123',
    }),
  });
  assert(invalidPhoneRes.status === 400, 'Rejeita registo com número de telemóvel inválido (HTTP 400)');

  // 3. Pedido de registo com senhas divergentes
  const passMismatchRes = await fetch(`${BASE_URL}/api/auth/register/request-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Cliente Teste',
      companyName: 'Minha Loja Lda',
      phone: '84 555 1234',
      password: 'password123',
      confirmPassword: 'password999',
    }),
  });
  assert(passMismatchRes.status === 400, 'Rejeita registo com palavras-passe não coincidentes (HTTP 400)');

  // 4. Pedido de registo de número válido Moçambique
  const validRegPhone = `+25884${Math.floor(1000000 + Math.random() * 9000000)}`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register/request-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Armando Guebuza Filho',
      companyName: 'Supermercado Zambézia',
      phone: validRegPhone,
      password: 'SegredoForte@2026',
      confirmPassword: 'SegredoForte@2026',
    }),
  });
  const regData = await regRes.json();
  assert(regRes.ok && regData.success, 'Solicitação de registo via SMS bem-sucedida');
  assert(!regData.code && !regData.otp, 'CRÍTICO: Resposta HTTP NÃO contém o código OTP em texto simples');
  assert(regData.expiresInSeconds === 300, 'Tempo de expiração informado é 300 segundos');

  // 5. Tentativa de confirmar com código errado
  const confirmWrong = await fetch(`${BASE_URL}/api/auth/register/confirm-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: validRegPhone,
      code: '999999',
    }),
  });
  const confirmWrongData = await confirmWrong.json();
  assert(confirmWrong.status === 400, 'Rejeita código SMS incorreto (HTTP 400)');
  assert(confirmWrongData.attemptsRemaining === 2, 'Informa que restam 2 tentativas');

  // 6. Teste de login com telemóvel existente e senha
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '+258 84 987 6543', // Carlos Nhantumbo (vendedor Loja 2)
      password: 'Vendedor@123',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.success, 'Login bem-sucedido usando número de telemóvel e palavra-passe');
  assert(loginData.user && loginData.user.role === 'seller', 'Utilizador autenticado tem perfil de vendedor da sua loja');

  // 7. Isolamento de loja: Vendedor só sincroniza a sua loja
  const syncRes = await fetch(`${BASE_URL}/api/sync`, {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      'X-User-Role': loginData.user.role,
      'X-User-Store-Id': loginData.user.storeId,
    },
  });
  const syncData = await syncRes.json();
  assert(syncRes.ok, 'Sincronização autorizada com token de telemóvel');
  const allSalesMatchStore = syncData.sales.length > 0 && syncData.sales.every((s: any) => s.storeId === loginData.user.storeId);
  assert(allSalesMatchStore, 'Isolamento garantido: Todas as vendas sincronizadas pertencem exclusivamente à Loja 2 (Zimpeto)');

  console.log('\n====================================================');
  console.log(`RESULTADO TESTES HTTP: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');
}

runEndpointTests().catch(console.error);
