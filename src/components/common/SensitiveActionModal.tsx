import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';

interface SensitiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle: string;
  actionDescription?: string;
}

export const SensitiveActionModal: React.FC<SensitiveActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle,
  actionDescription,
}) => {
  const { currentUser, verifySensitiveAction, playAudioFeedback } = useApp();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, insira a sua palavra-passe.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await verifySensitiveAction(password, actionTitle);
    setIsLoading(false);

    if (result.success) {
      playAudioFeedback('success');
      setPassword('');
      onSuccess();
    } else {
      playAudioFeedback('alert');
      setError(result.error || 'Palavra-passe incorreta. Acesso não autorizado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1728] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Confirmação de Segurança</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Operação Sensível
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
          Para prosseguir com <strong className="text-white">"{actionTitle}"</strong>, confirme a palavra-passe do utilizador{' '}
          <strong className="text-emerald-300">{currentUser?.name}</strong>.
        </p>

        {actionDescription && (
          <p className="text-[11px] text-slate-400 mb-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            {actionDescription}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Palavra-passe Atual
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoFocus
                placeholder="Insira a sua palavra-passe"
                className="w-full bg-[#061220] border border-emerald-900/80 rounded-xl px-4 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/80 text-rose-200 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'A verificar...' : 'Confirmar e Aceder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
