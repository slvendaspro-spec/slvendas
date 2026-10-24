import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingCart,
  Wifi,
  WifiOff,
  Bell,
  Clock,
  BookOpen,
  User,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { getMaputoTimeString, formatMZN } from '../../utils/formatters';

interface HeaderProps {
  onOpenGuide: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGuide, onOpenNotifications }) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    stores,
    activeStore,
    setActiveStore,
    isSimulatedOffline,
    toggleSimulatedOffline,
    notifications,
    offlineQueue,
    syncOfflineQueue,
    logout,
    theme,
    toggleTheme,
    companySettings,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(getMaputoTimeString());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getMaputoTimeString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 border-b backdrop-blur-md ${
        isAdmin
          ? 'bg-slate-950/95 border-emerald-900/40 text-slate-100'
          : 'bg-slate-950/95 border-cyan-900/40 text-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Role */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transition-transform active:scale-95 ${
                isAdmin
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-900/40'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-900/40'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">SL Vendas</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  {isAdmin ? 'Gestor Geral' : 'Vendedor'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {isAdmin
                  ? 'Painel de Administração Central'
                  : `${activeStore.name} — ${activeStore.city}`}
              </p>
            </div>
          </div>
        </div>

        {/* Center: System Status & Time */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          {/* Online/Offline Status Pill */}
          <button
            onClick={toggleSimulatedOffline}
            title="Clique para alternar o modo offline e testar a sincronização"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-medium transition-all ${
              isSimulatedOffline
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Offline (Fila: {offlineQueue.length})</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online — Sistema Conectado</span>
              </>
            )}
          </button>

          {/* Sync Button if queue exists */}
          {offlineQueue.length > 0 && !isSimulatedOffline && (
            <button
              onClick={syncOfflineQueue}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-semibold text-xs shadow-md animate-bounce"
            >
              <RefreshCw className="w-3 h-3" />
              Sincronizar ({offlineQueue.length})
            </button>
          )}

          {/* Clock Africa/Maputo */}
          <div className="flex items-center gap-1.5 text-slate-400 font-medium px-3 py-1 bg-slate-900/60 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Right: Actions, Theme, Notifications & User Switcher */}
        <div className="flex items-center gap-2">
          {/* Active POS Model Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300" title="Modelo de ecrã do Caixa configurado pelo Administrador Geral">
            <span className="text-[10px] text-slate-500 font-mono">PDV:</span>
            <span className={companySettings.posLayoutModel === 'ed' ? 'text-amber-400' : 'text-cyan-400'}>
              {companySettings.posLayoutModel === 'ed' ? 'Modelo Ed (Teclas)' : 'Modelo Nati (Touch)'}
            </span>
          </div>

          {/* Theme Toggle Button (Dia / Noite) */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 transition-colors"
            title={theme === 'dark' ? 'Mudar para Tema Claro (Dia)' : 'Mudar para Tema Escuro (Noite)'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-cyan-300" />}
          </button>

          {/* Guide Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Manual Operacional e Instruções Passo a Passo"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Manual</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="Abrir Central de Notificações e Alertas"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile & Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser?.name || 'Utilizador'}
                className="w-7 h-7 rounded-full object-cover border border-slate-700"
              />
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-slate-200 leading-tight">
                  {currentUser?.name}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {isAdmin ? 'Gestor Geral' : activeStore.name}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800 mb-3">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                    alt={currentUser?.name || 'Utilizador'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
                  />
                  <div className="overflow-hidden">
                    <span className="block font-bold text-xs text-white truncate">
                      {currentUser?.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate">
                      {currentUser?.email}
                    </span>
                    <span
                      className={`inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isAdmin
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {isAdmin ? 'Gestor Geral' : activeStore.code}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 mb-3 text-xs text-slate-300">
                  <div className="p-2.5 bg-slate-950/60 rounded-xl space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Loja Activa:</span>
                      <strong className="text-slate-200">{isAdmin ? 'Todas as Filiais' : activeStore.name}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Desconto Máximo:</span>
                      <strong className="text-emerald-400">
                        {currentUser?.permissions.canApplyDiscount ? `${currentUser.permissions.maxDiscountPercent}%` : '0%'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estornos / Cancelamentos:</span>
                      <strong className={currentUser?.permissions.canCancelSales ? 'text-emerald-400' : 'text-slate-500'}>
                        {currentUser?.permissions.canCancelSales ? 'Autorizado' : 'Não autorizado'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <button
                    onClick={toggleSimulatedOffline}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-slate-800 text-slate-300"
                  >
                    <span>Modo Offline</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isSimulatedOffline
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isSimulatedOffline ? 'Activo' : 'Inactivo'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Terminar Sessão (Sair)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
