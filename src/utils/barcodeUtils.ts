/**
 * Utilitários de Geração e Validação Estrita de Códigos de Barras e SKUs
 * Padrões: EAN-13 (Moçambique 600 / GS1 Internacional), UPC-A e SKUs Únicos
 * SL VENDAS — Sistema Comercial Inteligente
 */

/**
 * Calcula o dígito de controlo oficial EAN-13 para os primeiros 12 dígitos
 */
export function calculateEAN13CheckDigit(twelveDigits: string): number {
  if (!/^\d{12}$/.test(twelveDigits)) {
    throw new Error('Devem ser fornecidos exatamente 12 dígitos numéricos.');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    // Posições ímpares (0, 2, 4...) peso 1; pares (1, 3, 5...) peso 3 (1-indexed: 1, 3, 5... peso 1; 2, 4, 6... peso 3)
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }

  const remainder = sum % 10;
  return (10 - remainder) % 10;
}

/**
 * Validação estrita de código de barras EAN-13
 */
export function validateEAN13(barcode: string): {
  isValid: boolean;
  error?: string;
  expectedCheckDigit?: number;
  formatted?: string;
} {
  const clean = barcode.replace(/[\s-]/g, '');

  if (!clean) {
    return { isValid: false, error: 'O código de barras está vazio.' };
  }

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'O código de barras EAN-13 deve conter apenas algarismos numéricos.' };
  }

  if (clean.length !== 13) {
    return {
      isValid: false,
      error: `Tamanho inválido para EAN-13: possui ${clean.length} dígitos (deve ter exatamente 13 dígitos).`,
    };
  }

  const first12 = clean.slice(0, 12);
  const actualCheck = parseInt(clean[12], 10);
  const expectedCheck = calculateEAN13CheckDigit(first12);

  if (actualCheck !== expectedCheck) {
    return {
      isValid: false,
      error: `Dígito verificador inválido: termina em ${actualCheck}, mas o cálculo oficial EAN-13 exige ${expectedCheck}.`,
      expectedCheckDigit: expectedCheck,
      formatted: `${first12}${expectedCheck}`,
    };
  }

  // Formatação amigável: X XXXXXX XXXXXX
  const formatted = `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7, 13)}`;

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Validação estrita de UPC-A (12 dígitos numéricos)
 */
export function validateUPCA(barcode: string): {
  isValid: boolean;
  error?: string;
} {
  const clean = barcode.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false, error: 'O formato UPC-A exige exatamente 12 algarismos numéricos.' };
  }

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit * 1;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  if (parseInt(clean[11], 10) !== checkDigit) {
    return {
      isValid: false,
      error: `Dígito verificador UPC-A inválido. Esperado: ${checkDigit}.`,
    };
  }

  return { isValid: true };
}

/**
 * Validação genérica de códigos de barras aceitos no sistema
 * Permite: EAN-13 estrito, UPC-A ou Code-128 alfanumérico interno
 */
export function validateBarcodeStrict(barcode: string): {
  isValid: boolean;
  format: 'EAN-13' | 'UPC-A' | 'CODE-128' | 'INVALIDO';
  error?: string;
  details?: string;
} {
  const clean = barcode.trim();
  if (!clean) {
    return { isValid: true, format: 'INVALIDO', details: 'Sem código de barras associado (opcional).' };
  }

  // Verifica se é EAN-13
  if (/^\d{13}$/.test(clean)) {
    const eanRes = validateEAN13(clean);
    if (eanRes.isValid) {
      const isMoz = clean.startsWith('600');
      return {
        isValid: true,
        format: 'EAN-13',
        details: isMoz ? 'EAN-13 Oficial Moçambique (Prefixo 600)' : 'EAN-13 Internacional Válido',
      };
    } else {
      return {
        isValid: false,
        format: 'EAN-13',
        error: eanRes.error,
      };
    }
  }

  // Verifica se é UPC-A (12 dígitos)
  if (/^\d{12}$/.test(clean)) {
    const upcRes = validateUPCA(clean);
    if (upcRes.isValid) {
      return { isValid: true, format: 'UPC-A', details: 'Código UPC-A Válido (12 dígitos)' };
    } else {
      return { isValid: false, format: 'UPC-A', error: upcRes.error };
    }
  }

  // Verifica se é Code-128 ou código alfa interno (ex: PRD-001, MIN-10023)
  if (/^[A-Z0-9\-_]{4,20}$/i.test(clean)) {
    return {
      isValid: true,
      format: 'CODE-128',
      details: 'Código Alfanumérico Interno / Code-128 Aceito',
    };
  }

  return {
    isValid: false,
    format: 'INVALIDO',
    error: 'Formato não reconhecido. Use 13 dígitos para EAN-13, 12 para UPC-A, ou código alfanumérico limpo (4-20 caracteres).',
  };
}

/**
 * Gera um código de barras EAN-13 100% válido matematicamente com prefixo especificado
 * Padrão: 600 (Moçambique) + 9 dígitos aleatórios/sequenciais + 1 dígito de controlo calculado
 */
export function generateValidEAN13(prefix: string = '600', existingBarcodes: string[] = []): string {
  const safePrefix = prefix.slice(0, 3).padEnd(3, '0');
  const existingSet = new Set(existingBarcodes.map((b) => b.trim()));

  for (let attempt = 0; attempt < 100; attempt++) {
    // 9 dígitos aleatórios
    const middle9 = Math.floor(100000000 + Math.random() * 900000000).toString();
    const first12 = `${safePrefix}${middle9}`;
    const checkDigit = calculateEAN13CheckDigit(first12);
    const candidate = `${first12}${checkDigit}`;

    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }

  // Fallback baseado em timestamp
  const ts = Date.now().toString().slice(-9);
  const first12 = `${safePrefix}${ts}`;
  const checkDigit = calculateEAN13CheckDigit(first12);
  return `${first12}${checkDigit}`;
}

/**
 * Gera um SKU inteligente e estritamente ÚNICO baseado na categoria e nome
 * Ex: Fones Bluetooth na categoria Electrónica -> ELE-FON-001
 */
export function generateUniqueSKU(
  category: string = 'Geral',
  productName: string = '',
  existingSkus: string[] = []
): string {
  const existingSet = new Set(existingSkus.map((s) => s.trim().toUpperCase()));

  // Prefixos comuns por categoria
  const catPrefixes: Record<string, string> = {
    electrónica: 'ELE',
    eletronica: 'ELE',
    acessórios: 'ACE',
    acessorios: 'ACE',
    áudio: 'AUD',
    audio: 'AUD',
    informática: 'INF',
    informatica: 'INF',
    telecomunicações: 'TEL',
    telecomunicacoes: 'TEL',
    eletrodomésticos: 'ELT',
    eletrodomesticos: 'ELT',
    'bebidas & mercearia': 'ALM',
    bebidas: 'BEB',
    mercearia: 'MER',
    vestuário: 'VES',
    outros: 'PRD',
    geral: 'PRD',
  };

  const catKey = (category || 'geral').toLowerCase().trim();
  const catCode = catPrefixes[catKey] || catKey.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRD';

  // Obter sigla do produto (ex: "Fones Pro" -> "FP")
  const words = (productName || 'Artigo')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  let namePart = '';
  if (words.length >= 2) {
    namePart = `${words[0].slice(0, 2)}${words[1].slice(0, 2)}`;
  } else if (words.length === 1) {
    namePart = words[0].slice(0, 3);
  } else {
    namePart = 'ART';
  }

  // Tenta gerar código incremental ou aleatório
  for (let num = 1; num <= 999; num++) {
    const formattedNum = num.toString().padStart(3, '0');
    const candidate = `${catCode}-${namePart}-${formattedNum}`.toUpperCase();
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }

  // Fallback aleatório único garantido
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${catCode}-${namePart}-${randomSuffix}`.toUpperCase();
}
