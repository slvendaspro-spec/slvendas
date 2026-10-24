/**
 * Testes Automatizados de Validação do Sistema de Autenticação por Telemóvel e SMS
 * MZ SISTEMA DE VENDAS
 */

import { normalizePhoneNumber, maskPhoneNumber } from '../src/utils/phoneUtils';
import {
  sendSmsVerificationCode,
  verifySmsOtpCode,
  getSmsGatewayStatus,
} from '../src/services/smsService';

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO BATERIA DE TESTES: AUTENTICAÇÃO SMS & TELEMÓVEL');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ [PASSOU] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] ${desc}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TESTE 1: NORMALIZAÇÃO DE NÚMEROS DE MOÇAMBIQUE
  // ----------------------------------------------------
  console.log('--- TESTE 1: Normalização de Números Moçambique (+258) ---');
  const t1 = normalizePhoneNumber('84 123 4567');
  assert(t1.isValid && t1.normalized === '+258841234567', 'Formata "84 123 4567" para "+258841234567"');
  assert(t1.carrier === 'Vodacom Moçambique', 'Detecta Vodacom para prefixo 84');

  const t2 = normalizePhoneNumber('+258 86 987 6543');
  assert(t2.isValid && t2.normalized === '+258869876543', 'Normaliza "+258 86 987 6543"');
  assert(t2.carrier === 'Movitel Moçambique', 'Detecta Movitel para prefixo 86');

  const t3 = normalizePhoneNumber('00258 82 555 4433');
  assert(t3.isValid && t3.normalized === '+258825554433', 'Converte prefixo 00258 para +258');
  assert(t3.carrier === 'Tmcel Moçambique', 'Detecta Tmcel para prefixo 82');

  const t4 = normalizePhoneNumber('1234567');
  assert(!t4.isValid, 'Rejeita número curto inválido');

  const t5 = normalizePhoneNumber('89 123 4567');
  assert(!t5.isValid, 'Rejeita prefixo inexistente 89');

  // ----------------------------------------------------
  // TESTE 2: MASCARAMENTO SEGURO
  // ----------------------------------------------------
  console.log('\n--- TESTE 2: Mascaramento Seguro de Telemóvel ---');
  const masked = maskPhoneNumber('+258 84 123 4567');
  assert(masked.includes('•••'), `Número é mascarado com segurança: ${masked}`);
  assert(masked.endsWith('4567'), 'Preserva últimos dígitos para identificação amigável');

  // ----------------------------------------------------
  // TESTE 3: ENVIO DE CÓDIGO SMS (SEM EXPOR CÓDIGO)
  // ----------------------------------------------------
  console.log('\n--- TESTE 3: Despacho de SMS e Proteção de Segredo ---');
  const testPhone = '+258849990001';
  const dispatch = await sendSmsVerificationCode(testPhone, 'register', {
    fullName: 'Testador Moçambique',
    companyName: 'Empresa Teste Lda',
  }, '10.0.0.1');

  assert(dispatch.success, 'Despacho de SMS executado com sucesso');
  assert(dispatch.expiresInSeconds === 300, 'Validade estrita de 5 minutos (300 segundos)');
  assert(dispatch.resendCooldownSeconds === 60, 'Intervalo de segurança / cooldown de 60 segundos');
  assert(!(dispatch as any).code && !(dispatch as any).otp, 'CRÍTICO: O código NÃO é exposto na resposta');

  // ----------------------------------------------------
  // TESTE 4: INTERVALO DE SEGURANÇA (COOLDOWN)
  // ----------------------------------------------------
  console.log('\n--- TESTE 4: Bloqueio de Reenvio Rápido (Cooldown de 60s) ---');
  const quickResend = await sendSmsVerificationCode(testPhone, 'register', {}, '10.0.0.1');
  assert(!quickResend.success, 'Bloqueia envio imediato antes de transcorrer 60s');
  assert(quickResend.resendCooldownSeconds > 0, `Informa tempo restante de espera: ${quickResend.resendCooldownSeconds}s`);

  // ----------------------------------------------------
  // TESTE 5: LIMITE DE TENTATIVAS INCORRETAS
  // ----------------------------------------------------
  console.log('\n--- TESTE 5: Limite Rigoroso de Tentativas (Máx 3) ---');
  // Criamos uma sessão de teste isolada para testar tentativas
  const testPhone2 = '+258858880002';
  await sendSmsVerificationCode(testPhone2, 'login', { userId: 'test-user-2' }, '10.0.0.2');

  const fail1 = verifySmsOtpCode(testPhone2, '000000', 'login');
  assert(!fail1.success && fail1.attemptsRemaining === 2, `Tentativa 1 falhou. Restam ${fail1.attemptsRemaining}`);

  const fail2 = verifySmsOtpCode(testPhone2, '111111', 'login');
  assert(!fail2.success && fail2.attemptsRemaining === 1, `Tentativa 2 falhou. Restam ${fail2.attemptsRemaining}`);

  const fail3 = verifySmsOtpCode(testPhone2, '222222', 'login');
  assert(!fail3.success && fail3.attemptsRemaining === 0, 'Tentativa 3 esgotou. Código invalidado por segurança');

  const failAfterWipe = verifySmsOtpCode(testPhone2, '333333', 'login');
  assert(!failAfterWipe.success && failAfterWipe.error === 'CÓDIGO_NÃO_ENCONTRADO', 'Código já não existe após esgotar tentativas');

  // ----------------------------------------------------
  // TESTE 6: DIAGNÓSTICO DO GATEWAY
  // ----------------------------------------------------
  console.log('\n--- TESTE 6: Diagnóstico do Gateway SMS ---');
  const gwStatus = getSmsGatewayStatus();
  assert(gwStatus.otpValiditySeconds === 300, 'Gateway configurado para 300 segundos');
  assert(gwStatus.maxAttempts === 3, 'Gateway configurado para máximo 3 tentativas');
  assert(gwStatus.recentDeliveriesCount > 0, 'Histórico de entregas registado com sucesso');

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
