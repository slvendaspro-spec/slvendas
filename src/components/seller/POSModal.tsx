import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PaymentMethod, Sale } from '../../types';
import { formatMZN } from '../../utils/formatters';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';
import { SangriaModal } from '../pos/SangriaModal';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  ScanBarcode,
  Camera,
  ArrowDownCircle,
  ArrowUpCircle,
  Keyboard,
  Grid,
  List,
  Sparkles,
  Lock,
} from 'lucide-react';

interface POSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: (sale: Sale) => void;
  initialProduct?: Product;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const POSModal: React.FC<POSModalProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
  initialProduct,
}) => {
  const {
    products,
    currentUser,
    activeStore,
    stores,
    users,
    createSale,
    customers,
    addCustomer,
    companySettings,
    playAudioFeedback,
  } = useApp();

  // Active cashier layout model from companySettings (Admin restricted)
  const activeLayoutModel: 'nati' | 'ed' = companySettings.posLayoutModel || 'nati';

  const [selectedStoreId, setSelectedStoreId] = useState(activeStore.id);
  const [selectedSellerId, setSelectedSellerId] = useState(currentUser?.id || '');
  const [cart, setCart] = useState<CartItem[]>(() => {
    return initialProduct ? [{ product: initialProduct, quantity: 1 }] : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [discountMZN, setDiscountMZN] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [paymentRef, setPaymentRef] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals for Camera Scanning and Sangria
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [sangriaType, setSangriaType] = useState<'sangria' | 'suprimento'>('sangria');

  // Quick Price Check modal for Modelo Ed (F9)
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);

  // Laser scanner search input ref for Modelo Ed auto-focus
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, activeLayoutModel]);

  // Keyboard Shortcuts Handler for Modelo Ed (and universal)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Nova Venda (Clear Cart)
      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
        setSearchTerm('');
        setErrorMsg(null);
        searchInputRef.current?.focus();
        playAudioFeedback('beep');
      }
      // F3: Focus Barcode / Search
      else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F4: Finalizar Venda
      else if (e.key === 'F4') {
        e.preventDefault();
        handleCheckout();
      }
      // F7: Sangria
      else if (e.key === 'F7') {
        e.preventDefault();
        setSangriaType('sangria');
        setShowSangriaModal(true);
      }
      // F8: Suprimento
      else if (e.key === 'F8') {
        e.preventDefault();
        setSangriaType('suprimento');
        setShowSangriaModal(true);
      }
      // F9: Quick Price Check
      else if (e.key === 'F9') {
        e.preventDefault();
        if (searchTerm.trim()) {
          const match = products.find(
            (p) =>
              p.barcode === searchTerm.trim() ||
              p.code.toLowerCase() === searchTerm.trim().toLowerCase() ||
              p.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
          );
          if (match) {
            setQuickPriceProduct(match);
            playAudioFeedback('beep');
          }
        }
      }
      // Escape: Close or Clear
      else if (e.key === 'Escape') {
        if (showCameraScanner) {
          setShowCameraScanner(false);
        } else if (showSangriaModal) {
          setShowSangriaModal(false);
        } else if (quickPriceProduct) {
          setQuickPriceProduct(null);
        } else if (cart.length > 0) {
          if (window.confirm('Deseja cancelar esta venda em aberto?')) {
            setCart([]);
          }
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cart, products, searchTerm, activeLayoutModel]);

  if (!isOpen || !currentUser) return null;

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getProductMaxStock = (prod: Product) => {
    if (selectedStoreId && prod.stockByStore && prod.stockByStore[selectedStoreId] !== undefined) {
      return prod.stockByStore[selectedStoreId];
    }
    return prod.stockQuantity;
  };

  const addToCart = (product: Product, qty: number = 1) => {
    setErrorMsg(null);
    const maxStock = getProductMaxStock(product);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + qty > maxStock) {
          setErrorMsg(`Stock máximo disponível nesta loja para ${product.name} é ${maxStock} ${product.unit || 'un'}.`);
          playAudioFeedback('alert');
          return prev;
        }
        playAudioFeedback('beep');
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      } else {
        if (maxStock < qty) {
          setErrorMsg(`Produto ${product.name} está esgotado nesta loja.`);
          playAudioFeedback('alert');
          return prev;
        }
        playAudioFeedback('beep');
        return [...prev, { product, quantity: qty }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMsg(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const maxStock = getProductMaxStock(item.product);
            const nextQty = item.quantity + delta;
            if (nextQty > maxStock) {
              setErrorMsg(`Stock máximo atingido nesta loja (${maxStock} ${item.product.unit || 'un'}).`);
              playAudioFeedback('alert');
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode scanned from Camera Scanner
  const handleBarcodeScanned = (scannedCode: string) => {
    setShowCameraScanner(false);
    const codeClean = scannedCode.trim();
    const matchedProduct = products.find(
      (p) =>
        p.barcode === codeClean ||
        p.code.toLowerCase() === codeClean.toLowerCase() ||
        p.id === codeClean
    );

    if (matchedProduct) {
      addToCart(matchedProduct, 1);
      setErrorMsg(null);
    } else {
      setErrorMsg(`Nenhum produto cadastrado com o código "${codeClean}".`);
      playAudioFeedback('alert');
    }
  };

  // Direct barcode input submit (Enter pressed on laser scan)
  const handleBarcodeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const term = searchTerm.trim();
    // Look for exact barcode match first
    const exactBarcodeMatch = products.find(
      (p) => p.barcode === term || p.code.toLowerCase() === term.toLowerCase()
    );

    if (exactBarcodeMatch) {
      addToCart(exactBarcodeMatch, 1);
      setSearchTerm('');
      searchInputRef.current?.focus();
    } else if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0], 1);
      setSearchTerm('');
      searchInputRef.current?.focus();
    } else if (filteredProducts.length === 0) {
      setErrorMsg(`Nenhum produto encontrado com o código "${term}".`);
      playAudioFeedback('alert');
    }
  };

  const subtotal = cart.reduce((acc, it) => acc + it.product.sellingPrice * it.quantity, 0);
  const total = Math.max(0, subtotal - discountMZN);
  const change = paidAmount > total ? paidAmount - total : 0;

  const handleCheckout = () => {
    setErrorMsg(null);
    if (cart.length === 0) {
      setErrorMsg('Adicione pelo menos um produto ao carrinho antes de finalizar.');
      playAudioFeedback('alert');
      return;
    }

    // Validate max discount permission
    if (discountMZN > 0) {
      if (!currentUser.permissions.canApplyDiscount) {
        setErrorMsg('O seu utilizador não tem permissão para conceder descontos.');
        playAudioFeedback('alert');
        return;
      }
      const discountPercent = (discountMZN / subtotal) * 100;
      if (discountPercent > currentUser.permissions.maxDiscountPercent) {
        setErrorMsg(
          `O desconto excede o seu limite máximo permitido de ${currentUser.permissions.maxDiscountPercent}%.`
        );
        playAudioFeedback('alert');
        return;
      }
    }

    // Submit sale
    const result = createSale({
      items: cart.map((it) => ({ product: it.product, quantity: it.quantity })),
      discount: discountMZN,
      paymentMethod,
      paymentRef: paymentRef || (paymentMethod === 'mpesa' ? `MP-${Date.now().toString().slice(-6)}` : undefined),
      paidAmount: paymentMethod === 'dinheiro' && paidAmount > 0 ? paidAmount : total,
      customerName: customerName.trim() || 'Cliente Balcão',
      storeId: selectedStoreId,
      sellerId: selectedSellerId,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Erro ao concluir venda.');
      playAudioFeedback('alert');
      return;
    }

    if (result.sale) {
      if (customerPhone && customerName !== 'Cliente Balcão') {
        const existingCust = customers.find((c) => c.phone === customerPhone);
        if (!existingCust) {
          addCustomer({
            name: customerName,
            phone: customerPhone,
          });
        }
      }

      playAudioFeedback('success');
      onSaleCompleted(result.sale);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-cyan-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* ========================================================= */}
        {/* TOP BAR: Store selector, Model Badge & Quick Actions */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 bg-slate-950 border-b border-cyan-950 gap-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white shadow-md ${
              activeLayoutModel === 'ed' ? 'bg-amber-600' : 'bg-cyan-600'
            }`}>
              {activeLayoutModel === 'ed' ? <Keyboard className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-100 text-sm sm:text-base">
                  Terminal de Caixa &bull; {activeStore.name}
                </h3>

                {/* Cashier Model Badge (Admin Restricted) */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${
                    activeLayoutModel === 'ed'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  }`}
                  title="Configurado exclusivamente pelo Administrador Geral"
                >
                  <Lock className="w-3 h-3 opacity-70" />
                  <span>{activeLayoutModel === 'ed' ? 'Modelo Ed (Hiper / Teclas)' : 'Modelo Nati (Touch & Grade)'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Store Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Loja:</span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => {
                      const newStId = e.target.value;
                      setSelectedStoreId(newStId);
                      const matchedSeller = users.find((u) => u.storeId === newStId);
                      if (matchedSeller) setSelectedSellerId(matchedSeller.id);
                    }}
                    className="bg-transparent text-xs text-cyan-300 font-bold focus:outline-none cursor-pointer"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seller Selector */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Operador:</span>
                  <select
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="bg-transparent text-xs text-emerald-300 font-bold focus:outline-none cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                        {u.name} ({u.role === 'admin' ? 'Gestor Geral' : u.storeName || 'Vendedor'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Top Operational Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Camera Barcode Scanner Button */}
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Digitalizar Código de Barras com a Câmara do Dispositivo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ler com Câmara</span>
            </button>

            {/* Sangria Button */}
            <button
              type="button"
              onClick={() => {
                setSangriaType('sangria');
                setShowSangriaModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Efetuar Sangria de Caixa (Retirada de Dinheiro)"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Sangria</span>
            </button>

            {/* Suprimento Button */}
            <button
              type="button"
              onClick={() => {
                setSangriaType('suprimento');
                setShowSangriaModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Efetuar Suprimento de Caixa (Fundo de Troco)"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Suprimento</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-rose-950/90 border-b border-rose-800 text-rose-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* POS MAIN BODY: MODELO NATI vs MODELO ED */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {activeLayoutModel === 'ed' ? (
            /* ===================================================== */
            /* MODELO ED: HIPERMERCADO / ALTA DENSIDADE & LASER      */
            /* ===================================================== */
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-[#070d14] p-3 sm:p-4 overflow-hidden">
              {/* Laser Search Bar with auto-focus */}
              <form onSubmit={handleBarcodeSearchSubmit} className="pb-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3.5 top-3 w-4 h-4 text-amber-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="[F3] Passe o leitor de laser óptico ou digite o código e prima ENTER..."
                    className="w-full bg-[#0c1622] border-2 border-amber-500/60 rounded-xl pl-10 pr-20 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 font-mono focus:outline-none focus:border-amber-400 shadow-inner"
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] bg-slate-800 border border-slate-700 text-amber-300 font-mono px-1.5 py-0.5 rounded">
                    ENTER = Adicionar
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Adicionar
                </button>
              </form>

              {/* High-density catalog table view (Modelo Ed) */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição do Produto</th>
                      <th className="py-2.5 px-2 text-right">Preço</th>
                      <th className="py-2.5 px-2 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredProducts.map((prod) => {
                      const localStock = getProductMaxStock(prod);
                      const inCart = cart.find((it) => it.product.id === prod.id);
                      const isOutOfStock = localStock <= 0;

                      return (
                        <tr
                          key={prod.id}
                          onClick={() => !isOutOfStock && addToCart(prod, 1)}
                          className={`hover:bg-amber-950/20 transition-colors cursor-pointer ${
                            isOutOfStock ? 'opacity-50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-cyan-400 font-bold text-[11px]">
                            {prod.code}
                            {prod.barcode && (
                              <span className="block text-[9px] text-slate-500 font-normal">
                                {prod.barcode}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-white block truncate max-w-xs">
                              {prod.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{prod.category}</span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-amber-300 text-xs">
                            {formatMZN(prod.sellingPrice)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                localStock <= 0
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : localStock <= prod.minStock
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {localStock}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(prod, 1);
                              }}
                              disabled={isOutOfStock}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                            >
                              {inCart ? `+1 (${inCart.quantity})` : '+ Lançar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Function key guide ribbon at the bottom of Modelo Ed */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-[10px]">
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-amber-400 font-mono">[F2]</span>
                  <span className="text-slate-300">Nova Venda</span>
                </div>
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-amber-400 font-mono">[F3]</span>
                  <span className="text-slate-300">Focar Laser</span>
                </div>
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-emerald-400 font-mono">[F4]</span>
                  <span className="text-slate-300">Finalizar</span>
                </div>
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-rose-400 font-mono">[F7]</span>
                  <span className="text-slate-300">Sangria</span>
                </div>
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-emerald-400 font-mono">[F8]</span>
                  <span className="text-slate-300">Suprimento</span>
                </div>
                <div className="p-1 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="block font-black text-cyan-400 font-mono">[ESC]</span>
                  <span className="text-slate-300">Cancelar</span>
                </div>
              </div>
            </div>
          ) : (
            /* ===================================================== */
            /* MODELO NATI: TOUCHSCREEN COM FOTOS & GRADE VISUAL     */
            /* ===================================================== */
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-[#06121f] p-3 sm:p-4 overflow-hidden">
              {/* Search & Category Pills */}
              <div className="space-y-2.5 pb-2.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-cyan-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Toque para pesquisar por nome, categoria ou código de barras..."
                    className="w-full bg-[#0a1e34] border border-cyan-800/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                  />
                </div>

                {/* Categories Horizontal Scroller */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all font-semibold ${
                        selectedCategory === cat
                          ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/50'
                          : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat === 'all' ? 'Todos os Produtos' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid with Images (Touch Friendly) */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1">
                {filteredProducts.map((prod) => {
                  const inCart = cart.find((it) => it.product.id === prod.id);
                  const localStock = getProductMaxStock(prod);
                  const isOutOfStock = localStock <= 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                        isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                          : 'bg-[#0a1e36] border-cyan-900/60 hover:border-cyan-400 hover:bg-[#0e2746] cursor-pointer active:scale-95 shadow-md'
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="h-24 w-full bg-slate-900 rounded-xl overflow-hidden relative mb-2 flex items-center justify-center">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <ShoppingCart className="w-8 h-8 text-cyan-600/40" />
                        )}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/80 text-cyan-300">
                          {prod.code}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-white line-clamp-2 leading-tight">
                          {prod.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Stock: {localStock} {prod.unit || 'un'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-cyan-900/60 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-cyan-300">
                          {formatMZN(prod.sellingPrice)}
                        </span>
                        {inCart ? (
                          <span className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md animate-scaleIn">
                            {inCart.quantity}
                          </span>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-cyan-600/30 text-cyan-300 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* RIGHT COLUMN: CART, CUSTOMER & CHECKOUT (UNIVERSAL)       */}
          {/* ========================================================= */}
          <div className="w-full lg:w-96 flex flex-col bg-slate-950 p-4 overflow-y-auto shrink-0 border-t lg:border-t-0 border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold cursor-pointer"
                >
                  Limpar Tudo
                </button>
              )}
            </h4>

            {/* Cart Items List */}
            <div className="flex-1 max-h-48 overflow-y-auto divide-y divide-slate-800/80 py-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  Nenhum produto adicionado à venda.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-200 block truncate">
                        {item.product.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-cyan-400 font-bold font-mono">
                          {formatMZN(item.product.sellingPrice)}
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-slate-400 font-mono">
                          Total: {(item.product.sellingPrice * item.quantity).toFixed(2)} MT
                        </span>
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer & Discount Fields */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">Cliente:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Contacto:
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+258 84..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {currentUser.permissions.canApplyDiscount && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Desconto (MZN):
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Máx: {currentUser.permissions.maxDiscountPercent}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountMZN || ''}
                    onChange={(e) => setDiscountMZN(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                  Método de Pagamento:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMethod === 'mpesa'
                        ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                    <span>M-Pesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('emola')}
                    className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMethod === 'emola'
                        ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>e-Mola</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMethod === 'dinheiro'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dinheiro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao')}
                    className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMethod === 'cartao'
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cartão / POS</span>
                  </button>
                </div>
              </div>

              {/* Extra payment fields */}
              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Código de Confirmação SMS (Opcional):
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Ex: MP261015-8842"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              )}

              {paymentMethod === 'dinheiro' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Valor Entregue:
                    </label>
                    <input
                      type="number"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder={total.toString()}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">
                      Troco a Devolver:
                    </label>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-400 font-mono">
                      {formatMZN(change)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Breakdown and Checkout Button */}
            <div className="pt-4 mt-auto border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono">{formatMZN(subtotal)}</span>
              </div>
              {discountMZN > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Desconto:</span>
                  <span className="font-mono">- {formatMZN(discountMZN)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-1">
                <span>TOTAL A PAGAR:</span>
                <span className="text-emerald-400 text-base font-mono">{formatMZN(total)}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>[F4] Finalizar e Emitir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <CameraBarcodeScanner
          onDetected={handleBarcodeScanned}
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
