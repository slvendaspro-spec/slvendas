import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, User, Product, Sale, Expense, UserPermission } from '../../types';
import { formatMZN } from '../../utils/formatters';
import { maskPhoneNumber } from '../../utils/phoneUtils';
import { ReceiptModal } from '../common/ReceiptModal';
import { POSModal } from '../seller/POSModal';
import { ChangePhoneModal } from '../common/ChangePhoneModal';
import {
  LayoutDashboard,
  Store as StoreIcon,
  Users,
  Package,
  ShoppingCart,
  Boxes,
  DollarSign,
  BarChart3,
  UserCheck,
  Truck,
  Smartphone,
  Bell,
  Shield,
  Cloud,
  HelpCircle,
  LogOut,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Check,
  MapPin,
  FileSpreadsheet,
  Lock,
  ArrowLeft,
  ChevronRight,
  Sliders,
  Printer,
  Calendar,
  Building2,
  Coins,
  Percent,
  Phone,
  Mail,
  FileText,
  BadgeAlert,
  ChevronDown,
  Menu,
  X,
  KeyRound,
  RotateCcw,
  Camera,
  Crown,
  Briefcase,
  UserX,
  Sun,
  Moon,
  Keyboard,
  Grid,
  Leaf,
  UserMinus,
  ShieldCheck,
} from 'lucide-react';
import { SensitiveActionModal } from '../common/SensitiveActionModal';
import { ProductModal } from './ProductModal';
import { ProductCatalogTable } from './ProductCatalogTable';

interface AdminAppProps {
  onOpenGuide: () => void;
  onOpenNotifications: () => void;
}

export type AdminTab =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'stock'
  | 'stores'
  | 'reports'
  | 'finance'
  | 'sellers'
  | 'settings'
  | 'security';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'alert' | 'info';
  title: string;
  message: string;
}

export const AdminApp: React.FC<AdminAppProps> = ({ onOpenGuide, onOpenNotifications }) => {
  const {
    stores,
    users,
    products,
    sales,
    expenses,
    notifications,
    devices,
    auditLogs,
    customers,
    suppliers,
    currentUser,
    addStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    addUser,
    deleteUser,
    toggleUserStatus,
    resetUserPasswordByAdmin,
    updateUserPermissions,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    cancelSale,
    addExpense,
    revokeDevice,
    authorizeDevice,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    exportBackupJson,
    importBackupJson,
    resetToDemoData,
    playAudioFeedback,
    logout,
    companySettings,
    updateCompanySettings,
    theme,
    toggleTheme,
    setThemeMode,
    resetAndSetupNewAccounts,
  } = useApp();

  // Navigation State
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Global Store Filter for the entire Dashboard
  const [selectedGlobalStore, setSelectedGlobalStore] = useState<string>('all');

  // Modals & Interactive States
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showChangePhoneModal, setShowChangePhoneModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState<Product | null>(null);
  const [replenishStoreId, setReplenishStoreId] = useState<string>('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('Vendedor@123');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showCashRegisterModal, setShowCashRegisterModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Account Wipe & Reinitialization State
  const [showWipeAccountsModal, setShowWipeAccountsModal] = useState(false);
  const [wipeConfirmPhrase, setWipeConfirmPhrase] = useState('');
  const [isWipingAccounts, setIsWipingAccounts] = useState(false);
  const [newManagerData, setNewManagerData] = useState({
    name: 'Gerente Operacional',
    email: 'gerente@slvendas.co.mz',
    phone: '+258 84 333 4444',
    password: 'Gerente@123',
    role: 'manager' as const,
    storeId: stores[0]?.id || '',
  });
  const [newCashierData, setNewCashierData] = useState({
    name: 'Operador de Caixa 1',
    email: 'caixa1@slvendas.co.mz',
    phone: '+258 84 555 6666',
    password: 'Caixa@123',
    role: 'seller' as const,
    storeId: stores[0]?.id || '',
  });

  // Sensitive Section Protection State
  const [sensitiveTarget, setSensitiveTarget] = useState<{
    actionTitle: string;
    actionDescription?: string;
    onConfirm: () => void;
  } | null>(null);

  const requestSensitiveAccess = (
    actionTitle: string,
    actionDescription: string | undefined,
    onConfirm: () => void
  ) => {
    setSensitiveTarget({ actionTitle, actionDescription, onConfirm });
  };

  const handleSelectTab = (tab: AdminTab) => {
    if (tab === 'settings') {
      requestSensitiveAccess(
        'Configurações do Sistema',
        'Acesso a parâmetros fiscais, cópias de segurança JSON e restauro de dados.',
        () => setActiveTab('settings')
      );
    } else {
      setActiveTab(tab);
    }
  };

  const handleOpenCashRegister = () => {
    requestSensitiveAccess(
      'Fecho de Caixa e Reconciliação',
      'Operação de conferência de numerário, M-Pesa e e-Mola das lojas.',
      () => setShowCashRegisterModal(true)
    );
  };

  // Search & Filtering State within views
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'critical' | 'sensitive' | 'info'>('all');

  // Interactive Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Guard
  if (!currentUser) return null;

  // -------------------------------------------------------------
  // DYNAMIC CALCULATIONS BASED ON GLOBAL STORE SELECTION
  // -------------------------------------------------------------
  const filteredSales = useMemo(() => {
    if (selectedGlobalStore === 'all') return sales;
    return sales.filter((s) => s.storeId === selectedGlobalStore);
  }, [sales, selectedGlobalStore]);

  const paidSales = useMemo(() => {
    return filteredSales.filter((s) => s.status === 'paid');
  }, [filteredSales]);

  const filteredExpenses = useMemo(() => {
    if (selectedGlobalStore === 'all') return expenses;
    return expenses.filter((e) => e.storeId === selectedGlobalStore);
  }, [expenses, selectedGlobalStore]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedGlobalStore !== 'all' && u.storeId !== selectedGlobalStore && u.role !== 'admin') {
        return false;
      }
      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) {
        return false;
      }
      if (userSearchTerm.trim()) {
        const term = userSearchTerm.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(term);
        const matchesEmail = u.email.toLowerCase().includes(term);
        const matchesPhone = u.phone?.toLowerCase().includes(term);
        const matchesStore = u.storeName?.toLowerCase().includes(term);
        const matchesRole = (u.role === 'admin' ? 'gestor geral administrador' : u.role === 'manager' ? 'gerente' : 'vendedor').includes(term);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesStore && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [users, selectedGlobalStore, userStatusFilter, userSearchTerm]);

  const todaySales = paidSales.reduce((acc, s) => acc + s.total, 0);
  const todayProfit = paidSales.reduce((acc, s) => acc + s.profit, 0);
  const todayCosts = paidSales.reduce((acc, s) => acc + s.costTotal, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const estimatedNetProfit = todayProfit - totalExpenses;

  const totalProductsSold = paidSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0),
    0
  );

  const onlineStoresCount = stores.filter((s) => s.status === 'online').length;
  const activeSellersCount = users.filter((u) => u.status === 'active' && u.role === 'seller').length;
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStock && p.stockQuantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;
  const totalStockItems = products.reduce((acc, p) => acc + p.stockQuantity, 0);

  // Fecho de Caixa (Cash Register calculations for current store selection)
  const cashRegisterSummary = useMemo(() => {
    const mpesa = paidSales.filter((s) => s.paymentMethod === 'mpesa').reduce((a, s) => a + s.total, 0);
    const emola = paidSales.filter((s) => s.paymentMethod === 'emola').reduce((a, s) => a + s.total, 0);
    const cash = paidSales.filter((s) => s.paymentMethod === 'dinheiro').reduce((a, s) => a + s.total, 0);
    const pos = paidSales.filter((s) => s.paymentMethod === 'cartao' || s.paymentMethod === 'transferencia').reduce((a, s) => a + s.total, 0);
    return {
      mpesa,
      emola,
      cash,
      pos,
      totalRevenue: mpesa + emola + cash + pos,
      expensesTotal: totalExpenses,
      netCashBalance: cash - totalExpenses,
    };
  }, [paidSales, totalExpenses]);

  // Selected Store Details
  const selectedStoreObj = useMemo(() => {
    if (selectedGlobalStore === 'all') return null;
    return stores.find((s) => s.id === selectedGlobalStore) || null;
  }, [stores, selectedGlobalStore]);

  // Form states for new entities
  const [newStore, setNewStore] = useState({
    code: `LOJA-0${stores.length + 1}`,
    name: '',
    city: 'Quelimane',
    province: 'Zambézia',
    address: '',
    phone: '+258 84 ',
    email: '',
    managerName: '',
    status: 'online' as const,
    dailyTarget: 15000,
    currency: 'MZN',
    taxRate: 16,
    coordinates: { lat: -17.875, lng: 36.885 },
  });



  const [stockAddAmount, setStockAddAmount] = useState(10);
  const [stockAddCost, setStockAddCost] = useState(0);

  const PRESET_USER_AVATARS = [
    { label: 'Sandra Félix (Feminino)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
    { label: 'Carlos Nhantumbo (Masculino)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
    { label: 'Ana Paula (Feminino)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80' },
    { label: 'Mateus Cossa (Masculino)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
    { label: 'Fátima Ibraimo (Feminino)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
    { label: 'Alberto Machava (Executivo)', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80' },
  ];

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '+258 84 ',
    role: 'seller' as 'admin' | 'seller' | 'manager',
    storeId: stores[0]?.id || '',
    storeName: stores[0]?.name || '',
    status: 'active' as const,
    password: 'Vendedor@123',
    permissions: {
      canApplyDiscount: true,
      maxDiscountPercent: 10,
      canCancelSales: false,
      canViewReports: false,
      canEditStock: false,
    },
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  });

  const [newExpense, setNewExpense] = useState({
    storeId: stores[0]?.id || '',
    storeName: stores[0]?.name || '',
    category: 'mercadoria' as const,
    description: '',
    amount: 500,
    date: new Date().toLocaleDateString('pt-MZ'),
    createdBy: currentUser.name,
  });

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.name.trim() || !newStore.address.trim()) {
      addToast('error', 'Campos Incompletos', 'Indique o nome e endereço da loja.');
      return;
    }
    addStore({
      ...newStore,
      currency: newStore.currency || 'MZN',
      taxRate: newStore.taxRate !== undefined ? Number(newStore.taxRate) : 16,
    });
    setShowAddStoreModal(false);
    addToast('success', 'Loja Criada', `A filial "${newStore.name}" foi cadastrada com sucesso!`);
    playAudioFeedback('success');
    setNewStore({
      code: `LOJA-0${stores.length + 2}`,
      name: '',
      city: 'Quelimane',
      province: 'Zambézia',
      address: '',
      phone: '+258 84 ',
      email: '',
      managerName: '',
      status: 'online',
      dailyTarget: 15000,
      currency: 'MZN',
      taxRate: 16,
      coordinates: { lat: -17.875, lng: 36.885 },
    });
  };

  const handleUpdateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore || !editingStore.name.trim()) return;
    updateStore(editingStore);
    addToast('success', 'Parâmetros Salvos', `Dados da loja "${editingStore.name}" atualizados com sucesso.`);
    setEditingStore(null);
    playAudioFeedback('success');
  };

  const handleToggleStoreStatus = (store: Store) => {
    toggleStoreStatus(store.id);
    const nextStatus = store.status === 'online' ? 'suspensa' : 'reativada';
    addToast('info', 'Estado Alterado', `A filial "${store.name}" foi ${nextStatus}.`);
    playAudioFeedback('beep');
  };

  const handleConfirmDeleteStore = () => {
    if (!storeToDelete) return;
    const name = storeToDelete.name;
    deleteStore(storeToDelete.id);
    setStoreToDelete(null);
    if (selectedGlobalStore === storeToDelete.id) {
      setSelectedGlobalStore('all');
    }
    addToast('alert', 'Loja Removida', `A loja "${name}" foi removida da rede ativa.`);
    playAudioFeedback('alert');
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setShowAddProductModal(true);
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = (prod: Product) => {
    deleteProduct(prod.id);
    addToast('alert', 'Artigo Removido', `O produto "${prod.name}" (${prod.code}) foi removido do catálogo central.`);
    playAudioFeedback('alert');
  };

  const handleOpenStockReplenish = (prod: Product, storeId?: string) => {
    setShowAddStockModal(prod);
    setReplenishStoreId(storeId || stores[0]?.id || '');
    setStockAddAmount(10);
    setStockAddCost(prod.costPrice);
  };

  const handleAddStockSubmit = () => {
    if (!showAddStockModal) return;
    const targetStore = stores.find((s) => s.id === replenishStoreId);
    addStock(
      showAddStockModal.id,
      stockAddAmount,
      stockAddCost > 0 ? stockAddCost : undefined,
      undefined,
      replenishStoreId || undefined
    );
    addToast(
      'success',
      'Entrada de Stock Registada',
      `Adicionadas ${stockAddAmount} unidades a "${showAddStockModal.name}"${
        targetStore ? ` na filial ${targetStore.name} (${targetStore.code})` : ''
      }.`
    );
    setShowAddStockModal(null);
    setReplenishStoreId('');
    playAudioFeedback('success');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) {
      addToast('error', 'Dados Incompletos', 'O nome e o correio eletrónico são obrigatórios.');
      return;
    }
    const store = stores.find((s) => s.id === newUser.storeId);
    addUser(
      {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim() || '+258 84 000 0000',
        role: newUser.role,
        storeId: newUser.role === 'admin' ? undefined : newUser.storeId,
        storeName: newUser.role === 'admin' ? undefined : (store ? store.name : undefined),
        status: 'active',
        permissions: newUser.permissions,
        avatar: newUser.avatar,
      },
      newUser.password || 'Vendedor@123'
    );
    setShowAddUserModal(false);
    addToast(
      'success',
      'Utilizador Criado',
      `Colaborador "${newUser.name}" cadastrado com sucesso com a senha "${newUser.password || 'Vendedor@123'}".`
    );
    playAudioFeedback('success');
    setNewUser({
      name: '',
      email: '',
      phone: '+258 84 ',
      role: 'seller',
      storeId: stores[0]?.id || '',
      storeName: stores[0]?.name || '',
      status: 'active',
      password: 'Vendedor@123',
      permissions: {
        canApplyDiscount: true,
        maxDiscountPercent: 10,
        canCancelSales: false,
        canViewReports: false,
        canEditStock: false,
      },
      avatar: PRESET_USER_AVATARS[0].url,
    });
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === 'user-admin' || userToDelete.id === currentUser.id) {
      addToast('error', 'Ação Bloqueada', 'A conta principal do Gestor Geral não pode ser eliminada.');
      setUserToDelete(null);
      return;
    }
    const success = deleteUser(userToDelete.id);
    if (success) {
      addToast('success', 'Utilizador Eliminado', `A conta de "${userToDelete.name}" foi removida do sistema.`);
      playAudioFeedback('alert');
    } else {
      addToast('error', 'Erro', 'Não foi possível eliminar este utilizador.');
    }
    setUserToDelete(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToReset) return;
    const pwd = resetPasswordInput.trim() || 'Vendedor@123';
    const result = await resetUserPasswordByAdmin(userToReset.id, pwd);
    if (result.success) {
      addToast(
        'success',
        'Conta Recuperada / Senha Redefinida',
        `A palavra-passe de "${userToReset.name}" foi redefinida para "${pwd}". Acesso restabelecido.`
      );
      playAudioFeedback('success');
    } else {
      addToast('error', 'Falha ao Redefinir', result.error || 'Não foi possível redefinir a palavra-passe.');
    }
    setUserToReset(null);
    setResetPasswordInput('Vendedor@123');
  };

  const handleToggleUserStatus = (u: User) => {
    if (u.id === 'user-admin' || u.id === currentUser.id) {
      addToast('error', 'Ação Bloqueada', 'Não é possível desativar a conta do Administrador Geral.');
      return;
    }
    toggleUserStatus(u.id);
    const nextState = u.status === 'active' ? 'desativado / suspenso' : 'reativado com sucesso';
    addToast('info', 'Estado Atualizado', `O colaborador "${u.name}" foi ${nextState}.`);
    playAudioFeedback('beep');
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || newExpense.amount <= 0) {
      addToast('error', 'Valor Inválido', 'Descreva o motivo e insira um montante válido.');
      return;
    }
    const store = stores.find((s) => s.id === newExpense.storeId);
    addExpense({
      ...newExpense,
      storeName: store?.name || 'Sede Geral',
    });
    setShowAddExpenseModal(false);
    addToast('success', 'Despesa Lançada', `Despesa de ${formatMZN(newExpense.amount)} lançada com sucesso.`);
    playAudioFeedback('success');
  };

  const handleConfirmCancelSale = () => {
    if (!saleToCancel || !cancelReason.trim()) return;
    const res = cancelSale(saleToCancel.id, cancelReason);
    if (res.success) {
      addToast('alert', 'Venda Estornada', `Venda ${saleToCancel.receiptNumber} cancelada e mercadoria devolvida ao stock.`);
      setSaleToCancel(null);
      setCancelReason('');
    } else {
      addToast('error', 'Erro no Estorno', res.error || 'Não foi possível estornar a venda.');
    }
  };

  const handleDownloadBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SL_Vendas_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('success', 'Backup JSON Gerado', 'A cópia de segurança de todas as lojas foi descarregada.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        addToast('success', 'Base de Dados Restaurada', 'Os dados do ficheiro foram importados com sucesso!');
        playAudioFeedback('success');
      } else {
        addToast('error', 'Ficheiro Inválido', 'Não foi possível ler a estrutura da base de dados.');
        playAudioFeedback('alert');
      }
    };
    reader.readAsText(file);
  };

  const handleSelectPOSModel = (model: 'nati' | 'ed') => {
    updateCompanySettings({ posLayoutModel: model });
    playAudioFeedback('beep');
    addToast(
      'success',
      'Modelo de Caixa Atualizado',
      model === 'ed'
        ? 'Modelo Ed ativo: Ecrã de alta velocidade para leitor de laser e atalhos F2-F9.'
        : 'Modelo Nati ativo: Ecrã touchscreen moderno com fotos e grade visual.'
    );
  };

  const handleSelectThermalWidth = (width: '58mm' | '80mm') => {
    updateCompanySettings({ thermalWidth: width });
    playAudioFeedback('beep');
    addToast('info', 'Impressora Selecionada', `Largura padrão configurada para ${width}.`);
  };

  const handleToggleEconomyMode = () => {
    const nextVal = !companySettings.paperEconomyMode;
    updateCompanySettings({ paperEconomyMode: nextVal });
    playAudioFeedback('beep');
    addToast('info', 'Poupança de Papel', `Modo poupança de papel ${nextVal ? 'ativado' : 'desativado'}.`);
  };

  const handleExecuteWipeAccounts = async () => {
    if (wipeConfirmPhrase.trim() !== 'LIMPAR CONTAS') {
      addToast('error', 'Frase Incorreta', 'Digite exatamente "LIMPAR CONTAS" para confirmar.');
      return;
    }

    setIsWipingAccounts(true);
    try {
      const newUsersList = [];
      if (newManagerData.name.trim() && newManagerData.email.trim()) {
        newUsersList.push(newManagerData);
      }
      if (newCashierData.name.trim() && newCashierData.email.trim()) {
        newUsersList.push(newCashierData);
      }

      const res = await resetAndSetupNewAccounts(
        'moisesmarioestenda1999@gmail.com',
        newUsersList
      );

      if (res.success) {
        addToast(
          'success',
          'Limpeza Concluída',
          'Todas as contas antigas foram eliminadas. Administrador principal preservado e novas contas criadas com sucesso!'
        );
        playAudioFeedback('success');
        setShowWipeAccountsModal(false);
        setWipeConfirmPhrase('');
      } else {
        addToast('error', 'Erro na Limpeza', res.error || 'Falha ao redefinir contas.');
        playAudioFeedback('alert');
      }
    } catch (err: any) {
      addToast('error', 'Falha Inesperada', err.message || 'Erro de comunicação com o servidor.');
    } finally {
      setIsWipingAccounts(false);
    }
  };

  // Nav menu items matching exact specifications
  const menuItems = [
    { id: 'dashboard' as AdminTab, label: 'Início', icon: LayoutDashboard },
    { id: 'sales' as AdminTab, label: 'Vendas', icon: ShoppingCart, badge: `${paidSales.length}` },
    { id: 'products' as AdminTab, label: 'Produtos', icon: Package },
    { id: 'stock' as AdminTab, label: 'Stock', icon: Boxes, badge: lowStockCount > 0 ? `${lowStockCount}` : undefined, badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
    { id: 'stores' as AdminTab, label: 'Lojas', icon: StoreIcon, badge: `${onlineStoresCount}/${stores.length}` },
    { id: 'reports' as AdminTab, label: 'Relatórios', icon: BarChart3 },
    { id: 'finance' as AdminTab, label: 'Financeiro', icon: DollarSign },
    { id: 'sellers' as AdminTab, label: 'Utilizadores', icon: Users, badge: `${activeSellersCount}` },
    { id: 'settings' as AdminTab, label: 'Configurações', icon: Cloud },
    { id: 'security' as AdminTab, label: 'Auditoria & Logs', icon: Shield },
  ];

  // Helper title for breadcrumb
  const currentTabLabel = menuItems.find((m) => m.id === activeTab)?.label || 'Painel Principal';

  return (
    <div className="min-h-screen bg-[#041611] text-slate-100 flex flex-col md:flex-row selection:bg-emerald-500 selection:text-white">
      {/* ========================================================= */}
      {/* TOAST STACK (TOP-RIGHT NOTIFICATIONS) */}
      {/* ========================================================= */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-[#03241b]/95 border-emerald-500/80 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/80 text-rose-100'
                : toast.type === 'alert'
                ? 'bg-amber-950/95 border-amber-500/80 text-amber-100'
                : 'bg-slate-900/95 border-cyan-500/80 text-cyan-100'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'alert' && <BadgeAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Check className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
              <div>
                <h5 className="font-bold text-xs">{toast.title}</h5>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* SIDEBAR NAVIGATION (Executive Emerald Theme) */}
      {/* ========================================================= */}
      <aside className="w-full md:w-64 bg-[#031d16] border-r border-emerald-950/70 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-emerald-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white">SL Vendas</h1>
              <p className="text-[10px] text-emerald-400 font-medium">Gestor Geral &bull; Dispositivo Mãe</p>
            </div>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2 rounded-lg bg-emerald-950 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Global Store Selector inside Sidebar */}
        <div className="p-3 border-b border-emerald-950/60 bg-[#021812]">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Filtro Geral por Filial</span>
          </label>
          <div className="relative">
            <select
              value={selectedGlobalStore}
              onChange={(e) => {
                setSelectedGlobalStore(e.target.value);
                const storeName = e.target.value === 'all' ? 'Todas as Lojas' : stores.find((s) => s.id === e.target.value)?.name || '';
                addToast('info', 'Filtro de Filial Ativo', `Visualizando dados de: ${storeName}`);
              }}
              className="w-full bg-[#04281f] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none pr-8 cursor-pointer transition-all"
            >
              <option value="all">🏢 Todas as Lojas (Consolidado)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  🏬 {s.name} ({s.code})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
          {selectedStoreObj && (
            <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Gerente: <strong className="text-white">{selectedStoreObj.managerName}</strong></span>
              <span className="font-mono text-emerald-400 font-bold">{selectedStoreObj.code}</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          className={`flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar ${
            isMobileNavOpen ? 'block' : 'hidden md:block'
          }`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleSelectTab(item.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      item.badgeColor || 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Sidebar Actions */}
        <div className="p-3 border-t border-emerald-950/70 space-y-1">
          <button
            onClick={() => setShowPOSModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950 transition-all active:scale-95 mb-1"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Nova Venda / POS Global</span>
          </button>
          <button
            onClick={onOpenGuide}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-emerald-950/40 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Guia Passo a Passo</span>
          </button>
          <button
            onClick={onOpenNotifications}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:bg-emerald-950/60 transition-colors border border-emerald-800/40"
            title="Abrir Central de Mensagens e Notificações"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Notificações & Alertas</span>
            </div>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowChangePhoneModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-emerald-950/40 transition-colors border border-emerald-900/30"
            title="Segurança: Atualizar número de telemóvel com SMS"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>Meu Telemóvel</span>
            </div>
            <span className="text-[10px] text-teal-300 font-mono">
              {currentUser?.phone ? maskPhoneNumber(currentUser.phone) : 'Configurar'}
            </span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN ADMINISTRATIVE CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TOP QUICK-ACTION TAB RIBBON / BREADCRUMB BAR */}
        <div className="bg-[#032018] border border-emerald-950/90 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumbs & Active Store Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {activeTab !== 'dashboard' ? (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-800 transition-all active:scale-95"
                title="Voltar ao Painel Principal"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Início</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">Painel Principal</span>
              </div>
            )}

            {activeTab !== 'dashboard' && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-white">{currentTabLabel}</span>
              </>
            )}

            <span className="text-slate-600 hidden sm:inline">&bull;</span>

            {/* Global Store Pill */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Visão:</span>
              <strong className="text-emerald-400">
                {selectedGlobalStore === 'all'
                  ? 'Rede Geral (Consolidado)'
                  : selectedStoreObj?.name || 'Filial Selecionada'}
              </strong>
            </div>
          </div>

          {/* Quick Universal Actions on Top */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowPOSModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Global</span>
            </button>
            <button
              onClick={() => setShowCashRegisterModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#052e22] hover:bg-[#073d2e] text-emerald-200 border border-emerald-800/80 font-bold text-xs rounded-xl transition-all"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fecho de Caixa</span>
            </button>
            <button
              onClick={() => setShowAddStoreModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-emerald-900/60 font-bold text-xs rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nova Loja</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PAINEL PRINCIPAL (DASHBOARD COM ACESSO RÁPIDO) */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-emerald-950/60">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Painel de Controlo Executivo
                </h2>
                <p className="text-xs text-slate-400">
                  Gestão integrada em tempo real &bull; Moçambique (Africa/Maputo) &bull; Moeda: Metical (MZN)
                </p>
              </div>

              {/* Store Switcher for the Page */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden lg:inline">Filtrar Loja:</span>
                <select
                  value={selectedGlobalStore}
                  onChange={(e) => setSelectedGlobalStore(e.target.value)}
                  className="bg-[#032018] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white font-bold cursor-pointer"
                >
                  <option value="all">🏢 Todas as Lojas</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      🏬 {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DIRECT ACCESS INTERACTIVE GRID (7+ ESSENTIAL OPERATIONAL BUTTONS) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Acesso Rápido às Funcionalidades</span>
                </h3>
                <span className="text-[11px] text-slate-400">Clique para abrir instantaneamente</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {/* 1. POS Global */}
                <button
                  onClick={() => setShowPOSModal(true)}
                  className="group bg-gradient-to-br from-emerald-600/30 to-[#032018] hover:from-emerald-600/50 hover:to-[#042d22] border border-emerald-500/50 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 mb-3 shadow-md group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-white group-hover:text-emerald-300">Nova Venda / POS</h4>
                    <p className="text-[10px] text-slate-300 mt-0.5">Registo global de vendas</p>
                  </div>
                </button>

                {/* 2. Gestão de Lojas */}
                <button
                  onClick={() => setActiveTab('stores')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Gestão de Lojas</h4>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">{stores.length}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filiais, parâmetros e metas</p>
                  </div>
                </button>

                {/* 3. Utilizadores e Vendedores */}
                <button
                  onClick={() => setActiveTab('sellers')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Utilizadores</h4>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">{users.length}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Contas e permissões</p>
                  </div>
                </button>

                {/* 4. Controlo de Stock */}
                <button
                  onClick={() => setActiveTab('stock')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Stock & Inventário</h4>
                      {lowStockCount > 0 && (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-1.5 rounded">{lowStockCount} alertas</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reposição e níveis</p>
                  </div>
                </button>

                {/* 5. Relatórios Financeiros */}
                <button
                  onClick={() => setActiveTab('finance')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Financeiro & Caixa</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Receitas, despesas e fecho</p>
                  </div>
                </button>

                {/* 6. Auditoria e Segurança */}
                <button
                  onClick={() => setActiveTab('security')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Auditoria & Segurança</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Logs e rastreabilidade</p>
                  </div>
                </button>

                {/* 7. Definições Gerais */}
                <button
                  onClick={() => setActiveTab('settings')}
                  className="group bg-[#032018] hover:bg-[#052e22] border border-emerald-900/80 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-95 flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-105 transition-transform">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300">Definições & Backup</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cópias JSON e moedas</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 5 KPI Cards Dynamically Calculated for Selected Store */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Card 1: Vendas Hoje */}
              <div className="bg-[#05241b] border border-emerald-900/60 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Facturação Hoje</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl font-black text-white tracking-tight block">
                    {formatMZN(todaySales)}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{paidSales.length} transações pagas</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Lucro Bruto Hoje */}
              <div className="bg-[#05241b] border border-emerald-900/60 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Lucro Bruto</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl font-black text-white tracking-tight block">
                    {formatMZN(todayProfit)}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>
                      Margem: {todaySales > 0 ? ((todayProfit / todaySales) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Produtos Vendidos */}
              <div className="bg-[#05241b] border border-emerald-900/60 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Produtos Vendidos</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl font-black text-white tracking-tight block">
                    {totalProductsSold} unidades
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400">
                    <span>Stock Total: {totalStockItems} unid.</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Total de Lojas */}
              <div className="bg-[#05241b] border border-emerald-900/60 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Rede de Lojas</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <StoreIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl font-black text-white tracking-tight block">
                    {stores.length} Filiais
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{onlineStoresCount} operacionais</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Despesas Operacionais */}
              <div className="bg-[#05241b] border border-emerald-900/60 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Despesas Registadas</span>
                  <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-lg sm:text-xl font-black text-rose-400 tracking-tight block">
                    {formatMZN(totalExpenses)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-300">
                    <span>Líquido: {formatMZN(estimatedNetProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Evolução das Vendas & Vendas por Categoria & Lojas Online */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Evolução das Vendas Chart */}
              <div className="lg:col-span-6 bg-[#032018] border border-emerald-950/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Evolução das Vendas</h3>
                    <p className="text-[11px] text-slate-400">Desempenho dos últimos 7 dias (Vendas vs. Lucro)</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                      <span className="text-slate-300">Vendas</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
                      <span className="text-slate-300">Lucro</span>
                    </span>
                  </div>
                </div>

                <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-emerald-950/80">
                  {[
                    { day: '09 Out', sales: 6000, profit: 2400 },
                    { day: '10 Out', sales: 8500, profit: 3200 },
                    { day: '11 Out', sales: 9200, profit: 3800 },
                    { day: '12 Out', sales: 11000, profit: 4100 },
                    { day: '13 Out', sales: 10400, profit: 3900 },
                    { day: '14 Out', sales: 13200, profit: 4800 },
                    { day: 'Hoje', sales: todaySales > 0 ? todaySales : 15400, profit: todayProfit > 0 ? todayProfit : 5400 },
                  ].map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        <div
                          style={{ height: `${Math.min(100, Math.max(15, (d.sales / 18000) * 100))}%` }}
                          className="w-3.5 bg-emerald-500 rounded-t group-hover:bg-emerald-400 transition-all relative"
                          title={`Vendas: ${d.sales} MZN`}
                        />
                        <div
                          style={{ height: `${Math.min(100, Math.max(10, (d.profit / 18000) * 100))}%` }}
                          className="w-3 bg-cyan-400 rounded-t group-hover:bg-cyan-300 transition-all"
                          title={`Lucro: ${d.profit} MZN`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{d.day}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 flex justify-between text-xs text-slate-400">
                  <span>Faturação Hoje: <strong className="text-white">{formatMZN(todaySales)}</strong></span>
                  <span className="text-emerald-400 font-semibold">+22.4% de eficiência comercial</span>
                </div>
              </div>

              {/* Vendas por Categoria */}
              <div className="lg:col-span-3 bg-[#032018] border border-emerald-950/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white">Vendas por Categoria</h3>
                  <p className="text-[11px] text-slate-400">Distribuição no período comercial</p>
                </div>

                <div className="py-4 flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full border-8 border-emerald-500 border-t-cyan-400 border-r-amber-400 border-b-rose-400 flex items-center justify-center text-center shadow-inner">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Hoje</span>
                      <strong className="text-xs text-white">{formatMZN(todaySales)}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Electrónica & Áudio</span>
                    </span>
                    <strong className="text-white">46%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Acessórios & Cabos</span>
                    </span>
                    <strong className="text-white">28%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Baterias & Cargas</span>
                    </span>
                    <strong className="text-white">16%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Proteção / Capas</span>
                    </span>
                    <strong className="text-white">10%</strong>
                  </div>
                </div>
              </div>

              {/* Lojas Online Panel */}
              <div className="lg:col-span-3 bg-[#032018] border border-emerald-950/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-sm text-white">Filiais Conectadas</h3>
                    <button
                      onClick={() => setActiveTab('stores')}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Gerir Todas &rarr;
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                    {stores.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedGlobalStore(s.id);
                          addToast('info', 'Filtro Aplicado', `Exibindo métricas de: ${s.name}`);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                          selectedGlobalStore === s.id
                            ? 'bg-emerald-950/80 border-emerald-500'
                            : 'bg-[#04281f] border-emerald-950 hover:border-emerald-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                s.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                              }`}
                            />
                            <strong className="text-white">{s.name}</strong>
                          </div>
                          <span className="text-[10px] text-slate-400 block ml-3.5">
                            {s.city} &bull; Gerente: {s.managerName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-emerald-400">
                          {s.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-950 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Sincronização em tempo real:</span>
                  <strong className="text-emerald-400">Ativa (2s)</strong>
                </div>
              </div>
            </div>

            {/* Row 3: Últimas Vendas da Rede */}
            <div className="bg-[#032018] border border-emerald-950/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-white">Últimas Vendas da Rede Comercial</h3>
                </div>
                <button
                  onClick={() => setActiveTab('sales')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>Ver todas ({paidSales.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-emerald-950/80 text-slate-400 text-[11px] pb-2">
                      <th className="pb-2 font-semibold">Data/Hora</th>
                      <th className="pb-2 font-semibold">Loja</th>
                      <th className="pb-2 font-semibold">Vendedor</th>
                      <th className="pb-2 font-semibold text-right">Total</th>
                      <th className="pb-2 font-semibold text-center">Pagamento</th>
                      <th className="pb-2 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/60">
                    {paidSales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-emerald-950/40 transition-colors">
                        <td className="py-2.5 font-mono text-[11px] text-slate-300">{sale.createdAt}</td>
                        <td className="py-2.5 font-medium text-white">{sale.storeName}</td>
                        <td className="py-2.5 text-slate-300">{sale.sellerName}</td>
                        <td className="py-2.5 font-bold text-white text-right">{formatMZN(sale.total)}</td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sale.paymentMethod === 'mpesa'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : sale.paymentMethod === 'emola'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {sale.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedReceipt(sale)}
                            className="p-1 hover:text-emerald-400 text-slate-400"
                            title="Ver Recibo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GESTÃO DE LOJAS & FILIAIS */}
        {/* ========================================================= */}
        {activeTab === 'stores' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header with Back button and Store Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                  title="Voltar ao Painel"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Gestão Central de Lojas & Filiais</h2>
                  <p className="text-xs text-slate-400">
                    Adicione novas lojas, configure parâmetros fiscais, gerentes e ative/desative instantaneamente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddStoreModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova Loja</span>
                </button>
              </div>
            </div>

            {/* Store Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((s) => {
                const storeSales = sales.filter((sale) => sale.storeId === s.id && sale.status === 'paid');
                const storeRevenue = storeSales.reduce((a, b) => a + b.total, 0);

                return (
                  <div
                    key={s.id}
                    className={`bg-[#032018] border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                      s.status === 'online' ? 'border-emerald-900/80 hover:border-emerald-500/60' : 'border-rose-950 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                          {s.code}
                        </span>
                        <button
                          onClick={() => handleToggleStoreStatus(s)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                            s.status === 'online'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                          }`}
                        >
                          {s.status === 'online' ? 'OPERACIONAL / ONLINE' : 'SUSPENSA / INATIVA'}
                        </button>
                      </div>

                      <h3 className="text-base font-extrabold text-white">{s.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{s.address} ({s.city}, {s.province})</span>
                      </p>
                    </div>

                    <div className="p-3 bg-[#04281f] rounded-xl space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gerente Responsável:</span>
                        <strong className="text-white">{s.managerName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telefone:</span>
                        <span>{s.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Moeda / Taxa IVA:</span>
                        <span className="font-semibold text-emerald-300">
                          {s.currency || 'MZN'} &bull; {s.taxRate !== undefined ? `${s.taxRate}% IVA` : '16% IVA'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meta Diária:</span>
                        <strong className="text-emerald-400">{formatMZN(s.dailyTarget)}</strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-emerald-950">
                        <span className="text-slate-400">Vendas Registadas Hoje:</span>
                        <strong className="text-white">{formatMZN(storeRevenue)} ({storeSales.length})</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingStore(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#052920] hover:bg-emerald-900/60 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-emerald-800"
                        >
                          <Edit className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleToggleStoreStatus(s)}
                          className="text-xs text-slate-300 hover:text-white px-2 py-1"
                        >
                          {s.status === 'online' ? 'Suspender' : 'Reactivar'}
                        </button>
                      </div>

                      <button
                        onClick={() => setStoreToDelete(s)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold p-1.5 rounded-lg hover:bg-rose-950/40"
                        title="Remover Loja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GESTÃO DE UTILIZADORES & COLABORADORES */}
        {/* ========================================================= */}
        {activeTab === 'sellers' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-950/80">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2.5 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                  title="Voltar ao Painel Principal"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Gestão de Colaboradores & Utilizadores
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {users.length} Registados
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adicionar utilizadores com foto e filial, redefinir senhas, suspender e gerir permissões comerciais
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ Adicionar Colaborador</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#032018] border border-emerald-950 p-3.5 rounded-2xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Total de Contas
                </span>
                <span className="text-xl font-black text-white">{users.length}</span>
              </div>
              <div className="bg-[#032018] border border-emerald-950 p-3.5 rounded-2xl">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                  Contas Ativas
                </span>
                <span className="text-xl font-black text-emerald-300">
                  {users.filter((u) => u.status === 'active').length}
                </span>
              </div>
              <div className="bg-[#032018] border border-emerald-950 p-3.5 rounded-2xl">
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
                  Vendedores
                </span>
                <span className="text-xl font-black text-cyan-300">
                  {users.filter((u) => u.role === 'seller').length}
                </span>
              </div>
              <div className="bg-[#032018] border border-emerald-950 p-3.5 rounded-2xl">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                  Contas Suspensas
                </span>
                <span className="text-xl font-black text-amber-300">
                  {users.filter((u) => u.status === 'suspended').length}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#032018] border border-emerald-950/80 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Pesquisar utilizador por nome, email, telefone ou filial..."
                  className="w-full bg-[#021812] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-[#021812] p-1 border border-emerald-900/60 text-xs">
                  <button
                    onClick={() => setUserStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({users.length})
                  </button>
                  <button
                    onClick={() => setUserStatusFilter('active')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'active'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 Ativos ({users.filter((u) => u.status === 'active').length})
                  </button>
                  <button
                    onClick={() => setUserStatusFilter('suspended')}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      userStatusFilter === 'suspended'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔴 Suspensos ({users.filter((u) => u.status === 'suspended').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Users Grid */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 bg-[#032018] border border-emerald-950 rounded-2xl p-6">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-300 font-bold text-sm">Nenhum utilizador encontrado</p>
                <p className="text-slate-500 text-xs mt-1">
                  Ajuste os filtros de pesquisa ou cadastre um novo colaborador.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const isPrimaryAdmin = u.id === 'user-admin';
                  const userStore = stores.find((s) => s.id === u.storeId);
                  const isUserActive = u.status === 'active';

                  return (
                    <div
                      key={u.id}
                      className={`bg-[#032018] border rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all ${
                        isUserActive
                          ? 'border-emerald-950/80 hover:border-emerald-800'
                          : 'border-amber-900/40 bg-[#081a14]'
                      }`}
                    >
                      <div>
                        {/* Header with Avatar & Status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                                alt={u.name}
                                className={`w-12 h-12 rounded-full object-cover border-2 ${
                                  isUserActive ? 'border-emerald-500' : 'border-amber-500/70 grayscale'
                                }`}
                              />
                              <span
                                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#032018] ${
                                  isUserActive ? 'bg-emerald-400' : 'bg-amber-500'
                                }`}
                                title={isUserActive ? 'Conta Ativa' : 'Conta Suspensa'}
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isPrimaryAdmin && (
                                  <span title="Gestor Geral">
                                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  </span>
                                )}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{u.phone}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : u.role === 'manager'
                                  ? 'bg-blue-500/10 border-blue-500/30 text-cyan-400'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {u.role === 'admin'
                                ? 'Gestor Geral'
                                : u.role === 'manager'
                                ? 'Gerente'
                                : 'Vendedor'}
                            </span>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isUserActive
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {isUserActive ? 'Ativo' : 'Suspenso'}
                            </span>
                          </div>
                        </div>

                        {/* Store Badge */}
                        <div className="p-2 bg-[#04281f] rounded-xl mb-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <StoreIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-slate-300 text-[11px] truncate font-medium">
                              {u.role === 'admin'
                                ? 'Todas as Lojas (Acesso Central)'
                                : userStore
                                ? `${userStore.name}`
                                : u.storeName || 'Filial não definida'}
                            </span>
                          </div>
                          {userStore && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                              {userStore.code}
                            </span>
                          )}
                        </div>

                        {/* Permissions Overview */}
                        <div className="p-2.5 bg-[#021812] rounded-xl space-y-1.5 text-xs border border-emerald-950">
                          <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">
                            Permissões Comerciais
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={u.permissions.canApplyDiscount}
                                onChange={(e) => {
                                  updateUserPermissions(u.id, {
                                    ...u.permissions,
                                    canApplyDiscount: e.target.checked,
                                  });
                                  addToast('info', 'Permissão Atualizada', `Permissão de desconto de ${u.name} salva.`);
                                }}
                                className="accent-emerald-500 rounded"
                              />
                              <span>Descontos</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={u.permissions.canCancelSales}
                                onChange={(e) => {
                                  updateUserPermissions(u.id, {
                                    ...u.permissions,
                                    canCancelSales: e.target.checked,
                                  });
                                  addToast('info', 'Permissão Atualizada', `Permissão de cancelamento de ${u.name} salva.`);
                                }}
                                className="accent-emerald-500 rounded"
                              />
                              <span>Cancelar</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={u.permissions.canViewReports}
                                onChange={(e) => {
                                  updateUserPermissions(u.id, {
                                    ...u.permissions,
                                    canViewReports: e.target.checked,
                                  });
                                  addToast('info', 'Permissão Atualizada', `Acesso a relatórios de ${u.name} atualizado.`);
                                }}
                                className="accent-emerald-500 rounded"
                              />
                              <span>Relatórios</span>
                            </label>

                            <div className="flex items-center justify-between text-slate-400">
                              <span>Máx desc:</span>
                              <span className="font-bold text-emerald-400 font-mono">
                                {u.permissions.maxDiscountPercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
                          <span>Último acesso:</span>
                          <span className="text-slate-400">{u.lastLogin || 'Recentemente'}</span>
                        </div>
                      </div>

                      {/* Action Buttons Bar: Recuperar, Ativar/Suspender, Eliminar */}
                      <div className="pt-3 mt-3 border-t border-emerald-950/80 flex items-center justify-between gap-1.5">
                        {/* 🔄 Recuperar / Redefinir Senha */}
                        <button
                          type="button"
                          onClick={() => {
                            setUserToReset(u);
                            setResetPasswordInput('Vendedor@123');
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#04281f] hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-800 text-[11px] font-semibold transition-all active:scale-95"
                          title="Redefinir palavra-passe ou reativar acesso"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>🔄 Recuperar</span>
                        </button>

                        {/* ⚡ Toggle Status */}
                        {!isPrimaryAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                              isUserActive
                                ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-800/60'
                                : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                            }`}
                            title={isUserActive ? 'Suspender conta temporariamente' : 'Reativar conta de utilizador'}
                          >
                            {isUserActive ? 'Suspender' : 'Reativar'}
                          </button>
                        )}

                        {/* 🗑️ Eliminar */}
                        {!isPrimaryAdmin ? (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-800/40 text-xs transition-all"
                            title="Eliminar utilizador do sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-slate-600 cursor-not-allowed"
                            title="Conta principal protegida contra eliminação"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CONTROLO DE STOCK & INVENTÁRIO CONSOLIDADO */}
        {/* ========================================================= */}
        {activeTab === 'stock' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Controlo de Stock & Inventário Consolidado</h2>
                  <p className="text-xs text-slate-400">
                    Níveis consolidados de armazém, reposição rápida e alertas de rutura
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Produto</span>
                </button>
              </div>
            </div>

            {/* Quick stock KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 block font-medium">Total de Itens em Stock:</span>
                <span className="text-xl font-extrabold text-white">{totalStockItems} unidades</span>
              </div>
              <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 block font-medium">Itens com Stock Baixo:</span>
                <span className="text-xl font-extrabold text-amber-400">{lowStockCount} produtos</span>
              </div>
              <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 block font-medium">Produtos Esgotados:</span>
                <span className="text-xl font-extrabold text-rose-400">{outOfStockCount} produtos</span>
              </div>
            </div>

            {/* Consolidated Stock Table */}
            <ProductCatalogTable
              products={products}
              stores={stores}
              onOpenCreateModal={handleOpenCreateProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onOpenStockModal={handleOpenStockReplenish}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CATÁLOGO DE PRODUTOS & PREÇOS */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <ProductCatalogTable
            products={products}
            stores={stores}
            onOpenCreateModal={handleOpenCreateProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onOpenStockModal={handleOpenStockReplenish}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 6: REGISTO CENTRAL DE VENDAS */}
        {/* ========================================================= */}
        {activeTab === 'sales' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Registo Central de Vendas & Recibos</h2>
                  <p className="text-xs text-slate-400">Auditoria completa de transações, trocos e estornos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedGlobalStore}
                  onChange={(e) => setSelectedGlobalStore(e.target.value)}
                  className="bg-slate-950 border border-emerald-900 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">Todas as Lojas</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowPOSModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Venda</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-[#032018] rounded-2xl border border-emerald-950 p-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-950 text-slate-400 pb-2">
                    <th className="pb-3">Recibo Nº</th>
                    <th className="pb-3">Loja</th>
                    <th className="pb-3">Vendedor</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3 text-right">Subtotal</th>
                    <th className="pb-3 text-right">Desconto</th>
                    <th className="pb-3 text-right">Total Pago</th>
                    <th className="pb-3 text-right">Lucro Est.</th>
                    <th className="pb-3 text-center">Método</th>
                    <th className="pb-3 text-center">Estado</th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/60">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-emerald-950/40 transition-colors">
                      <td className="py-3 font-mono font-bold text-emerald-400">{s.receiptNumber}</td>
                      <td className="py-3 font-medium text-white">{s.storeName}</td>
                      <td className="py-3 text-slate-300">{s.sellerName}</td>
                      <td className="py-3 text-slate-300">{s.customerName}</td>
                      <td className="py-3 text-right text-slate-400">{formatMZN(s.subtotal)}</td>
                      <td className="py-3 text-right text-amber-400">{s.discount > 0 ? `-${formatMZN(s.discount)}` : '-'}</td>
                      <td className="py-3 text-right font-black text-white">{formatMZN(s.total)}</td>
                      <td className="py-3 text-right font-semibold text-emerald-400">{formatMZN(s.profit)}</td>
                      <td className="py-3 text-center uppercase font-mono text-[10px] text-slate-300">{s.paymentMethod}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {s.status === 'paid' ? 'PAGO' : 'ESTORNADO'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedReceipt(s)}
                          className="p-1 hover:text-emerald-400 text-slate-400"
                          title="Ver Recibo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {s.status === 'paid' && (
                          <button
                            onClick={() => setSaleToCancel(s)}
                            className="p-1 hover:text-rose-400 text-slate-400"
                            title="Estornar Venda"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: FINANCEIRO & FECHO DE CAIXA */}
        {/* ========================================================= */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Finanças, Despesas & Fecho de Caixa</h2>
                  <p className="text-xs text-slate-400">
                    Balanço operacional diário, conferência por método de pagamento e lucros
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCashRegisterModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#052e22] hover:bg-[#073d2e] text-emerald-200 border border-emerald-800 font-bold text-xs rounded-xl shadow-md"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Conferência de Caixa</span>
                </button>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registar Despesa</span>
                </button>
              </div>
            </div>

            {/* 4 Financial Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-[#032018] border border-emerald-950 rounded-xl space-y-1">
                <span className="text-xs text-slate-400">Facturação Bruta:</span>
                <span className="text-lg font-black text-white block">{formatMZN(todaySales)}</span>
              </div>
              <div className="p-4 bg-[#032018] border border-emerald-950 rounded-xl space-y-1">
                <span className="text-xs text-slate-400">Custo de Mercadorias:</span>
                <span className="text-lg font-black text-slate-300 block">{formatMZN(todayCosts)}</span>
              </div>
              <div className="p-4 bg-[#032018] border border-emerald-950 rounded-xl space-y-1">
                <span className="text-xs text-slate-400">Despesas Operacionais:</span>
                <span className="text-lg font-black text-rose-400 block">{formatMZN(totalExpenses)}</span>
              </div>
              <div className="p-4 bg-[#032018] border border-emerald-950 rounded-xl space-y-1">
                <span className="text-xs text-slate-400">Lucro Líquido Real:</span>
                <span className="text-lg font-black text-emerald-400 block">{formatMZN(estimatedNetProfit)}</span>
              </div>
            </div>

            {/* Fecho de Caixa Detail Card */}
            <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white">Resumo do Fecho de Caixa Diário</h3>
                  <p className="text-xs text-slate-400">Distribuição real por canal de recebimento</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Folha de Caixa</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#04281f] rounded-xl border border-emerald-900/60">
                  <span className="text-slate-400 block">Numerário (Dinheiro Vivo):</span>
                  <strong className="text-white text-sm block mt-1">{formatMZN(cashRegisterSummary.cash)}</strong>
                  <span className="text-[10px] text-slate-500">Gaveta física</span>
                </div>
                <div className="p-3 bg-[#04281f] rounded-xl border border-emerald-900/60">
                  <span className="text-slate-400 block">M-Pesa (Vodacom):</span>
                  <strong className="text-rose-400 text-sm block mt-1">{formatMZN(cashRegisterSummary.mpesa)}</strong>
                  <span className="text-[10px] text-slate-500">Carteira digital</span>
                </div>
                <div className="p-3 bg-[#04281f] rounded-xl border border-emerald-900/60">
                  <span className="text-slate-400 block">e-Mola (Movitel):</span>
                  <strong className="text-amber-400 text-sm block mt-1">{formatMZN(cashRegisterSummary.emola)}</strong>
                  <span className="text-[10px] text-slate-500">Carteira digital</span>
                </div>
                <div className="p-3 bg-[#04281f] rounded-xl border border-emerald-900/60">
                  <span className="text-slate-400 block">Cartão / POS Bancário:</span>
                  <strong className="text-cyan-400 text-sm block mt-1">{formatMZN(cashRegisterSummary.pos)}</strong>
                  <span className="text-[10px] text-slate-500">Terminal Ponto 24</span>
                </div>
              </div>
            </div>

            {/* Expenses history */}
            <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-4">
              <h3 className="font-bold text-sm text-white mb-3">Histórico de Despesas Registadas</h3>
              <div className="divide-y divide-emerald-950/60">
                {filteredExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-white block">{exp.description}</strong>
                      <span className="text-[10px] text-slate-400">
                        {exp.storeName} &bull; Categoria: {exp.category.toUpperCase()} &bull; Registado por: {exp.createdBy}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-400 text-sm block">-{formatMZN(exp.amount)}</span>
                      <span className="text-[10px] text-slate-500">{exp.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: RELATÓRIOS EXECUTIVOS */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Relatórios Executivos & Ranking de Filiais</h2>
                  <p className="text-xs text-slate-400">Comparação de desempenho comercial e metas das lojas</p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir Relatório Executivo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-white">Desempenho Comercial por Filial</h3>
                <div className="space-y-2 text-xs">
                  {stores.map((s) => {
                    const stSales = paidSales.filter((sale) => sale.storeId === s.id);
                    const total = stSales.reduce((acc, sale) => acc + sale.total, 0);
                    const profit = stSales.reduce((acc, sale) => acc + sale.profit, 0);

                    return (
                      <div key={s.id} className="p-3 bg-[#04281f] rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-white block">{s.name}</strong>
                          <span className="text-[10px] text-slate-400">{stSales.length} vendas registradas</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{formatMZN(total)}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">Lucro: {formatMZN(profit)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-white">Ranking de Vendedores</h3>
                <div className="space-y-2 text-xs">
                  {users
                    .filter((u) => u.role === 'seller')
                    .map((seller, idx) => {
                      const selSales = paidSales.filter((s) => s.sellerId === seller.id);
                      const total = selSales.reduce((acc, s) => acc + s.total, 0);

                      return (
                        <div key={seller.id} className="p-3 bg-[#04281f] rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <strong className="text-white block">{seller.name}</strong>
                              <span className="text-[10px] text-slate-400">{seller.storeName}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white block">{formatMZN(total)}</span>
                            <span className="text-[10px] text-slate-400">{selSales.length} transações</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: AUDITORIA & SEGURANÇA */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-950">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-white">Auditoria, Tentativas de Acesso & Dispositivos</h2>
                  <p className="text-xs text-slate-400">Rastreabilidade completa de todas as operações e acessos críticos</p>
                </div>
              </div>

              {/* Severity filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setAuditFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    auditFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({auditLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilter('critical')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    auditFilter === 'critical' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Críticos
                </button>
                <button
                  onClick={() => setAuditFilter('sensitive')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    auditFilter === 'sensitive' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Sensíveis
                </button>
              </div>
            </div>

            {/* Audit log list */}
            <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-4">
              <div className="divide-y divide-emerald-950/60">
                {auditLogs
                  .filter((log) => {
                    if (auditFilter === 'all') return true;
                    return log.severity === auditFilter;
                  })
                  .map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                              log.severity === 'critical'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : log.severity === 'sensitive'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-400'
                            }`}
                          >
                            {log.action}
                          </span>
                          <strong className="text-white">{log.performedBy}</strong>
                          <span className="text-slate-500">({log.role})</span>
                        </div>
                        <p className="text-slate-300">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">{log.timestamp}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Authorized Devices Grid */}
            <div className="pt-4 border-t border-emerald-950 space-y-3">
              <h3 className="font-bold text-sm text-white">Dispositivos Conectados e Autorizados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className={`bg-[#032018] border rounded-xl p-4 text-xs space-y-2 ${
                      d.isMotherDevice ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{d.deviceName}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          d.status === 'authorized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {d.status === 'authorized' ? 'AUTORIZADO' : 'REVOGADO'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{d.os} &bull; {d.browser} &bull; IP: {d.ipAddress}</p>
                    <div className="pt-2 border-t border-emerald-950 flex justify-between items-center text-[10px] text-slate-500">
                      <span>{d.lastSeen}</span>
                      {!d.isMotherDevice && (
                        <button
                          onClick={() => {
                            if (d.status === 'authorized') {
                              revokeDevice(d.id);
                              addToast('alert', 'Dispositivo Revogado', `Acesso do terminal ${d.deviceName} bloqueado.`);
                            } else {
                              authorizeDevice(d.id);
                              addToast('success', 'Dispositivo Autorizado', `Terminal ${d.deviceName} ativado.`);
                            }
                          }}
                          className={`font-bold hover:underline ${
                            d.status === 'authorized' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {d.status === 'authorized' ? 'Revogar Acesso' : 'Autorizar'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 10: DEFINIÇÕES GERAIS DO SISTEMA & BACKUP */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fadeIn max-w-3xl">
            <div className="flex items-center gap-3 pb-3 border-b border-emerald-950">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-2 rounded-xl bg-[#032018] hover:bg-emerald-900/60 text-slate-300 hover:text-white border border-emerald-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-white">Definições Gerais do Sistema & Cópias de Segurança</h2>
                <p className="text-xs text-slate-400">
                  Parâmetros de moeda nacional, taxas de imposto, salvaguarda de dados e restauro
                </p>
              </div>
            </div>

            <div className="bg-[#032018] border border-emerald-950 rounded-2xl p-5 space-y-6 text-xs">
              {/* System Info */}
              <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-800/60 space-y-2 text-emerald-200">
                <strong className="font-bold block text-emerald-300 text-sm">
                  SL Vendas &bull; Sistema Central Comercial Multiempresa
                </strong>
                <p className="text-xs text-slate-300">
                  Moeda Oficial: <strong>Metical Moçambicano (MZN)</strong> &bull; Fuso Horário: <strong>Africa/Maputo (CAT)</strong>
                </p>
                <p className="text-xs text-slate-300">
                  Taxa Padrão de IVA: <strong>16%</strong> (regulamentação tributária de Moçambique)
                </p>
              </div>

              {/* POS SCREEN MODEL CONFIGURATION (ADMIN EXCLUSIVE) */}
              <div className="pt-4 border-t border-emerald-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Modelos de Ecrã do Caixa (PDV) — Exclusivo Admin</span>
                    </h4>
                    <p className="text-slate-400 text-xs">
                      Selecione a arquitetura visual padrão dos caixas. Os vendedores seguem automaticamente esta escolha.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ativo: {companySettings.posLayoutModel === 'ed' ? 'Modelo Ed' : 'Modelo Nati'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Modelo Nati */}
                  <div
                    onClick={() => handleSelectPOSModel('nati')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      companySettings.posLayoutModel !== 'ed'
                        ? 'bg-gradient-to-br from-cyan-950/70 to-[#071a2e] border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
                        : 'bg-[#042018] border-emerald-900/60 hover:border-cyan-800 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                          <Grid className="w-5 h-5" />
                        </div>
                        {companySettings.posLayoutModel !== 'ed' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                            EM USO NO CAIXA
                          </span>
                        )}
                      </div>
                      <h5 className="font-black text-sm text-white">Modelo Nati (Touch & Grade)</h5>
                      <p className="text-slate-300 text-[11px] mt-1 leading-snug">
                        Design moderno com fotos reais de produtos, abas visuais de categorias e botões largos para toque.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-cyan-900/40 text-[10px] text-cyan-300 font-semibold flex items-center justify-between">
                      <span>Ideal para: Ecrãs táteis, tablets e supermercados modernos</span>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Modelo Ed */}
                  <div
                    onClick={() => handleSelectPOSModel('ed')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      companySettings.posLayoutModel === 'ed'
                        ? 'bg-gradient-to-br from-amber-950/70 to-[#221607] border-amber-400 ring-2 ring-amber-500/30 shadow-lg'
                        : 'bg-[#042018] border-emerald-900/60 hover:border-amber-800 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                          <Keyboard className="w-5 h-5" />
                        </div>
                        {companySettings.posLayoutModel === 'ed' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                            EM USO NO CAIXA
                          </span>
                        )}
                      </div>
                      <h5 className="font-black text-sm text-white">Modelo Ed (Hipermercado / Teclas)</h5>
                      <p className="text-slate-300 text-[11px] mt-1 leading-snug">
                        Alta densidade de itens em linhas de tabela, foco em leitor óptico contínuo e atalhos rápidos [F2-F9].
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-amber-900/40 text-[10px] text-amber-300 font-semibold flex items-center justify-between">
                      <span>Ideal para: Balcão rápido, laser barcode e teclados físicos</span>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* THERMAL PRINTER CONFIGURATION & PAPER ECONOMY */}
              <div className="pt-4 border-t border-emerald-950 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Impressora Térmica & Poupança de Papel</span>
                </h4>
                <p className="text-slate-400 text-xs">
                  Ajuste a largura do rolo de papel térmico para caber no espaço disponível do balcão.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 58mm Portable */}
                  <div
                    onClick={() => handleSelectThermalWidth('58mm')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      companySettings.thermalWidth === '58mm'
                        ? 'bg-emerald-950/80 border-emerald-400'
                        : 'bg-[#021812] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">58mm (Portátil / Mini Bluetooth)</span>
                      {companySettings.thermalWidth === '58mm' && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Compatível com GOOJPRT, POS-58 e MPT-II. Poupa espaço no balcão e funciona a bateria.
                    </p>
                  </div>

                  {/* 80mm Standard */}
                  <div
                    onClick={() => handleSelectThermalWidth('80mm')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      companySettings.thermalWidth === '80mm'
                        ? 'bg-emerald-950/80 border-emerald-400'
                        : 'bg-[#021812] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">80mm (Desktop / Supermercado Padrão)</span>
                      {companySettings.thermalWidth === '80mm' && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Impressora fixa USB/Ethernet para talões completos e detalhados.
                    </p>
                  </div>
                </div>

                {/* Paper economy switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#021812] border border-emerald-950">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-white block text-xs">Modo Poupança de Papel Térmico</span>
                      <span className="text-[10px] text-slate-400">Comprime entrelinhas e margens para gastar menos bobina</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleEconomyMode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      companySettings.paperEconomyMode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {companySettings.paperEconomyMode ? 'Activo' : 'Desactivado'}
                  </button>
                </div>
              </div>

              {/* THEME SELECTOR: DIA / NOITE */}
              <div className="pt-4 border-t border-emerald-950 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Tema Visual do Sistema (Dia / Noite)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      theme === 'light'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-[#021812] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Tema Claro (Dia)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#021812] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-cyan-300" />
                    <span>Tema Escuro (Noite)</span>
                  </button>
                </div>
              </div>

              {/* ACCOUNT WIPE & COMPLETE REINITIALIZATION (USER REQUIREMENT) */}
              <div className="pt-4 border-t border-emerald-950 space-y-3">
                <div className="p-4 bg-rose-950/40 rounded-2xl border border-rose-800/70 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
                      <UserMinus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-rose-200">
                        Eliminação de Todas as Contas & Reinicialização do Zero
                      </h4>
                      <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                        Elimina com segurança todas as contas secundárias de vendedores, gerentes e caixas de demonstração,
                        revoga sessões e permite cadastrar imediatamente novas contas comerciais. A conta de Administrador
                        Principal (<strong>moisesmarioestenda1999@gmail.com</strong>) é protegida e mantida intacta.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowWipeAccountsModal(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpar Contas Antigas & Começar do Zero</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Backup & Export */}
              <div className="pt-4 border-t border-emerald-950 space-y-2">
                <h4 className="font-bold text-white text-sm">Descarregar Cópia de Segurança Completa:</h4>
                <p className="text-slate-400">
                  Gera um ficheiro seguro em formato JSON com todas as lojas, produtos, utilizadores, vendas e despesas.
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarregar Backup JSON</span>
                </button>
              </div>

              {/* Restore */}
              <div className="pt-4 border-t border-emerald-950 space-y-2">
                <h4 className="font-bold text-white text-sm">Restaurar a partir de Backup:</h4>
                <p className="text-slate-400">Carregue um ficheiro JSON previamente gerado para restaurar o estado integral.</p>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold rounded-xl cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Seleccionar Ficheiro JSON...</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>

              {/* Reset to Demo */}
              <div className="pt-4 border-t border-emerald-950 space-y-2">
                <h4 className="font-bold text-rose-400 text-sm">Restaurar Dados Originais de Demonstração:</h4>
                <p className="text-slate-400">
                  Redefine o sistema com as lojas comerciais originais de Quelimane e o catálogo inicial de produtos.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Tem a certeza de que deseja restaurar os dados originais de demonstração?')) {
                      resetToDemoData();
                      addToast('info', 'Dados Restaurados', 'O sistema retornou ao estado original de teste.');
                    }
                  }}
                  className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Restaurar Demonstração
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: POS GLOBAL / NOVA VENDA */}
      {/* ========================================================= */}
      {showPOSModal && (
        <POSModal
          isOpen={showPOSModal}
          onClose={() => setShowPOSModal(false)}
          onSaleCompleted={(sale) => {
            setShowPOSModal(false);
            setSelectedReceipt(sale);
            addToast('success', 'Venda Registada!', `Venda ${sale.receiptNumber} de ${formatMZN(sale.total)} registada com sucesso!`);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: FECHO DE CAIXA DO DIA */}
      {/* ========================================================= */}
      {showCashRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#032018] border border-emerald-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-950">
              <div className="flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base">Fecho de Caixa Diário</h3>
              </div>
              <button onClick={() => setShowCashRegisterModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300">
              Conferência de entradas e saídas para: <strong className="text-emerald-400">{selectedStoreObj?.name || 'Todas as Lojas'}</strong>
            </p>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#04281f] rounded-xl flex justify-between items-center">
                <span>Entradas em Numerário (Dinheiro):</span>
                <strong className="text-white font-mono text-sm">{formatMZN(cashRegisterSummary.cash)}</strong>
              </div>
              <div className="p-3 bg-[#04281f] rounded-xl flex justify-between items-center">
                <span>Entradas via M-Pesa:</span>
                <strong className="text-rose-400 font-mono text-sm">{formatMZN(cashRegisterSummary.mpesa)}</strong>
              </div>
              <div className="p-3 bg-[#04281f] rounded-xl flex justify-between items-center">
                <span>Entradas via e-Mola:</span>
                <strong className="text-amber-400 font-mono text-sm">{formatMZN(cashRegisterSummary.emola)}</strong>
              </div>
              <div className="p-3 bg-[#04281f] rounded-xl flex justify-between items-center">
                <span>Entradas via Terminal POS:</span>
                <strong className="text-cyan-400 font-mono text-sm">{formatMZN(cashRegisterSummary.pos)}</strong>
              </div>
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl flex justify-between items-center">
                <span className="text-rose-200">Total de Despesas Pagas:</span>
                <strong className="text-rose-400 font-mono text-sm">-{formatMZN(cashRegisterSummary.expensesTotal)}</strong>
              </div>
              <div className="p-4 bg-emerald-950 border border-emerald-500/60 rounded-xl flex justify-between items-center text-sm">
                <span className="font-bold text-white">Saldo em Dinheiro Físico Disponível:</span>
                <strong className="text-emerald-300 font-black text-base">{formatMZN(cashRegisterSummary.netCashBalance)}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950">
              <button
                onClick={() => {
                  window.print();
                  setShowCashRegisterModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-emerald-900 rounded-lg font-bold"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Comprovativo</span>
              </button>
              <button
                onClick={() => setShowCashRegisterModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
              >
                Concluir Conferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADICIONAR NOVA LOJA (COM TAXAS, MOEDA, CONTACTOS) */}
      {/* ========================================================= */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#032018] border border-emerald-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-950">
              <div className="flex items-center gap-2 text-white">
                <StoreIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Adicionar Nova Loja à Rede Comercial</h3>
              </div>
              <button onClick={() => setShowAddStoreModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código da Filial:</label>
                  <input
                    type="text"
                    value={newStore.code}
                    onChange={(e) => setNewStore({ ...newStore, code: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Comercial da Loja:</label>
                  <input
                    type="text"
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    placeholder="Ex: Loja 7 - Quelimane Sangalauize"
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cidade:</label>
                  <input
                    type="text"
                    value={newStore.city}
                    onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Província:</label>
                  <input
                    type="text"
                    value={newStore.province}
                    onChange={(e) => setNewStore({ ...newStore, province: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço Completo:</label>
                <input
                  type="text"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  placeholder="Av. Julius Nyerere, Mercado Central ou Bairro"
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contacto Telefónico:</label>
                  <input
                    type="text"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    placeholder="+258 84 123 4567"
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">E-mail de Contacto (Opcional):</label>
                  <input
                    type="email"
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    placeholder="loja@slvendas.co.mz"
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gerente:</label>
                  <input
                    type="text"
                    value={newStore.managerName}
                    onChange={(e) => setNewStore({ ...newStore, managerName: e.target.value })}
                    placeholder="Nome do gerente"
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Moeda:</label>
                  <select
                    value={newStore.currency}
                    onChange={(e) => setNewStore({ ...newStore, currency: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="MZN">MZN (Metical)</option>
                    <option value="USD">USD (Dólar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taxa IVA (%):</label>
                  <input
                    type="number"
                    value={newStore.taxRate}
                    onChange={(e) => setNewStore({ ...newStore, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Meta Diária de Vendas (MZN):</label>
                <input
                  type="number"
                  value={newStore.dailyTarget}
                  onChange={(e) => setNewStore({ ...newStore, dailyTarget: parseFloat(e.target.value) || 15000 })}
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md"
                >
                  Cadastrar Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR PARÂMETROS DA LOJA */}
      {/* ========================================================= */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#032018] border border-emerald-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-950">
              <div className="flex items-center gap-2 text-white">
                <Edit className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Editar Parâmetros da Filial: {editingStore.name}</h3>
              </div>
              <button onClick={() => setEditingStore(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStore} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Comercial:</label>
                  <input
                    type="text"
                    value={editingStore.name}
                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gerente Responsável:</label>
                  <input
                    type="text"
                    value={editingStore.managerName}
                    onChange={(e) => setEditingStore({ ...editingStore, managerName: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço:</label>
                <input
                  type="text"
                  value={editingStore.address}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone:</label>
                  <input
                    type="text"
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Meta Diária (MZN):</label>
                  <input
                    type="number"
                    value={editingStore.dailyTarget}
                    onChange={(e) => setEditingStore({ ...editingStore, dailyTarget: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Taxa IVA (%):</label>
                  <input
                    type="number"
                    value={editingStore.taxRate !== undefined ? editingStore.taxRate : 16}
                    onChange={(e) => setEditingStore({ ...editingStore, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Estado Operacional:</label>
                  <select
                    value={editingStore.status}
                    onChange={(e) => setEditingStore({ ...editingStore, status: e.target.value as 'online' | 'offline' })}
                    className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="online">Operacional / Online</option>
                    <option value="offline">Suspensa / Inativa</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NOVO PRODUTO / EDITAR PRODUTO */}
      {/* ========================================================= */}
      <ProductModal
        isOpen={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false);
          setEditingProduct(null);
        }}
        onSave={(prodData) => {
          addProduct(prodData);
          addToast('success', 'Produto Registado', `Item "${prodData.name}" adicionado com sucesso ao inventário.`);
          playAudioFeedback('success');
        }}
        onUpdate={(prod) => {
          updateProduct(prod);
          addToast('success', 'Artigo Atualizado', `As alterações no artigo "${prod.name}" foram guardadas com sucesso.`);
          playAudioFeedback('success');
        }}
        productToEdit={editingProduct}
        stores={stores}
      />

      {/* ========================================================= */}
      {/* MODAL: REPOSIÇÃO DE STOCK POR FILIAL */}
      {/* ========================================================= */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#121820] border border-slate-700/70 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">Registar Entrada de Stock</h3>
                  <p className="text-[11px] text-slate-400">Reposição de inventário por filial ou sede</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddStockModal(null);
                  setReplenishStoreId('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product summary banner */}
            <div className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
              {showAddStockModal.imageUrl ? (
                <img
                  src={showAddStockModal.imageUrl}
                  alt={showAddStockModal.name}
                  className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-xs truncate">{showAddStockModal.name}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-400 font-bold">{showAddStockModal.code}</span>
                  <span>•</span>
                  <span>Stock Total Atual: <strong className="text-white">{showAddStockModal.stockQuantity} {showAddStockModal.unit || 'un'}</strong></span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Store branch selector */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Filial de Destino da Mercadoria:
                </label>
                <select
                  value={replenishStoreId}
                  onChange={(e) => setReplenishStoreId(e.target.value)}
                  className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="">Todas as Lojas / Stock Central Consolidado</option>
                  {stores.map((s) => {
                    const currentStoreQty = showAddStockModal.stockByStore?.[s.id] ?? 0;
                    return (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.code.replace('LOJA-', 'LJ-')} • {s.name} (Atual: {currentStoreQty} {showAddStockModal.unit || 'un'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity to add */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1.5">
                  Quantidade a Adicionar ({showAddStockModal.unit || 'unidades'}):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStockAddAmount(Math.max(1, stockAddAmount - 5))}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={stockAddAmount}
                    onChange={(e) => setStockAddAmount(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#0a0f15] border border-emerald-600/70 rounded-xl px-3 py-2 text-center text-white font-extrabold text-base focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setStockAddAmount(stockAddAmount + 5)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAddAmount(stockAddAmount + 20)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    +20
                  </button>
                </div>
              </div>

              {/* Updated cost price */}
              <div>
                <label className="block text-slate-200 font-semibold mb-1.5">
                  Preço de Custo de Entrada (Opcional - MT):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder={showAddStockModal.costPrice.toString()}
                    value={stockAddCost || ''}
                    onChange={(e) => setStockAddCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold text-[11px]">MT</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddStockModal(null);
                  setReplenishStoreId('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddStockSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/60 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Entrada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR / ADICIONAR NOVO UTILIZADOR */}
      {/* ========================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0e161c] border border-emerald-800/80 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-4 text-xs my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">➕ Cadastrar Novo Colaborador</h3>
                  <p className="text-[11px] text-slate-400">Crie contas com foto de perfil, filial e privilégios específicos</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Profile Photo Selection & Preview */}
              <div>
                <label className="block text-slate-200 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Foto de Perfil do Colaborador:
                  </span>
                  <span className="text-[10px] text-slate-400">Escolha um avatar ou insira URL</span>
                </label>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#091016] border border-slate-800">
                  <img
                    src={newUser.avatar}
                    alt="Pré-visualização"
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-md shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={newUser.avatar}
                      onChange={(e) => setNewUser({ ...newUser, avatar: e.target.value })}
                      placeholder="URL da foto (ex: https://...)"
                      className="w-full bg-[#131d24] border border-slate-700 rounded-xl px-3 py-1.5 text-white text-[11px] placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Preset Avatars */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {PRESET_USER_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewUser({ ...newUser, avatar: av.url })}
                          className={`relative shrink-0 rounded-full border transition-all ${
                            newUser.avatar === av.url
                              ? 'border-emerald-400 scale-105 shadow-md'
                              : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} className="w-7 h-7 rounded-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Ex: Sandra Félix"
                    className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Função / Cargo:</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as 'seller' | 'manager' | 'admin',
                      })
                    }
                    className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="seller">👤 Vendedor de Balcão (PDV)</option>
                    <option value="manager">👔 Gerente de Loja / Supervisor</option>
                    <option value="admin">👑 Gestor Geral (Acesso Central)</option>
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de Início de Sessão:</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="exemplo@slvendas.co.mz"
                    className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contacto Telefónico:</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Assigned Store */}
              {newUser.role !== 'admin' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Loja / Filial Atribuída:</span>
                    <span className="text-[10px] text-emerald-400 font-normal">O vendedor só opera nesta loja</span>
                  </label>
                  <select
                    value={newUser.storeId}
                    onChange={(e) => setNewUser({ ...newUser, storeId: e.target.value })}
                    className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code.replace('LOJA-', 'LJ-')} • {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Palavra-passe Inicial:</span>
                  <span className="text-[10px] text-slate-400">Pode ser alterada a qualquer momento</span>
                </label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Vendedor@123"
                  className="w-full bg-[#091016] border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Permissions */}
              <div className="p-3 bg-[#091016] rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">
                  Permissões do Novo Utilizador:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.permissions.canApplyDiscount}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, canApplyDiscount: e.target.checked },
                        })
                      }
                      className="accent-emerald-500 rounded"
                    />
                    <span>Pode dar descontos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.permissions.canCancelSales}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, canCancelSales: e.target.checked },
                        })
                      }
                      className="accent-emerald-500 rounded"
                    />
                    <span>Pode cancelar vendas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.permissions.canViewReports}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, canViewReports: e.target.checked },
                        })
                      }
                      className="accent-emerald-500 rounded"
                    />
                    <span>Acesso a relatórios</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Desc. máx:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={newUser.permissions.maxDiscountPercent}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          permissions: {
                            ...newUser.permissions,
                            maxDiscountPercent: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-14 bg-[#131d24] border border-slate-700 rounded px-1.5 py-0.5 text-center text-emerald-400 font-bold"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/60 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar Colaborador</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECUPERAR / REDEFINIR SENHA DE UTILIZADOR */}
      {/* ========================================================= */}
      {userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e161c] border border-cyan-800/80 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">🔄 Recuperar Conta / Redefinir Senha</h3>
                  <p className="text-[11px] text-slate-400">Restabelecer acesso imediato do colaborador</p>
                </div>
              </div>
              <button
                onClick={() => setUserToReset(null)}
                className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#091016] rounded-2xl border border-slate-800 flex items-center gap-3">
              <img
                src={userToReset.avatar}
                alt={userToReset.name}
                className="w-12 h-12 rounded-full object-cover border border-cyan-500"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{userToReset.name}</h4>
                <p className="text-[11px] text-slate-400 truncate">{userToReset.email}</p>
                <p className="text-[10px] text-cyan-400 font-semibold">
                  {userToReset.role === 'admin' ? 'Gestor Geral' : userToReset.storeName || 'Filial'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Nova Palavra-passe a Definir:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#091016] border border-cyan-600/70 rounded-xl px-3.5 py-2.5 text-cyan-300 font-mono text-sm font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setResetPasswordInput('Vendedor@123')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                  >
                    Padrão
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  O utilizador poderá iniciar sessão imediatamente com esta credencial. Se a conta estava suspensa, será reativada automaticamente.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToReset(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/60 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>Confirmar e Reativar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ELIMINAÇÃO DE UTILIZADOR */}
      {/* ========================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#160d10] border border-rose-800/80 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">🗑️ Eliminar Colaborador</h3>
                <p className="text-[11px] text-rose-300">Esta ação remove o utilizador da base de dados central.</p>
              </div>
            </div>

            <div className="p-3 bg-[#0d0708] rounded-2xl border border-rose-950 flex items-center gap-3">
              <img
                src={userToDelete.avatar}
                alt={userToDelete.name}
                className="w-12 h-12 rounded-full object-cover border border-rose-600"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{userToDelete.name}</h4>
                <p className="text-[11px] text-slate-400 truncate">{userToDelete.email}</p>
                <p className="text-[10px] text-rose-400 font-semibold">
                  {userToDelete.role === 'admin' ? 'Gestor Geral' : userToDelete.storeName || 'Filial'}
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Tem a certeza de que pretende remover permanentemente a conta de <strong>{userToDelete.name}</strong>? O colaborador não poderá mais aceder ao PDV ou efetuar vendas.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-rose-950/80">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/60 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Eliminação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTAR DESPESA */}
      {/* ========================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#032018] border border-emerald-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-950">
              <h3 className="font-bold text-base text-white">Registar Despesa Operacional de Caixa</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Filial / Loja:</label>
                <select
                  value={newExpense.storeId}
                  onChange={(e) => setNewExpense({ ...newExpense, storeId: e.target.value })}
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Gasto:</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Ex: Saldo de internet para POS, transporte de mercadorias..."
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Montante (MZN):</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#021812] border border-emerald-900/80 rounded-lg px-3 py-2 text-white font-bold text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md"
                >
                  Lançar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR REMOÇÃO DE LOJA */}
      {/* ========================================================= */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Confirmar Remoção da Loja</h3>
            </div>
            <p className="text-slate-300">
              Tem a certeza de que deseja remover permanentemente a loja <strong>{storeToDelete.name}</strong>?
            </p>
            <p className="text-slate-400 text-[11px]">
              Esta ação será auditada e o histórico financeiro continuará registado para conferência fiscal.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setStoreToDelete(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteStore}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
              >
                Sim, Remover Loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ESTORNO DE VENDA */}
      {/* ========================================================= */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Estorno de Venda e Devolução ao Stock</h3>
            </div>
            <p className="text-slate-300">
              Venda: <strong>{saleToCancel.receiptNumber}</strong> &bull; Total: <strong>{formatMZN(saleToCancel.total)}</strong>
            </p>
            <p className="text-slate-400">
              Os produtos serão automaticamente devolvidos ao stock da loja e a transação será marcada como cancelada.
            </p>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Motivo do Estorno (Obrigatório):</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Devolução por desistência do cliente / produto avariado"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSaleToCancel(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancelSale}
                disabled={!cancelReason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-lg"
              >
                Efetuar Estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ELIMINAÇÃO DE CONTAS & REINICIALIZAÇÃO DO ZERO */}
      {/* ========================================================= */}
      {showWipeAccountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e161c] border-2 border-rose-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 text-xs my-8">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-rose-950">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <UserMinus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    Limpeza Completa de Contas & Reinicialização
                  </h3>
                  <p className="text-[11px] text-rose-300">
                    Purga segura de vendedores e caixas de demonstração &bull; Sessões revogadas no servidor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWipeAccountsModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preserved Master Admin Shield */}
            <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-xs block">Administrador Principal Preservado:</strong>
                <p className="text-emerald-300 text-[11px] mt-0.5">
                  A conta <strong>Moisés Estenda (moisesmarioestenda1999@gmail.com)</strong> não será apagada.
                  O seu acesso de Gestor Geral permanece ativo para continuar a administrar todo o sistema.
                </p>
              </div>
            </div>

            {/* Old Accounts to be Deleted List */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block text-xs">
                Contas que serão eliminadas ({users.filter((u) => u.email !== 'moisesmarioestenda1999@gmail.com' && u.id !== 'user-admin').length}):
              </label>
              <div className="max-h-28 overflow-y-auto bg-[#070d13] p-2.5 rounded-xl border border-slate-800 divide-y divide-slate-800/60">
                {users.filter((u) => u.email !== 'moisesmarioestenda1999@gmail.com' && u.id !== 'user-admin').map((u) => (
                  <div key={u.id} className="py-1.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{u.name}</span>
                      <span className="text-slate-500">({u.email})</span>
                    </div>
                    <span className="text-rose-400 font-mono text-[10px] uppercase">
                      {u.role === 'manager' ? 'Gerente' : 'Vendedor'} &bull; {u.storeName || 'Sede'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-register New Accounts Form */}
            <div className="p-4 bg-[#091219] rounded-2xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-white">
                  ➕ Cadastrar Imediatamente Novas Contas Comerciais (Opcional):
                </span>
                <span className="text-[10px] text-cyan-400 font-medium">Prontas para uso</span>
              </div>

              {/* Account 1: New Manager */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c1822] border border-cyan-900/40">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                  1. Novo Gerente de Loja:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newManagerData.name}
                    onChange={(e) => setNewManagerData({ ...newManagerData, name: e.target.value })}
                    placeholder="Nome do Gerente"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                  />
                  <input
                    type="email"
                    value={newManagerData.email}
                    onChange={(e) => setNewManagerData({ ...newManagerData, email: e.target.value })}
                    placeholder="Email de Acesso"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                  />
                  <input
                    type="text"
                    value={newManagerData.password}
                    onChange={(e) => setNewManagerData({ ...newManagerData, password: e.target.value })}
                    placeholder="Palavra-passe"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Account 2: New Cashier */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#0c1822] border border-cyan-900/40">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  2. Novo Operador de Caixa (PDV):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newCashierData.name}
                    onChange={(e) => setNewCashierData({ ...newCashierData, name: e.target.value })}
                    placeholder="Nome do Caixa"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                  />
                  <input
                    type="email"
                    value={newCashierData.email}
                    onChange={(e) => setNewCashierData({ ...newCashierData, email: e.target.value })}
                    placeholder="Email de Acesso"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                  />
                  <input
                    type="text"
                    value={newCashierData.password}
                    onChange={(e) => setNewCashierData({ ...newCashierData, password: e.target.value })}
                    placeholder="Palavra-passe"
                    className="bg-[#070e14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Strict Confirmation Input */}
            <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-2xl space-y-2">
              <label className="block text-slate-200 text-xs font-semibold">
                Para confirmar a eliminação de todas as contas secundárias, digite{' '}
                <strong className="text-rose-400 font-mono tracking-wider">LIMPAR CONTAS</strong>:
              </label>
              <input
                type="text"
                value={wipeConfirmPhrase}
                onChange={(e) => setWipeConfirmPhrase(e.target.value)}
                placeholder="LIMPAR CONTAS"
                className="w-full bg-[#080d12] border-2 border-rose-700 rounded-xl px-3 py-2 text-rose-300 font-mono font-black text-sm uppercase focus:outline-none focus:border-rose-500 text-center tracking-widest"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowWipeAccountsModal(false);
                  setWipeConfirmPhrase('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={wipeConfirmPhrase.trim() !== 'LIMPAR CONTAS' || isWipingAccounts}
                onClick={handleExecuteWipeAccounts}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-rose-950 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isWipingAccounts ? 'A processar limpeza...' : 'Executar Limpeza & Iniciar Novas Contas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VISUALIZAÇÃO DE RECIBO */}
      {/* ========================================================= */}
      <ReceiptModal sale={selectedReceipt} onClose={() => setSelectedReceipt(null)} />

      {/* ========================================================= */}
      {/* MODAL: ALTERAR NÚMERO DE TELEMÓVEL COM SMS */}
      {/* ========================================================= */}
      <ChangePhoneModal
        isOpen={showChangePhoneModal}
        onClose={() => setShowChangePhoneModal(false)}
      />
    </div>
  );
};
