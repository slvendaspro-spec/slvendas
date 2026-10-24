import React, { useState, useEffect } from 'react';
import { Product, Store } from '../../types';
import { formatMZN } from '../../utils/formatters';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Sparkles,
  Barcode,
  Building2,
  Boxes,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Camera,
  FolderTree,
  ShieldCheck,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import {
  validateBarcodeStrict,
  generateValidEAN13,
  generateUniqueSKU,
} from '../../utils/barcodeUtils';
import { CameraBarcodeScanner } from '../common/CameraBarcodeScanner';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>) => void;
  onUpdate?: (product: Product) => void;
  productToEdit?: Product | null;
  stores: Store[];
  categories?: string[];
  onOpenCategoryManager?: () => void;
  onAddCategory?: (newCategory: string) => void;
  existingProducts?: Product[];
}

const PRESET_IMAGES = [
  { label: 'Fones Bluetooth', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80' },
  { label: 'Capas Telemóvel', url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Power Bank', url: 'https://images.unsplash.com/photo-1609592424364-a698a6bb5c68?auto=format&fit=crop&w=400&q=80' },
  { label: 'Carregador Turbo', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80' },
  { label: 'Cabo Tipo-C', url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=400&q=80' },
  { label: 'Coluna de Som', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Memória MicroSD', url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80' },
  { label: 'Película 9D', url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=400&q=80' },
  { label: 'Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80' },
];

const CATEGORIES_LIST = [
  'Electrónica',
  'Acessórios',
  'Áudio',
  'Informática',
  'Telecomunicações',
  'Eletrodomésticos',
  'Bebidas & Mercearia',
  'Outros',
];

const UNITS_LIST = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'fd', label: 'Fardo (fd)' },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  productToEdit,
  stores,
  categories = CATEGORIES_LIST,
  onOpenCategoryManager,
  onAddCategory,
  existingProducts = [],
}) => {
  const [skuCode, setSkuCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Electrónica');
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [minStock, setMinStock] = useState<number | ''>(5);
  const [supplierName, setSupplierName] = useState('Mocambique Tech Distribuidora');
  const [unit, setUnit] = useState('un');
  const [imageUrl, setImageUrl] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [stockByStore, setStockByStore] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [copiedCodeNotice, setCopiedCodeNotice] = useState<string | null>(null);

  // Listas de códigos existentes para verificação estrita de duplicidade
  const allExistingSkus = (existingProducts || [])
    .filter((p) => !productToEdit || p.id !== productToEdit.id)
    .map((p) => p.code);

  const allExistingBarcodes = (existingProducts || [])
    .filter((p) => !productToEdit || p.id !== productToEdit.id)
    .map((p) => p.barcode);

  // Validações em tempo real
  const isSkuDuplicate = Boolean(
    skuCode.trim() && allExistingSkus.some((s) => s.toLowerCase() === skuCode.trim().toLowerCase())
  );
  const isBarcodeDuplicate = Boolean(
    barcode.trim() && allExistingBarcodes.some((b) => b.trim() === barcode.trim())
  );
  const barcodeValidation = validateBarcodeStrict(barcode);

  // Initialize or populate form
  useEffect(() => {
    if (productToEdit) {
      setSkuCode(productToEdit.code || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category || categories[0] || 'Electrónica');
      setName(productToEdit.name || '');
      setCostPrice(productToEdit.costPrice || 0);
      setSellingPrice(productToEdit.sellingPrice || 0);
      setMinStock(productToEdit.minStock ?? 5);
      setSupplierName(productToEdit.supplierName || 'Mocambique Tech Distribuidora');
      setUnit(productToEdit.unit || 'un');
      setImageUrl(productToEdit.imageUrl || '');

      // Load stock by store
      const initialStoreStock: Record<string, number> = {};
      stores.forEach((store) => {
        initialStoreStock[store.id] = productToEdit.stockByStore?.[store.id] ?? 0;
      });
      const totalAllocated = Object.values(initialStoreStock).reduce((a, b) => a + b, 0);
      if (totalAllocated === 0 && productToEdit.stockQuantity > 0 && stores[0]) {
        initialStoreStock[stores[0].id] = productToEdit.stockQuantity;
      }
      setStockByStore(initialStoreStock);
    } else {
      // Geração automática inicial de SKU único e EAN-13 válido
      const initialSku = generateUniqueSKU('Electrónica', '', allExistingSkus);
      const initialBarcode = generateValidEAN13('600', allExistingBarcodes);
      setSkuCode(initialSku);
      setBarcode(initialBarcode);
      setCategory(categories[0] || 'Electrónica');
      setName('');
      setCostPrice('');
      setSellingPrice('');
      setMinStock(5);
      setSupplierName('Mocambique Tech Distribuidora');
      setUnit('un');
      setImageUrl(PRESET_IMAGES[0].url);

      // Default stock distribution: 0 or equal distribution across stores
      const defaultDistribution: Record<string, number> = {};
      stores.forEach((s, idx) => {
        defaultDistribution[s.id] = idx === 0 ? 5 : 2;
      });
      setStockByStore(defaultDistribution);
    }
    setErrorMsg('');
  }, [productToEdit, isOpen, stores]);

  if (!isOpen) return null;

  // Real-time calculations
  const numCost = typeof costPrice === 'number' ? costPrice : 0;
  const numSelling = typeof sellingPrice === 'number' ? sellingPrice : 0;
  const grossProfitMT = numSelling - numCost;
  const grossMarginPercent = numSelling > 0 ? ((grossProfitMT / numSelling) * 100).toFixed(1) : '0.0';

  // Total consolidated stock
  const totalStockConsolidated = Object.values(stockByStore).reduce(
    (acc, val) => acc + (Number(val) || 0),
    0
  );

  const handleStoreQtyChange = (storeId: string, val: number) => {
    setStockByStore((prev) => ({
      ...prev,
      [storeId]: Math.max(0, val),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('A imagem selecionada é muito grande. Escolha uma foto com menos de 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Geradores e gestores de código
  const handleGenerateUniqueSku = () => {
    const newSku = generateUniqueSKU(category, name, allExistingSkus);
    setSkuCode(newSku);
    setErrorMsg('');
  };

  const handleGenerateValidEan = () => {
    const newEan = generateValidEAN13('600', allExistingBarcodes);
    setBarcode(newEan);
    setErrorMsg('');
  };

  const handleClearSku = () => {
    setSkuCode('');
  };

  const handleClearBarcode = () => {
    setBarcode('');
  };

  const handleClearAllCodes = () => {
    setSkuCode('');
    setBarcode('');
  };

  const handleCameraBarcodeScanned = (scannedCode: string) => {
    setBarcode(scannedCode);
    const validation = validateBarcodeStrict(scannedCode);
    if (!validation.isValid && validation.error) {
      setErrorMsg(`Aviso sobre o código lido: ${validation.error}`);
    } else {
      setErrorMsg('');
    }
  };

  const handleQuickAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;
    if (onAddCategory) {
      onAddCategory(clean);
    }
    setCategory(clean);
    setNewCatName('');
    setShowInlineCategory(false);
  };

  const handleCopyCode = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedCodeNotice(`${label} copiado!`);
    setTimeout(() => setCopiedCodeNotice(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor, informe a Designação Completa do Produto.');
      return;
    }
    if (numSelling <= 0) {
      setErrorMsg('O Preço de Venda deve ser superior a zero.');
      return;
    }
    if (!imageUrl.trim()) {
      setErrorMsg('A Imagem do Produto é obrigatória. Adicione um URL ou faça o carregamento.');
      return;
    }

    // Validação estrita de SKU
    const finalSku = skuCode.trim() || generateUniqueSKU(category, name, allExistingSkus);
    if (isSkuDuplicate) {
      setErrorMsg(`O código SKU "${skuCode.trim()}" já está a ser utilizado por outro produto no catálogo central.`);
      return;
    }

    // Validação estrita de Código de Barras (se preenchido)
    const finalBarcode = barcode.trim();
    if (finalBarcode) {
      const v = validateBarcodeStrict(finalBarcode);
      if (!v.isValid) {
        setErrorMsg(`Código de barras inválido: ${v.error}`);
        return;
      }
      if (isBarcodeDuplicate) {
        setErrorMsg(`O código de barras "${finalBarcode}" já está atribuído a outro produto no catálogo.`);
        return;
      }
    }

    const payload = {
      code: finalSku,
      barcode: finalBarcode, // Respeita código vazio caso o utilizador remova
      name: name.trim(),
      category: category.trim() || 'Geral',
      costPrice: numCost,
      sellingPrice: numSelling,
      minStock: typeof minStock === 'number' ? minStock : 5,
      stockQuantity: totalStockConsolidated,
      supplierName: supplierName.trim() || 'Distribuidor Nacional',
      unit: unit || 'un',
      imageUrl: imageUrl.trim(),
      stockByStore,
      lastRestocked: new Date().toLocaleDateString('pt-MZ'),
    };

    if (productToEdit && onUpdate) {
      onUpdate({
        ...productToEdit,
        ...payload,
      });
    } else {
      onSave(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl my-auto bg-[#121820] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e141c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white">
                {productToEdit ? 'Editar Artigo / Produto' : 'Cadastrar Novo Artigo / Produto'}
              </h3>
              <p className="text-xs text-slate-400">
                Preços de compra/venda, unidade, foto e alocação de stock por filial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LINHA 1: CÓDIGO SKU & CÓDIGO DE BARRAS PROFISSIONAL */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#090e15] border border-slate-800">
            {/* SKU Section */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Código SKU Único do Catálogo</span>
                  {skuCode && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                        isSkuDuplicate
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isSkuDuplicate ? '⚠ SKU Já Existente' : '✓ SKU Único'}
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleGenerateUniqueSku}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Gerar automaticamente um SKU único para este artigo"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gerar SKU Único</span>
                  </button>

                  {skuCode && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(skuCode, 'SKU')}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Copiar SKU"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSku}
                        className="px-1.5 py-0.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Limpar / Remover SKU"
                      >
                        Limpar
                      </button>
                    </>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value.toUpperCase())}
                placeholder="Ex: ELE-FON-001 (Código único interno)"
                className={`w-full bg-[#0a0f15] border rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none transition-colors ${
                  isSkuDuplicate ? 'border-rose-500 text-rose-200' : 'border-slate-700 focus:border-emerald-500'
                }`}
                required
              />
              {isSkuDuplicate && (
                <p className="text-[10px] text-rose-400 mt-1 font-medium">
                  Aviso: Este código SKU já pertence a outro artigo do catálogo central. Gere um novo código para evitar conflitos.
                </p>
              )}
            </div>

            {/* Barcode Section with Camera Scan & Strict Validation */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Barcode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Código de Barras (EAN-13 / UPC / Scanner)</span>
                  {barcode.trim() ? (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded-full border ${
                        isBarcodeDuplicate
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : barcodeValidation.isValid
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {isBarcodeDuplicate
                        ? '⚠ Barras Duplicado'
                        : barcodeValidation.isValid
                        ? `✓ ${barcodeValidation.format} Válido`
                        : '⚠ Formato Inválido'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">(Opcional / Granel)</span>
                  )}
                </label>

                {/* Ações do Código de Barras */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  {/* Botão de Câmera de Telemóvel */}
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 shadow transition-all cursor-pointer active:scale-95"
                    title="Usar a câmara do celular ou tablet como leitor óptico de código de barras"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ler com Câmara</span>
                  </button>

                  {/* Gerador EAN-13 Oficial */}
                  <button
                    type="button"
                    onClick={handleGenerateValidEan}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title="Gerar código EAN-13 oficial válido (Moçambique 600...)"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gerar EAN-13</span>
                  </button>

                  {barcode && (
                    <button
                      type="button"
                      onClick={handleClearBarcode}
                      className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Limpar Código de Barras"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value.trim())}
                  placeholder="Código de barras (ex: 6001234567890 ou use a câmara)..."
                  className={`w-full bg-[#0a0f15] border rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none transition-colors ${
                    isBarcodeDuplicate || (barcode.trim() && !barcodeValidation.isValid)
                      ? 'border-rose-500 text-rose-200'
                      : 'border-slate-700 focus:border-cyan-500'
                  }`}
                />
              </div>

              {/* Detalhes de validação em tempo real */}
              {barcode.trim() && !barcodeValidation.isValid && (
                <p className="text-[10px] text-rose-400 mt-1 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{barcodeValidation.error}</span>
                </p>
              )}

              {isBarcodeDuplicate && (
                <p className="text-[10px] text-rose-400 mt-1 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Atenção: Este código de barras já está registado num produto existente no catálogo central.</span>
                </p>
              )}

              {barcode.trim() && barcodeValidation.isValid && (
                <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[11px] text-slate-300 font-mono">
                      {barcodeValidation.details || 'Código conforme os padrões comerciais GS1'}
                    </span>
                  </div>

                  {/* Pré-visualização gráfica de barras térmicas */}
                  <div className="bg-white px-2 py-1 rounded flex items-center gap-0.5 h-6">
                    {Array.from(barcode.slice(0, 16)).map((c, i) => (
                      <div
                        key={i}
                        className="bg-black h-full"
                        style={{ width: `${((c.charCodeAt(0) % 3) + 1) * 1.5}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LINHA 1.5: Categoria do Artigo Dinâmica */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Categoria do Artigo</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInlineCategory(!showInlineCategory)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova Categoria</span>
                </button>
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                  >
                    <FolderTree className="w-3 h-3" />
                    <span>Gerir Categorias</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mini formulário inline de categoria */}
            {showInlineCategory && (
              <div className="mb-2 p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da nova categoria..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleQuickAddCategory}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Gravar
                </button>
                <button
                  type="button"
                  onClick={() => setShowInlineCategory(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* LINHA 2: Designação Completa do Produto */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5">
              Designação Completa do Produto <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fones Bluetooth Sem Fios Pro com Cancelamento Ativo"
              className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-4 py-3 text-white font-medium text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {/* LINHA 3: Preço Compra (MT), Preço Venda (MT) e Stock Mínimo de Alerta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Preço de Compra (MT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-[11px]">MT</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Preço de Venda (MT) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#0a0f15] border border-emerald-600/70 rounded-xl pl-3 pr-10 py-2.5 text-emerald-400 font-extrabold text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  required
                />
                <span className="absolute right-3 top-2.5 text-emerald-400 font-bold text-[11px]">MT</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Stock Mínimo de Alerta
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="5"
                className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Margem Bruta Estimada Preview */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400">Margem Bruta Estimada por Unidade:</span>
            <div className="flex items-center gap-2">
              <span
                className={`font-black px-2.5 py-1 rounded-lg border ${
                  grossProfitMT >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {grossProfitMT >= 0 ? '+' : ''}
                {formatMZN(grossProfitMT)} ({grossMarginPercent}%)
              </span>
              <span className="text-slate-400 text-[11px]">
                {numSelling > 0 && numCost > 0
                  ? `Lucro de ${formatMZN(grossProfitMT)} por ${unit}`
                  : 'Insira os preços para cálculo automático'}
              </span>
            </div>
          </div>

          {/* LINHA 4: Fornecedor (Opcional) e Unidade de Medida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Fornecedor (Opcional)
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ex: Mocambique Tech Distribuidora"
                className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-[#0a0f15] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                {UNITS_LIST.map((u) => (
                  <option key={u.value} value={u.value} className="bg-slate-900 text-white">
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* NOVO CAMPO OBRIGATÓRIO: Imagem do Produto / Foto (URL ou Carregamento) */}
          <div className="p-4 rounded-2xl bg-[#0a0f15] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Imagem do Produto / Foto (URL ou Carregamento) <span className="text-emerald-400">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline"
              >
                {showPresets ? 'Ocultar Galeria' : 'Escolher da Galeria'}
              </button>
            </div>

            {/* Presets Gallery Drawer */}
            {showPresets && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                <p className="text-[11px] text-slate-400">Clique para selecionar uma foto de catálogo:</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageUrl(img.url);
                        setShowPresets(false);
                      }}
                      className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 aspect-square transition-all"
                      title={img.label}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[9px] text-center truncate text-white">
                        {img.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Image URL input */}
              <div className="sm:col-span-8">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-produto.jpg ou carregue do dispositivo"
                  className="w-full bg-[#121820] border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Upload file button */}
              <div className="sm:col-span-4">
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 cursor-pointer font-bold text-xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Carregar Ficheiro</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Instant Preview Box */}
            {imageUrl ? (
              <div className="flex items-center gap-3 p-3 bg-[#121820] rounded-xl border border-emerald-900/40">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-0.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Foto pronta para o catálogo</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{imageUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Remover foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-[11px]">
                Nenhuma foto selecionada. Insira um link, escolha da galeria ou faça upload.
              </div>
            )}
          </div>

          {/* SECÇÃO: Stock Inicial por Loja */}
          <div className="p-4 rounded-2xl bg-[#0b0f14] border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Stock Inicial por Loja
                </h4>
                <p className="text-[11px] text-slate-400">
                  Defina a quantidade alocada em cada filial cadastrada na rede
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Total Consolidado:</span>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-black rounded-lg border border-emerald-500/30 text-xs">
                  {totalStockConsolidated} {unit}
                </span>
              </div>
            </div>

            {/* Grid of branches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stores.map((store) => {
                const qty = stockByStore[store.id] ?? 0;
                const storeCode = store.code.replace('LOJA-', 'LJ-');

                return (
                  <div
                    key={store.id}
                    className={`p-3 rounded-xl border transition-all ${
                      qty > 0
                        ? 'bg-slate-900/80 border-slate-700/80'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <div className="min-w-0">
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-black text-[10px] rounded mb-1">
                          {storeCode}
                        </span>
                        <h5 className="font-bold text-white text-xs truncate" title={store.name}>
                          {store.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate">{store.city}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleStoreQtyChange(store.id, qty - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => handleStoreQtyChange(store.id, parseInt(e.target.value) || 0)}
                        className={`w-full text-center bg-[#0a0f15] border rounded-lg py-1 font-bold text-xs focus:outline-none transition-colors ${
                          qty > 0
                            ? 'border-emerald-700 text-white'
                            : 'border-slate-800 text-slate-500'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleStoreQtyChange(store.id, qty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 bg-[#0e141c] -mx-6 -mb-6 p-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/50 hover:shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{productToEdit ? 'Guardar Alterações' : 'Criar Produto'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Leitor Óptico de Código de Barras por Câmara */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraBarcodeScanned}
        title="Leitor de Código de Barras do Produto"
        subtitle="Aponte a câmara do telemóvel para a embalagem do artigo"
      />

      {/* Notificação flutuante de código copiado */}
      {copiedCodeNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl font-bold text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedCodeNotice}</span>
        </div>
      )}
    </div>
  );
};
