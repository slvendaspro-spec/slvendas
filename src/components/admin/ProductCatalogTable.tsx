import React, { useState, useMemo } from 'react';
import { Product, Store } from '../../types';
import { formatMZN } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { CategoryManagerModal } from '../common/CategoryManagerModal';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  Boxes,
  AlertTriangle,
  ArrowLeft,
  Filter,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  FolderTree,
} from 'lucide-react';

interface ProductCatalogTableProps {
  products: Product[];
  stores: Store[];
  onOpenCreateModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onOpenStockModal: (product: Product, storeId?: string) => void;
  onBackToDashboard?: () => void;
}

export type QuickFilterType = 'all' | 'low_stock' | 'out_of_stock';

export const ProductCatalogTable: React.FC<ProductCatalogTableProps> = ({
  products,
  stores,
  onOpenCreateModal,
  onEditProduct,
  onDeleteProduct,
  onOpenStockModal,
  onBackToDashboard,
}) => {
  const {
    categories: appCategories,
    addCategory,
    deleteCategory,
    renameCategory,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Counts for quick filters
  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    products.forEach((p) => {
      if (p.stockQuantity <= 0) {
        out++;
      } else if (p.stockQuantity <= p.minStock) {
        low++;
      }
    });
    return {
      all: products.length,
      low_stock: low,
      out_of_stock: out,
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = prod.name.toLowerCase().includes(term);
        const matchesCode = prod.code.toLowerCase().includes(term);
        const matchesBarcode = prod.barcode.toLowerCase().includes(term);
        const matchesCategory = prod.category.toLowerCase().includes(term);
        const matchesSupplier = prod.supplierName?.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesBarcode && !matchesCategory && !matchesSupplier) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
        return false;
      }

      // Quick filter
      if (quickFilter === 'low_stock') {
        if (!(prod.stockQuantity > 0 && prod.stockQuantity <= prod.minStock)) {
          return false;
        }
      } else if (quickFilter === 'out_of_stock') {
        if (prod.stockQuantity > 0) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchTerm, selectedCategory, quickFilter]);

  return (
    <div className="space-y-4 animate-fadeIn bg-[#0B0F14] text-slate-100 rounded-2xl border border-slate-800/80 p-4 sm:p-6 shadow-2xl">
      {/* BARRA SUPERIOR: Título, Subtítulo e Botão + Novo Produto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Boxes className="w-6 h-6 text-emerald-400" />
              <span>Catálogo Central de Produtos & Stock</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Controlo de Inventário por loja, preços de compra/venda, margens e alertas de reposição
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
            title="Adicionar, editar e remover categorias do catálogo"
          >
            <FolderTree className="w-4 h-4 text-emerald-400" />
            <span>Gerir Categorias</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/60 hover:shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Produto</span>
          </button>
        </div>
      </div>

      {/* LINHA DE FILTROS: Busca, Categorias e Filtros Rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0e141c] p-3 rounded-xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, SKU, código de barras..."
            className="w-full bg-[#121820] border border-slate-700/70 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#121820] border border-slate-700/70 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="all">Todas as Categorias ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
              quickFilter === 'all'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                quickFilter === 'all' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
              quickFilter === 'low_stock'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'bg-slate-900 text-amber-400/90 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>⚠️ Stock Baixo</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                quickFilter === 'low_stock' ? 'bg-black/30 text-white' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {counts.low_stock}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
              quickFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-slate-900 text-rose-400/90 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>🚫 Esgotados</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                quickFilter === 'out_of_stock' ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {counts.out_of_stock}
            </span>
          </button>
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0d1219]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#090d13] text-slate-400 font-bold tracking-wider text-[11px] uppercase">
              <th className="py-3.5 px-4 min-w-[250px]">Código / Nome do Produto</th>
              <th className="py-3.5 px-3 min-w-[120px]">Categoria</th>
              <th className="py-3.5 px-3 text-right min-w-[110px]">Preço Compra</th>
              <th className="py-3.5 px-3 text-right min-w-[110px]">Preço Venda</th>
              <th className="py-3.5 px-3 text-right min-w-[140px]">Margem Bruta</th>
              <th className="py-3.5 px-3 min-w-[260px]">Stock por Loja</th>
              <th className="py-3.5 px-3 text-center min-w-[130px]">Stock Total</th>
              <th className="py-3.5 px-4 text-right min-w-[130px]">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/70">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-semibold text-sm text-slate-400">Nenhum produto encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tente ajustar o termo de pesquisa ou limpar os filtros selecionados.
                  </p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const margin = p.sellingPrice - p.costPrice;
                const marginPercent =
                  p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(1) : '0.0';
                const isOutOfStock = p.stockQuantity <= 0;
                const isLowStock = !isOutOfStock && p.stockQuantity <= p.minStock;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* COLUNA 1: CÓDIGO / NOME DO PRODUTO */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {/* Miniatura limpa da imagem */}
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shrink-0 shadow-sm">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Nome, SKU e fornecedor */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-xs sm:text-sm truncate max-w-xs" title={p.name}>
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                              {p.code}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 truncate">
                              • {p.barcode}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5" title={p.supplierName}>
                            {p.supplierName || 'Distribuidor Nacional'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* COLUNA 2: CATEGORIA */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/70 font-semibold text-[11px]">
                        {p.category}
                      </span>
                      {p.unit && (
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          Unid: {p.unit}
                        </span>
                      )}
                    </td>

                    {/* COLUNA 3: PREÇO COMPRA */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-mono text-slate-300 font-medium">
                        {formatMZN(p.costPrice)}
                      </span>
                    </td>

                    {/* COLUNA 4: PREÇO VENDA */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-mono font-extrabold text-white text-sm">
                        {formatMZN(p.sellingPrice)}
                      </span>
                    </td>

                    {/* COLUNA 5: MARGEM BRUTA */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span
                          className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${
                            margin >= 0
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {margin >= 0 ? '+' : ''}
                          {marginPercent}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {margin >= 0 ? '+' : ''}
                          {formatMZN(margin)}
                        </span>
                      </div>
                    </td>

                    {/* COLUNA 6: STOCK POR LOJA */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                        {stores.map((store) => {
                          const storeCode = store.code.replace('LOJA-', 'LJ-');
                          // check stockByStore or fall back to store allocation
                          const storeQty = p.stockByStore?.[store.id] ?? 0;
                          const isZero = storeQty <= 0;

                          return (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() => onOpenStockModal(p, store.id)}
                              className={`flex flex-col items-center justify-center min-w-[42px] px-1.5 py-1 rounded-lg border text-center transition-all ${
                                isZero
                                  ? 'bg-rose-950/80 text-rose-400 border-rose-800/80 font-black hover:bg-rose-900/90'
                                  : 'bg-slate-900/90 text-slate-200 border-slate-700/60 font-semibold hover:border-emerald-500'
                              }`}
                              title={`${store.name}: ${storeQty} unid. (Clique para repor)`}
                            >
                              <span className="text-[9px] uppercase tracking-wider opacity-75 font-mono">
                                {storeCode}
                              </span>
                              <span className={`text-[11px] leading-tight ${isZero ? 'text-rose-300 font-black' : 'text-white font-bold'}`}>
                                {storeQty}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* COLUNA 7: STOCK TOTAL */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-white font-mono">
                          {p.stockQuantity} {p.unit || 'un'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Mín: {p.minStock} {p.unit || 'un'}
                        </span>

                        <div className="mt-1">
                          {isOutOfStock ? (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black text-[9px]">
                              ESGOTADO
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-[9px]">
                              STOCK BAIXO
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[9px]">
                              EM STOCK
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* COLUNA 8: AÇÕES */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenStockModal(p)}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-700/60 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                          title="Repor Stock"
                        >
                          + Stock
                        </button>

                        <button
                          onClick={() => onEditProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Editar Artigo"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remover Artigo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800">
        <div>
          A mostrar <strong className="text-white">{filteredProducts.length}</strong> de{' '}
          <strong className="text-white">{products.length}</strong> produtos registados na rede central.
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Stock Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Stock Baixo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Esgotado / Alerta Vermelho</span>
          </div>
        </div>
      </div>

      {/* Modal de Gestão de Categorias */}
      {showCategoryModal && (
        <CategoryManagerModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={appCategories}
          products={products}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onRenameCategory={renameCategory}
        />
      )}
    </div>
  );
};
