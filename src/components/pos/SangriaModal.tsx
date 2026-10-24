import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMZN } from '../../utils/formatters';
import {
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Building2,
  User,
  Clock,
} from 'lucide-react';

interface SangriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'sangria' | 'suprimento';
}

export interface SangriaRecord {
  id: string;
  type: 'sangria' | 'suprimento';
  amount: number;
  reason: string;
  storeId: string;
  storeName: string;
  performedBy: string;
  timestamp: string;
  paperWidth?: '58mm' | '80mm';
}

export const SangriaModal: React.FC<SangriaModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'sangria',
}) => {
  const { currentUser, activeStore, companySettings, addExpense, playAudioFeedback } = useApp();

  const [type, setType] = useState<'sangria' | 'suprimento'>(defaultType);
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [completedRecord, setCompletedRecord] = useState<SangriaRecord | null>(null);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(companySettings.thermalWidth || '58mm');

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount as any);

    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Informe um valor monetário válido superior a zero.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('A descrição/motivo da movimentação de caixa é obrigatória.');
      return;
    }

    const timestamp = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

    const record: SangriaRecord = {
      id: `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      type,
      amount: numAmount,
      reason: reason.trim(),
      storeId: activeStore.id,
      storeName: activeStore.name,
      performedBy: currentUser.name,
      timestamp,
      paperWidth,
    };

    // Se for sangria para despesa/recolha, registra em expenses
    if (type === 'sangria') {
      addExpense({
        storeId: activeStore.id,
        storeName: activeStore.name,
        category: 'outros',
        description: `SANGRIA DE CAIXA: ${reason.trim()} (Operador: ${currentUser.name})`,
        amount: numAmount,
        date: timestamp,
        createdBy: currentUser.name,
      });
    }

    playAudioFeedback('success');
    setCompletedRecord(record);
    setErrorMsg('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0e1726] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a101d]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                type === 'sangria'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {type === 'sangria' ? (
                <ArrowDownCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">
                {completedRecord
                  ? `Comprovativo de ${completedRecord.type === 'sangria' ? 'Sangria' : 'Suprimento'}`
                  : 'Movimentação de Numerário no Caixa'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeStore.name} &bull; Operador: {currentUser.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!completedRecord ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setType('sangria')}
                  className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'sangria'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Sangria (Saída)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('suprimento')}
                  className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'suprimento'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Suprimento (Entrada)</span>
                </button>
              </div>

              {/* Informative pill */}
              <div
                className={`p-3 rounded-xl border text-[11px] ${
                  type === 'sangria'
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                }`}
              >
                {type === 'sangria'
                  ? 'Sangria: Retirada de dinheiro físico da gaveta do caixa para cofre, recolha ou despesa autorizada. Reduz o saldo em gaveta.'
                  : 'Suprimento: Entrada de dinheiro físico para reforço de troco ou fundo de maneio. Aumenta o saldo em gaveta.'}
              </div>

              {/* Valor em Meticais */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Valor a {type === 'sangria' ? 'Retirar' : 'Entrar'} (MZN) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-[#121c2d] border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white text-base font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    autoFocus
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-xs">MT</span>
                </div>
              </div>

              {/* Motivo / Descrição */}
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  Motivo / Justificativa da Movimentação <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    type === 'sangria'
                      ? 'Ex: Recolha parcial para o cofre central de segurança / Pagamento de transporte urgente...'
                      : 'Ex: Fundo de troco inicial em notas pequenas / Reforço de moedas...'
                  }
                  className="w-full bg-[#121c2d] border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none text-xs"
                  required
                />
              </div>

              {/* Formato de Impressão */}
              <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-300 font-medium">Formato da Mini-Impressora Térmica:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaperWidth('58mm')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      paperWidth === '58mm'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    58mm (Portátil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth('80mm')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      paperWidth === '80mm'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    80mm (Padrão)
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-bold transition-all shadow-lg cursor-pointer ${
                    type === 'sangria'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/60'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60'
                  }`}
                >
                  Confirmar {type === 'sangria' ? 'Sangria' : 'Suprimento'}
                </button>
              </div>
            </form>
          ) : (
            /* Comprovativo de Sangria / Suprimento Pronto para Impressão */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Movimentação Registada com Sucesso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPaperWidth('58mm')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      paperWidth === '58mm' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    onClick={() => setPaperWidth('80mm')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      paperWidth === '80mm' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    80mm
                  </button>
                </div>
              </div>

              {/* Mini Recibo Térmico Físico 58mm / 80mm */}
              <div
                id="printable-sangria"
                className={`mx-auto bg-white text-slate-950 p-4 rounded-xl font-mono text-[11px] shadow-lg border border-slate-300 ${
                  paperWidth === '58mm' ? 'max-w-[260px]' : 'max-w-[340px]'
                }`}
              >
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <h3 className="font-extrabold text-sm uppercase">SL VENDAS</h3>
                  <p className="text-[10px] text-slate-600">{activeStore.name}</p>
                  <p className="text-[9px] text-slate-500">Quelimane &bull; Moçambique</p>
                  <p className="mt-1 text-xs font-black uppercase text-slate-900 bg-slate-100 py-0.5 rounded">
                    COMPROVATIVO DE {completedRecord.type.toUpperCase()}
                  </p>
                </div>

                <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>REGISTO:</span>
                    <span className="font-bold">{completedRecord.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATA:</span>
                    <span>{completedRecord.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OPERADOR:</span>
                    <span className="font-semibold">{completedRecord.performedBy}</span>
                  </div>
                </div>

                <div className="py-2.5 text-center border-b border-dashed border-slate-400">
                  <span className="text-[10px] uppercase text-slate-600 block">VALOR REGISTADO:</span>
                  <span className="text-base font-black text-slate-950">
                    {formatMZN(completedRecord.amount)}
                  </span>
                </div>

                <div className="py-2 border-b border-dashed border-slate-400 text-[10px]">
                  <span className="font-bold block text-slate-700">MOTIVO:</span>
                  <p className="text-slate-800 italic break-words leading-tight mt-0.5">{completedRecord.reason}</p>
                </div>

                {/* Linhas de Assinatura */}
                <div className="pt-4 pb-1 text-center space-y-3 text-[9px] text-slate-600">
                  <div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto mb-1" />
                    <span>Assinatura do Operador de Caixa</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 w-3/4 mx-auto mb-1" />
                    <span>Visto do Gerente / Responsável</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Concluir
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprovativo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
