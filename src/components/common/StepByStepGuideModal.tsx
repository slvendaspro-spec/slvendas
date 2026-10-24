import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Database,
  UserCheck,
  Store,
  Users,
  Smartphone,
  BellRing,
  Globe,
  HardDriveDownload,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

interface StepByStepGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StepByStepGuideModal: React.FC<StepByStepGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      id: 1,
      title: 'Configurar a Base de Dados Central',
      icon: Database,
      short: 'Base centralizada e segura',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            O <strong>SL Vendas</strong> foi projectado com uma arquitectura de persistência dupla:
            armazenamento offline local resiliente (LocalStorage / IndexedDB com sincronização automática)
            e integração centralizada com a nuvem (Express backend / Cloud Firestore / PostgreSQL).
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-semibold text-emerald-400 text-xs uppercase tracking-wider">
              Passo a Passo de Inicialização:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
              <li>O sistema inicializa automaticamente a base de dados com as tabelas de Lojas, Utilizadores, Produtos, Stock, Vendas e Auditoria.</li>
              <li>A sincronização online em tempo real actualiza dados entre o computador central (Gestor Geral) e os telemóveis dos vendedores.</li>
              <li>Se a conexão à Internet for interrompida na loja, o sistema entra em <em>Modo Offline</em> automaticamente sem perder vendas.</li>
            </ol>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 flex items-center justify-between">
            <span>npm run dev # Servidor Express com Vite & API de Sincronização</span>
            <button
              onClick={() => copyCode('npm run dev', 1)}
              className="p-1 hover:text-white transition-colors"
            >
              {copiedIndex === 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Criar o Primeiro Gestor Geral (Dispositivo Mãe)',
      icon: UserCheck,
      short: 'Acesso total administrativo',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            O Gestor Geral é o administrador master que possui o <strong>Dispositivo Mãe</strong>.
            Ele tem acesso irrestrito ao painel verde, relatórios de lucro, auditoria e revogação de acessos.
          </p>
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-2 text-emerald-200">
            <div className="font-bold flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              Gestor Geral Padrão Configurado:
            </div>
            <p><strong>Nome:</strong> Moisés Estenda (Administrador Geral)</p>
            <p><strong>Email:</strong> moisesmarioestenda1999@gmail.com</p>
            <p><strong>Permissões:</strong> Controlo total sobre todas as lojas, aprovação de descontos, cancelamento de vendas e auditoria.</p>
          </div>
          <p className="text-xs text-slate-400">
            Para adicionar novos administradores ou alterar senhas, aceda à secção <strong>Utilizadores</strong> no menu lateral e defina o papel como <em>Gestor Geral</em>.
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Adicionar a Primeira Loja',
      icon: Store,
      short: 'Configuração da filial física',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Cada filial física (ex: Quelimane Centro, Zimpeto, 25 de Setembro, Macurungo, Namuac) opera como uma unidade independente de stock e vendas.
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-emerald-400">Campos Obrigatórios da Loja:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Código da Loja:</strong> Ex: LOJA-01, LOJA-02</li>
              <li><strong>Nome e Endereço:</strong> Localização física em Quelimane ou outra província</li>
              <li><strong>Meta Diária de Vendas:</strong> Ex: 15.000,00 MZN (usada para calcular a barra de progresso do vendedor)</li>
              <li><strong>Coordenadas GPS:</strong> Para monitoramento no mapa de filiais</li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            Aceda ao menu <strong>Lojas</strong> no painel verde e clique em <em>+ Adicionar Nova Loja</em>.
          </p>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Criar Contas de Vendedores',
      icon: Users,
      short: 'Acesso isolado e seguro (Painel Azul)',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Os vendedores acedem ao <strong>Painel Azul</strong> e têm a sua visão estritamente restrita à loja atribuída:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li>Não conseguem visualizar dados financeiros nem vendas de outras filiais.</li>
            <li>Não podem alterar permissões nem apagar histórico de transações.</li>
            <li>O desconto concedido é limitado pela percentagem máxima configurada pelo Gestor Geral (ex: 10%).</li>
          </ul>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <span className="text-cyan-400 font-semibold">Exemplo de Vendedor Ativo:</span>
            <p className="mt-1 text-slate-300">Carlos Nhantumbo &rarr; Atribuído à <strong>Loja 2 - Quelimane (Zimpeto)</strong></p>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: 'Ligar Outros Dispositivos (Telemóveis e Tablets)',
      icon: Smartphone,
      short: 'PWA e autorização de terminais',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            O SL Vendas é uma Aplicação Web Progressiva (PWA) de alto desempenho que pode ser instalada diretamente no ecrã principal de qualquer smartphone Android ou tablet.
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-emerald-400">Como conectar o telemóvel do vendedor:</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>No Chrome do telemóvel, aceda ao endereço partilhado da aplicação.</li>
              <li>Toque no menu do Chrome &rarr; <strong>"Adicionar ao ecrã inicial"</strong> ou <strong>"Instalar aplicação"</strong>.</li>
              <li>O dispositivo será registado automaticamente no painel de <strong>Dispositivos Autorizados</strong> do Gestor Geral.</li>
              <li>O Gestor Geral pode revogar o acesso de qualquer aparelho remotamente com apenas um clique!</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      title: 'Configurar Notificações e Alertas em Tempo Real',
      icon: BellRing,
      short: 'Alertas de vendas, stock e auditoria',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            O Gestor Geral recebe notificações automáticas imediatas sempre que ocorrem eventos críticos:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-emerald-400 font-bold block mb-1">✅ Vendas de Alto Valor</span>
              <span>Notificação com loja, vendedor, cliente e valor em MZN.</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-amber-400 font-bold block mb-1">⚠️ Alertas de Stock Baixo</span>
              <span>Avisa quando um produto atinge o limiar mínimo de segurança.</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-rose-400 font-bold block mb-1">🛑 Cancelamento e Estorno</span>
              <span>Regista estornos de vendas com justificativa obrigatória.</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-bold block mb-1">📱 Novo Dispositivo</span>
              <span>Alerta quando um novo telemóvel inicia sessão no sistema.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      title: 'Publicar a Aplicação Online',
      icon: Globe,
      short: 'Hospedagem 24/7 e domínio',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            A aplicação já está configurada e em execução no ambiente de nuvem do <strong>Google AI Studio</strong> com URL segura HTTPS.
          </p>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-emerald-400">Passos para Produção:</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Para gerar a compilação final optimizada de produção: execute <code>npm run build</code>.</li>
              <li>O comando gera os ficheiros estáticos ultra-leves na pasta <code>dist/</code> servidos pelo <code>server.ts</code>.</li>
              <li>A porta de produção padrão é a 3000 (ou variável de ambiente <code>PORT</code>).</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      title: 'Fazer Cópias de Segurança (Backups)',
      icon: HardDriveDownload,
      short: 'Exportação JSON e recuperação',
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Nunca perca um único cêntimo do seu histórico comercial. O SL Vendas inclui um utilitário completo de backup e restauro:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>Exportação em 1 Clique:</strong> Descarregue um ficheiro JSON completo com todas as lojas, produtos, inventário, vendas, despesas e auditoria.</li>
            <li><strong>Restauro Instantâneo:</strong> Pode carregar o ficheiro de backup em qualquer novo computador ou servidor para restaurar o sistema em segundos.</li>
            <li><strong>Protecção contra Exclusão Silenciosa:</strong> Nenhuma exclusão de loja ou transação é feita sem confirmação explícita e registo de auditoria.</li>
          </ul>
        </div>
      ),
    },
  ];

  const currentStep = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-950/70 border-b border-emerald-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-lg">
                Manual Operacional e Guia Passo a Passo
              </h3>
              <p className="text-xs text-slate-400">
                Instruções oficiais de implantação e configuração do SL Vendas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Steps Nav */}
          <div className="w-full md:w-72 bg-slate-950/80 border-r border-slate-800 overflow-y-auto p-3 space-y-1 shrink-0">
            {steps.map((st) => {
              const Icon = st.icon;
              const isActive = st.id === activeStep;
              return (
                <button
                  key={st.id}
                  onClick={() => setActiveStep(st.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  <div className="flex-1 truncate">
                    <span className="block font-semibold truncate">{st.id}. {st.title}</span>
                    <span className={`text-[10px] truncate block ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {st.short}
                    </span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Active Step Details */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
                  {currentStep.id}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{currentStep.title}</h2>
                  <p className="text-xs text-emerald-400 font-medium">{currentStep.short}</p>
                </div>
              </div>

              <div>{currentStep.content}</div>
            </div>

            {/* Step navigation buttons */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between mt-6">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              >
                &larr; Passo Anterior
              </button>
              {activeStep < steps.length ? (
                <button
                  onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 transition-all active:scale-95"
                >
                  Próximo Passo
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Concluir Leitura
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
