import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingCart,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Crown,
  Store,
  RefreshCw,
  Clock,
  Sparkles,
  Building2,
  User as UserIcon,
  Check,
  Radio,
  Timer,
  Send,
} from 'lucide-react';
import { getMaputoTimeString } from '../../utils/formatters';
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  SUPPORTED_COUNTRY_CODES,
  PhoneValidationResult,
} from '../../utils/phoneUtils';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const {
    login,
    loginWithGoogle,
    requestPasswordReset,
    confirmPasswordReset,
    registerRequestSms,
    registerConfirmSms,
    sendLoginSms,
    verifyLoginSms,
    requestPhonePasswordReset,
    confirmPhonePasswordReset,
    serverConnected,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recovery' | 'guide'>('login');

  // Login Options State
  const [loginMode, setLoginMode] = useState<'password' | 'sms'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login via SMS OTP State
  const [smsLoginStep, setSmsLoginStep] = useState<1 | 2>(1);
  const [smsLoginPhone, setSmsLoginPhone] = useState('');
  const [smsLoginCode, setSmsLoginCode] = useState('');
  const [smsLoginMaskedPhone, setSmsLoginMaskedPhone] = useState('');
  const [smsLoginCountdown, setSmsLoginCountdown] = useState(300); // 5 min
  const [smsLoginCooldown, setSmsLoginCooldown] = useState(0);

  // Register New Account State
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regFullName, setRegFullName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regSelectedCountryPrefix, setRegSelectedCountryPrefix] = useState('+258');
  const [regPhoneInput, setRegPhoneInput] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regSmsCode, setRegSmsCode] = useState('');
  const [regMaskedPhone, setRegMaskedPhone] = useState('');
  const [regNormalizedPhone, setRegNormalizedPhone] = useState('');
  const [regCountdown, setRegCountdown] = useState(300); // 5 min
  const [regCooldown, setRegCooldown] = useState(0);

  // Recovery State
  const [recoveryMethod, setRecoveryMethod] = useState<'phone' | 'email'>('phone');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryMaskedTarget, setRecoveryMaskedTarget] = useState('');
  const [recoveryCountdown, setRecoveryCountdown] = useState(300);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);

  const currentTime = getMaputoTimeString();

  // Dynamic phone validation helper for registration
  const fullRegPhoneString = regPhoneInput.startsWith('+')
    ? regPhoneInput
    : `${regSelectedCountryPrefix}${regPhoneInput.replace(/^0+/, '')}`;
  const regPhoneValidation: PhoneValidationResult = normalizePhoneNumber(fullRegPhoneString, regSelectedCountryPrefix);

  // Timer effect for OTP countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      // Register countdowns
      if (regStep === 2) {
        setRegCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setRegCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }
      // SMS Login countdowns
      if (loginMode === 'sms' && smsLoginStep === 2) {
        setSmsLoginCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setSmsLoginCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }
      // Recovery countdowns
      if (recoveryStep === 2) {
        setRecoveryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setRecoveryCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [regStep, loginMode, smsLoginStep, recoveryStep]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithGoogle({
        email: 'moisesmarioestenda1999@gmail.com',
        name: 'Moisés Estenda',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      });
      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(result.error || 'Falha ao autenticar com a conta Google.');
      }
    } catch {
      setErrorMessage('Erro de ligação ao serviço Google OAuth.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Password Login Submit
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Por favor introduza o seu número de telemóvel ou email e a palavra-passe.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas. Verifique os dados introduzidos.');
      }
    } catch {
      setErrorMessage('Erro de ligação ao servidor central. Verifique a sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Request SMS OTP for Direct Login
  const handleRequestLoginSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizePhoneNumber(smsLoginPhone);
    if (!norm.isValid) {
      setErrorMessage(norm.error || 'Por favor introduza um número de telemóvel válido de Moçambique.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await sendLoginSms(norm.normalized);
    setIsLoading(false);

    if (res.success) {
      setSmsLoginMaskedPhone(res.phone || norm.formatted);
      setSmsLoginStep(2);
      setSmsLoginCountdown(300);
      setSmsLoginCooldown(res.resendCooldownSeconds || 60);
      setSuccessMessage(`Código enviado por SMS para ${res.phone || norm.formatted}.`);
    } else {
      setErrorMessage(res.error || 'Erro ao enviar código de acesso por SMS.');
    }
  };

  // 3. Confirm SMS OTP for Direct Login
  const handleVerifyLoginSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (smsLoginCode.trim().length !== 6) {
      setErrorMessage('Por favor introduza o código de 6 dígitos recebido por SMS.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await verifyLoginSms(smsLoginPhone, smsLoginCode.trim());
    setIsLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || 'Código SMS inválido ou expirado.');
    }
  };

  // 4. Registration Step 1: Submit Form & Request SMS Verification
  const handleRegisterRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regCompanyName.trim() || !regPhoneInput.trim()) {
      setErrorMessage('Todos os campos são obrigatórios.');
      return;
    }

    if (!regPhoneValidation.isValid) {
      setErrorMessage(regPhoneValidation.error || 'Número de telemóvel inválido.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('A palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As palavras-passe não coincidem.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await registerRequestSms({
      fullName: regFullName.trim(),
      companyName: regCompanyName.trim(),
      phone: regPhoneValidation.normalized,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });

    setIsLoading(false);

    if (res.success) {
      setRegNormalizedPhone(regPhoneValidation.normalized);
      setRegMaskedPhone(res.phone || maskPhoneNumber(regPhoneValidation.normalized));
      setRegStep(2);
      setRegCountdown(300);
      setRegCooldown(res.resendCooldownSeconds || 60);
      setSuccessMessage(`Código enviado com sucesso para ${res.phone || maskPhoneNumber(regPhoneValidation.normalized)}.`);
    } else {
      setErrorMessage(res.error || 'Não foi possível enviar o código SMS.');
    }
  };

  // 5. Registration Step 2: Confirm SMS OTP & Activate Account
  const handleRegisterConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSmsCode.trim().length !== 6) {
      setErrorMessage('O código deve conter exatamente 6 dígitos numéricos.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await registerConfirmSms(regNormalizedPhone, regSmsCode.trim());
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Conta ativada com sucesso! A carregar a sua loja...');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1000);
    } else {
      setErrorMessage(res.error || 'Código SMS inválido ou expirado.');
    }
  };

  // Quick fill demo helper
  const handleQuickFill = (demoId: string, demoPass: string) => {
    setIdentifier(demoId);
    setPassword(demoPass);
    setLoginMode('password');
    setErrorMessage(null);
  };

  // Recovery Step 1: Request code
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (recoveryMethod === 'phone') {
      const norm = normalizePhoneNumber(recoveryPhone);
      if (!norm.isValid) {
        setIsLoading(false);
        setErrorMessage(norm.error || 'Por favor introduza um número de telemóvel válido.');
        return;
      }
      const res = await requestPhonePasswordReset(norm.normalized);
      setIsLoading(false);
      if (res.success) {
        setRecoveryMaskedTarget(res.phone || norm.formatted);
        setRecoveryStep(2);
        setRecoveryCountdown(300);
        setRecoveryCooldown(res.resendCooldownSeconds || 60);
        setSuccessMessage(`Código SMS enviado para ${res.phone || norm.formatted}.`);
      } else {
        setErrorMessage(res.error || 'Erro ao solicitar código de recuperação por SMS.');
      }
    } else {
      if (!recoveryEmail.trim()) {
        setIsLoading(false);
        setErrorMessage('Por favor introduza o email cadastrado.');
        return;
      }
      const res = await requestPasswordReset(recoveryEmail.trim());
      setIsLoading(false);
      if (res.success) {
        setRecoveryMaskedTarget(recoveryEmail);
        setRecoveryStep(2);
        setRecoveryCountdown(900);
        setSuccessMessage('Código de recuperação enviado para o seu endereço de email.');
      } else {
        setErrorMessage(res.error || 'Conta de email não encontrada.');
      }
    }
  };

  // Recovery Step 2: Confirm Code & Set New Password
  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode.trim() || !newPassword) {
      setErrorMessage('Por favor preencha o código e a nova palavra-passe.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('As palavras-passe não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('A nova palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    if (recoveryMethod === 'phone') {
      const norm = normalizePhoneNumber(recoveryPhone);
      const res = await confirmPhonePasswordReset(norm.normalized, recoveryCode.trim(), newPassword);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage('Palavra-passe alterada com sucesso! A redirecionar para início de sessão...');
        setTimeout(() => {
          setActiveTab('login');
          setLoginMode('password');
          setIdentifier(norm.formatted);
          setPassword(newPassword);
          setRecoveryStep(1);
          setSuccessMessage(null);
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Código SMS inválido ou expirado.');
      }
    } else {
      const res = await confirmPasswordReset(recoveryEmail.trim(), recoveryCode.trim(), newPassword);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage('Palavra-passe alterada com sucesso! A redirecionar para início de sessão...');
        setTimeout(() => {
          setActiveTab('login');
          setLoginMode('password');
          setIdentifier(recoveryEmail);
          setPassword(newPassword);
          setRecoveryStep(1);
          setSuccessMessage(null);
        }, 1800);
      } else {
        setErrorMessage(res.error || 'Código de verificação inválido ou expirado.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#06101e] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 font-black">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">MZ SISTEMA DE VENDAS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Moçambique (MZN)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Gestão Multilojas em Tempo Real • Autenticação Verificada por SMS (+258)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Maputo: {currentTime}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{serverConnected ? 'Servidor Central Online' : 'A Conectar...'}</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-xl">
          {/* Tabs Switcher: Iniciar Sessão | Registar Conta | Recuperar Conta | Guia */}
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 mb-6 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Iniciar Sessão</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300" />
              <span className="truncate">Abrir Conta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('recovery');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'recovery'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Recuperar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('guide');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Guia</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: INICIAR SESSÃO (Senha ou Código SMS Rápido)      */}
          {/* ======================================================== */}
          {activeTab === 'login' && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 text-center">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Bem-vindo ao MZ Sistema de Vendas
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Aceda à sua conta com telemóvel ou email e credenciais verificadas.
                </p>
              </div>

              {/* Sub-toggle: Palavra-passe vs Código SMS */}
              <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('password');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === 'password'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Entrar com Palavra-passe</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('sms');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === 'sms'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Entrar com Código SMS</span>
                </button>
              </div>

              {/* SUBMODE A: Palavra-passe */}
              {loginMode === 'password' && (
                <form onSubmit={handlePasswordLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Número de Telemóvel ou Email
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="+258 84 123 4567 ou utilizador@slvendas.co.mz"
                        required
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Palavra-passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      <span>Manter sessão ativa</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('recovery');
                        setRecoveryPhone(identifier);
                        setRecoveryEmail(identifier);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                    >
                      Esqueceu a palavra-passe?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A autenticar na base central...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar no Sistema</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* SUBMODE B: Código SMS Rápido */}
              {loginMode === 'sms' && (
                <div>
                  {smsLoginStep === 1 ? (
                    <form onSubmit={handleRequestLoginSms} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Número de Telemóvel Registado (+258)
                        </label>
                        <div className="relative">
                          <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={smsLoginPhone}
                            onChange={(e) => setSmsLoginPhone(e.target.value)}
                            placeholder="+258 84 123 4567"
                            required
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Enviaremos um código SMS de uso único de 6 dígitos para o seu telemóvel.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>A enviar SMS...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Enviar Código por SMS</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginSms} className="space-y-4">
                      <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center">
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Código enviado por SMS para:
                        </span>
                        <span className="text-sm font-bold text-emerald-300 font-mono">
                          {smsLoginMaskedPhone}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300 mt-1">
                          <Timer className="w-3.5 h-3.5" />
                          <span>Expira em: {formatTimer(smsLoginCountdown)}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Código de 6 Dígitos do SMS
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={smsLoginCode}
                          onChange={(e) => setSmsLoginCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          autoFocus
                          required
                          className="w-full bg-slate-950/90 border border-emerald-500/50 rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.3em] font-black text-emerald-400 focus:outline-none focus:border-emerald-400 shadow-inner"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Restam tentativas de segurança</span>
                        <button
                          type="button"
                          disabled={smsLoginCooldown > 0 || isLoading}
                          onClick={handleRequestLoginSms}
                          className="text-emerald-400 hover:underline disabled:text-slate-600 disabled:no-underline font-medium"
                        >
                          {smsLoginCooldown > 0
                            ? `Reenviar SMS em ${smsLoginCooldown}s`
                            : 'Reenviar Código SMS'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || smsLoginCode.length !== 6}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>A validar código...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Entrar no Sistema</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setSmsLoginStep(1)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          ← Alterar número de telemóvel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* DEMO ACCOUNTS HELPER */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Acesso Rápido de Demonstração:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    className="text-[10px] text-emerald-400 hover:underline"
                  >
                    Ver credenciais no Guia →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('moisesmarioestenda1999@gmail.com', 'Admin@2026!')}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300">
                        Moisés Estenda
                      </p>
                      <p className="text-[10px] text-emerald-400/90 font-medium">Gestor Geral (Admin)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('+258 84 987 6543', 'Vendedor@123')}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                        Carlos Nhantumbo
                      </p>
                      <p className="text-[10px] text-cyan-400/90 font-medium">Vendedor (LJ-02 Zimpeto)</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGISTO DE NOVA CONTA (SMS OTP Multiempresa)       */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Registo de Nova Conta e Empresa
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Abra a conta do seu estabelecimento com confirmação obrigatória de identidade por SMS.
                </p>
              </div>

              {/* Progress Steps Header */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  regStep === 1
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}>
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Dados da Empresa</span>
                </div>
                <div className="w-6 h-[1px] bg-slate-800" />
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  regStep === 2
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-500'
                }`}>
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Verificação SMS OTP</span>
                </div>
              </div>

              {regStep === 1 ? (
                <form onSubmit={handleRegisterRequestSubmit} className="space-y-4">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nome Completo do Responsável <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Ex: Albino Matusse"
                        required
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Nome da Empresa */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nome da Empresa ou Estabelecimento <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        placeholder="Ex: Mercearia Estrela do Norte"
                        required
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Número de Telemóvel com Indicativo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Número de Telemóvel do Cliente (Identificador Principal) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={regSelectedCountryPrefix}
                        onChange={(e) => setRegSelectedCountryPrefix(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 shrink-0"
                      >
                        {SUPPORTED_COUNTRY_CODES.map((c) => (
                          <option key={c.prefix} value={c.prefix}>
                            {c.flag} {c.prefix} ({c.name})
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={regPhoneInput}
                          onChange={(e) => setRegPhoneInput(e.target.value)}
                          placeholder="84 123 4567"
                          required
                          className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                            regPhoneInput
                              ? regPhoneValidation.isValid
                                ? 'border-emerald-500/80 focus:border-emerald-400'
                                : 'border-amber-500/60 focus:border-amber-400'
                              : 'border-slate-800 focus:border-teal-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Feedback visual da operadora */}
                    {regPhoneInput && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        {regPhoneValidation.isValid ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            {regPhoneValidation.carrier} • Formato E.164: {regPhoneValidation.normalized}
                          </span>
                        ) : (
                          <span className="text-amber-400">
                            {regPhoneValidation.error || 'Formato de número inválido'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Palavras-passe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Palavra-passe <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setRegShowPassword(!regShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {regShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Confirmar Palavra-passe <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={regShowPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repita a palavra-passe"
                          required
                          className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none ${
                            regConfirmPassword
                              ? regPassword === regConfirmPassword
                                ? 'border-emerald-500'
                                : 'border-red-500'
                              : 'border-slate-800 focus:border-teal-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informação sobre isolamento de dados e política de perfis */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Segurança e Isolamento Multiempresa:</span>
                    </p>
                    <p>
                      A conta criada terá perfil de <strong>Gerente</strong> da sua própria empresa. O seu stock, vendas e caixas ficam 100% isolados de outros estabelecimentos.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !regPhoneValidation.isValid}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-lg shadow-teal-950/50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A processar e enviar SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Código SMS de Verificação →</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* STEP 2: VERIFICAÇÃO OTP SMS */
                <form onSubmit={handleRegisterConfirmSubmit} className="space-y-4">
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl text-center space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      Enviámos um código temporário de verificação para:
                    </span>
                    <span className="text-base font-black text-emerald-300 font-mono tracking-wider block">
                      {regMaskedPhone}
                    </span>
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-bold pt-1">
                      <Timer className="w-4 h-4 animate-pulse" />
                      <span>Válido por: {formatTimer(regCountdown)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                      Insira o Código de 6 Dígitos do SMS
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={regSmsCode}
                      onChange={(e) => setRegSmsCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      autoFocus
                      required
                      className="w-full bg-slate-950/90 border border-teal-500/60 rounded-2xl px-4 py-3.5 text-center font-mono text-2xl tracking-[0.35em] font-black text-teal-300 focus:outline-none focus:border-teal-400 shadow-inner"
                    />
                    <p className="text-[10px] text-slate-500 text-center mt-1.5">
                      Código de utilização única com hash criptográfico SHA-256 no servidor.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Máximo de 3 tentativas</span>
                    <button
                      type="button"
                      disabled={regCooldown > 0 || isLoading}
                      onClick={handleRegisterRequestSubmit}
                      className="text-teal-400 hover:underline disabled:text-slate-600 disabled:no-underline font-semibold"
                    >
                      {regCooldown > 0 ? `Reenviar SMS em ${regCooldown}s` : 'Reenviar Código SMS'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || regSmsCode.length !== 6}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>A ativar a conta no servidor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar SMS e Ativar Minha Conta</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      ← Voltar e corrigir dados da empresa
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: RECUPERAR CONTA (SMS ou Email)                   */}
          {/* ======================================================== */}
          {activeTab === 'recovery' && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Recuperação Segura de Conta
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Redefina a sua palavra-passe com verificação em duas etapas via SMS ou Email.
                </p>
              </div>

              {/* Method Switcher */}
              {recoveryStep === 1 && (
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod('phone');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      recoveryMethod === 'phone'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Por Telemóvel SMS (Recomendado)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMethod('email');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      recoveryMethod === 'email'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Por Email</span>
                  </button>
                </div>
              )}

              {recoveryStep === 1 ? (
                <form onSubmit={handleRequestRecovery} className="space-y-4">
                  {recoveryMethod === 'phone' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Número de Telemóvel Registado (+258)
                      </label>
                      <div className="relative">
                        <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={recoveryPhone}
                          onChange={(e) => setRecoveryPhone(e.target.value)}
                          placeholder="+258 84 123 4567"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Receberá um SMS com o código criptográfico de redefinição de palavra-passe.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Email da Conta Cadastrada
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="seu.email@slvendas.co.mz"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Código de Recuperação</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* RECOVERY STEP 2: Validar Código e Nova Senha */
                <form onSubmit={handleConfirmRecovery} className="space-y-4">
                  <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-center">
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Código de verificação enviado para:
                    </span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">
                      {recoveryMaskedTarget}
                    </span>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-300 mt-1 font-bold">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Expira em: {formatTimer(recoveryCountdown)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Código de Verificação de 6 Dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 849201"
                      required
                      className="w-full bg-slate-950/80 border border-blue-500/50 rounded-xl px-4 py-2.5 text-center font-mono text-lg font-black text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nova Palavra-passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirmar Nova Palavra-passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a palavra-passe"
                      required
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirmar e Redefinir Palavra-passe</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRecoveryStep(1);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ← Voltar para Início de Sessão
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: GUIA DE ACESSO & MANUAL DE SEGURANÇA               */}
          {/* ======================================================== */}
          {activeTab === 'guide' && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Manual de Contas e Segurança SMS</h2>
                  <p className="text-xs text-slate-400">Instruções de acesso e regras multiempresa</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <Smartphone className="w-4 h-4" />
                    <span>1. Autenticação e Registo por Telemóvel e SMS</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    O número de telemóvel é o identificador de contacto principal do cliente. Ao abrir uma conta, o sistema envia um código SMS de 6 dígitos temporário (expira em 5 minutos) com limite de 3 tentativas e proteção contra abuso. Os números são normalizados no padrão internacional E.164 (ex: <code>+258 84 123 4567</code>) para Vodacom, Movitel e Tmcel.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                    <Building2 className="w-4 h-4" />
                    <span>2. Isolamento Multiempresa Estrito</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Novos registos públicos criam automaticamente um novo estabelecimento com o utilizador no papel de <strong>Gerente</strong>. Cada empresa apenas pode consultar, registar vendas e gerir o seu próprio inventário. O perfil de <strong>Administrador Geral</strong> não é atribuído em registos públicos por razões de soberania e segurança.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                    <Lock className="w-4 h-4" />
                    <span>3. Proteção Criptográfica dos Códigos</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Os códigos SMS são gerados criptograficamente no servidor com salt aleatório e armazenados sob hash <strong>SHA-256</strong>. Nunca são gravados em texto simples, nunca são incluídos em registos públicos nem expostos na interface. A validação é efetuada por comparação tempo-constante (<code>timingSafeEqual</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <Crown className="w-4 h-4" />
                    <span>4. Gestor Geral Inicial do Sistema</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    A administração central e o comando mestre pertencem ao Gestor Geral <strong>Moisés Estenda</strong> (<code>moisesmarioestenda1999@gmail.com</code> / Telemóvel: <code>+258 84 000 0001</code> / Senha: <code>Admin@2026!</code>).
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="py-2.5 px-6 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                >
                  Ir para Início de Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-500 z-10">
        MZ SISTEMA DE VENDAS &copy; 2026 — Gestão Multilojas em Tempo Real • Moçambique (MZN)
      </footer>
    </div>
  );
};
