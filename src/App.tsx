import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { AdminApp } from './components/admin/AdminApp';
import { SellerApp } from './components/seller/SellerApp';
import { StepByStepGuideModal } from './components/common/StepByStepGuideModal';
import { NotificationManagerModal } from './components/common/NotificationManagerModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { Loader2, ShoppingCart } from 'lucide-react';

function MainRouter() {
  const { currentUser, isAuthenticated, isAuthLoading } = useApp();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleOpenGuide = () => {
    setIsGuideOpen(true);
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
  };

  // 1. Loading screen while verifying persistent session token
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#06101e] flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-950/50 mb-4 animate-pulse">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <h2 className="text-base font-black tracking-tight text-white">SL Vendas</h2>
        </div>
        <p className="text-xs text-slate-400 font-medium">A validar sessão com a base de dados central...</p>
      </div>
    );
  }

  // 2. Strict Access Control: If unauthenticated, show LoginScreen only (no stores or sales visible)
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-[#041611]' : 'bg-[#071326]'}`}>
      {/* Universal Top Header with Role Indicator, Sync Status, Maputo Clock, Notifications & Logout */}
      <Header
        onOpenGuide={handleOpenGuide}
        onOpenNotifications={handleOpenNotifications}
      />

      {/* Main View: Green Executive Dashboard for Gestor Geral, Deep Blue App for Vendedor */}
      {isAdmin ? (
        <AdminApp
          onOpenGuide={handleOpenGuide}
          onOpenNotifications={handleOpenNotifications}
        />
      ) : (
        <SellerApp
          onOpenGuide={handleOpenGuide}
          onOpenNotifications={handleOpenNotifications}
        />
      )}

      {/* Global Notifications and Alerts Manager Modal */}
      <NotificationManagerModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Global Operational Manual & Step-by-Step Guide Modal */}
      <StepByStepGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
