import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import {
  Bell,
  X,
  Trash2,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface NotificationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationManagerModal: React.FC<NotificationManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    playAudioFeedback,
  } = useApp();

  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'critical' && n.severity !== 'critical') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.recommendedAction && n.recommendedAction.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelectNotification = (n: NotificationItem) => {
    setSelectedNotif(n);
    if (!n.read) {
      markNotificationAsRead(n.id);
    }
  };

  const handleDeleteSingle = (id: string) => {
    deleteNotification(id);
    playAudioFeedback('beep');
    setDeletingId(null);
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
    playAudioFeedback('alert');
    setShowClearConfirm(false);
    setSelectedNotif(null);
  };

  const getSeverityIcon = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getSeverityBadge = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Crítico
          </span>
        );
      case 'warning':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Alerta
          </span>
        );
      case 'success':
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Sucesso
          </span>
        );
      case 'info':
      default:
        return (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Informativo
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1728] border border-cyan-900/60 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-950/80 bg-[#071322] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Central de Notificações</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Acompanhe e gira alertas de stock, caixa e auditoria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-cyan-950/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar / Filters */}
        <div className="p-4 bg-[#0a192e] border-b border-cyan-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título ou mensagem..."
              className="w-full bg-[#071322] border border-cyan-900/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-cyan-950/60 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                filter === 'unread'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-cyan-950/60 text-slate-400 hover:text-white'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                filter === 'critical'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-950/40 text-rose-300 hover:text-white'
              }`}
            >
              Críticas
            </button>
          </div>
        </div>

        {/* Content Body: List vs Details View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {selectedNotif ? (
            /* Detailed view of selected notification */
            <div className="bg-[#071322] border border-cyan-900/80 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-950">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar à lista</span>
                </button>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(selectedNotif.severity)}
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedNotif.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-800/80 shrink-0">
                  {getSeverityIcon(selectedNotif.severity)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{selectedNotif.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {selectedNotif.message}
                  </p>
                </div>
              </div>

              {selectedNotif.recommendedAction && (
                <div className="p-3.5 bg-[#0a1e36] border border-cyan-800/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-black uppercase text-cyan-300 block">
                    Recomendação de Gestão:
                  </span>
                  <p className="text-xs text-white leading-normal">
                    {selectedNotif.recommendedAction}
                  </p>
                </div>
              )}

              {/* Safety Confirmation for single deletion */}
              {deletingId === selectedNotif.id ? (
                <div className="p-3 bg-rose-950/60 border border-rose-600 rounded-xl space-y-2 animate-fadeIn">
                  <p className="text-xs text-rose-200 font-bold">
                    Tem a certeza de que deseja eliminar permanentemente esta notificação?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteSingle(selectedNotif.id)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Confirmar Eliminação
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 font-medium text-xs rounded-lg hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-3 border-t border-cyan-950">
                  <span className="text-[11px] text-slate-400">
                    Estado: <strong className="text-emerald-400">Lida</strong>
                  </span>
                  <button
                    onClick={() => setDeletingId(selectedNotif.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs border border-rose-800/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Notificação</span>
                  </button>
                </div>
              )}
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty state */
            <div className="text-center py-12 px-4 space-y-2">
              <Bell className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="font-bold text-sm text-slate-300">Sem notificações a apresentar</h4>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : 'Todas as notificações foram tratadas ou eliminadas.'}
              </p>
            </div>
          ) : (
            /* Notifications list */
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleSelectNotification(n)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                  !n.read
                    ? 'bg-[#0e2444] border-cyan-700/80 hover:border-cyan-400 shadow-md'
                    : 'bg-[#071322] border-cyan-950/80 hover:bg-[#0a1a30] hover:border-cyan-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-900 shrink-0 mt-0.5">
                    {getSeverityIcon(n.severity)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-bold text-xs ${
                          !n.read ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                      {n.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {getSeverityBadge(n.severity)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingle(n.id);
                    }}
                    title="Eliminar Notificação"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Confirmation Modal for Clear All */}
        {showClearConfirm && (
          <div className="p-4 bg-rose-950/90 border-t border-rose-700 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <strong className="text-xs font-bold">
                Confirmar limpeza completa de notificações?
              </strong>
            </div>
            <p className="text-[11px] text-rose-300">
              Esta ação apagará permanentemente todas as mensagens e alertas do sistema. Não poderá
              ser desfeita.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Sim, Eliminar Todas
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#071322] border-t border-cyan-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllNotificationsAsRead();
                  playAudioFeedback('beep');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 font-bold border border-cyan-800 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar todas como lidas</span>
              </button>
            )}
            {notifications.length > 0 && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar todas</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
