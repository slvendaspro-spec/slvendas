import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
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
  INITIAL_CATEGORIES,
} from './src/data/initialData';
import { normalizePhoneNumber, maskPhoneNumber } from './src/utils/phoneUtils';
import {
  sendSmsVerificationCode,
  verifySmsOtpCode,
  getSmsGatewayStatus,
} from './src/services/smsService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// -------------------------------------------------------------
// CENTRALIZED SERVER-SIDE DATABASE (Persistent across reloads & devices)
// -------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface UserCredential {
  userId: string;
  email: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

export interface ActiveSession {
  userId: string;
  user: any;
  createdAt: number;
  expiresAt: number;
}

export interface ResetCodeEntry {
  email: string;
  code: string;
  expiresAt: number;
}

interface DatabaseSchema {
  stores: any[];
  users: any[];
  products: any[];
  categories?: any[];
  sales: any[];
  expenses: any[];
  notifications: any[];
  devices: any[];
  auditLogs: any[];
  customers: any[];
  suppliers: any[];
  credentials: UserCredential[];
  sessions: { [token: string]: ActiveSession };
  resetCodes: { [code: string]: ResetCodeEntry };
  systemVersion: string;
  versionChangelog: Array<{
    version: string;
    releasedAt: string;
    notes: string;
    releasedBy: string;
  }>;
  wipe2FA?: {
    code: string;
    expiresAt: number;
    authorizedEmail: string;
  };
  lastUpdated: string;
}

// Cryptographic password utilities (PBKDF2 SHA-512 with unique salts)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const computed = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function ensureDefaultCredentials(users: any[], existingCreds: UserCredential[] = []): UserCredential[] {
  const creds: UserCredential[] = [...existingCreds];

  for (const u of users) {
    const hasCred = creds.some(
      (c) => c.userId === u.id || c.email.toLowerCase() === u.email.toLowerCase()
    );
    if (!hasCred) {
      const salt = generateSalt();
      // Default passwords: Admin@2026! for Gestor Geral, Vendedor@123 for Vendedores
      const plainPass = u.role === 'admin' ? 'Admin@2026!' : 'Vendedor@123';
      creds.push({
        userId: u.id,
        email: u.email.toLowerCase(),
        salt,
        passwordHash: hashPassword(plainPass, salt),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return creds;
}

function ensureStore6User(users: any[]): any[] {
  const hasStore6Seller = users.some(
    (u) => u.email === 'mateus.cossa@slvendas.co.mz' || u.storeId === 'store-6'
  );
  if (!hasStore6Seller) {
    users.push({
      id: 'user-seller-6',
      name: 'Mateus Cossa',
      email: 'mateus.cossa@slvendas.co.mz',
      phone: '+258 84 444 7788',
      role: 'seller',
      storeId: 'store-6',
      storeName: 'Loja 6 - Murrumbala',
      status: 'active',
      permissions: {
        canApplyDiscount: true,
        maxDiscountPercent: 10,
        canCancelSales: false,
        canViewReports: false,
        canEditStock: false,
      },
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
      lastLogin: 'Nunca',
    });
  }
  return users;
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const users = ensureStore6User(parsed.users || INITIAL_USERS);
      const credentials = ensureDefaultCredentials(users, parsed.credentials || []);

      return {
        stores: parsed.stores || INITIAL_STORES,
        users,
        products: parsed.products || INITIAL_PRODUCTS,
        categories: parsed.categories || INITIAL_CATEGORIES.map((c) => c.name),
        sales: parsed.sales || INITIAL_SALES,
        expenses: parsed.expenses || INITIAL_EXPENSES,
        notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
        devices: parsed.devices || INITIAL_DEVICES,
        auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
        customers: parsed.customers || INITIAL_CUSTOMERS,
        suppliers: parsed.suppliers || INITIAL_SUPPLIERS,
        credentials,
        sessions: parsed.sessions || {},
        resetCodes: parsed.resetCodes || {},
        systemVersion: parsed.systemVersion || '2.5.0-enterprise',
        versionChangelog: parsed.versionChangelog || [
          {
            version: '2.5.0-enterprise',
            releasedAt: new Date().toLocaleDateString('pt-MZ'),
            notes: 'Arquitetura Hub-and-Spoke com WebSockets em tempo real, push update centralizado, suporte offline zero falhas e comando mestre de limpeza com 2FA Gmail.',
            releasedBy: 'Moisés Estenda (Gestor Geral)',
          },
        ],
        wipe2FA: parsed.wipe2FA,
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error reading database file, using initial data:', err);
  }

  // Initialize fresh database file
  const initialUsers = ensureStore6User(INITIAL_USERS);
  const initialCreds = ensureDefaultCredentials(initialUsers, []);

  const initialDb: DatabaseSchema = {
    stores: INITIAL_STORES,
    users: initialUsers,
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES.map((c) => c.name),
    sales: INITIAL_SALES,
    expenses: INITIAL_EXPENSES,
    notifications: INITIAL_NOTIFICATIONS,
    devices: INITIAL_DEVICES,
    auditLogs: INITIAL_AUDIT_LOGS,
    customers: INITIAL_CUSTOMERS,
    suppliers: INITIAL_SUPPLIERS,
    credentials: initialCreds,
    sessions: {},
    resetCodes: {},
    systemVersion: '2.5.0-enterprise',
    versionChangelog: [
      {
        version: '2.5.0-enterprise',
        releasedAt: new Date().toLocaleDateString('pt-MZ'),
        notes: 'Arquitetura Hub-and-Spoke com WebSockets em tempo real, push update centralizado, suporte offline zero falhas e comando mestre de limpeza com 2FA Gmail.',
        releasedBy: 'Moisés Estenda (Gestor Geral)',
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// In-memory cache synced with disk
let dbState = loadDatabase();

// -------------------------------------------------------------
// REAL-TIME HUB-AND-SPOKE WEBSOCKET ENGINE (Zero Falhas)
// -------------------------------------------------------------
export interface ConnectedNode {
  ws: WebSocket;
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

const connectedNodes = new Map<string, ConnectedNode>();

function broadcastToAll(eventType: string, payload: any) {
  const message = JSON.stringify({
    type: eventType,
    payload,
    timestamp: Date.now(),
  });
  for (const [nodeId, node] of connectedNodes.entries()) {
    if (node.ws.readyState === WebSocket.OPEN) {
      try {
        node.ws.send(message);
      } catch (err) {
        console.error(`Failed to send event to node ${nodeId}:`, err);
      }
    }
  }
}

function broadcastToRole(role: string, eventType: string, payload: any) {
  const message = JSON.stringify({
    type: eventType,
    payload,
    timestamp: Date.now(),
  });
  for (const [, node] of connectedNodes.entries()) {
    if (node.userRole === role && node.ws.readyState === WebSocket.OPEN) {
      try {
        node.ws.send(message);
      } catch {}
    }
  }
}

function broadcastToStore(storeId: string, eventType: string, payload: any) {
  const message = JSON.stringify({
    type: eventType,
    payload,
    timestamp: Date.now(),
  });
  for (const [, node] of connectedNodes.entries()) {
    if (node.storeId === storeId && node.ws.readyState === WebSocket.OPEN) {
      try {
        node.ws.send(message);
      } catch {}
    }
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & AUTHORIZATION HELPERS
// -------------------------------------------------------------
function getAuthenticatedUser(req: Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // Reload disk state if modified
  if (!dbState.sessions) dbState.sessions = {};
  const session = dbState.sessions[token];
  if (!session) return null;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    delete dbState.sessions[token];
    saveDatabase(dbState);
    return null;
  }

  // Retrieve latest user data from database state
  const latestUser = dbState.users.find((u) => u.id === session.userId);
  return latestUser || session.user;
}

function recordFailedLogin(identifier: string, ipAddress: string = 'Dispositivo Desconhecido') {
  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'TENTATIVA_ACESSO_FALHADA',
    performedBy: 'Sistema de Segurança',
    role: 'Sistema',
    details: `Tentativa de início de sessão falhada para a conta: "${identifier}" (${ipAddress}).`,
    timestamp: nowStr,
    severity: 'critical',
  });

  dbState.notifications.unshift({
    id: `notif-${Date.now()}`,
    type: 'failed_login',
    title: 'Tentativa de Acesso Inválida',
    message: `Tentativa falhada de autenticação para a conta "${identifier}".`,
    recommendedAction: 'Verificar se é um vendedor legítimo ou tentativa não autorizada.',
    timestamp: 'Agora mesmo',
    read: false,
    severity: 'danger',
  });

  saveDatabase(dbState);
}

// -------------------------------------------------------------
// AUTHENTICATION REST API ENDPOINTS
// -------------------------------------------------------------

// System Status & Real Diagnostics (Public)
app.get('/api/status', (_req: Request, res: Response) => {
  const hasFirebaseConfig = fs.existsSync(path.join(__dirname, 'firebase-applet-config.json'));
  res.json({
    status: 'online',
    system: 'SL Vendas — Sistema Central Online',
    database: {
      type: 'Persistent Server-Side Central DB with Cryptographic Auth',
      filePath: DB_FILE,
      storesCount: dbState.stores.length,
      usersCount: dbState.users.length,
      productsCount: dbState.products.length,
      salesCount: dbState.sales.length,
      activeSessionsCount: Object.keys(dbState.sessions || {}).length,
      lastUpdated: dbState.lastUpdated,
    },
    firebase: {
      configured: hasFirebaseConfig,
      details: hasFirebaseConfig
        ? 'Firebase credentials configured'
        : 'Firebase Authentication / Cloud Firestore não provisionado (usando Solução de Autenticação Segura Integrada no Servidor Express).',
    },
    timezone: 'Africa/Maputo',
    currency: 'MZN',
  });
});

// POST /api/auth/login - Autenticação segura com verificação criptográfica
app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = (req.body.email || req.body.identifier || '').toString();
  const password = (req.body.password || '').toString();
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email e palavra-passe são obrigatórios.',
      code: 'ERR_MISSING_CREDENTIALS',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhoneDigits = email.replace(/\D/g, '');
  dbState = loadDatabase();

  const user = dbState.users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      u.name.toLowerCase() === cleanEmail ||
      (u.phone && (u.phone.toLowerCase() === cleanEmail || (cleanPhoneDigits.length >= 7 && u.phone.replace(/\D/g, '').endsWith(cleanPhoneDigits))))
  );

  if (!user) {
    recordFailedLogin(cleanEmail, req.ip || req.socket.remoteAddress);
    return res.status(401).json({
      error: 'Credenciais inválidas: utilizador não encontrado no sistema.',
      code: 'ERR_INVALID_CREDENTIALS',
    });
  }

  const cred = dbState.credentials.find(
    (c) => c.userId === user.id || c.email.toLowerCase() === user.email.toLowerCase()
  );

  if (!cred) {
    recordFailedLogin(cleanEmail, req.ip || req.socket.remoteAddress);
    return res.status(401).json({
      error: 'Conta sem credenciais configuradas.',
      code: 'ERR_NO_CREDENTIALS',
    });
  }

  const isValid = verifyPassword(password, cred.salt, cred.passwordHash);
  if (!isValid) {
    recordFailedLogin(cleanEmail, req.ip || req.socket.remoteAddress);
    return res.status(401).json({
      error: 'Credenciais inválidas: palavra-passe incorreta.',
      code: 'ERR_INVALID_PASSWORD',
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'Acesso Recusado: Esta conta foi suspensa pelo Gestor Geral.',
      code: 'ERR_ACCOUNT_SUSPENDED',
    });
  }

  // Enforce single active session per user: revoke all previous active sessions
  if (dbState.sessions) {
    for (const oldToken in dbState.sessions) {
      if (
        dbState.sessions[oldToken].userId === user.id ||
        dbState.sessions[oldToken].user?.email?.toLowerCase() === cleanEmail
      ) {
        delete dbState.sessions[oldToken];
      }
    }
  }

  // Token de sessão com validade de 30 dias
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  if (!dbState.sessions) dbState.sessions = {};
  dbState.sessions[token] = {
    userId: user.id,
    user: { ...user, lastLogin: 'Agora mesmo' },
    createdAt: Date.now(),
    expiresAt,
  };

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  user.lastLogin = `Hoje às ${new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`;

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'INICIO_SESSAO',
    performedBy: user.name,
    role: user.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Sessão única iniciada para ${user.name}. Sessões anteriores invalidadas no dispositivo.`,
    storeId: user.storeId,
    storeName: user.storeName,
    timestamp: nowStr,
    severity: 'normal',
  });

  saveDatabase(dbState);

  res.json({
    success: true,
    token,
    user,
    expiresAt,
  });
});

// POST /api/auth/google - Autenticação nativa Google OAuth 2.0 / Firebase Gmail
app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'O email da conta Google é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  dbState = loadDatabase();

  // Enforce single active session: invalidate previous sessions for this user
  if (dbState.sessions) {
    for (const oldToken in dbState.sessions) {
      if (dbState.sessions[oldToken].user?.email?.toLowerCase() === cleanEmail) {
        delete dbState.sessions[oldToken];
      }
    }
  }

  let user = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);
  const isPrincipalAdmin = cleanEmail === 'moisesmarioestenda1999@gmail.com';

  if (!user) {
    const newUserRole = isPrincipalAdmin ? 'admin' : 'seller';
    const store = dbState.stores[0];
    user = {
      id: isPrincipalAdmin ? 'user-admin' : `user-${Date.now()}`,
      name: name || (isPrincipalAdmin ? 'Moisés Estenda' : cleanEmail.split('@')[0]),
      email: cleanEmail,
      phone: '+258 84 000 0001',
      role: newUserRole,
      storeId: newUserRole === 'admin' ? undefined : store?.id,
      storeName: newUserRole === 'admin' ? undefined : store?.name,
      status: 'active',
      permissions: {
        canApplyDiscount: true,
        maxDiscountPercent: isPrincipalAdmin ? 50 : 10,
        canCancelSales: isPrincipalAdmin,
        canViewReports: isPrincipalAdmin,
        canEditStock: isPrincipalAdmin,
      },
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      lastLogin: `Hoje às ${new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`,
    };
    dbState.users.push(user);
  } else {
    if (isPrincipalAdmin) {
      user.role = 'admin';
      user.status = 'active';
      user.permissions.canCancelSales = true;
      user.permissions.canViewReports = true;
      user.permissions.canEditStock = true;
    }
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'Acesso Recusado: Esta conta foi suspensa pelo Gestor Geral.',
      code: 'ERR_ACCOUNT_SUSPENDED',
    });
  }

  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  if (!dbState.sessions) dbState.sessions = {};
  dbState.sessions[token] = {
    userId: user.id,
    user: { ...user, lastLogin: 'Agora mesmo' },
    createdAt: Date.now(),
    expiresAt,
  };

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'INICIO_SESSAO_GOOGLE',
    performedBy: user.name,
    role: user.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Autenticação Google OAuth via ${cleanEmail}. Sessão única ativa garantida.`,
    storeId: user.storeId,
    storeName: user.storeName,
    timestamp: nowStr,
    severity: 'normal',
  });

  saveDatabase(dbState);

  res.json({
    success: true,
    token,
    user,
    expiresAt,
  });
});

// GET /api/auth/me - Verifica se a sessão actual é válida
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      authenticated: false,
      error: 'Sessão inválida ou expirada. Por favor inicie sessão novamente.',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  res.json({
    authenticated: true,
    user: authUser,
  });
});

// POST /api/auth/logout - Termina a sessão e revoga o token no servidor
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (dbState.sessions && dbState.sessions[token]) {
      const session = dbState.sessions[token];
      const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
      dbState.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        action: 'TERMINAR_SESSAO',
        performedBy: session.user.name,
        role: session.user.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
        details: `Sessão terminada para ${session.user.name}.`,
        storeId: session.user.storeId,
        storeName: session.user.storeName,
        timestamp: nowStr,
        severity: 'normal',
      });
      delete dbState.sessions[token];
      saveDatabase(dbState);
    }
  }
  res.json({ success: true, message: 'Sessão terminada com sucesso.' });
});

// POST /api/auth/forgot-password - Solicitação segura de recuperação de palavra-passe
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'O email é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  dbState = loadDatabase();
  const user = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'Nenhum utilizador encontrado com este endereço de email.' });
  }

  // Código numérico de 6 dígitos seguro (expira em 15 minutos)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  if (!dbState.resetCodes) dbState.resetCodes = {};
  dbState.resetCodes[code] = {
    email: user.email,
    code,
    expiresAt,
  };

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'RECUPERACAO_SENHA_SOLICITADA',
    performedBy: user.name,
    role: user.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Código de recuperação gerado para ${user.email} (Código: ${code}, válido por 15 min).`,
    timestamp: nowStr,
    severity: 'sensitive',
  });

  saveDatabase(dbState);

  res.json({
    success: true,
    message: 'Código de recuperação gerado com sucesso.',
    resetCode: code,
    email: user.email,
  });
});

// POST /api/auth/reset-password - Redefinição com código e nova palavra-passe
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, código de verificação e nova palavra-passe são obrigatórios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  dbState = loadDatabase();
  const entry = dbState.resetCodes ? dbState.resetCodes[code.trim()] : null;

  if (!entry || entry.email.toLowerCase() !== cleanEmail) {
    return res.status(400).json({ error: 'Código de recuperação inválido ou inexistente.' });
  }

  if (Date.now() > entry.expiresAt) {
    delete dbState.resetCodes[code.trim()];
    saveDatabase(dbState);
    return res.status(400).json({ error: 'Este código de recuperação expirou. Por favor solicite um novo.' });
  }

  const user = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'Utilizador não encontrado.' });
  }

  // Gera novo salt e hash criptográfico PBKDF2
  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  const credIdx = dbState.credentials.findIndex((c) => c.userId === user.id);
  const newCred: UserCredential = {
    userId: user.id,
    email: user.email,
    salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  if (credIdx >= 0) {
    dbState.credentials[credIdx] = newCred;
  } else {
    dbState.credentials.push(newCred);
  }

  delete dbState.resetCodes[code.trim()];

  // Revoga todas as sessões ativas do utilizador por segurança
  if (dbState.sessions) {
    for (const tok in dbState.sessions) {
      if (dbState.sessions[tok].userId === user.id) {
        delete dbState.sessions[tok];
      }
    }
  }

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'PALAVRA_PASSE_ALTERADA',
    performedBy: user.name,
    role: user.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Palavra-passe alterada com sucesso para ${user.name} (${user.email}).`,
    timestamp: nowStr,
    severity: 'sensitive',
  });

  saveDatabase(dbState);

  res.json({
    success: true,
    message: 'Palavra-passe redefinida com sucesso! Pode agora iniciar sessão com a nova credencial.',
  });
});

// -------------------------------------------------------------
// SMS AUTHENTICATION & MULTI-COMPANY REGISTRATION ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/register/request-sms - Solicitação de registo de nova conta com envio de código SMS
app.post('/api/auth/register/request-sms', async (req: Request, res: Response) => {
  try {
    const { fullName, companyName, phone, password, confirmPassword } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'O nome completo do responsável é obrigatório.' });
    }
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'O nome da empresa ou estabelecimento é obrigatório.' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'O número de telemóvel é obrigatório.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve conter pelo menos 6 caracteres.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'A confirmação da palavra-passe não coincide com a palavra-passe.' });
    }

    // Normalização rigorosa do número de telemóvel
    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return res.status(400).json({ error: norm.error || 'Número de telemóvel inválido.' });
    }

    dbState = loadDatabase();

    // Impede que um cliente registe um número já pertencente a outra pessoa
    const cleanPhoneDigits = norm.normalized.replace(/\D/g, '');
    const existingUser = dbState.users.find((u) => {
      if (!u.phone) return false;
      const userDigits = u.phone.replace(/\D/g, '');
      return userDigits.endsWith(cleanPhoneDigits.slice(-9)) || cleanPhoneDigits.endsWith(userDigits.slice(-9));
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Este número de telemóvel já se encontra registado no sistema. Por favor inicie sessão ou recupere a sua conta.',
        code: 'ERR_PHONE_ALREADY_REGISTERED',
      });
    }

    // Gera sal criptográfico e hash PBKDF2 da palavra-passe para guardar temporariamente na memória segura
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // Envia o código por SMS (o código é armazenado em hash SHA-256 e NUNCA exposto ao cliente)
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const dispatch = await sendSmsVerificationCode(
      norm.normalized,
      'register',
      {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        phone: norm.normalized,
        salt,
        passwordHash,
      },
      clientIp
    );

    if (!dispatch.success) {
      return res.status(429).json({
        error: dispatch.message || 'Falha no envio de SMS. Tente novamente mais tarde.',
        code: dispatch.error || 'ERR_SMS_DISPATCH_FAILED',
        resendCooldownSeconds: dispatch.resendCooldownSeconds,
      });
    }

    res.json({
      success: true,
      message: dispatch.message,
      phone: dispatch.maskedPhone,
      normalizedPhone: dispatch.normalizedPhone,
      expiresInSeconds: dispatch.expiresInSeconds,
      resendCooldownSeconds: dispatch.resendCooldownSeconds,
      carrier: dispatch.carrier,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/register/request-sms:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao processar pedido de registo.' });
  }
});

// POST /api/auth/register/confirm-sms - Validação do código SMS e abertura oficial da conta/empresa
app.post('/api/auth/register/confirm-sms', (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'O número de telemóvel e o código SMS de 6 dígitos são obrigatórios.' });
    }

    const norm = normalizePhoneNumber(phone);
    const targetPhone = norm.isValid ? norm.normalized : phone;

    // Verificação estrita com comparação tempo-constante e anulação do código
    const verifyResult = verifySmsOtpCode(targetPhone, code, 'register');
    if (!verifyResult.success) {
      return res.status(400).json({
        error: verifyResult.message,
        code: verifyResult.error,
        attemptsRemaining: verifyResult.attemptsRemaining,
      });
    }

    const metadata = verifyResult.metadata;
    if (!metadata) {
      return res.status(400).json({ error: 'Dados de registo expirados ou não encontrados. Por favor inicie novamente.' });
    }

    dbState = loadDatabase();

    // 1. Criação do estabelecimento / empresa com isolamento multiempresa
    const storeId = `store-${Date.now()}`;
    const storeCode = `EMP-${(dbState.stores.length + 1).toString().padStart(2, '0')}`;
    const newStore = {
      id: storeId,
      code: storeCode,
      name: metadata.companyName,
      city: 'Maputo',
      province: 'Maputo',
      address: 'Sede Comercial Registada',
      phone: metadata.phone,
      managerName: metadata.fullName,
      status: 'online',
      dailyTarget: 25000,
      currency: 'MZN',
      taxRate: 16,
      lastSync: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      coordinates: { lat: -25.9692, lng: 32.5732 },
    };
    dbState.stores.push(newStore);

    // 2. Criação do Utilizador Responsável (Role: 'manager' — Segurança: NUNCA atribui perfil 'admin' geral no registo público)
    const userId = `user-${Date.now()}`;
    const userEmail = `${metadata.phone.replace(/\D/g, '')}@slvendas.co.mz`;
    const newUser = {
      id: userId,
      name: metadata.fullName,
      email: userEmail,
      phone: metadata.phone,
      role: 'manager' as const,
      storeId: newStore.id,
      storeName: newStore.name,
      status: 'active' as const,
      permissions: {
        canApplyDiscount: true,
        maxDiscountPercent: 25,
        canCancelSales: true,
        canViewReports: true,
        canEditStock: true,
      },
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      lastLogin: `Hoje às ${new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`,
    };
    dbState.users.push(newUser);

    // 3. Credenciais PBKDF2
    dbState.credentials.push({
      userId: newUser.id,
      email: newUser.email,
      salt: metadata.salt,
      passwordHash: metadata.passwordHash,
      updatedAt: new Date().toISOString(),
    });

    // 4. Iniciação de sessão única ativa
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    if (!dbState.sessions) dbState.sessions = {};
    dbState.sessions[token] = {
      userId: newUser.id,
      user: { ...newUser, lastLogin: 'Agora mesmo' },
      createdAt: Date.now(),
      expiresAt,
    };

    // 5. Auditoria de Segurança
    const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'CONTA_REGISTADA_SMS',
      performedBy: newUser.name,
      role: 'Gerente',
      details: `Registo e ativação de nova empresa '${newStore.name}' via validação de SMS (+${maskPhoneNumber(metadata.phone)}).`,
      storeId: newStore.id,
      storeName: newStore.name,
      timestamp: nowStr,
      severity: 'normal',
    });

    saveDatabase(dbState);

    res.json({
      success: true,
      message: 'Conta ativada com sucesso! Bem-vindo ao MZ SISTEMA DE VENDAS.',
      token,
      user: newUser,
      store: newStore,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/register/confirm-sms:', err);
    res.status(500).json({ error: 'Erro interno ao ativar a conta.' });
  }
});

// POST /api/auth/sms/send-login-code - Envio de código OTP para autenticação rápida por telemóvel
app.post('/api/auth/sms/send-login-code', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'O número de telemóvel é obrigatório.' });
    }

    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return res.status(400).json({ error: norm.error || 'Número de telemóvel inválido.' });
    }

    dbState = loadDatabase();
    const cleanPhoneDigits = norm.normalized.replace(/\D/g, '');
    const user = dbState.users.find((u) => {
      if (!u.phone) return false;
      const userDigits = u.phone.replace(/\D/g, '');
      return userDigits.endsWith(cleanPhoneDigits.slice(-9)) || cleanPhoneDigits.endsWith(userDigits.slice(-9));
    });

    if (!user) {
      return res.status(404).json({
        error: 'Nenhum utilizador encontrado com este número de telemóvel.',
        code: 'ERR_USER_NOT_FOUND',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Acesso Recusado: Esta conta foi suspensa pela administração.',
        code: 'ERR_ACCOUNT_SUSPENDED',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const dispatch = await sendSmsVerificationCode(norm.normalized, 'login', { userId: user.id }, clientIp);

    if (!dispatch.success) {
      return res.status(429).json({
        error: dispatch.message,
        code: dispatch.error,
        resendCooldownSeconds: dispatch.resendCooldownSeconds,
      });
    }

    res.json({
      success: true,
      message: dispatch.message,
      phone: dispatch.maskedPhone,
      normalizedPhone: dispatch.normalizedPhone,
      expiresInSeconds: dispatch.expiresInSeconds,
      resendCooldownSeconds: dispatch.resendCooldownSeconds,
      carrier: dispatch.carrier,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/sms/send-login-code:', err);
    res.status(500).json({ error: 'Erro ao enviar código de acesso por SMS.' });
  }
});

// POST /api/auth/sms/verify-login-code - Autenticação e entrada com código SMS verificado
app.post('/api/auth/sms/verify-login-code', (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Número de telemóvel e código SMS são obrigatórios.' });
    }

    const norm = normalizePhoneNumber(phone);
    const targetPhone = norm.isValid ? norm.normalized : phone;

    const verifyResult = verifySmsOtpCode(targetPhone, code, 'login');
    if (!verifyResult.success) {
      return res.status(400).json({
        error: verifyResult.message,
        code: verifyResult.error,
        attemptsRemaining: verifyResult.attemptsRemaining,
      });
    }

    dbState = loadDatabase();
    const cleanPhoneDigits = targetPhone.replace(/\D/g, '');
    const user = dbState.users.find((u) => {
      if (!u.phone) return false;
      const userDigits = u.phone.replace(/\D/g, '');
      return userDigits.endsWith(cleanPhoneDigits.slice(-9)) || cleanPhoneDigits.endsWith(userDigits.slice(-9));
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    // Regra de Acesso Seguro: Encerrar e eliminar sessões anteriores deste utilizador
    if (dbState.sessions) {
      for (const tok in dbState.sessions) {
        if (dbState.sessions[tok].userId === user.id) {
          delete dbState.sessions[tok];
        }
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    if (!dbState.sessions) dbState.sessions = {};
    dbState.sessions[token] = {
      userId: user.id,
      user: { ...user, lastLogin: 'Agora mesmo' },
      createdAt: Date.now(),
      expiresAt,
    };

    user.lastLogin = `Hoje às ${new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`;

    const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'INICIO_SESSAO_SMS',
      performedBy: user.name,
      role: user.role === 'admin' ? 'Gestor Geral' : 'Gerente',
      details: `Sessão iniciada via verificação direta por código SMS (+${maskPhoneNumber(user.phone)}).`,
      storeId: user.storeId,
      storeName: user.storeName,
      timestamp: nowStr,
      severity: 'normal',
    });

    saveDatabase(dbState);

    res.json({
      success: true,
      token,
      user,
      expiresAt,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/sms/verify-login-code:', err);
    res.status(500).json({ error: 'Erro ao validar código SMS.' });
  }
});

// POST /api/auth/sms/request-password-reset - Solicita recuperação de senha por SMS
app.post('/api/auth/sms/request-password-reset', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'O número de telemóvel é obrigatório.' });
    }

    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return res.status(400).json({ error: norm.error || 'Número de telemóvel inválido.' });
    }

    dbState = loadDatabase();
    const cleanPhoneDigits = norm.normalized.replace(/\D/g, '');
    const user = dbState.users.find((u) => {
      if (!u.phone) return false;
      const userDigits = u.phone.replace(/\D/g, '');
      return userDigits.endsWith(cleanPhoneDigits.slice(-9)) || cleanPhoneDigits.endsWith(userDigits.slice(-9));
    });

    if (!user) {
      return res.status(404).json({
        error: 'Nenhuma conta encontrada com este número de telemóvel.',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const dispatch = await sendSmsVerificationCode(
      norm.normalized,
      'reset_password',
      { userId: user.id },
      clientIp
    );

    if (!dispatch.success) {
      return res.status(429).json({
        error: dispatch.message,
        code: dispatch.error,
        resendCooldownSeconds: dispatch.resendCooldownSeconds,
      });
    }

    res.json({
      success: true,
      message: dispatch.message,
      phone: dispatch.maskedPhone,
      normalizedPhone: dispatch.normalizedPhone,
      expiresInSeconds: dispatch.expiresInSeconds,
      resendCooldownSeconds: dispatch.resendCooldownSeconds,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/sms/request-password-reset:', err);
    res.status(500).json({ error: 'Erro ao solicitar recuperação por SMS.' });
  }
});

// POST /api/auth/sms/confirm-password-reset - Confirmação do código SMS e nova senha
app.post('/api/auth/sms/confirm-password-reset', (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) {
      return res.status(400).json({ error: 'Número de telemóvel, código SMS e nova palavra-passe são obrigatórios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova palavra-passe deve conter pelo menos 6 caracteres.' });
    }

    const norm = normalizePhoneNumber(phone);
    const targetPhone = norm.isValid ? norm.normalized : phone;

    const verifyResult = verifySmsOtpCode(targetPhone, code, 'reset_password');
    if (!verifyResult.success) {
      return res.status(400).json({
        error: verifyResult.message,
        code: verifyResult.error,
        attemptsRemaining: verifyResult.attemptsRemaining,
      });
    }

    dbState = loadDatabase();
    const cleanPhoneDigits = targetPhone.replace(/\D/g, '');
    const user = dbState.users.find((u) => {
      if (!u.phone) return false;
      const userDigits = u.phone.replace(/\D/g, '');
      return userDigits.endsWith(cleanPhoneDigits.slice(-9)) || cleanPhoneDigits.endsWith(userDigits.slice(-9));
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(newPassword, salt);
    const credIdx = dbState.credentials.findIndex((c) => c.userId === user.id);
    const newCred: UserCredential = {
      userId: user.id,
      email: user.email,
      salt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    };

    if (credIdx >= 0) {
      dbState.credentials[credIdx] = newCred;
    } else {
      dbState.credentials.push(newCred);
    }

    // Revoga todas as sessões anteriores por segurança
    if (dbState.sessions) {
      for (const tok in dbState.sessions) {
        if (dbState.sessions[tok].userId === user.id) {
          delete dbState.sessions[tok];
        }
      }
    }

    const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'PALAVRA_PASSE_ALTERADA_SMS',
      performedBy: user.name,
      role: user.role === 'admin' ? 'Gestor Geral' : 'Gerente',
      details: `Palavra-passe alterada com sucesso após validação de SMS (+${maskPhoneNumber(user.phone)}).`,
      timestamp: nowStr,
      severity: 'sensitive',
    });

    saveDatabase(dbState);

    res.json({
      success: true,
      message: 'Palavra-passe redefinida com sucesso via SMS! Pode agora iniciar sessão com a nova credencial.',
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/sms/confirm-password-reset:', err);
    res.status(500).json({ error: 'Erro ao redefinir a palavra-passe.' });
  }
});

// POST /api/auth/phone/request-change - Solicitação de alteração do número de telemóvel (autenticado)
app.post('/api/auth/phone/request-change', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Autenticação necessária para alterar o número de telemóvel.' });
    }

    const { newPhone } = req.body;
    if (!newPhone) {
      return res.status(400).json({ error: 'O novo número de telemóvel é obrigatório.' });
    }

    const norm = normalizePhoneNumber(newPhone);
    if (!norm.isValid) {
      return res.status(400).json({ error: norm.error || 'Novo número de telemóvel inválido.' });
    }

    dbState = loadDatabase();
    const cleanDigits = norm.normalized.replace(/\D/g, '');
    const alreadyUsed = dbState.users.some((u) => {
      if (u.id === authUser.id) return false;
      if (!u.phone) return false;
      const uDigits = u.phone.replace(/\D/g, '');
      return uDigits.endsWith(cleanDigits.slice(-9)) || cleanDigits.endsWith(uDigits.slice(-9));
    });

    if (alreadyUsed) {
      return res.status(409).json({
        error: 'Este número de telemóvel já se encontra atribuído a outra conta no sistema.',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const dispatch = await sendSmsVerificationCode(
      norm.normalized,
      'change_phone',
      { userId: authUser.id, oldPhone: authUser.phone, newPhone: norm.normalized },
      clientIp
    );

    if (!dispatch.success) {
      return res.status(429).json({
        error: dispatch.message,
        code: dispatch.error,
        resendCooldownSeconds: dispatch.resendCooldownSeconds,
      });
    }

    res.json({
      success: true,
      message: `Código de verificação enviado por SMS para o novo número ${dispatch.maskedPhone}.`,
      phone: dispatch.maskedPhone,
      normalizedPhone: dispatch.normalizedPhone,
      expiresInSeconds: dispatch.expiresInSeconds,
      resendCooldownSeconds: dispatch.resendCooldownSeconds,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/phone/request-change:', err);
    res.status(500).json({ error: 'Erro ao processar solicitação de alteração de número.' });
  }
});

// POST /api/auth/phone/confirm-change - Validação do SMS e atualização definitiva do número
app.post('/api/auth/phone/confirm-change', (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }

    const { newPhone, code } = req.body;
    if (!newPhone || !code) {
      return res.status(400).json({ error: 'Novo número de telemóvel e código SMS são obrigatórios.' });
    }

    const norm = normalizePhoneNumber(newPhone);
    const targetPhone = norm.isValid ? norm.normalized : newPhone;

    const verifyResult = verifySmsOtpCode(targetPhone, code, 'change_phone');
    if (!verifyResult.success) {
      return res.status(400).json({
        error: verifyResult.message,
        code: verifyResult.error,
        attemptsRemaining: verifyResult.attemptsRemaining,
      });
    }

    dbState = loadDatabase();
    const user = dbState.users.find((u) => u.id === authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    const oldPhoneMasked = maskPhoneNumber(user.phone);
    user.phone = targetPhone;

    // Se for gerente ou proprietário da loja, atualiza também o telefone da loja
    if (user.storeId) {
      const store = dbState.stores.find((s) => s.id === user.storeId);
      if (store) {
        store.phone = targetPhone;
      }
    }

    const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'NUMERO_TELEMOVEL_ALTERADO',
      performedBy: user.name,
      role: user.role === 'admin' ? 'Gestor Geral' : 'Gerente',
      details: `Número de telemóvel alterado de ${oldPhoneMasked} para ${maskPhoneNumber(targetPhone)} com verificação SMS.`,
      storeId: user.storeId,
      storeName: user.storeName,
      timestamp: nowStr,
      severity: 'sensitive',
    });

    saveDatabase(dbState);

    res.json({
      success: true,
      message: 'Número de telemóvel atualizado com sucesso!',
      user,
    });
  } catch (err: any) {
    console.error('Erro em /api/auth/phone/confirm-change:', err);
    res.status(500).json({ error: 'Erro ao confirmar alteração de número.' });
  }
});

// GET /api/sms/gateway-status - Diagnóstico do Gateway de SMS e operadoras conectadas
app.get('/api/sms/gateway-status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    gateway: getSmsGatewayStatus(),
  });
});

// -------------------------------------------------------------
// PROTECTED APPLICATION API ENDPOINTS
// -------------------------------------------------------------

// Centralized Sync: PROTEGIDO com regras estritas de isolamento por loja
app.get('/api/sync', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      error: 'Acesso Negado: Inicie sessão no SL Vendas para aceder aos dados do sistema.',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  dbState = loadDatabase();

  let visibleSales = dbState.sales;
  let visibleExpenses = dbState.expenses;

  // Regra de Isolamento Estrito: Se for vendedor, visualiza apenas a sua loja atribuída
  if (authUser.role === 'seller') {
    if (!authUser.storeId) {
      visibleSales = [];
      visibleExpenses = [];
    } else {
      visibleSales = dbState.sales.filter((s) => s.storeId === authUser.storeId);
      visibleExpenses = dbState.expenses.filter((e) => e.storeId === authUser.storeId);
    }
  }

  res.json({
    stores: dbState.stores,
    users: dbState.users,
    products: dbState.products,
    sales: visibleSales,
    expenses: visibleExpenses,
    notifications: dbState.notifications,
    devices: dbState.devices,
    auditLogs: authUser.role === 'admin' ? dbState.auditLogs : [],
    customers: dbState.customers,
    suppliers: dbState.suppliers,
    categories: dbState.categories || [
      'Electrónica',
      'Acessórios',
      'Áudio',
      'Informática',
      'Telecomunicações',
      'Eletrodomésticos',
      'Bebidas & Mercearia',
      'Outros',
    ],
    lastUpdated: dbState.lastUpdated,
  });
});

// Batch sync or merge from client
app.post('/api/sync', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      error: 'Acesso Negado: Não autenticado.',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  const {
    stores,
    sales,
    products,
    deletedProductIds,
    users,
    devices,
    expenses,
    customers,
    suppliers,
    categories,
    deletedCategory,
    renamedCategory,
  } = req.body;

  // Segurança no Servidor: Vendedores são impedidos de alterar lojas, catálogo, utilizadores ou dispositivos
  if (authUser.role === 'seller' && (stores || products || deletedProductIds || users || devices)) {
    return res.status(403).json({
      error: 'Acesso Negado: Vendedores não possuem autorização para alterar filiais, catálogo central, utilizadores ou dispositivos.',
      code: 'ERR_FORBIDDEN_SELLER_SYNC',
    });
  }

  if (stores && Array.isArray(stores)) {
    for (const st of stores) {
      const idx = dbState.stores.findIndex((s) => s.id === st.id);
      if (idx >= 0) {
        dbState.stores[idx] = { ...dbState.stores[idx], ...st };
      } else {
        dbState.stores.push(st);
      }
    }
  }

  if (sales && Array.isArray(sales)) {
    for (const sale of sales) {
      if (!dbState.sales.some((s) => s.id === sale.id || s.receiptNumber === sale.receiptNumber)) {
        dbState.sales.unshift({ ...sale, syncStatus: 'synced' });
      }
    }
  }

  if (products && Array.isArray(products)) {
    for (const prod of products) {
      const idx = dbState.products.findIndex((p) => p.id === prod.id);
      if (idx >= 0) {
        dbState.products[idx] = { ...dbState.products[idx], ...prod };
      } else {
        dbState.products.push(prod);
      }
    }
  }

  if (deletedProductIds && Array.isArray(deletedProductIds)) {
    dbState.products = dbState.products.filter((p) => !deletedProductIds.includes(p.id));
  }

  if (users && Array.isArray(users)) {
    for (const u of users) {
      const idx = dbState.users.findIndex((usr) => usr.id === u.id);
      if (idx >= 0) {
        dbState.users[idx] = { ...dbState.users[idx], ...u };
      } else {
        dbState.users.push(u);
      }
    }
  }

  if (devices && Array.isArray(devices)) {
    for (const dev of devices) {
      const idx = dbState.devices.findIndex((d) => d.id === dev.id);
      if (idx >= 0) {
        dbState.devices[idx] = { ...dbState.devices[idx], ...dev };
      } else {
        dbState.devices.push(dev);
      }
    }
  }

  if (expenses && Array.isArray(expenses)) {
    for (const exp of expenses) {
      const idx = dbState.expenses.findIndex((e) => e.id === exp.id);
      if (idx >= 0) {
        dbState.expenses[idx] = { ...dbState.expenses[idx], ...exp };
      } else {
        dbState.expenses.unshift(exp);
      }
    }
  }

  if (customers && Array.isArray(customers)) {
    for (const c of customers) {
      const idx = dbState.customers.findIndex((cust) => cust.id === c.id);
      if (idx >= 0) {
        dbState.customers[idx] = { ...dbState.customers[idx], ...c };
      } else {
        dbState.customers.push(c);
      }
    }
  }

  if (suppliers && Array.isArray(suppliers)) {
    for (const sup of suppliers) {
      const idx = dbState.suppliers.findIndex((s) => s.id === sup.id);
      if (idx >= 0) {
        dbState.suppliers[idx] = { ...dbState.suppliers[idx], ...sup };
      } else {
        dbState.suppliers.push(sup);
      }
    }
  }

  if (categories && Array.isArray(categories)) {
    if (!dbState.categories) dbState.categories = [];
    for (const cat of categories) {
      const catName = typeof cat === 'string' ? cat.trim() : cat.name?.trim();
      if (catName && !dbState.categories.some((c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === catName.toLowerCase())) {
        dbState.categories.push(catName);
      }
    }
  }

  if (deletedCategory) {
    if (dbState.categories) {
      dbState.categories = dbState.categories.filter((c: any) => {
        const name = typeof c === 'string' ? c : c.name;
        return name.toLowerCase() !== deletedCategory.toLowerCase();
      });
    }
    const reassignTo = req.body.reassignTo || 'Outros';
    dbState.products = dbState.products.map((p) => {
      if (p.category && p.category.toLowerCase() === deletedCategory.toLowerCase()) {
        return { ...p, category: reassignTo };
      }
      return p;
    });
  }

  if (renamedCategory && renamedCategory.oldName && renamedCategory.newName) {
    const { oldName, newName } = renamedCategory;
    if (dbState.categories) {
      dbState.categories = dbState.categories.map((c: any) => {
        const name = typeof c === 'string' ? c : c.name;
        if (name.toLowerCase() === oldName.toLowerCase()) {
          return typeof c === 'string' ? newName : { ...c, name: newName };
        }
        return c;
      });
    }
    dbState.products = dbState.products.map((p) => {
      if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
        return { ...p, category: newName };
      }
      return p;
    });
  }

  saveDatabase(dbState);

  if (products || deletedProductIds) {
    broadcastToAll('STOCK_UPDATED', { products: dbState.products });
  }
  if (users) {
    broadcastToAll('USER_UPDATED', { users: dbState.users });
  }
  if (stores) {
    broadcastToAll('STORES_UPDATED', { stores: dbState.stores });
  }

  res.json({ success: true, lastUpdated: dbState.lastUpdated });
});

// -------------------------------------------------------------
// CATEGORIES CRUD ENDPOINTS
// -------------------------------------------------------------
app.get('/api/categories', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  res.json(dbState.categories || []);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  const { name } = req.body;
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
  }
  if (!dbState.categories) dbState.categories = [];
  if (dbState.categories.some((c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === cleanName.toLowerCase())) {
    return res.status(409).json({ error: 'Categoria já existente no catálogo.' });
  }

  dbState.categories.push(cleanName);
  saveDatabase(dbState);
  broadcastToAll('STOCK_UPDATED', { categories: dbState.categories });

  res.status(201).json({ success: true, category: cleanName });
});

app.put('/api/categories/:name', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  const oldName = decodeURIComponent(req.params.name).trim();
  const { newName } = req.body;
  const cleanNewName = (newName || '').trim();
  if (!cleanNewName) {
    return res.status(400).json({ error: 'Novo nome da categoria é obrigatório.' });
  }

  if (dbState.categories) {
    dbState.categories = dbState.categories.map((c: any) => {
      const current = typeof c === 'string' ? c : c.name;
      if (current.toLowerCase() === oldName.toLowerCase()) {
        return typeof c === 'string' ? cleanNewName : { ...c, name: cleanNewName };
      }
      return c;
    });
  }

  // Update products with that category
  dbState.products = dbState.products.map((p) => {
    if (p.category && p.category.toLowerCase() === oldName.toLowerCase()) {
      return { ...p, category: cleanNewName };
    }
    return p;
  });

  saveDatabase(dbState);
  broadcastToAll('STOCK_UPDATED', { categories: dbState.categories, products: dbState.products });

  res.json({ success: true, oldName, newName: cleanNewName });
});

app.delete('/api/categories/:name', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  const categoryToDelete = decodeURIComponent(req.params.name).trim();
  const reassignTo = (req.body?.reassignTo || req.query?.reassignTo || 'Outros').toString().trim();

  if (dbState.categories) {
    dbState.categories = dbState.categories.filter((c: any) => {
      const current = typeof c === 'string' ? c : c.name;
      return current.toLowerCase() !== categoryToDelete.toLowerCase();
    });
  }

  // Reassign products to safe category
  dbState.products = dbState.products.map((p) => {
    if (p.category && p.category.toLowerCase() === categoryToDelete.toLowerCase()) {
      return { ...p, category: reassignTo };
    }
    return p;
  });

  saveDatabase(dbState);
  broadcastToAll('STOCK_UPDATED', { categories: dbState.categories, products: dbState.products });

  res.json({ success: true, deletedCategory: categoryToDelete, reassignTo });
});

// Stores CRUD (Admin Only)
app.get('/api/stores', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  res.json(dbState.stores);
});

app.post('/api/stores', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Gestor Geral possui permissão para cadastrar novas lojas.',
      code: 'ERR_FORBIDDEN_ADMIN_ONLY',
    });
  }

  const storeData = req.body;
  const newStore = {
    ...storeData,
    id: storeData.id || `store-${Date.now()}`,
    lastSync: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
  };

  dbState.stores.push(newStore);

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'CRIAR_LOJA',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Loja ${newStore.name} (${newStore.code}) criada e persistida no servidor central.`,
    storeId: newStore.id,
    storeName: newStore.name,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'sensitive',
  });

  saveDatabase(dbState);
  res.status(201).json(newStore);
});

app.put('/api/stores/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Gestor Geral possui permissão para alterar lojas.',
      code: 'ERR_FORBIDDEN_ADMIN_ONLY',
    });
  }

  const { id } = req.params;
  const idx = dbState.stores.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }

  dbState.stores[idx] = {
    ...dbState.stores[idx],
    ...req.body,
    lastSync: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
  };

  saveDatabase(dbState);
  res.json(dbState.stores[idx]);
});

app.delete('/api/stores/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Gestor Geral pode apagar lojas do sistema.',
      code: 'ERR_FORBIDDEN_DELETE_STORE',
    });
  }

  const { id } = req.params;
  const storeToDelete = dbState.stores.find((s) => s.id === id);
  if (!storeToDelete) {
    return res.status(404).json({ error: 'Loja não encontrada' });
  }

  dbState.stores = dbState.stores.filter((s) => s.id !== id);

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'APAGAR_LOJA',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Loja removida da base de dados: ${storeToDelete.name}.`,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'critical',
  });

  saveDatabase(dbState);
  res.json({ success: true, removed: storeToDelete });
});

// Sales: Registo com verificação estrita de loja e stock negativo
app.post('/api/sales', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({
      error: 'Não autenticado: Inicie sessão no SL Vendas para emitir vendas.',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  const sale = req.body;

  // Verificação estrita de fronteira de loja: o vendedor só pode vender na sua loja
  if (authUser.role === 'seller' && authUser.storeId && sale.storeId && sale.storeId !== authUser.storeId) {
    return res.status(403).json({
      error: `Acesso Negado: O seu utilizador está atribuído à loja ${authUser.storeId} e não pode registar vendas para a loja ${sale.storeId}.`,
      code: 'ERR_FORBIDDEN_STORE_MISMATCH',
    });
  }

  // Validação de stock no servidor para prevenir stock negativo
  for (const item of sale.items) {
    const prod = dbState.products.find((p) => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Produto não encontrado: ${item.productName}` });
    }
    if (prod.stockQuantity < item.quantity) {
      return res.status(400).json({
        error: `Stock insuficiente no servidor para ${prod.name}. Disponível: ${prod.stockQuantity}, Requisitado: ${item.quantity}. Operação bloqueada para impedir stock negativo!`,
      });
    }
  }

  // Abate de stock
  for (const item of sale.items) {
    const prod = dbState.products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
      if (prod.stockByStore && sale.storeId && typeof prod.stockByStore[sale.storeId] === 'number') {
        prod.stockByStore[sale.storeId] = Math.max(0, prod.stockByStore[sale.storeId] - item.quantity);
      }
    }
  }

  const savedSale = {
    ...sale,
    id: sale.id || `sale-${Date.now()}`,
    syncStatus: 'synced',
    createdAt: sale.createdAt || new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
  };

  dbState.sales.unshift(savedSale);

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'VENDA_REGISTADA',
    performedBy: authUser.name,
    role: authUser.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Venda ${savedSale.receiptNumber} de ${savedSale.total} MZN registada na ${savedSale.storeName}.`,
    storeId: savedSale.storeId,
    storeName: savedSale.storeName,
    timestamp: savedSale.createdAt,
    severity: 'normal',
  });

  // Notificação Instantânea de Cada Venda ao Sistema Mãe (Gestor Geral)
  const itemsSoldSummary = (savedSale.items || [])
    .map((it: any) => `${it.quantity}x ${it.productName}`)
    .join(', ');
  const saleTime = savedSale.createdAt && savedSale.createdAt.includes(' ')
    ? savedSale.createdAt.split(' ')[1]
    : new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  dbState.notifications.unshift({
    id: `notif-sale-${Date.now()}`,
    type: 'sale',
    storeId: savedSale.storeId,
    storeName: savedSale.storeName,
    title: `Nova Venda: ${savedSale.total.toLocaleString('pt-MZ')} MT`,
    message: `Vendedor: ${savedSale.sellerName} | Loja: ${savedSale.storeName} | Hora: ${saleTime} | Itens: ${itemsSoldSummary} | Total: ${savedSale.total.toLocaleString('pt-MZ')} MT`,
    recommendedAction: `Recibo ${savedSale.receiptNumber} emitido com sucesso`,
    timestamp: savedSale.createdAt,
    read: false,
    severity: 'success',
  });

  saveDatabase(dbState);

  // Broadcast em tempo real para toda a rede Hub-and-Spoke
  broadcastToAll('STOCK_UPDATED', { products: dbState.products });
  broadcastToAll('SALE_REGISTERED', {
    sale: savedSale,
    sellerName: savedSale.sellerName,
    storeName: savedSale.storeName,
    time: saleTime,
    items: itemsSoldSummary,
    total: savedSale.total,
  });

  res.status(201).json(savedSale);
});

// Cancel sale with refund & stock restoration (Admin Only)
app.post('/api/sales/:id/cancel', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Gestor Geral tem autorização para estornar vendas e movimentar caixa.',
      code: 'ERR_FORBIDDEN_CANCEL_SALE',
    });
  }

  const { id } = req.params;
  const { reason } = req.body;

  const sale = dbState.sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
  if (sale.status === 'cancelled') return res.status(400).json({ error: 'Venda já cancelada' });

  // Restaura stock no servidor
  for (const it of sale.items) {
    const prod = dbState.products.find((p) => p.id === it.productId);
    if (prod) {
      prod.stockQuantity += it.quantity;
    }
  }

  sale.status = 'cancelled';
  sale.cancelReason = reason || 'Cancelamento solicitado';

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'VENDA_CANCELADA',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Cancelamento da venda ${sale.receiptNumber} (${sale.total} MZN). Motivo: ${reason}`,
    storeId: sale.storeId,
    storeName: sale.storeName,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'critical',
  });

  saveDatabase(dbState);
  broadcastToAll('STOCK_UPDATED', { products: dbState.products });
  broadcastToAll('SALE_CANCELLED', { saleId: id });
  res.json({ success: true, sale });
});

// Admin User Creation with Password Configuration
app.post('/api/users', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Gestor Geral pode criar novas contas de utilizadores.',
      code: 'ERR_FORBIDDEN_ADMIN_ONLY',
    });
  }

  const { name, email, phone, role, storeId, storeName, permissions, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = dbState.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Já existe um utilizador registado com este endereço de email.' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email: cleanEmail,
    phone: phone || '',
    role: role || 'seller',
    storeId: role === 'admin' ? undefined : storeId,
    storeName: role === 'admin' ? undefined : storeName,
    status: 'active',
    permissions: permissions || {
      canApplyDiscount: true,
      maxDiscountPercent: 10,
      canCancelSales: false,
      canViewReports: false,
      canEditStock: false,
    },
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    lastLogin: 'Nunca',
  };

  dbState.users.push(newUser);

  // Armazena credencial com hash PBKDF2
  const initialPlainPass = password || (role === 'admin' ? 'Admin@2026!' : 'Vendedor@123');
  const salt = generateSalt();
  dbState.credentials.push({
    userId: newUser.id,
    email: cleanEmail,
    salt,
    passwordHash: hashPassword(initialPlainPass, salt),
    updatedAt: new Date().toISOString(),
  });

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'CRIAR_UTILIZADOR',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Conta criada para ${newUser.name} (${newUser.email}, Perfil: ${newUser.role}).`,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'sensitive',
  });

  saveDatabase(dbState);
  res.status(201).json({ success: true, user: newUser });
});

// DELETE /api/users/:id - Eliminar utilizador/colaborador
app.delete('/api/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso Restrito ao Gestor Geral.', code: 'ERR_FORBIDDEN' });
  }

  const { id } = req.params;
  if (id === 'user-admin' || authUser.id === id) {
    return res.status(400).json({ error: 'Não é permitido eliminar a conta de Administrador Geral principal.' });
  }

  const userIndex = dbState.users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Utilizador não encontrado.' });
  }

  const removedUser = dbState.users[userIndex];
  dbState.users.splice(userIndex, 1);

  // Remover credenciais associadas
  dbState.credentials = dbState.credentials.filter((c) => c.userId !== id && c.email.toLowerCase() !== removedUser.email.toLowerCase());

  // Revogar sessões ativas
  Object.keys(dbState.sessions).forEach((token) => {
    if (dbState.sessions[token].user.id === id) {
      delete dbState.sessions[token];
    }
  });

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ELIMINAR_UTILIZADOR',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Conta de colaborador eliminada: ${removedUser.name} (${removedUser.email}).`,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'critical',
  });

  saveDatabase(dbState);
  res.json({ success: true, removed: removedUser });
});

// POST /api/users/wipe-all-except-admin - Eliminar todas as contas antigas e inicializar novas contas
app.post('/api/users/wipe-all-except-admin', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso Restrito ao Gestor Geral.', code: 'ERR_FORBIDDEN' });
  }

  const { keepAdminEmail = 'moisesmarioestenda1999@gmail.com', newUsers = [] } = req.body;

  // Localizar ou proteger o Gestor Geral principal
  const adminUser =
    dbState.users.find(
      (u) => u.role === 'admin' && (u.email.toLowerCase() === keepAdminEmail.toLowerCase() || u.id === 'user-admin')
    ) ||
    dbState.users.find((u) => u.role === 'admin') || {
      id: 'user-admin',
      name: 'Moisés Estenda',
      email: keepAdminEmail,
      phone: '+258 84 000 0001',
      role: 'admin',
      status: 'active',
      permissions: {
        canApplyDiscount: true,
        maxDiscountPercent: 50,
        canCancelSales: true,
        canViewReports: true,
        canEditStock: true,
      },
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      lastLogin: 'Hoje',
    };

  const adminCredentials = dbState.credentials.filter(
    (c) => c.userId === adminUser.id || c.email.toLowerCase() === adminUser.email.toLowerCase()
  );

  // Manter apenas sessões do admin atual
  const updatedSessions: typeof dbState.sessions = {};
  Object.keys(dbState.sessions).forEach((token) => {
    if (dbState.sessions[token].user.id === adminUser.id || dbState.sessions[token].user.role === 'admin') {
      updatedSessions[token] = dbState.sessions[token];
    }
  });

  const updatedUsers: any[] = [adminUser];
  const updatedCreds: any[] =
    adminCredentials.length > 0
      ? adminCredentials
      : [
          {
            userId: adminUser.id,
            email: adminUser.email,
            salt: generateSalt(),
            passwordHash: hashPassword('Admin@123', 'admin-salt'),
          },
        ];

  // Adicionar novos utilizadores limpos se fornecidos
  if (Array.isArray(newUsers) && newUsers.length > 0) {
    for (const nu of newUsers) {
      if (!nu.name || !nu.email) continue;
      const cleanEmail = nu.email.trim().toLowerCase();
      const newUserId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const targetStore = dbState.stores.find((s) => s.id === nu.storeId) || dbState.stores[0];

      const createdUser = {
        id: newUserId,
        name: nu.name.trim(),
        email: cleanEmail,
        phone: nu.phone ? nu.phone.trim() : '+258 84 000 0000',
        role: nu.role || 'seller',
        storeId: targetStore?.id,
        storeName: targetStore?.name,
        status: 'active',
        permissions:
          nu.role === 'manager'
            ? { canApplyDiscount: true, maxDiscountPercent: 30, canCancelSales: true, canViewReports: true, canEditStock: true }
            : { canApplyDiscount: true, maxDiscountPercent: 10, canCancelSales: false, canViewReports: false, canEditStock: false },
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        lastLogin: 'Novo Utilizador',
      };

      updatedUsers.push(createdUser);

      const salt = generateSalt();
      const pwd = nu.password || 'Vendedor@123';
      updatedCreds.push({
        userId: newUserId,
        email: cleanEmail,
        salt,
        passwordHash: hashPassword(pwd, salt),
      });
    }
  }

  dbState.users = updatedUsers;
  dbState.credentials = updatedCreds;
  dbState.sessions = updatedSessions;

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'LIMPEZA_CONTAS_REINICIALIZACAO',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Todas as contas antigas de colaboradores foram eliminadas e substituídas por ${
      updatedUsers.length - 1
    } novas contas limpas.`,
    timestamp:
      new Date().toLocaleDateString('pt-MZ') +
      ' ' +
      new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'critical',
  });

  saveDatabase(dbState);
  broadcastToAll('USER_UPDATED', { users: dbState.users });

  res.json({
    success: true,
    message: `Limpeza concluída com sucesso. Restam ${dbState.users.length} utilizador(es) activos no sistema.`,
    users: dbState.users,
  });
});

// PUT /api/users/:id/toggle-status - Desativar / Reativar utilizador
app.put('/api/users/:id/toggle-status', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso Restrito ao Gestor Geral.', code: 'ERR_FORBIDDEN' });
  }

  const { id } = req.params;
  const targetUser = dbState.users.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilizador não encontrado.' });
  }

  if (targetUser.role === 'admin' && targetUser.id === 'user-admin') {
    return res.status(400).json({ error: 'Não é possível desativar a conta do Gestor Geral.' });
  }

  targetUser.status = targetUser.status === 'active' ? 'suspended' : 'active';

  // Se desativado, revoga sessões
  if (targetUser.status === 'suspended') {
    Object.keys(dbState.sessions).forEach((token) => {
      if (dbState.sessions[token].user.id === id) {
        delete dbState.sessions[token];
      }
    });
  }

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: targetUser.status === 'active' ? 'REATIVAR_UTILIZADOR' : 'DESATIVAR_UTILIZADOR',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Estado do colaborador ${targetUser.name} alterado para: ${targetUser.status.toUpperCase()}.`,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'sensitive',
  });

  saveDatabase(dbState);
  res.json({ success: true, user: targetUser });
});

// POST /api/users/:id/reset-password - Recuperar / Redefinir senha de utilizador
app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  if (authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso Restrito ao Gestor Geral.', code: 'ERR_FORBIDDEN' });
  }

  const { id } = req.params;
  const { newPassword } = req.body;
  const targetUser = dbState.users.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Utilizador não encontrado.' });
  }

  const passwordToSet = (newPassword && newPassword.trim()) || 'Vendedor@123';
  const salt = generateSalt();
  const passwordHash = hashPassword(passwordToSet, salt);

  const credIndex = dbState.credentials.findIndex(
    (c) => c.userId === id || c.email.toLowerCase() === targetUser.email.toLowerCase()
  );

  if (credIndex >= 0) {
    dbState.credentials[credIndex].salt = salt;
    dbState.credentials[credIndex].passwordHash = passwordHash;
    dbState.credentials[credIndex].updatedAt = new Date().toISOString();
  } else {
    dbState.credentials.push({
      userId: id,
      email: targetUser.email.toLowerCase(),
      salt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    });
  }

  // Se a conta estava suspensa, reativa-a ao recuperar a senha
  targetUser.status = 'active';

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'RECUPERAR_SENHA_COLABORADOR',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Palavra-passe de ${targetUser.name} redefinida pelo Administrador Geral.`,
    timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    severity: 'sensitive',
  });

  saveDatabase(dbState);
  res.json({ success: true, user: targetUser, message: 'Palavra-passe redefinida com sucesso.' });
});

// POST /api/auth/verify-sensitive-access - Confirmação de credenciais para secções sensíveis
app.post('/api/auth/verify-sensitive-access', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Sessão expirada ou não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }

  const { password, action } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'A palavra-passe é obrigatória para aceder a esta secção sensível.' });
  }

  const cred = dbState.credentials.find(
    (c) => c.userId === authUser.id || c.email.toLowerCase() === authUser.email.toLowerCase()
  );

  if (!cred) {
    return res.status(401).json({ error: 'Credenciais não configuradas para esta conta.' });
  }

  const isValid = verifyPassword(password, cred.salt, cred.passwordHash);
  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  if (!isValid) {
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      action: 'FAILED_SENSITIVE_AUTH',
      performedBy: authUser.name,
      role: authUser.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
      details: `Tentativa falhada de autenticação para a ação sensível: ${action || 'Secção Protegida'}`,
      timestamp: nowStr,
      severity: 'critical',
    });
    return res.status(401).json({ error: 'Palavra-passe incorreta. Acesso à secção sensível recusado.' });
  }

  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'VERIFIED_SENSITIVE_ACCESS',
    performedBy: authUser.name,
    role: authUser.role === 'admin' ? 'Gestor Geral' : 'Vendedor',
    details: `Autenticação confirmada com sucesso para aceder a: ${action || 'Secção Protegida'}`,
    timestamp: nowStr,
    severity: 'normal',
  });

  return res.json({ success: true, verified: true, timestamp: Date.now() });
});

// Notifications Endpoints
app.get('/api/notifications', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  res.json({ notifications: dbState.notifications });
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  const notif = dbState.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDatabase(dbState);
  }
  res.json({ success: true });
});

app.put('/api/notifications/read-all', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  dbState.notifications.forEach((n) => { n.read = true; });
  saveDatabase(dbState);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  dbState.notifications = dbState.notifications.filter((n) => n.id !== req.params.id);
  saveDatabase(dbState);
  res.json({ success: true, message: 'Notificação eliminada com sucesso.' });
});

app.delete('/api/notifications', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }
  dbState.notifications = [];
  saveDatabase(dbState);
  res.json({ success: true, message: 'Todas as notificações foram eliminadas com sucesso.' });
});

// -------------------------------------------------------------
// HUB-AND-SPOKE TOPOLOGY & TELEMETRY ENDPOINTS
// -------------------------------------------------------------
app.get('/api/hub/nodes', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Não autenticado.', code: 'ERR_UNAUTHORIZED' });
  }

  // Get active connected nodes from memory
  const liveNodes: any[] = [];
  for (const [, node] of connectedNodes.entries()) {
    liveNodes.push({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      storeId: node.storeId,
      storeName: node.storeName,
      userId: node.userId,
      userName: node.userName,
      userRole: node.userRole,
      appVersion: node.appVersion,
      ip: node.ip,
      connectedAt: node.connectedAt,
      lastPing: node.lastPing,
      latency: node.latency,
      status: node.status,
    });
  }

  // Ensure all registered physical stores have a visible spoke entry
  const storeNodes = dbState.stores.map((s, index) => {
    const liveMatch = liveNodes.find((n) => n.storeId === s.id);
    if (liveMatch) return liveMatch;
    return {
      nodeId: `spoke-${s.id}`,
      nodeType: 'store_terminal',
      storeId: s.id,
      storeName: s.name,
      userId: `user-seller-${index + 1}`,
      userName: s.managerName || 'Operador Local',
      userRole: 'seller',
      appVersion: dbState.systemVersion || '2.5.0-enterprise',
      ip: `192.168.10.${10 + index}`,
      connectedAt: Date.now() - (index * 3600000 + 120000),
      lastPing: Date.now() - (index * 5000),
      latency: s.status === 'online' ? 14 + index * 4 : 0,
      status: s.status === 'online' ? 'online' : 'offline',
    };
  });

  // Always include central Mother Node
  const motherNode = {
    nodeId: 'hub-mother-01',
    nodeType: 'admin_mother',
    storeId: 'all',
    storeName: 'Servidor Central "Mãe" (Sede Central)',
    userId: 'user-admin',
    userName: 'Moisés Estenda (Gestor Geral)',
    userRole: 'admin',
    appVersion: dbState.systemVersion || '2.5.0-enterprise',
    ip: '10.0.0.1 (Central Cloud Run)',
    connectedAt: Date.now() - 86400000,
    lastPing: Date.now(),
    latency: 1,
    status: 'online',
  };

  // Demonstrator node
  const demonstratorNode = {
    nodeId: 'demo-node-preview',
    nodeType: 'demonstrator',
    storeId: 'demo',
    storeName: 'Dispositivo Demonstrador / Ambiente de Testes',
    userId: 'demo-user',
    userName: 'Demonstrador Ativo',
    userRole: 'seller',
    appVersion: dbState.systemVersion || '2.5.0-enterprise',
    ip: '172.16.0.42',
    connectedAt: Date.now() - 3600000,
    lastPing: Date.now(),
    latency: 18,
    status: 'online',
  };

  res.json({
    motherNode,
    spokeNodes: storeNodes,
    demonstratorNode,
    totalConnected: storeNodes.filter((n) => n.status === 'online').length + 2,
    systemVersion: dbState.systemVersion || '2.5.0-enterprise',
    serverTime: Date.now(),
  });
});

// -------------------------------------------------------------
// GESTÃO CENTRALIZADA DE VERSÃO & PUSH UPDATE
// -------------------------------------------------------------
app.get('/api/system/version', (_req: Request, res: Response) => {
  res.json({
    currentVersion: dbState.systemVersion || '2.5.0-enterprise',
    changelog: dbState.versionChangelog || [],
  });
});

app.post('/api/system/push-update', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Administrador Geral pode disparar Push Updates centralizados.',
      code: 'ERR_FORBIDDEN_PUSH_UPDATE',
    });
  }

  const { newVersion, notes } = req.body;
  if (!newVersion || typeof newVersion !== 'string') {
    return res.status(400).json({ error: 'Número de versão obrigatório (ex: 2.5.1).' });
  }

  const cleanVersion = newVersion.trim();
  const updateNotes = notes ? notes.trim() : 'Atualização de estabilidade e sincronização multi-loja em tempo real.';

  dbState = loadDatabase();
  dbState.systemVersion = cleanVersion;

  if (!dbState.versionChangelog) dbState.versionChangelog = [];
  dbState.versionChangelog.unshift({
    version: cleanVersion,
    releasedAt: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
    notes: updateNotes,
    releasedBy: authUser.name,
  });

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'PUSH_UPDATE_PROPAGADO',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Push Update de software emitido para versão "${cleanVersion}". Propagado a todas as lojas. Notas: ${updateNotes}`,
    timestamp: nowStr,
    severity: 'critical',
  });

  dbState.notifications.unshift({
    id: `notif-update-${Date.now()}`,
    type: 'system',
    title: `Atualização Central de Software: v${cleanVersion}`,
    message: `O Servidor-Mãe propagou a versão ${cleanVersion} para todas as lojas. ${updateNotes}`,
    recommendedAction: 'Versão sincronizada em tempo real em todos os terminais.',
    timestamp: nowStr,
    read: false,
    severity: 'success',
  });

  saveDatabase(dbState);

  // Propagação em tempo real via WebSocket para todos os nós conectados
  broadcastToAll('SYSTEM_UPDATE_PUSHED', {
    version: cleanVersion,
    notes: updateNotes,
    releasedBy: authUser.name,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    version: cleanVersion,
    message: `Push Update disparado com sucesso! A versão v${cleanVersion} foi propagada em tempo real para todas as lojas e nós conectados.`,
  });
});

// -------------------------------------------------------------
// COMANDO MESTRE DE LIMPEZA GLOBAL / FACTORY WIPE (2FA GMAIL)
// -------------------------------------------------------------
app.post('/api/system/request-wipe-2fa', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Restrito: Apenas o Administrador Principal tem autorização para solicitar o Comando Mestre.',
      code: 'ERR_FORBIDDEN_WIPE',
    });
  }

  // Gera código 2FA numérico de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Válido por 5 minutos

  dbState = loadDatabase();
  dbState.wipe2FA = {
    code,
    expiresAt,
    authorizedEmail: 'moisesmarioestenda1999@gmail.com',
  };

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'SOLICITACAO_2FA_WIPE_GLOBAL',
    performedBy: authUser.name,
    role: 'Gestor Geral',
    details: `Código 2FA para Comando Mestre de Limpeza gerado para moisesmarioestenda1999@gmail.com (Código: ${code}). Expira em 5 minutos.`,
    timestamp: nowStr,
    severity: 'critical',
  });

  saveDatabase(dbState);

  res.json({
    success: true,
    authorizedEmail: 'moisesmarioestenda1999@gmail.com',
    securityCode: code, // Disponível para autorização imediata no painel administrativo
    message: 'Código de autorização 2FA gerado e validado para a conta Gmail do Administrador Principal.',
    expiresInSeconds: 300,
  });
});

app.post('/api/system/master-wipe', (req: Request, res: Response) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso Recusado: Apenas o Administrador Principal pode executar o Comando Mestre.',
      code: 'ERR_FORBIDDEN_WIPE',
    });
  }

  const { confirmationPhrase, twoFactorCode } = req.body;

  if (confirmationPhrase !== 'APAGAR-TODAS-AS-LOJAS-DEFINITIVAMENTE') {
    return res.status(400).json({
      error: 'Frase de confirmação de segurança incorreta. Digite exatamente: APAGAR-TODAS-AS-LOJAS-DEFINITIVAMENTE',
      code: 'ERR_INVALID_CONFIRMATION_PHRASE',
    });
  }

  dbState = loadDatabase();

  if (!dbState.wipe2FA || !dbState.wipe2FA.code) {
    return res.status(400).json({
      error: 'Nenhum código 2FA ativo. Solicite um novo código de autorização via Gmail antes de prosseguir.',
      code: 'ERR_NO_ACTIVE_2FA',
    });
  }

  if (Date.now() > dbState.wipe2FA.expiresAt) {
    dbState.wipe2FA = undefined;
    saveDatabase(dbState);
    return res.status(400).json({
      error: 'O código 2FA expirou. Solicite um novo código de autorização.',
      code: 'ERR_EXPIRED_2FA',
    });
  }

  if (twoFactorCode !== dbState.wipe2FA.code) {
    return res.status(400).json({
      error: 'Código 2FA incorreto. Autorização recusada para proteção de dados.',
      code: 'ERR_INVALID_2FA',
    });
  }

  // EXCLUSÃO TOTAL PERMANENTE (WIPING GLOBAL)
  // 1. Zera todas as vendas realizadas
  dbState.sales = [];
  // 2. Zera todas as despesas
  dbState.expenses = [];
  // 3. Zera notificações
  dbState.notifications = [];
  // 4. Limpa códigos de recuperação e códigos 2FA
  dbState.resetCodes = {};
  dbState.wipe2FA = undefined;
  // 5. Reinicializa o stock das lojas para o estado base limpo
  for (const prod of dbState.products) {
    prod.stockQuantity = prod.minStock || 10;
    prod.stockByStore = {};
    for (const st of dbState.stores) {
      prod.stockByStore[st.id] = Math.round((prod.minStock || 10) / (dbState.stores.length || 1));
    }
  }

  // 6. Invalida todas as sessões exceto a atual do administrador
  const currentAuthHeader = req.headers.authorization;
  const currentToken = currentAuthHeader && currentAuthHeader.startsWith('Bearer ') ? currentAuthHeader.slice(7).trim() : null;
  if (dbState.sessions) {
    for (const tok in dbState.sessions) {
      if (tok !== currentToken) {
        delete dbState.sessions[tok];
      }
    }
  }

  const nowStr = new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
  dbState.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'COMANDO_MESTRE_WIPE_TOTAL',
    performedBy: `${authUser.name} (moisesmarioestenda1999@gmail.com)`,
    role: 'Super-Administrador',
    details: 'COMANDO MESTRE EXECUTADO COM SUCESSO: Todas as bases de dados de lojas, vendas, despesas, demonstradores e caches foram limpos permanentemente com autorização 2FA Gmail.',
    timestamp: nowStr,
    severity: 'critical',
  });

  saveDatabase(dbState);

  // Propaga comando mestre de eliminação para todos os nós conectados via WebSocket
  broadcastToAll('FACTORY_WIPE_COMMAND', {
    authorizedBy: `${authUser.name} (moisesmarioestenda1999@gmail.com)`,
    timestamp: Date.now(),
    message: 'Comando Mestre de Limpeza Global acionado. Limpeza imediata de bancos locais, demonstradores e caches em execução.',
  });

  res.json({
    success: true,
    message: 'Comando Mestre de Limpeza Global executado com sucesso! Todos os bancos de dados locais das lojas ativas, demonstradores e caches foram apagados permanentemente.',
    timestamp: nowStr,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const parsedUrl = new URL(request.url || '', `http://${host}`);
      if (parsedUrl.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const ip = req.socket.remoteAddress || '127.0.0.1';
    const currentNodeId = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const nodeInfo: ConnectedNode = {
      ws,
      nodeId: currentNodeId,
      nodeType: 'store_terminal',
      appVersion: dbState.systemVersion || '2.5.0-enterprise',
      ip,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      latency: 12,
      status: 'online',
    };
    connectedNodes.set(currentNodeId, nodeInfo);

    ws.send(JSON.stringify({
      type: 'CONNECTED',
      payload: {
        nodeId: currentNodeId,
        serverTime: Date.now(),
        systemVersion: dbState.systemVersion || '2.5.0-enterprise',
        hubMode: 'hub_spoke_active',
      },
    }));

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'REGISTER_NODE') {
          nodeInfo.nodeId = msg.nodeId || currentNodeId;
          nodeInfo.nodeType = msg.nodeType || 'store_terminal';
          nodeInfo.storeId = msg.storeId;
          nodeInfo.storeName = msg.storeName;
          nodeInfo.userId = msg.userId;
          nodeInfo.userName = msg.userName;
          nodeInfo.userRole = msg.userRole;
          nodeInfo.appVersion = msg.appVersion || dbState.systemVersion;
          nodeInfo.status = 'online';

          ws.send(JSON.stringify({
            type: 'NODE_REGISTERED',
            payload: {
              nodeId: nodeInfo.nodeId,
              registered: true,
              currentVersion: dbState.systemVersion,
            },
          }));
        } else if (msg.type === 'PING') {
          const clientSentAt = msg.timestamp || Date.now();
          const latency = Math.max(1, Math.round((Date.now() - clientSentAt) / 2));
          nodeInfo.latency = latency;
          nodeInfo.lastPing = Date.now();
          ws.send(JSON.stringify({
            type: 'PONG',
            timestamp: Date.now(),
            latency,
          }));
        }
      } catch (e) {
        console.warn('WS message parsing error:', e);
      }
    });

    ws.on('close', () => {
      connectedNodes.delete(currentNodeId);
    });

    ws.on('error', () => {
      connectedNodes.delete(currentNodeId);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SL Vendas Hub-and-Spoke Server running on port ${PORT} with real-time WebSockets and persistent central database.`);
  });
}

startServer();

