import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Timer,
  Send,
  RefreshCw,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  SUPPORTED_COUNTRY_CODES,
  PhoneValidationResult,
} from '../../utils/phoneUtils';

interface ChangePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePhoneModal: React.FC<ChangePhoneModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, requestPhoneChange, confirmPhoneChange } = useApp();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCountryPrefix, setSelectedCountryPrefix] = useState('+258');
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [maskedNewPhone, setMaskedNewPhone] = useState('');
  const [normalizedNewPhone, setNormalizedNewPhone] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAlternativeHelp, setShowAlternativeHelp] = useState(false);

  // Dynamic phone validation
  const fullPhoneString = newPhoneInput.startsWith('+')
    ? newPhoneInput
    : `${selectedCountryPrefix}${newPhoneInput.replace(/^0+/, '')}`;
  const validation: PhoneValidationResult = normalizePhoneNumber(fullPhoneString, selectedCountryPrefix);

  // Timer
  useEffect(() => {
    if (!isOpen || step !== 2) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRequestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Número de telemóvel inválido.');
      return;
    }

    if (currentUser?.phone && validation.normalized === normalizePhoneNumber(currentUser.phone).normalized) {
      setErrorMsg('O novo número deve ser diferente do número atual da conta.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const res = await requestPhoneChange(validation.normalized);
    setIsLoading(false);

    if (res.success) {
      setNormalizedNewPhone(validation.normalized);
      setMaskedNewPhone(res.phone || maskPhoneNumber(validation.normalized));
      setStep(2);
      setCountdown(300);
      setCooldown(res.resendCooldownSeconds || 60);
      setSuccessMsg(`Código SMS enviado para ${res.phone || maskPhoneNumber(validation.normalized)}.`);
    } else {
      setErrorMsg(res.error || 'Erro ao enviar código para o novo número.');
    }
  };

  const handleConfirmSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (smsCode.trim().length !== 6) {
      setErrorMsg('O código deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const res = await confirmPhoneChange(normalizedNewPhone, smsCode.trim());
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Número de telemóvel atualizado com sucesso no servidor central!');
      setTimeout(() => {
        onClose();
        setStep(1);
        setNewPhoneInput('');
        setSmsCode('');
        setSuccessMsg(null);
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Código SMS inválido ou expirado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Alterar Número de Telemóvel</h3>
            <p className="text-xs text-slate-400">Verificação obrigatória em 2 etapas por SMS</p>
          </div>
        </div>

        {/* Current Phone Indicator */}
        <div className="mb-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-400">Número Atual Registado:</span>
          <span className="font-bold text-emerald-400 font-mono">
            {currentUser?.phone ? maskPhoneNumber(currentUser.phone) : 'Não configurado'}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestSms} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Novo Número de Telemóvel
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCountryPrefix}
                  onChange={(e) => setSelectedCountryPrefix(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {SUPPORTED_COUNTRY_CODES.map((c) => (
                    <option key={c.prefix} value={c.prefix}>
                      {c.flag} {c.prefix}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    placeholder="84 123 4567"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {newPhoneInput && (
                <div className="mt-1 text-[11px]">
                  {validation.isValid ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {validation.carrier} • {validation.normalized}
                    </span>
                  ) : (
                    <span className="text-amber-400">{validation.error}</span>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Um código de verificação temporário de 6 dígitos será enviado por SMS para comprovar a posse do novo número.
            </p>

            <button
              type="submit"
              disabled={isLoading || !validation.isValid}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>A enviar SMS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Código de Confirmação SMS</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmSms} className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 block">
                Código SMS enviado para o novo número:
              </span>
              <span className="text-sm font-bold text-emerald-300 font-mono">
                {maskedNewPhone}
              </span>
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-bold">
                <Timer className="w-3.5 h-3.5" />
                <span>Expira em: {formatTimer(countdown)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                Insira o Código de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                required
                className="w-full bg-slate-950 border border-teal-500/60 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-[0.3em] font-black text-teal-300 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Máximo de 3 tentativas</span>
              <button
                type="button"
                disabled={cooldown > 0 || isLoading}
                onClick={handleRequestSms}
                className="text-teal-400 hover:underline disabled:text-slate-600 disabled:no-underline font-semibold"
              >
                {cooldown > 0 ? `Reenviar SMS em ${cooldown}s` : 'Reenviar SMS'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || smsCode.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>A atualizar no servidor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validar e Atualizar Número</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Procedimento alternativo caso tenha perdido acesso ao número */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setShowAlternativeHelp(!showAlternativeHelp)}
            className="text-[11px] text-slate-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Perdeu o acesso ao número antigo? Procedimento alternativo</span>
          </button>

          {showAlternativeHelp && (
            <div className="mt-3 p-3 bg-slate-950/90 border border-amber-500/30 rounded-xl text-left text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
              <p className="font-bold text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protocolo de Segurança Administrativa:</span>
              </p>
              <p className="text-slate-400 leading-relaxed">
                Se perdeu o chip ou o telemóvel antigo, solicite ao <strong>Gestor Geral</strong> (Moisés Estenda) a redefinição de segurança com comprovação de identidade ou utilize a recuperação por email cadastrado no ecrã de início de sessão.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
