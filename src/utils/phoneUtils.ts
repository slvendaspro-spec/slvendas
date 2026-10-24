/**
 * Utilitários de Normalização e Validação de Números de Telemóvel
 * MZ SISTEMA DE VENDAS — Padrão E.164 e Detecção de Operadoras Moçambicanas
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // Formato E.164 (ex: +258841234567)
  formatted: string;  // Formato visual (ex: +258 84 123 4567)
  countryCode: string; // Ex: +258
  nationalNumber: string; // Ex: 841234567
  carrier?: string; // Ex: Vodacom, Movitel, Tmcel
  error?: string;
}

export interface CountryDialInfo {
  code: string;
  name: string;
  flag: string;
  prefix: string;
  placeholder: string;
  expectedDigits: number;
}

export const SUPPORTED_COUNTRY_CODES: CountryDialInfo[] = [
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿', prefix: '+258', placeholder: '84 123 4567', expectedDigits: 9 },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦', prefix: '+27', placeholder: '82 123 4567', expectedDigits: 9 },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', prefix: '+244', placeholder: '923 123 456', expectedDigits: 9 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', prefix: '+351', placeholder: '912 345 678', expectedDigits: 9 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55', placeholder: '11 98765 4321', expectedDigits: 11 },
  { code: 'ZW', name: 'Zimbabué', flag: '🇿🇼', prefix: '+263', placeholder: '77 123 4567', expectedDigits: 9 },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', prefix: '+268', placeholder: '76 123 456', expectedDigits: 8 },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', prefix: '+265', placeholder: '88 123 4567', expectedDigits: 9 },
  { code: 'TZ', name: 'Tanzânia', flag: '🇹🇿', prefix: '+255', placeholder: '74 123 4567', expectedDigits: 9 },
];

/**
 * Normaliza um número de telemóvel para o padrão E.164 internacional.
 * Previne duplicações causadas por formatos diferentes do mesmo número.
 */
export function normalizePhoneNumber(rawInput: string, defaultPrefix = '+258'): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      normalized: '',
      formatted: '',
      countryCode: defaultPrefix,
      nationalNumber: '',
      error: 'O número de telemóvel é obrigatório.',
    };
  }

  // Remove espaços, parênteses, hífenes e pontos
  let clean = rawInput.trim().replace(/[\s\(\)\-\.]/g, '');

  // Converte 00 internacional para +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  let countryCode = defaultPrefix;
  let nationalNumber = '';

  if (clean.startsWith('+')) {
    // Procura o indicativo internacional correspondente
    const matched = SUPPORTED_COUNTRY_CODES.find((c) => clean.startsWith(c.prefix));
    if (matched) {
      countryCode = matched.prefix;
      nationalNumber = clean.slice(matched.prefix.length);
    } else {
      // Indicativo genérico de 1 a 4 dígitos
      const prefixMatch = clean.match(/^\+(\d{1,4})(\d+)$/);
      if (prefixMatch) {
        countryCode = '+' + prefixMatch[1];
        nationalNumber = prefixMatch[2];
      } else {
        return {
          isValid: false,
          normalized: clean,
          formatted: clean,
          countryCode: defaultPrefix,
          nationalNumber: '',
          error: 'Formato internacional de indicativo inválido.',
        };
      }
    }
  } else {
    // Sem prefixo '+', verificar se começa com código de país direto (ex: 258841234567)
    if (clean.startsWith('258') && clean.length >= 11) {
      countryCode = '+258';
      nationalNumber = clean.slice(3);
    } else if (clean.startsWith('27') && clean.length >= 11) {
      countryCode = '+27';
      nationalNumber = clean.slice(2);
    } else if (clean.startsWith('244') && clean.length >= 12) {
      countryCode = '+244';
      nationalNumber = clean.slice(3);
    } else if (clean.startsWith('351') && clean.length >= 12) {
      countryCode = '+351';
      nationalNumber = clean.slice(3);
    } else {
      // Assume o país padrão (+258 Moçambique)
      countryCode = defaultPrefix;
      nationalNumber = clean;
    }
  }

  // Remove zeros à esquerda adicionais no número nacional
  if (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.replace(/^0+/, '');
  }

  // Validação específica para Moçambique (+258)
  if (countryCode === '+258') {
    if (!/^\d+$/.test(nationalNumber)) {
      return {
        isValid: false,
        normalized: `${countryCode}${nationalNumber}`,
        formatted: `${countryCode} ${nationalNumber}`,
        countryCode,
        nationalNumber,
        error: 'O número deve conter apenas dígitos numéricos.',
      };
    }

    if (nationalNumber.length !== 9) {
      return {
        isValid: false,
        normalized: `${countryCode}${nationalNumber}`,
        formatted: `${countryCode} ${nationalNumber}`,
        countryCode,
        nationalNumber,
        error: `O número de Moçambique deve ter 9 dígitos (introduziu ${nationalNumber.length}).`,
      };
    }

    const prefix2 = nationalNumber.slice(0, 2);
    let carrier = 'Operadora Móvel MZ';
    if (prefix2 === '84' || prefix2 === '85') {
      carrier = 'Vodacom Moçambique';
    } else if (prefix2 === '86' || prefix2 === '87') {
      carrier = 'Movitel Moçambique';
    } else if (prefix2 === '82' || prefix2 === '83') {
      carrier = 'Tmcel Moçambique';
    } else if (['21', '23', '24', '25', '26', '27', '28', '29'].includes(prefix2)) {
      carrier = 'Rede Fixa TDM';
    } else {
      return {
        isValid: false,
        normalized: `${countryCode}${nationalNumber}`,
        formatted: `${countryCode} ${nationalNumber}`,
        countryCode,
        nationalNumber,
        error: `Prefixo '${prefix2}' não reconhecido em Moçambique. Use 84, 85 (Vodacom), 86, 87 (Movitel) ou 82, 83 (Tmcel).`,
      };
    }

    // Formata como +258 84 123 4567
    const formatted = `+258 ${nationalNumber.slice(0, 2)} ${nationalNumber.slice(2, 5)} ${nationalNumber.slice(5)}`;
    return {
      isValid: true,
      normalized: `+258${nationalNumber}`,
      formatted,
      countryCode: '+258',
      nationalNumber,
      carrier,
    };
  }

  // Validação genérica para outros países suportados
  if (!/^\d{7,15}$/.test(nationalNumber)) {
    return {
      isValid: false,
      normalized: `${countryCode}${nationalNumber}`,
      formatted: `${countryCode} ${nationalNumber}`,
      countryCode,
      nationalNumber,
      error: 'Número internacional com extensão de dígitos inválida (deve ter entre 7 e 15 dígitos).',
    };
  }

  return {
    isValid: true,
    normalized: `${countryCode}${nationalNumber}`,
    formatted: `${countryCode} ${nationalNumber}`,
    countryCode,
    nationalNumber,
    carrier: 'Internacional',
  };
}

/**
 * Oculta parte do número para exibição segura sem expor dados privados.
 * Exemplo: +258 84 123 4567 -> +258 84 ••• •567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const norm = normalizePhoneNumber(phone);
  if (!norm.isValid) return phone;

  if (norm.countryCode === '+258') {
    const p = norm.nationalNumber;
    return `+258 ${p.slice(0, 2)} ••• ${p.slice(5)}`;
  }

  const p = norm.nationalNumber;
  if (p.length > 4) {
    return `${norm.countryCode} ••• •${p.slice(-3)}`;
  }
  return `${norm.countryCode} ••••`;
}
