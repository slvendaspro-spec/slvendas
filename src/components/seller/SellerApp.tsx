import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Sale } from '../../types';
import { formatMZN } from '../../utils/formatters';
import { POSModal } from './POSModal';
import { ReceiptModal } from '../common/ReceiptModal';
import {
  ShoppingCart,
  Search,
  ScanBarcode,
  TrendingUp,
  Package,
  Users,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Home,
  CheckCircle2,
  MapPin,
  Bell,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  User,
  Filter,
  Eye,
  LogOut,
  Smartphone,
} from 'lucide-react';
import { ChangePhoneModal } from '../common/ChangePhoneModal';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { SangriaModal } from '../pos/SangriaModal';
import { Camera, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface SellerAppProps {
  onOpenGuide: () => void;
  onOpenNotifications: () => void;
}

type TabType = 'home' | 'products' | 'clients' | 'sales' | 'profile';

export const SellerApp: React.FC<SellerAppProps> = ({ onOpenGuide, onOpenNotifications }) => {
  const {
    currentUser,
    activeStore,
    products,
    sales,
    customers,
    notifications,
    addCustomer,
    isSimulatedOffline,
    playAudioFeedback,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isPOSOpen, setIsPOSOpen] = useState(false);
  const [selectedProductForPOS, setSelectedProductForPOS] = useState<Product | undefined>(undefined);
  const [activeReceipt, setActiveReceipt] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);
  const [showChangePhoneModal, setShowChangePhoneModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [sangriaType, setSangriaType] = useState<'sangria' | 'suprimento'>('sangria');

  if (!currentUser) return null;

  // Filter sales for this store
  const storeSales = sales.filter((s) => s.storeId === activeStore.id && s.status === 'paid');

  // Calculate metrics
  const todaySalesAmount = storeSales.reduce((acc, s) => acc + s.total, 0);
  const monthSalesAmount = 48730 + todaySalesAmount; // Projected monthly base
  const itemsSold = storeSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0),
    0
  ) + 80;
  const estimatedProfit = storeSales.reduce((acc, s) => acc + s.profit, 0) + 14000;

  const targetPercent = Math.min(
    100,
    Math.round((todaySalesAmount / (activeStore.dailyTarget || 15000)) * 100)
  );

  const handleOpenPOS = (product?: Product) => {
    setSelectedProductForPOS(product);
    setIsPOSOpen(true);
  };

  const handleSaleCompleted = (sale: Sale) => {
    setActiveReceipt(sale);
  };

  const simulateBarcodeScan = () => {
    setScannerActive(true);
    playAudioFeedback('beep');
    setScannerNotice('A activar leitor óptico / câmara do dispositivo...');

    setTimeout(() => {
      // Pick a random product from inventory
      const randomProd = products[Math.floor(Math.random() * products.length)];
      setScannerNotice(`Código lido: ${randomProd.barcode} - ${randomProd.name}`);
      playAudioFeedback('beep');

      setTimeout(() => {
        setScannerActive(false);
        setScannerNotice(null);
        handleOpenPOS(randomProd);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#071326] text-slate-100 flex flex-col pb-20 selection:bg-cyan-500 selection:text-white">
      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-3 sm:px-5 py-4 space-y-4">
        {/* Profile Card / Header matching Image 1 */}
        <div className="bg-gradient-to-r from-[#0d2242] to-[#112d58] border border-cyan-800/60 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-600/30 border-2 border-cyan-400 overflow-hidden flex items-center justify-center shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">
                {currentUser.name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-cyan-300">
                <span>Vendedor</span>
                <span>•</span>
                <span className="font-medium">{activeStore.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-cyan-700/50 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isSimulatedOffline ? 'Offline' : 'Online'}</span>
            </div>
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800 transition-colors"
              title="Notificações e Mensagens da Loja"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4 Metric Cards matching Image 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Vendas Hoje */}
          <div className="bg-[#0b1d38] border border-cyan-900/60 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Vendas Hoje</span>
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {formatMZN(todaySalesAmount)}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+ 32% (vs. ontem)</span>
              </div>
            </div>
          </div>

          {/* Total de Vendas */}
          <div className="bg-[#0b1d38] border border-cyan-900/60 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Total de Vendas</span>
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {formatMZN(monthSalesAmount)}
              </div>
              <span className="block mt-1 text-[10px] text-slate-400 font-medium">
                (este mês)
              </span>
            </div>
          </div>

          {/* Produtos Vendidos */}
          <div className="bg-[#0b1d38] border border-cyan-900/60 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Produtos Vendidos</span>
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {itemsSold}
              </div>
              <span className="block mt-1 text-[10px] text-slate-400 font-medium">
                (este mês)
              </span>
            </div>
          </div>

          {/* Lucro Estimado */}
          <div className="bg-[#0b1d38] border border-cyan-900/60 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">Lucro Estimado</span>
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-base sm:text-lg font-black text-white tracking-tight">
                {formatMZN(estimatedProfit)}
              </div>
              <span className="block mt-1 text-[10px] text-slate-400 font-medium">
                (este mês)
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar + Barcode Scanner Trigger */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar produto, código ou categoria..."
              className="w-full bg-[#0b1e38] border border-cyan-900/80 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />
          </div>
          <button
            onClick={() => setShowCameraScanner(true)}
            title="Digitalizar com a Câmara do Dispositivo"
            className="p-3 bg-[#0d2f5a] hover:bg-[#12417d] text-cyan-200 border border-cyan-700 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-5 h-5 text-cyan-400" />
            <span className="hidden sm:inline text-xs font-bold">Câmara</span>
          </button>
          <button
            onClick={simulateBarcodeScan}
            title="Simulador de Leitura Óptica"
            className="p-3 bg-[#0f2a4f] hover:bg-[#143768] text-cyan-300 border border-cyan-800 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ScanBarcode className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Simulated Notice */}
        {scannerNotice && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-500 rounded-xl text-xs text-cyan-200 flex items-center gap-2 animate-pulse">
            <ScanBarcode className="w-4 h-4 text-cyan-400" />
            <span>{scannerNotice}</span>
          </div>
        )}

        {/* Quick Action Grid (5 Buttons matching Image 1) */}
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => handleOpenPOS()}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-[#0e2c56] to-[#0a1e3b] hover:from-[#133d75] hover:to-[#0e2c56] border border-cyan-800/80 text-white shadow-lg transition-all active:scale-95 group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500 text-white mb-1.5 shadow-md shadow-cyan-900/50 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-center">Nova Venda</span>
            <span className="text-[9px] text-cyan-300 hidden sm:block">Registar venda</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a1e3b] hover:bg-[#0f2c54] border border-cyan-900/60 text-white shadow-md transition-all active:scale-95"
          >
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-300 mb-1.5 border border-cyan-800">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-center">Produtos</span>
            <span className="text-[9px] text-slate-400 hidden sm:block">Ver stock</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a1e3b] hover:bg-[#0f2c54] border border-cyan-900/60 text-white shadow-md transition-all active:scale-95"
          >
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-300 mb-1.5 border border-cyan-800">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-center">Clientes</span>
            <span className="text-[9px] text-slate-400 hidden sm:block">Gerir clientes</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a1e3b] hover:bg-[#0f2c54] border border-cyan-900/60 text-white shadow-md transition-all active:scale-95"
          >
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-300 mb-1.5 border border-cyan-800">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-center">Histórico</span>
            <span className="text-[9px] text-slate-400 hidden sm:block">Vendas do dia</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a1e3b] hover:bg-[#0f2c54] border border-cyan-900/60 text-white shadow-md transition-all active:scale-95"
          >
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-300 mb-1.5 border border-cyan-800">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-center">Mais</span>
            <span className="text-[9px] text-slate-400 hidden sm:block">Outras opções</span>
          </button>
        </div>

        {/* Tab 1: Home View */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Featured Products Section (Produtos em destaque) */}
            <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded bg-cyan-400 transform rotate-45" />
                  <h3 className="font-extrabold text-sm text-white">Produtos em destaque</h3>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Horizontal / Grid Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {products.slice(0, 4).map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#0d2242] border border-cyan-800/70 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-cyan-400 transition-all shadow-md group"
                  >
                    <div className="h-28 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-cyan-300">
                        {prod.code}
                      </span>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-white line-clamp-1">{prod.name}</h4>
                        <span className="block font-black text-cyan-400 text-xs mt-1">
                          {formatMZN(prod.sellingPrice)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-cyan-900/60">
                        <span className="text-[10px] text-cyan-200 font-medium">
                          Stock: {prod.stockByStore?.[activeStore.id] ?? prod.stockQuantity} {prod.unit || 'un'}
                        </span>
                        <button
                          onClick={() => handleOpenPOS(prod)}
                          title="Vender este produto"
                          className="w-7 h-7 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column Split: Últimas Vendas & Informação da Loja */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Últimas Vendas */}
              <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Clock className="w-4 h-4" />
                      <h3 className="font-bold text-sm text-white">Últimas vendas</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('sales')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                    >
                      Ver todas <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-cyan-950/80">
                    {storeSales.slice(0, 5).map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => setActiveReceipt(sale)}
                        className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-cyan-950/40 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-900/40 text-cyan-300 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block">
                              {sale.items[0]?.productName || 'Venda Diversa'}
                            </span>
                            <span className="text-[11px] font-semibold text-cyan-400">
                              {formatMZN(sale.total)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-[10px] text-slate-400">
                            {sale.createdAt.split(' ')[1] || '10:00'}
                          </span>
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Pago
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Informação da Loja + AI Bubble */}
              <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <MapPin className="w-4 h-4" />
                      <h3 className="font-bold text-sm text-white">Informação da loja</h3>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-100 text-sm">{activeStore.name}</h4>
                    <p className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {activeStore.address} — {activeStore.city}
                    </p>
                  </div>

                  {/* Daily Target Progress */}
                  <div className="mt-4 p-3 bg-[#0c2242] rounded-xl border border-cyan-800/60">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Vendas de hoje:</span>
                      <strong className="text-white">{formatMZN(todaySalesAmount)}</strong>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">Meta diária:</span>
                      <span className="text-cyan-300 font-semibold">
                        {formatMZN(activeStore.dailyTarget)}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-900">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${targetPercent}%` }}
                      />
                    </div>
                    <div className="text-right text-[10px] text-cyan-300 font-bold mt-1">
                      {targetPercent}% atingido
                    </div>
                  </div>
                </div>

                {/* Operational Desk Card */}
                <div className="p-3.5 bg-[#0d274c] border border-cyan-700/60 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">Balcão & Pagamentos Moçambique</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      MZN
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    <div className="p-1.5 rounded-xl bg-[#08182f] border border-cyan-900/60">
                      <span className="block font-bold text-rose-400">M-Pesa</span>
                      <span className="text-slate-400 text-[9px]">Vodacom</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#08182f] border border-cyan-900/60">
                      <span className="block font-bold text-amber-400">e-Mola</span>
                      <span className="text-slate-400 text-[9px]">Movitel</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-[#08182f] border border-cyan-900/60">
                      <span className="block font-bold text-emerald-400">Dinheiro</span>
                      <span className="text-slate-400 text-[9px]">Com Troco</span>
                    </div>
                  </div>
                  <button
                    onClick={onOpenGuide}
                    className="w-full py-1.5 px-3 rounded-xl bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/50 text-[11px] font-bold transition-colors text-center block"
                  >
                    Abrir Manual de Vendas e Procedimentos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Products Catalog */}
        {activeTab === 'products' && (
          <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
              <div>
                <h3 className="font-bold text-base text-white">Catálogo de Produtos e Stock</h3>
                <p className="text-xs text-slate-400">Stock disponível para venda em {activeStore.name}</p>
              </div>
              <button
                onClick={() => handleOpenPOS()}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Vender
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#0d2242] border border-cyan-800/60 rounded-xl p-3 flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-16 h-16 rounded-lg object-cover bg-slate-900 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-cyan-400 block">{prod.code}</span>
                      <h4 className="font-bold text-xs text-white line-clamp-1">{prod.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{prod.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-cyan-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
                      <span className="font-extrabold text-sm text-cyan-400">{formatMZN(prod.sellingPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const localStock = prod.stockByStore?.[activeStore.id] ?? prod.stockQuantity;
                        return (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              localStock <= 0
                                ? 'bg-rose-500/20 text-rose-300'
                                : localStock <= prod.minStock
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            Stock: {localStock} {prod.unit || 'un'}
                          </span>
                        );
                      })()}
                      <button
                        onClick={() => handleOpenPOS(prod)}
                        className="p-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Clients */}
        {activeTab === 'clients' && (
          <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
              <div>
                <h3 className="font-bold text-base text-white">Clientes Cadastrados</h3>
                <p className="text-xs text-slate-400">Histórico de compras e fidelização de clientes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customers.map((c) => (
                <div key={c.id} className="bg-[#0d2242] border border-cyan-800/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{c.name}</h4>
                      <span className="text-xs text-cyan-300">{c.phone}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Última visita: {c.lastVisit}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-cyan-900/60">
                    <span className="text-slate-400">Total Comprado:</span>
                    <strong className="text-emerald-400">{formatMZN(c.totalPurchases)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Sales History */}
        {activeTab === 'sales' && (
          <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60">
              <div>
                <h3 className="font-bold text-base text-white">Histórico de Vendas da Loja</h3>
                <p className="text-xs text-slate-400">Todas as transações concluídas em {activeStore.name}</p>
              </div>
            </div>

            <div className="divide-y divide-cyan-950/80">
              {storeSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => setActiveReceipt(sale)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-cyan-950/40 px-2 rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{sale.receiptNumber}</span>
                      <span className="text-xs text-slate-300 font-medium">({sale.customerName})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                    </p>
                    <span className="text-[10px] text-slate-500">{sale.createdAt} • {sale.paymentMethod.toUpperCase()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-white block">{formatMZN(sale.total)}</span>
                    <button className="text-[11px] text-cyan-400 hover:underline mt-1 flex items-center gap-1 justify-end">
                      <Eye className="w-3 h-3" /> Ver Recibo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-[#091b33] border border-cyan-900/60 rounded-2xl p-5 shadow-xl space-y-4 max-w-lg mx-auto">
            <div className="text-center pb-4 border-b border-cyan-900/60">
              <div className="w-20 h-20 rounded-full border-2 border-cyan-400 mx-auto overflow-hidden bg-slate-900 mb-2">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-extrabold text-lg text-white">{currentUser.name}</h3>
              <p className="text-xs text-slate-400">{currentUser.email} • {currentUser.phone}</p>
              <div className="mt-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowChangePhoneModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Alterar Número de Telemóvel (SMS)</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Permissões do Perfil:</h4>
              <div className="p-3 bg-[#0d2242] rounded-xl space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span>Conceder Descontos:</span>
                  <strong className={currentUser.permissions.canApplyDiscount ? 'text-emerald-400' : 'text-rose-400'}>
                    {currentUser.permissions.canApplyDiscount ? `Sim (Até ${currentUser.permissions.maxDiscountPercent}%)` : 'Não autorizado'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Cancelar Vendas / Estornos:</span>
                  <strong className={currentUser.permissions.canCancelSales ? 'text-emerald-400' : 'text-rose-400'}>
                    {currentUser.permissions.canCancelSales ? 'Autorizado' : 'Apenas Gestor Geral'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Relatórios Financeiros:</span>
                  <strong className={currentUser.permissions.canViewReports ? 'text-emerald-400' : 'text-rose-400'}>
                    {currentUser.permissions.canViewReports ? 'Acesso Total' : 'Restrito'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-cyan-900/60">
              <button
                onClick={() => logout()}
                className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão (Sair da Conta)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation Bar matching Image 1 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08182f]/95 border-t border-cyan-900/60 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'home' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'products' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Produtos</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'clients' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Clientes</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'sales' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Vendas</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'profile' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </div>
      </nav>

      {/* POS Modal */}
      <POSModal
        isOpen={isPOSOpen}
        onClose={() => setIsPOSOpen(false)}
        onSaleCompleted={handleSaleCompleted}
        initialProduct={selectedProductForPOS}
      />

      {/* Receipt Thermal Modal */}
      <ReceiptModal sale={activeReceipt} onClose={() => setActiveReceipt(null)} />

      {/* Change Phone Modal */}
      <ChangePhoneModal
        isOpen={showChangePhoneModal}
        onClose={() => setShowChangePhoneModal(false)}
      />

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <CameraBarcodeScanner
          onDetected={(barcode) => {
            setShowCameraScanner(false);
            const found = products.find((p) => p.barcode === barcode || p.code.toLowerCase() === barcode.toLowerCase());
            if (found) {
              handleOpenPOS(found);
            } else {
              setScannerNotice(`Código lido (${barcode}), mas não consta no catálogo.`);
              setTimeout(() => setScannerNotice(null), 3000);
            }
          }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {/* Sangria / Suprimento Modal */}
      {showSangriaModal && (
        <SangriaModal
          isOpen={showSangriaModal}
          onClose={() => setShowSangriaModal(false)}
          defaultType={sangriaType}
        />
      )}
    </div>
  );
};
