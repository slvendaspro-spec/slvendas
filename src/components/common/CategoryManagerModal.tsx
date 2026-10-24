import React, { useState } from 'react';
import { Product } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  AlertTriangle,
  FolderTree,
  Search,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  products: Product[];
  onAddCategory: (newCategory: string) => void;
  onDeleteCategory: (categoryToDelete: string, reassignTo?: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [reassignCategory, setReassignCategory] = useState('Outros');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Filtered categories
  const filtered = categories.filter((c) =>
    c.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const getProductCount = (catName: string) => {
    return products.filter((p) => p.category?.toLowerCase() === catName.toLowerCase()).length;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) {
      setErrorMsg('Informe o nome da categoria.');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setErrorMsg('Esta categoria já existe.');
      return;
    }

    onAddCategory(clean);
    setNewCatName('');
    setErrorMsg('');
  };

  const startEdit = (cat: string) => {
    setEditingCat(cat);
    setEditValue(cat);
    setErrorMsg('');
  };

  const handleSaveRename = (oldName: string) => {
    const clean = editValue.trim();
    if (!clean) {
      setErrorMsg('O nome da categoria não pode estar vazio.');
      return;
    }
    if (clean.toLowerCase() !== oldName.toLowerCase() && categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setErrorMsg('Já existe outra categoria com este nome.');
      return;
    }

    onRenameCategory(oldName, clean);
    setEditingCat(null);
    setEditValue('');
    setErrorMsg('');
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    onDeleteCategory(categoryToDelete, reassignCategory);
    setCategoryToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Gestão de Categorias</h3>
              <p className="text-xs text-slate-400">Criar, renomear e remover categorias de produtos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form para Adicionar Nova Categoria */}
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nome da nova categoria (ex: Calçado, Bebidas)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </form>

        {/* Barra de Pesquisa */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar entre as categorias cadastradas..."
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Lista de Categorias */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma categoria encontrada com esse termo.
            </div>
          ) : (
            filtered.map((cat) => {
              const count = getProductCount(cat);
              const isEditing = editingCat === cat;

              return (
                <div
                  key={cat}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(cat)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          title="Gravar alteração"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCat(null)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {cat}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {count === 1 ? '1 artigo associado' : `${count} artigos associados`}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Renomear Categoria"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Remover Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Confirmação de Exclusão de Categoria */}
        {categoryToDelete && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">
                  Remover Categoria &ldquo;{categoryToDelete}&rdquo;?
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Esta categoria possui <strong>{getProductCount(categoryToDelete)}</strong> produto(s) associado(s).
                </p>
              </div>
            </div>

            {getProductCount(categoryToDelete) > 0 && (
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Reatribuir os produtos para outra categoria:
                </label>
                <select
                  value={reassignCategory}
                  onChange={(e) => setReassignCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  {categories
                    .filter((c) => c !== categoryToDelete)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value="Outros">Outros</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white rounded-xl bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Total: {categories.length} categoria(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
