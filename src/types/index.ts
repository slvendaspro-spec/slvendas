export type UserRole = 'admin' | 'seller' | 'manager';

export interface UserPermission {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canCancelSales: boolean;
  canViewReports: boolean;
  canEditStock: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  storeId?: string; // null for admin
  storeName?: string;
  status: 'active' | 'suspended';
  permissions: UserPermission;
  avatar?: string;
  lastLogin: string;
}

export interface Store {
  id: string;
  code: string; // e.g. "LOJA-01"
  name: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  email?: string;
  managerName: string;
  status: 'online' | 'offline';
  dailyTarget: number;
  currency?: string; // default "MZN"
  taxRate?: number; // e.g. 16 for 16% IVA
  lastSync: string;
  createdAt?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  description?: string;
  costPrice: number; // Preço de compra
  sellingPrice: number; // Preço de venda
  stockQuantity: number; // Stock total consolidado de todas as lojas
  minStock: number;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  unit?: string; // 'un' | 'kg' | 'cx' | 'l' | 'pct' | 'm'
  stockByStore?: Record<string, number>; // { [storeId: string]: number }
  lastRestocked?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: string;
}

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  subtotal: number;
}

export type PaymentMethod = 'mpesa' | 'emola' | 'dinheiro' | 'cartao' | 'transferencia';

export interface Sale {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  sellerId: string;
  sellerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  paidAmount?: number;
  changeAmount?: number;
  status: 'paid' | 'cancelled' | 'refunded';
  cancelReason?: string;
  customerId?: string;
  customerName?: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending_sync';
}

export interface Expense {
  id: string;
  storeId: string;
  storeName: string;
  category: 'aluguer' | 'salarios' | 'energia_agua' | 'transporte' | 'mercadoria' | 'outros';
  description: string;
  amount: number;
  date: string;
  createdBy: string;
}

export type NotificationType =
  | 'sale'
  | 'low_stock'
  | 'out_of_stock'
  | 'device'
  | 'auth_fail'
  | 'permission'
  | 'cancellation'
  | 'high_discount'
  | 'store_offline'
  | 'sync_fail'
  | 'backup_fail';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  storeId?: string;
  storeName?: string;
  title: string;
  message: string;
  recommendedAction?: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface AuthorizedDevice {
  id: string;
  deviceName: string;
  deviceType: 'laptop' | 'smartphone' | 'tablet';
  os: string;
  ipAddress: string;
  storeId?: string;
  storeName?: string;
  isMotherDevice: boolean;
  status: 'authorized' | 'revoked';
  lastSeen: string;
  browser: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  role: string;
  details: string;
  storeId?: string;
  storeName?: string;
  timestamp: string;
  severity: 'normal' | 'sensitive' | 'critical';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  debtAmount: number;
  lastVisit: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  address: string;
}

export type StockMovementType =
  | 'entrada' // Reposição / Compra
  | 'saida' // Venda
  | 'devolucao' // Devolução
  | 'transferencia' // Transferência entre filiais
  | 'ajuste_inventario' // Inventário / Acerto
  | 'baixa_danificado'; // Quebra / Danificado

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  storeId: string;
  storeName: string;
  targetStoreId?: string;
  targetStoreName?: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  performedBy: string;
  reason: string;
  timestamp: string;
}

export interface CashRegisterSession {
  id: string;
  storeId: string;
  storeName: string;
  sellerId: string;
  sellerName: string;
  registerNumber: string; // ex: "CX-01"
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  initialCash: number; // Saldo de abertura em dinheiro
  expectedCash?: number; // Dinheiro esperado (Abertura + Vendas Dinheiro - Despesas)
  countedCash?: number; // Dinheiro contado no fecho
  difference?: number; // Diferença (Contado - Esperado)
  cashSalesTotal: number;
  mpesaSalesTotal: number;
  emolaSalesTotal: number;
  posSalesTotal: number;
  transferSalesTotal: number;
  expensesTotal: number;
  refundsTotal: number;
  totalSalesCount: number;
  notes?: string;
  closedBy?: string;
}

export interface CompanySettings {
  companyName: string;
  tradeName: string;
  nuit: string;
  taxRate: number; // 16% IVA
  address: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  thermalWidth: '58mm' | '80mm';
  posLayoutModel?: 'nati' | 'ed';
  printerType?: 'thermal_58mm_portable' | 'thermal_80mm_standard' | 'label_compact';
  paperEconomyMode?: boolean;
  themeMode?: 'light' | 'dark';
  footerMessage: string;
  isInitialSetupCompleted: boolean;
  setupSteps: {
    storeCreated: boolean;
    productsAndStockCreated: boolean;
    usersCreated: boolean;
    usersAssigned: boolean;
    taxAndReceiptConfigured: boolean;
    systemTested: boolean;
  };
}

export interface HubNode {
  nodeId: string;
  nodeType: 'admin_mother' | 'store_terminal' | 'demonstrator';
  storeId?: string;
  storeName?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  appVersion: string;
  ip: string;
  connectedAt: number;
  lastPing: number;
  latency: number;
  status: 'online' | 'syncing' | 'offline';
}

export interface SystemVersionInfo {
  currentVersion: string;
  lastPushedAt: string;
  pushedBy: string;
  changelog: Array<{
    version: string;
    releasedAt: string;
    notes: string;
    releasedBy: string;
  }>;
}

export type WebSocketEventType =
  | 'CONNECTED'
  | 'NODE_REGISTERED'
  | 'STOCK_UPDATED'
  | 'SALE_REGISTERED'
  | 'USER_UPDATED'
  | 'PERMISSIONS_UPDATED'
  | 'CASH_REGISTER_MUTATION'
  | 'SYSTEM_UPDATE_PUSHED'
  | 'FACTORY_WIPE_COMMAND'
  | 'PING'
  | 'PONG';

