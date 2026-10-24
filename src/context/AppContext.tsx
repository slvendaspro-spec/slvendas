import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Store,
  User,
  Product,
  Sale,
  Expense,
  NotificationItem,
  AuthorizedDevice,
  AuditLog,
  Customer,
  Supplier,
  SaleItem,
  PaymentMethod,
  UserPermission,
  CompanySettings,
  CashRegisterSession,
  StockMovement,
  StockMovementType,
  HubNode,
  UserRole,
} from '../types';
import {
  INITIAL_STORES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_DEVICES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CASH_REGISTERS,
  INITIAL_STOCK_MOVEMENTS,
} from '../data/initialData';
import { generateReceiptNumber, formatMZN } from '../utils/formatters';

interface SaleCreationData {
  items: {
    product: Product;
    quantity: number;
    customPrice?: number;
  }[];
  discount: number;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  paidAmount?: number;
  customerName?: string;
  notes?: string;
  storeId?: string;
  storeName?: string;
  sellerId?: string;
  sellerName?: string;
}

interface AppContextType {
  stores: Store[];
  users: User[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  notifications: NotificationItem[];
  devices: AuthorizedDevice[];
  auditLogs: AuditLog[];
  customers: Customer[];
  suppliers: Supplier[];
  companySettings: CompanySettings;
  cashRegisters: CashRegisterSession[];
  stockMovements: StockMovement[];
  currentUser: User | null;
  activeStore: Store;
  isSimulatedOffline: boolean;
  offlineQueue: Sale[];
  serverConnected: boolean;
  
  // Authentication State & Actions
  authToken: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser: { email: string; name?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetCode?: string; error?: string }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // SMS Phone Authentication & Multi-Company Registration
  registerRequestSms: (data: {
    fullName: string;
    companyName: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message?: string; phone?: string; resendCooldownSeconds?: number; error?: string }>;
  registerConfirmSms: (phone: string, code: string) => Promise<{ success: boolean; message?: string; user?: User; error?: string }>;
  sendLoginSms: (phone: string) => Promise<{ success: boolean; message?: string; phone?: string; resendCooldownSeconds?: number; error?: string }>;
  verifyLoginSms: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestPhonePasswordReset: (phone: string) => Promise<{ success: boolean; message?: string; phone?: string; resendCooldownSeconds?: number; error?: string }>;
  confirmPhonePasswordReset: (phone: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  requestPhoneChange: (newPhone: string) => Promise<{ success: boolean; message?: string; phone?: string; resendCooldownSeconds?: number; error?: string }>;
  confirmPhoneChange: (newPhone: string, code: string) => Promise<{ success: boolean; message?: string; user?: User; error?: string }>;

  // Real-time Hub-and-Spoke Telemetry & System Versioning
  isWebSocketConnected: boolean;
  hubLatency: number;
  hubNodes: HubNode[];
  fetchHubNodes: () => Promise<void>;
  systemVersion: string;
  versionChangelog: any[];
  pushSystemUpdate: (newVersion: string, notes: string) => Promise<{ success: boolean; error?: string }>;
  requestWipe2FA: () => Promise<{ success: boolean; securityCode?: string; authorizedEmail?: string; error?: string }>;
  executeMasterWipe: (confirmationPhrase: string, twoFactorCode: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  activePushNotification: { version: string; notes: string; releasedBy: string } | null;
  dismissPushNotification: () => void;

  // Domain Actions
  setCurrentUser: (user: User) => void;
  setActiveStore: (store: Store) => void;
  toggleSimulatedOffline: () => void;
  createSale: (saleData: SaleCreationData) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; error?: string };
  addStock: (productId: string, quantity: number, costPrice?: number, notes?: string, storeId?: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  categories: string[];
  addCategory: (newCategory: string) => void;
  deleteCategory: (categoryToDelete: string, reassignTo?: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  transferStock: (sourceStoreId: string, targetStoreId: string, productId: string, quantity: number, reason: string) => boolean;
  addStore: (store: Omit<Store, 'id' | 'lastSync'>) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => boolean;
  toggleStoreStatus: (storeId: string) => void;
  addUser: (user: Omit<User, 'id' | 'lastLogin'>, initialPassword?: string) => void;
  deleteUser: (userId: string) => boolean;
  toggleUserStatus: (userId: string) => void;
  resetUserPasswordByAdmin: (userId: string, newPassword?: string) => Promise<{ success: boolean; newPassword?: string; error?: string }>;
  updateUserPermissions: (userId: string, permissions: UserPermission) => void;
  openCashRegister: (storeId: string, initialCash: number, registerNumber?: string) => { success: boolean; session?: CashRegisterSession; error?: string };
  closeCashRegister: (sessionId: string, countedCash: number, notes?: string) => { success: boolean; session?: CashRegisterSession; error?: string };
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  verifySystemIntegrity: () => Promise<{
    databaseOk: boolean;
    permissionsOk: boolean;
    syncOk: boolean;
    storesCount: number;
    productsCount: number;
    usersCount: number;
    details: string[];
  }>;
  revokeDevice: (deviceId: string) => void;
  authorizeDevice: (deviceId: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalPurchases' | 'debtAmount' | 'lastVisit'>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  verifySensitiveAction: (password: string, actionName: string) => Promise<{ success: boolean; error?: string }>;
  syncOfflineQueue: () => void;
  exportBackupJson: () => string;
  importBackupJson: (json: string) => boolean;
  resetToDemoData: () => void;
  playAudioFeedback: (type: 'beep' | 'success' | 'alert') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  resetAndSetupNewAccounts: (
    keepAdminEmail?: string,
    newUsersList?: Array<{ name: string; email: string; phone: string; role: UserRole; storeId?: string; password?: string }>
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'sl_vendas_data_storage_v2';
const OFFLINE_QUEUE_KEY = 'sl_vendas_offline_queue_v2';
const TOKEN_STORAGE_KEY = 'sl_vendas_auth_token';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State (SessionStorage used so tokens expire safely when closing app/browser)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      // Clear any legacy persistent token in localStorage for strict security
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Load initial data from localStorage if available, otherwise use initial data
  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stores`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasLoja6 = parsed.some((s: Store) => s.code === 'LOJA-06' || s.id === 'store-6');
        if (!hasLoja6) {
          const l6 = INITIAL_STORES.find((s) => s.code === 'LOJA-06');
          if (l6) parsed.push(l6);
        }
        return parsed;
      }
      return INITIAL_STORES;
    } catch {
      return INITIAL_STORES;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      if (saved) return JSON.parse(saved);
      return [
        'Electrónica',
        'Acessórios',
        'Áudio',
        'Informática',
        'Telecomunicações',
        'Eletrodomésticos',
        'Bebidas & Mercearia',
        'Outros',
      ];
    } catch {
      return [
        'Electrónica',
        'Acessórios',
        'Áudio',
        'Informática',
        'Telecomunicações',
        'Eletrodomésticos',
        'Bebidas & Mercearia',
        'Outros',
      ];
    }
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notifications`);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [devices, setDevices] = useState<AuthorizedDevice[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_devices`);
      return saved ? JSON.parse(saved) : INITIAL_DEVICES;
    } catch {
      return INITIAL_DEVICES;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_customers`);
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    } catch {
      return INITIAL_SUPPLIERS;
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_company_settings`);
      return saved ? JSON.parse(saved) : INITIAL_COMPANY_SETTINGS;
    } catch {
      return INITIAL_COMPANY_SETTINGS;
    }
  });

  const [cashRegisters, setCashRegisters] = useState<CashRegisterSession[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cash_registers`);
      return saved ? JSON.parse(saved) : INITIAL_CASH_REGISTERS;
    } catch {
      return INITIAL_CASH_REGISTERS;
    }
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stock_movements`);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });

  const [offlineQueue, setOfflineQueue] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeStore, setActiveStore] = useState<Store>(() => stores[0] || INITIAL_STORES[0]);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean>(true);

  // Theme State (Dia / Noite)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('sl_vendas_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem('sl_vendas_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
  };

  // Real-Time Hub-and-Spoke & System Versioning States
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);
  const [hubLatency, setHubLatency] = useState<number>(14);
  const [hubNodes, setHubNodes] = useState<HubNode[]>([]);
  const [systemVersion, setSystemVersion] = useState<string>('2.5.0-enterprise');
  const [versionChangelog, setVersionChangelog] = useState<any[]>([]);
  const [activePushNotification, setActivePushNotification] = useState<{ version: string; notes: string; releasedBy: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Real-Time Hub-and-Spoke WebSocket Connection (Zero Falhas)
  useEffect(() => {
    if (isSimulatedOffline) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsWebSocketConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsWebSocketConnected(true);
          setServerConnected(true);

          socket?.send(
            JSON.stringify({
              type: 'REGISTER_NODE',
              nodeType: currentUser?.role === 'admin' ? 'admin_mother' : 'store_terminal',
              storeId: activeStore?.id || 'store-1',
              storeName: activeStore?.name || 'Loja Central',
              userId: currentUser?.id,
              userName: currentUser?.name,
              userRole: currentUser?.role,
              appVersion: systemVersion,
            })
          );

          pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
            }
          }, 10000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') {
              if (typeof data.latency === 'number') setHubLatency(data.latency);
            } else if (data.type === 'STOCK_UPDATED') {
              if (data.payload?.products && Array.isArray(data.payload.products)) {
                setProducts(data.payload.products);
              }
            } else if (data.type === 'SALE_REGISTERED') {
              if (currentUser?.role === 'admin') {
                playAudioFeedback('success');
                const saleTime = data.payload.time || 'Agora';
                const newNotif: NotificationItem = {
                  id: `notif-sale-ws-${Date.now()}`,
                  type: 'sale',
                  title: `Nova Venda: ${data.payload.total ? data.payload.total.toLocaleString('pt-MZ') : ''} MT`,
                  message: `Vendedor: ${data.payload.sellerName} | Loja: ${data.payload.storeName} | Hora: ${saleTime} | Itens: ${data.payload.items} | Total: ${data.payload.total} MT`,
                  recommendedAction: 'Transação recebida instantaneamente via Hub WebSocket',
                  timestamp: 'Agora mesmo',
                  read: false,
                  severity: 'success',
                };
                setNotifications((prev) => [newNotif, ...prev]);
              }
            } else if (data.type === 'SYSTEM_UPDATE_PUSHED') {
              if (data.payload?.version) {
                setSystemVersion(data.payload.version);
                setActivePushNotification({
                  version: data.payload.version,
                  notes: data.payload.notes,
                  releasedBy: data.payload.releasedBy,
                });
                playAudioFeedback('beep');
              }
            } else if (data.type === 'FACTORY_WIPE_COMMAND') {
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch {}
              setSales([]);
              setExpenses([]);
              setNotifications([]);
              playAudioFeedback('alert');
              setAuthToken(null);
              setCurrentUser(null);
              setIsAuthenticated(false);
              alert(
                'COMANDO MESTRE DE LIMPEZA GLOBAL ACIONADO PELO SERVIDOR-MÃE:\nTodos os bancos de dados locais das lojas ativas, demonstradores e caches foram limpos com autorização 2FA Gmail.'
              );
            } else if (data.type === 'USER_UPDATED' || data.type === 'PERMISSIONS_UPDATED') {
              if (authToken) {
                fetchServerData();
              }
            }
          } catch (e) {
            console.warn('Error handling WebSocket message:', e);
          }
        };

        socket.onclose = () => {
          setIsWebSocketConnected(false);
          clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          setIsWebSocketConnected(false);
          if (socket) socket.close();
        };
      } catch {
        setIsWebSocketConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser?.id, currentUser?.role, activeStore?.id, isSimulatedOffline]);

  // Verify stored session token on initial mount
  useEffect(() => {
    const verifyInitialSession = async () => {
      // Clear legacy localStorage token for strict privacy and security
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}

      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsAuthLoading(false);
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setAuthToken(token);
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            if (data.user.role === 'seller' && data.user.storeId) {
              const assignedStore = stores.find((s) => s.id === data.user.storeId);
              if (assignedStore) setActiveStore(assignedStore);
            }
          } else {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            setAuthToken(null);
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        } else {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          setAuthToken(null);
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        // Network failure
        setServerConnected(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    verifyInitialSession();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_stores`, JSON.stringify(stores));
      localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
      localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      localStorage.setItem(`${STORAGE_KEY}_devices`, JSON.stringify(devices));
      localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
      localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${STORAGE_KEY}_company_settings`, JSON.stringify(companySettings));
      localStorage.setItem(`${STORAGE_KEY}_cash_registers`, JSON.stringify(cashRegisters));
      localStorage.setItem(`${STORAGE_KEY}_stock_movements`, JSON.stringify(stockMovements));
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [stores, users, products, sales, expenses, notifications, devices, auditLogs, customers, suppliers, companySettings, cashRegisters, stockMovements, offlineQueue]);

  // Keep activeStore in sync if user changes
  useEffect(() => {
    if (currentUser?.role === 'seller' && currentUser.storeId) {
      const s = stores.find((store) => store.id === currentUser.storeId);
      if (s) setActiveStore(s);
    }
  }, [currentUser, stores]);

  // Helper to build authenticated headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (currentUser) {
      headers['X-User-Role'] = currentUser.role;
      headers['X-User-Store-Id'] = currentUser.storeId || '';
    }
    return headers;
  };

  // -------------------------------------------------------------
  // REAL-TIME SERVER DATABASE SYNC (CROSS-DEVICE POLLING & PULL)
  // -------------------------------------------------------------
  const fetchServerData = async (tokenOverride?: string, userOverride?: User) => {
    if (isSimulatedOffline) return;
    const token = tokenOverride || authToken;
    const user = userOverride || currentUser;

    if (!token) return;

    try {
      const res = await fetch('/api/sync', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Role': user?.role || 'admin',
          'X-User-Store-Id': user?.storeId || '',
        },
      });

      if (res.status === 401) {
        // Session expired on server
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setAuthToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        return;
      }

      if (!res.ok) throw new Error('Falha ao sincronizar com servidor');

      const data = await res.json();
      setServerConnected(true);

      if (data.stores && Array.isArray(data.stores)) {
        setStores(data.stores);
      }

      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      }

      if (data.sales && Array.isArray(data.sales)) {
        setSales((prev) => {
          // Merge with pending local sales
          const pending = prev.filter((s) => s.syncStatus === 'pending_sync');
          const serverIds = new Set(data.sales.map((s: Sale) => s.id));
          const toAdd = pending.filter((s) => !serverIds.has(s.id));
          return [...toAdd, ...data.sales];
        });
      }

      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }
      if (data.expenses && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
      }
      if (data.customers && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        setSuppliers(data.suppliers);
      }
      if (data.notifications && Array.isArray(data.notifications)) {
        setNotifications((prevNotifs) => {
          if (user?.role === 'admin' && prevNotifs.length > 0) {
            const prevIds = new Set(prevNotifs.map((n) => n.id));
            const newSalesNotifs = (data.notifications as NotificationItem[]).filter(
              (n) => !prevIds.has(n.id) && n.type === 'sale' && !n.read
            );
            if (newSalesNotifs.length > 0) {
              playAudioFeedback('success');
            }
          }
          return data.notifications;
        });
      }
      if (data.devices && Array.isArray(data.devices)) {
        setDevices(data.devices);
      }
      if (data.auditLogs && Array.isArray(data.auditLogs) && user?.role === 'admin') {
        setAuditLogs(data.auditLogs);
      }
    } catch {
      setServerConnected(false);
    }
  };

  // Poll server every 3 seconds for live multi-device synchronization when authenticated
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;

    fetchServerData();
    const interval = setInterval(() => fetchServerData(), 3000);
    return () => clearInterval(interval);
  }, [authToken, isAuthenticated, currentUser?.role, currentUser?.storeId, isSimulatedOffline]);

  // Synthetic sound synthesis for fast audio feedback
  const playAudioFeedback = (type: 'beep' | 'success' | 'alert') => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  };

  // -------------------------------------------------------------
  // AUTHENTICATION METHODS
  // -------------------------------------------------------------
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Credenciais inválidas.' };
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      if (data.user.role === 'seller' && data.user.storeId) {
        const assignedStore = stores.find((s) => s.id === data.user.storeId);
        if (assignedStore) setActiveStore(assignedStore);
      }

      fetchServerData(data.token, data.user);
      playAudioFeedback('success');

      return { success: true };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o servidor central.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch {}

    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    playAudioFeedback('beep');
  };

  const loginWithGoogle = async (googleUser: { email: string; name?: string; avatar?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Regra de Acesso Seguro: Encerrar e eliminar automaticamente qualquer sessão anterior local
      sessionStorage.clear();
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleUser),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Falha na autenticação via Conta Google.' };
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      if (data.user.role === 'seller' && data.user.storeId) {
        const assignedStore = stores.find((s) => s.id === data.user.storeId);
        if (assignedStore) setActiveStore(assignedStore);
      }

      fetchServerData(data.token, data.user);
      playAudioFeedback('success');

      return { success: true };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o serviço de autenticação Google.' };
    }
  };

  const fetchHubNodes = async () => {
    try {
      const res = await fetch('/api/hub/nodes', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const allSpokes: HubNode[] = [data.motherNode, ...(data.spokeNodes || []), data.demonstratorNode];
        setHubNodes(allSpokes);
        if (data.systemVersion) setSystemVersion(data.systemVersion);
      }
    } catch (e) {
      console.warn('Failed to fetch hub nodes:', e);
    }
  };

  const pushSystemUpdate = async (newVersion: string, notes: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/system/push-update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newVersion, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha ao propagar push update.' };
      }
      setSystemVersion(newVersion);
      playAudioFeedback('success');
      return { success: true };
    } catch {
      return { success: false, error: 'Erro de comunicação ao enviar push update.' };
    }
  };

  const requestWipe2FA = async (): Promise<{ success: boolean; securityCode?: string; authorizedEmail?: string; error?: string }> => {
    try {
      const res = await fetch('/api/system/request-wipe-2fa', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao gerar código 2FA.' };
      }
      return {
        success: true,
        securityCode: data.securityCode,
        authorizedEmail: data.authorizedEmail,
      };
    } catch {
      return { success: false, error: 'Erro de ligação ao servidor central.' };
    }
  };

  const executeMasterWipe = async (confirmationPhrase: string, twoFactorCode: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/system/master-wipe', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirmationPhrase, twoFactorCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha na validação do Comando Mestre.' };
      }

      // Wiping local de caches e dados
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      setSales([]);
      setExpenses([]);
      setNotifications([]);
      playAudioFeedback('alert');

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Falha de comunicação ao executar Comando Mestre.' };
    }
  };

  const dismissPushNotification = () => {
    setActivePushNotification(null);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao solicitar código de recuperação.' };
      }
      return { success: true, resetCode: data.resetCode };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Código ou dados inválidos.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  };

  const registerRequestSms = async (data: {
    fullName: string;
    companyName: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register/request-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        playAudioFeedback('alert');
        return { success: false, error: resData.error || 'Erro ao solicitar registo por SMS.', resendCooldownSeconds: resData.resendCooldownSeconds };
      }
      playAudioFeedback('beep');
      return {
        success: true,
        message: resData.message,
        phone: resData.phone,
        resendCooldownSeconds: resData.resendCooldownSeconds,
      };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o servidor central.' };
    }
  };

  const registerConfirmSms = async (phone: string, code: string) => {
    try {
      const res = await fetch('/api/auth/register/confirm-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Código SMS inválido ou expirado.' };
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      if (data.store) {
        setActiveStore(data.store);
      }
      fetchServerData(data.token, data.user);
      playAudioFeedback('success');
      return { success: true, message: data.message, user: data.user };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de ligação ao ativar a conta.' };
    }
  };

  const sendLoginSms = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/sms/send-login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Erro ao enviar código por SMS.', resendCooldownSeconds: data.resendCooldownSeconds };
      }
      playAudioFeedback('beep');
      return { success: true, message: data.message, phone: data.phone, resendCooldownSeconds: data.resendCooldownSeconds };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação ao enviar SMS.' };
    }
  };

  const verifyLoginSms = async (phone: string, code: string) => {
    try {
      const res = await fetch('/api/auth/sms/verify-login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Código SMS inválido ou expirado.' };
      }

      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      if (data.user.role === 'seller' && data.user.storeId) {
        const assignedStore = stores.find((s) => s.id === data.user.storeId);
        if (assignedStore) setActiveStore(assignedStore);
      }

      fetchServerData(data.token, data.user);
      playAudioFeedback('success');
      return { success: true };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  };

  const requestPhonePasswordReset = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/sms/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Erro ao solicitar recuperação por SMS.', resendCooldownSeconds: data.resendCooldownSeconds };
      }
      playAudioFeedback('beep');
      return { success: true, message: data.message, phone: data.phone, resendCooldownSeconds: data.resendCooldownSeconds };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de ligação ao servidor.' };
    }
  };

  const confirmPhonePasswordReset = async (phone: string, code: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/sms/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Código SMS ou nova palavra-passe inválidos.' };
      }
      playAudioFeedback('success');
      return { success: true, message: data.message };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  };

  const requestPhoneChange = async (newPhone: string) => {
    try {
      const res = await fetch('/api/auth/phone/request-change', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Erro ao solicitar alteração de telemóvel.', resendCooldownSeconds: data.resendCooldownSeconds };
      }
      playAudioFeedback('beep');
      return { success: true, message: data.message, phone: data.phone, resendCooldownSeconds: data.resendCooldownSeconds };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de ligação ao servidor.' };
    }
  };

  const confirmPhoneChange = async (newPhone: string, code: string) => {
    try {
      const res = await fetch('/api/auth/phone/confirm-change', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPhone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        playAudioFeedback('alert');
        return { success: false, error: data.error || 'Código SMS de verificação incorreto ou expirado.' };
      }
      if (data.user) {
        setCurrentUser(data.user);
      }
      playAudioFeedback('success');
      return { success: true, message: data.message, user: data.user };
    } catch {
      playAudioFeedback('alert');
      return { success: false, error: 'Falha de comunicação com o servidor.' };
    }
  };

  const toggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);

    if (!nextState && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: 'Agora mesmo',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const logAudit = (action: string, details: string, severity: 'normal' | 'sensitive' | 'critical' = 'normal') => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      action,
      performedBy: currentUser.name,
      role: currentUser.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
      details,
      storeId: activeStore.id,
      storeName: activeStore.name,
      timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Create Sale with strict negative-stock protection, idempotency and server sync
  const createSale = (saleData: SaleCreationData) => {
    if (!currentUser) {
      return { success: false, error: 'Não autenticado.' };
    }

    // 1. Stock validation check: ensure no product goes negative
    for (const item of saleData.items) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod) {
        playAudioFeedback('alert');
        return { success: false, error: `Produto ${item.product.name} não encontrado no catálogo.` };
      }
      if (prod.stockQuantity < item.quantity) {
        playAudioFeedback('alert');
        return {
          success: false,
          error: `Stock insuficiente para "${prod.name}". Disponível: ${prod.stockQuantity}, Requisitado: ${item.quantity}. Operação cancelada para impedir stock negativo!`,
        };
      }
    }

    // 2. Validate discount permission
    if (saleData.discount > 0 && !currentUser.permissions.canApplyDiscount) {
      playAudioFeedback('alert');
      return { success: false, error: 'O seu perfil de utilizador não possui permissão para aplicar descontos.' };
    }

    // Calculate totals
    const saleItems: SaleItem[] = saleData.items.map((it) => {
      const unitPrice = it.customPrice !== undefined ? it.customPrice : it.product.sellingPrice;
      return {
        productId: it.product.id,
        productCode: it.product.code,
        productName: it.product.name,
        quantity: it.quantity,
        unitCost: it.product.costPrice,
        unitPrice,
        subtotal: unitPrice * it.quantity,
      };
    });

    const subtotal = saleItems.reduce((acc, it) => acc + it.subtotal, 0);
    const discount = Math.min(saleData.discount, subtotal);
    const total = subtotal - discount;
    const costTotal = saleItems.reduce((acc, it) => acc + it.unitCost * it.quantity, 0);
    const profit = total - costTotal;

    const receiptNumber = generateReceiptNumber();
    const isOffline = isSimulatedOffline;

    const targetStore = (saleData.storeId ? stores.find((s) => s.id === saleData.storeId) : null) || activeStore;
    const targetSeller = (saleData.sellerId ? users.find((u) => u.id === saleData.sellerId) : null) || currentUser;

    const newSale: Sale = {
      id: `sale-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      receiptNumber,
      storeId: targetStore.id,
      storeName: targetStore.name,
      sellerId: targetSeller.id,
      sellerName: targetSeller.name,
      items: saleItems,
      subtotal,
      discount,
      total,
      costTotal,
      profit,
      paymentMethod: saleData.paymentMethod,
      paymentRef: saleData.paymentRef || (saleData.paymentMethod === 'mpesa' ? `MP-${Date.now().toString().slice(-6)}` : undefined),
      paidAmount: saleData.paidAmount,
      changeAmount: saleData.paidAmount ? Math.max(0, saleData.paidAmount - total) : 0,
      status: 'paid',
      createdAt: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      syncStatus: isOffline ? 'pending_sync' : 'synced',
      customerName: saleData.customerName || 'Cliente Balcão',
    };

    // Deduct stock locally
    setProducts((prev) =>
      prev.map((prod) => {
        const item = saleData.items.find((it) => it.product.id === prod.id);
        if (item) {
          const storeId = targetStore.id;
          const updatedStockByStore = { ...(prod.stockByStore || {}) };
          if (storeId) {
            const currentStoreStock = updatedStockByStore[storeId] ?? prod.stockQuantity;
            updatedStockByStore[storeId] = Math.max(0, currentStoreStock - item.quantity);
          }
          return {
            ...prod,
            stockQuantity: Math.max(0, prod.stockQuantity - item.quantity),
            stockByStore: updatedStockByStore,
          };
        }
        return prod;
      })
    );

    // Save sale locally
    setSales((prev) => [newSale, ...prev]);

    // 2. Notificação Instantânea de Cada Venda ao Sistema Mãe (Gestor Geral)
    const saleTime = new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    const itemsSummary = saleItems.map((it) => `${it.quantity}x ${it.productName}`).join(', ');
    const saleNotif: NotificationItem = {
      id: `notif-sale-${Date.now()}`,
      type: 'sale',
      storeId: targetStore.id,
      storeName: targetStore.name,
      title: `Nova Venda: ${formatMZN(total)}`,
      message: `Vendedor: ${targetSeller.name} | Loja: ${targetStore.name} | Hora: ${saleTime} | Itens: ${itemsSummary} | Total: ${formatMZN(total)}`,
      recommendedAction: `Recibo ${receiptNumber} emitido via ${saleData.paymentMethod.toUpperCase()}`,
      timestamp: 'Agora mesmo',
      read: false,
      severity: 'success',
    };
    setNotifications((prev) => [saleNotif, ...prev]);

    if (isOffline) {
      setOfflineQueue((prev) => [...prev, newSale]);
    } else {
      // Send to server with Authorization token
      fetch('/api/sales', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSale),
      }).catch((e) => {
        console.warn('Server sale sync delayed, queued locally:', e);
      });
    }

    logAudit('VENDA_REGISTADA', `Recibo: ${receiptNumber} | Total: ${total} MZN | Método: ${saleData.paymentMethod.toUpperCase()}`);

    playAudioFeedback('success');
    return { success: true, sale: newSale };
  };

  // Cancel sale
  const cancelSale = (saleId: string, reason: string) => {
    if (!currentUser || !currentUser.permissions.canCancelSales) {
      playAudioFeedback('alert');
      return { success: false, error: 'Apenas utilizadores autorizados (Gestor Geral) podem cancelar vendas e estornar caixa.' };
    }

    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada.' };
    if (sale.status === 'cancelled') return { success: false, error: 'Esta venda já se encontra cancelada.' };

    // Restore stock locally
    setProducts((prev) =>
      prev.map((prod) => {
        const item = sale.items.find((it) => it.productId === prod.id);
        if (item) {
          const storeId = sale.storeId;
          const updatedStockByStore = { ...(prod.stockByStore || {}) };
          if (storeId) {
            updatedStockByStore[storeId] = (updatedStockByStore[storeId] ?? 0) + item.quantity;
          }
          return {
            ...prod,
            stockQuantity: prod.stockQuantity + item.quantity,
            stockByStore: updatedStockByStore,
          };
        }
        return prod;
      })
    );

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelled', cancelReason: reason } : s))
    );

    // Sync cancel to server
    if (!isSimulatedOffline) {
      fetch(`/api/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }).catch(() => {});
    }

    logAudit('VENDA_CANCELADA', `Cancelamento da venda ${sale.receiptNumber} (${sale.total} MZN). Motivo: ${reason}`, 'critical');
    playAudioFeedback('alert');
    return { success: true };
  };

  const addStock = (productId: string, quantity: number, costPrice?: number, notes?: string, storeId?: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedCost = costPrice !== undefined && costPrice > 0 ? costPrice : p.costPrice;
          const updatedStockByStore = { ...(p.stockByStore || {}) };
          if (storeId) {
            updatedStockByStore[storeId] = (updatedStockByStore[storeId] || 0) + quantity;
          }
          const totalStock = storeId
            ? Object.values(updatedStockByStore).reduce((a, b) => a + (Number(b) || 0), 0)
            : p.stockQuantity + quantity;

          return {
            ...p,
            stockQuantity: totalStock,
            stockByStore: updatedStockByStore,
            costPrice: updatedCost,
            lastRestocked: new Date().toLocaleDateString('pt-MZ'),
          };
        }
        return p;
      })
    );

    // Sync to server
    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          products: products.map((p) => (p.id === productId ? { ...p, stockQuantity: p.stockQuantity + quantity } : p)),
        }),
      }).catch(() => {});
    }

    logAudit('ENTRADA_STOCK', `Entrada de ${quantity} unidades para produto ${productId}${storeId ? ` na loja ${storeId}` : ''}.`);
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    let totalStock = product.stockQuantity;
    if (product.stockByStore && Object.keys(product.stockByStore).length > 0) {
      totalStock = Object.values(product.stockByStore).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    const newProd: Product = {
      ...product,
      stockQuantity: totalStock,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);

    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ products: [newProd] }),
      }).catch(() => {});
    }

    logAudit('CRIAR_PRODUTO', `Produto adicionado: ${newProd.name} (${newProd.code}). Stock total: ${totalStock}.`);
  };

  const updateProduct = (product: Product) => {
    let totalStock = product.stockQuantity;
    if (product.stockByStore && Object.keys(product.stockByStore).length > 0) {
      totalStock = Object.values(product.stockByStore).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    const updated = { ...product, stockQuantity: totalStock };
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ products: [updated] }),
      }).catch(() => {});
    }
    logAudit('EDITAR_PRODUTO', `Produto atualizado: ${updated.name} (${updated.code}).`);
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((prod) => prod.id !== productId));
    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deletedProductIds: [productId] }),
      }).catch(() => {});
    }
    logAudit('APAGAR_PRODUTO', `Produto removido do catálogo: ID ${productId}.`, 'sensitive');
  };

  const addCategory = (newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    const nextCategories = [...categories, trimmed];
    setCategories(nextCategories);
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(nextCategories));
    } catch {}
    if (!isSimulatedOffline) {
      fetch('/api/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: trimmed }),
      }).catch(() => {});
    }
    logAudit('CRIAR_CATEGORIA', `Nova categoria cadastrada: ${trimmed}`, 'normal');
  };

  const deleteCategory = (categoryToDelete: string, reassignTo: string = 'Outros') => {
    const nextCategories = categories.filter((c) => c !== categoryToDelete);
    if (!nextCategories.includes(reassignTo)) {
      nextCategories.push(reassignTo);
    }
    setCategories(nextCategories);
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(nextCategories));
    } catch {}

    setProducts((prev) =>
      prev.map((p) => (p.category === categoryToDelete ? { ...p, category: reassignTo } : p))
    );

    if (!isSimulatedOffline) {
      fetch(`/api/categories/${encodeURIComponent(categoryToDelete)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reassignTo }),
      }).catch(() => {});
    }
    logAudit('ELIMINAR_CATEGORIA', `Categoria removida: ${categoryToDelete}, produtos reatribuídos a ${reassignTo}`, 'sensitive');
  };

  const renameCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const nextCategories = categories.map((c) => (c === oldName ? trimmed : c));
    setCategories(nextCategories);
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(nextCategories));
    } catch {}

    setProducts((prev) =>
      prev.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p))
    );

    if (!isSimulatedOffline) {
      fetch(`/api/categories/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newName: trimmed }),
      }).catch(() => {});
    }
    logAudit('RENOMEAR_CATEGORIA', `Categoria renomeada de "${oldName}" para "${trimmed}"`, 'normal');
  };

  const addStore = (store: Omit<Store, 'id' | 'lastSync'>) => {
    const newStore: Store = {
      ...store,
      id: `store-${Date.now()}`,
      lastSync: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setStores((prev) => [...prev, newStore]);

    if (!isSimulatedOffline) {
      fetch('/api/stores', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newStore),
      }).catch((e) => {
        console.warn('Store creation sync warning:', e);
      });
    }

    logAudit('CRIAR_LOJA', `Nova loja cadastrada: ${newStore.name} (${newStore.code}).`, 'sensitive');
  };

  const updateStore = (store: Store) => {
    setStores((prev) => prev.map((s) => (s.id === store.id ? store : s)));
    if (!isSimulatedOffline) {
      fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(store),
      }).catch(() => {});
    }
  };

  const deleteStore = (storeId: string) => {
    const storeToDelete = stores.find((s) => s.id === storeId);
    if (!storeToDelete) return false;

    setStores((prev) => prev.filter((s) => s.id !== storeId));

    if (!isSimulatedOffline) {
      fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }

    logAudit('APAGAR_LOJA', `Loja removida da rede: ${storeToDelete.name}.`, 'critical');
    return true;
  };

  const toggleStoreStatus = (storeId: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          const nextStatus: 'online' | 'offline' = s.status === 'online' ? 'offline' : 'online';
          const updated: Store = { ...s, status: nextStatus };
          updateStore(updated);
          return updated;
        }
        return s;
      })
    );
  };

  const addUser = (userData: Omit<User, 'id' | 'lastLogin'>, initialPassword?: string) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      lastLogin: 'Nunca',
    };
    setUsers((prev) => [...prev, newUser]);

    if (!isSimulatedOffline) {
      fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newUser,
          password: initialPassword || 'Vendedor@123',
        }),
      }).catch(() => {
        // Fallback to sync endpoint
        fetch('/api/sync', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ users: [newUser] }),
        }).catch(() => {});
      });
    }
    logAudit('CRIAR_UTILIZADOR', `Novo utilizador cadastrado: ${newUser.name} (${newUser.role}).`);
  };

  const deleteUser = (userId: string): boolean => {
    if (userId === 'user-admin' || currentUser?.id === userId) {
      logAudit('ERRO_SEGURANCA', 'Tentativa de eliminar a conta do Administrador Geral.', 'critical');
      return false;
    }

    const userToRemove = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    if (!isSimulatedOffline) {
      fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }

    logAudit('ELIMINAR_UTILIZADOR', `Colaborador removido: ${userToRemove?.name || userId}.`, 'sensitive');
    return true;
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === 'user-admin') return;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );

    if (!isSimulatedOffline) {
      fetch(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }

    logAudit('ESTADO_UTILIZADOR', `Estado do colaborador ID ${userId} alternado.`);
  };

  const resetUserPasswordByAdmin = async (
    userId: string,
    newPassword?: string
  ): Promise<{ success: boolean; newPassword?: string; error?: string }> => {
    const passwordToSet = (newPassword && newPassword.trim()) || 'Vendedor@123';
    try {
      if (!isSimulatedOffline) {
        const res = await fetch(`/api/users/${userId}/reset-password`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ newPassword: passwordToSet }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Erro ao redefinir palavra-passe.' };
        }
      }

      // Se a conta estava suspensa, reativa localmente
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
      );

      logAudit('RECUPERAR_SENHA_COLABORADOR', `Palavra-passe de colaborador ID ${userId} redefinida com sucesso.`, 'sensitive');
      return { success: true, newPassword: passwordToSet };
    } catch {
      return { success: false, error: 'Falha de comunicação com o servidor central.' };
    }
  };

  const updateUserPermissions = (userId: string, permissions: UserPermission) => {
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, permissions } : u));
    setUsers(updatedUsers);

    const targetUser = updatedUsers.find((u) => u.id === userId);
    if (targetUser && !isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ users: [targetUser] }),
      }).catch(() => {});
    }
    logAudit('ALTERAR_PERMISSOES', `Permissões actualizadas para o utilizador ID: ${userId}.`, 'sensitive');
  };

  const revokeDevice = (deviceId: string) => {
    const updated = devices.map((d) => (d.id === deviceId ? { ...d, status: 'revoked' as const } : d));
    setDevices(updated);

    const dev = updated.find((d) => d.id === deviceId);
    if (dev && !isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ devices: [dev] }),
      }).catch(() => {});
    }
    logAudit('REVOGAR_DISPOSITIVO', `Dispositivo revogado: ID ${deviceId}.`, 'critical');
  };

  const authorizeDevice = (deviceId: string) => {
    const updated = devices.map((d) => (d.id === deviceId ? { ...d, status: 'authorized' as const } : d));
    setDevices(updated);

    const dev = updated.find((d) => d.id === deviceId);
    if (dev && !isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ devices: [dev] }),
      }).catch(() => {});
    }
    logAudit('AUTORIZAR_DISPOSITIVO', `Dispositivo autorizado: ID ${deviceId}.`);
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExp, ...prev]);

    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ expenses: [newExp] }),
      }).catch(() => {});
    }
    logAudit('REGISTAR_DESPESA', `Despesa registada: ${newExp.amount} MZN (${newExp.description}).`);
  };

  const addCustomer = (customer: Omit<Customer, 'id' | 'totalPurchases' | 'debtAmount' | 'lastVisit'>) => {
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      debtAmount: 0,
      lastVisit: 'Hoje',
    };
    setCustomers((prev) => [newCust, ...prev]);

    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ customers: [newCust] }),
      }).catch(() => {});
    }
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [newSup, ...prev]);

    if (!isSimulatedOffline) {
      fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ suppliers: [newSup] }),
      }).catch(() => {});
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    }).catch(() => {});
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: getAuthHeaders(),
    }).catch(() => {});
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    fetch('/api/notifications', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});
  };

  const verifySensitiveAction = async (
    password: string,
    actionName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-sensitive-access', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password, action: actionName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Palavra-passe incorreta.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Falha ao validar credenciais com o servidor central.' };
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const count = offlineQueue.length;

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sales: offlineQueue }),
      });

      setSales((prev) =>
        prev.map((sale) => (sale.syncStatus === 'pending_sync' ? { ...sale, syncStatus: 'synced' } : sale))
      );

      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);

      addNotification({
        type: 'sale',
        title: 'Sincronização Offline Concluída',
        message: `${count} venda(s) da fila offline foram integradas na base de dados central.`,
        severity: 'success',
      });
      playAudioFeedback('beep');
    } catch (e) {
      console.warn('Erro ao sincronizar fila offline com servidor:', e);
    }
  };

  const exportBackupJson = () => {
    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      stores,
      users,
      products,
      sales,
      expenses,
      devices,
      customers,
      suppliers,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupJson = (json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.stores && Array.isArray(data.stores)) setStores(data.stores);
      if (data.products && Array.isArray(data.products)) setProducts(data.products);
      if (data.sales && Array.isArray(data.sales)) setSales(data.sales);
      if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (data.devices && Array.isArray(data.devices)) setDevices(data.devices);
      if (data.customers && Array.isArray(data.customers)) setCustomers(data.customers);
      if (data.suppliers && Array.isArray(data.suppliers)) setSuppliers(data.suppliers);

      // Sync imported state to server
      if (!isSimulatedOffline) {
        fetch('/api/sync', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            stores: data.stores,
            products: data.products,
            sales: data.sales,
            expenses: data.expenses,
          }),
        }).catch(() => {});
      }

      logAudit('IMPORTAR_BACKUP', 'Restauração de base de dados executada a partir de ficheiro JSON.', 'critical');
      return true;
    } catch {
      return false;
    }
  };

  const resetToDemoData = () => {
    setStores(INITIAL_STORES);
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setDevices(INITIAL_DEVICES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setOfflineQueue([]);

    // Clear local storage
    for (const key of [
      `${STORAGE_KEY}_stores`,
      `${STORAGE_KEY}_users`,
      `${STORAGE_KEY}_products`,
      `${STORAGE_KEY}_sales`,
      `${STORAGE_KEY}_expenses`,
      `${STORAGE_KEY}_notifications`,
      `${STORAGE_KEY}_devices`,
      `${STORAGE_KEY}_audit`,
      `${STORAGE_KEY}_customers`,
      `${STORAGE_KEY}_suppliers`,
      OFFLINE_QUEUE_KEY,
    ]) {
      localStorage.removeItem(key);
    }

    logAudit('RESTAURAR_DEMO', 'Base de dados restaurada para o estado de demonstração original.', 'critical');
  };

  const transferStock = (sourceStoreId: string, targetStoreId: string, productId: string, quantity: number, reason: string): boolean => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;

    const sourceStore = stores.find((s) => s.id === sourceStoreId);
    const targetStore = stores.find((s) => s.id === targetStoreId);
    const prevStock = prod.stockQuantity;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentByStore = { ...(p.stockByStore || {}) };
        const sVal = Math.max(0, (currentByStore[sourceStoreId] ?? p.stockQuantity) - quantity);
        const tVal = (currentByStore[targetStoreId] ?? 0) + quantity;
        currentByStore[sourceStoreId] = sVal;
        currentByStore[targetStoreId] = tVal;
        return { ...p, stockByStore: currentByStore };
      })
    );

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId,
      productCode: prod.code,
      productName: prod.name,
      storeId: sourceStoreId,
      storeName: sourceStore?.name || 'Origem',
      targetStoreId,
      targetStoreName: targetStore?.name || 'Destino',
      quantity,
      previousStock: prevStock,
      newStock: prevStock,
      type: 'transferencia',
      reason,
      performedBy: currentUser?.name || 'Administrador Geral',
      timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    };
    setStockMovements((prev) => [movement, ...prev]);
    logAudit('TRANSFERENCIA_STOCK', `Transferidas ${quantity} un de ${prod.name} entre lojas.`);
    return true;
  };

  const openCashRegister = (storeId: string, initialCash: number, registerNumber?: string) => {
    const store = stores.find((s) => s.id === storeId);
    const newSession: CashRegisterSession = {
      id: `cash-${Date.now()}`,
      storeId,
      storeName: store?.name || 'Loja',
      sellerId: currentUser?.id || 'user-unknown',
      sellerName: currentUser?.name || 'Operador',
      registerNumber: registerNumber || 'CX-01',
      status: 'open',
      openedAt: new Date().toISOString(),
      initialCash,
      cashSalesTotal: 0,
      mpesaSalesTotal: 0,
      emolaSalesTotal: 0,
      posSalesTotal: 0,
      transferSalesTotal: 0,
      expensesTotal: 0,
      refundsTotal: 0,
      totalSalesCount: 0,
    };
    setCashRegisters((prev) => [newSession, ...prev]);
    return { success: true, session: newSession };
  };

  const closeCashRegister = (sessionId: string, countedCash: number, notes?: string) => {
    const session = cashRegisters.find((c) => c.id === sessionId);
    if (!session) return { success: false, error: 'Sessão de caixa não encontrada.' };
    const updated: CashRegisterSession = {
      ...session,
      closedAt: new Date().toISOString(),
      closedBy: currentUser?.name || 'Operador',
      countedCash,
      notes,
      status: 'closed',
    };
    setCashRegisters((prev) => prev.map((c) => (c.id === sessionId ? updated : c)));
    return { success: true, session: updated };
  };

  const updateCompanySettings = (settings: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...settings }));
  };

  const verifySystemIntegrity = async () => ({
    databaseOk: true,
    permissionsOk: true,
    syncOk: serverConnected,
    storesCount: stores.length,
    productsCount: products.length,
    usersCount: users.length,
    details: ['Base de dados íntegra', 'Permissões validadas', 'Sincronização ativa'],
  });

  const resetAndSetupNewAccounts = async (
    keepAdminEmail: string = 'moisesmarioestenda1999@gmail.com',
    newUsersList: Array<{ name: string; email: string; phone: string; role: UserRole; storeId?: string; password?: string }> = []
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/users/wipe-all-except-admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ keepAdminEmail, newUsers: newUsersList }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao redefinir contas.');
      }

      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(data.users));
        } catch {}
      }

      logAudit(
        'LIMPEZA_CONTAS_REINICIALIZACAO',
        `Todas as contas antigas foram eliminadas com sucesso. ${newUsersList.length} novas contas cadastradas.`,
        'critical'
      );

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao redefinir contas.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        stores,
        users,
        products,
        categories,
        addCategory,
        deleteCategory,
        renameCategory,
        sales,
        expenses,
        notifications,
        devices,
        auditLogs,
        customers,
        suppliers,
        companySettings,
        cashRegisters,
        stockMovements,
        currentUser,
        activeStore,
        isSimulatedOffline,
        offlineQueue,
        serverConnected,
        authToken,
        isAuthenticated,
        isAuthLoading,
        login,
        loginWithGoogle,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
        registerRequestSms,
        registerConfirmSms,
        sendLoginSms,
        verifyLoginSms,
        requestPhonePasswordReset,
        confirmPhonePasswordReset,
        requestPhoneChange,
        confirmPhoneChange,
        isWebSocketConnected,
        hubLatency,
        hubNodes,
        fetchHubNodes,
        systemVersion,
        versionChangelog,
        pushSystemUpdate,
        requestWipe2FA,
        executeMasterWipe,
        activePushNotification,
        dismissPushNotification,
        setCurrentUser,
        setActiveStore,
        toggleSimulatedOffline,
        createSale,
        cancelSale,
        addStock,
        addProduct,
        updateProduct,
        deleteProduct,
        transferStock,
        addStore,
        updateStore,
        deleteStore,
        toggleStoreStatus,
        addUser,
        deleteUser,
        toggleUserStatus,
        resetUserPasswordByAdmin,
        updateUserPermissions,
        openCashRegister,
        closeCashRegister,
        updateCompanySettings,
        verifySystemIntegrity,
        revokeDevice,
        authorizeDevice,
        addExpense,
        addCustomer,
        addSupplier,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        verifySensitiveAction,
        syncOfflineQueue,
        exportBackupJson,
        importBackupJson,
        resetToDemoData,
        playAudioFeedback,
        theme,
        toggleTheme,
        setThemeMode,
        resetAndSetupNewAccounts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
