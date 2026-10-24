import React, { useState } from 'react';
import { Sale } from '../../types';
import { formatMZN } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  CheckCircle,
  X,
  Smartphone,
  Monitor,
  Tag,
  Leaf,
  Barcode,
  Share2,
} from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

type PrintFormat = '58mm' | '80mm' | 'label';

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { companySettings } = useApp();

  const [printFormat, setPrintFormat] = useState<PrintFormat>(
    (companySettings.thermalWidth as PrintFormat) || '58mm'
  );
  const [economyMode, setEconomyMode] = useState<boolean>(
    companySettings.paperEconomyMode ?? true
  );

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      {/* Print Specific CSS embedded */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-thermal-area, #printable-thermal-area * {
            visibility: visible;
          }
          #printable-thermal-area {
            position: fixed;
            left: 0;
            top: 0;
            width: ${printFormat === '58mm' ? '54mm' : printFormat === 'label' ? '50mm' : '76mm'} !important;
            margin: 0 !important;
            padding: ${economyMode ? '2mm' : '4mm'} !important;
            box-shadow: none !important;
            border: none !important;
            color: #000 !important;
            background: #fff !important;
            font-size: ${printFormat === '58mm' ? '10px' : '11px'} !important;
            line-height: ${economyMode ? '1.15' : '1.3'} !important;
          }
          @page {
            size: ${printFormat === '58mm' ? '58mm auto' : printFormat === 'label' ? '58mm 40mm' : '80mm auto'};
            margin: 0mm;
          }
        }
      `}</style>

      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-slate-100 text-sm">Recibo de Venda Autorizado</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printer Format Selector & Controls Ribbon */}
        <div className="px-5 py-3 bg-[#0a1420] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Formato:</span>
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintFormat('58mm')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  printFormat === '58mm'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Impressora Térmica Portátil Bluetooth 58mm (GOOJPRT, POS-58, MPT-II) para poupar espaço no balcão"
              >
                <Smartphone className="w-3 h-3" />
                <span>58mm (Portátil)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('80mm')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  printFormat === '80mm'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Impressora Térmica Padrão de Supermercado 80mm"
              >
                <Monitor className="w-3 h-3" />
                <span>80mm (Desktop)</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('label')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  printFormat === 'label'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Etiqueta Compacta de Prateleira com Código de Barras"
              >
                <Tag className="w-3 h-3" />
                <span>Etiqueta</span>
              </button>
            </div>
          </div>

          {/* Economy Mode Toggle */}
          <button
            type="button"
            onClick={() => setEconomyMode(!economyMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
              economyMode
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
            title="Reduz margens e espaçamento em branco para poupar bobina de papel térmico"
          >
            <Leaf className="w-3 h-3 text-emerald-400" />
            <span>Poupança de Papel: {economyMode ? 'Activa' : 'Desactivada'}</span>
          </button>
        </div>

        {/* Thermal Slip Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex justify-center items-start">
          <div
            id="printable-thermal-area"
            className={`bg-white text-slate-950 rounded-xl font-mono shadow-2xl transition-all border border-slate-200 ${
              printFormat === '58mm'
                ? 'w-[280px] p-4 text-[10px]'
                : printFormat === 'label'
                ? 'w-[260px] p-3 text-[10px]'
                : 'w-[360px] p-5 text-xs'
            } ${economyMode ? 'leading-tight' : 'leading-normal'}`}
          >
            {printFormat === 'label' ? (
              /* SHELF LABEL / COMPACT BARCODE MODE */
              <div className="space-y-2 text-center">
                <div className="border-b border-dashed border-slate-400 pb-1.5">
                  <span className="font-extrabold text-[11px] text-slate-900 block truncate uppercase">
                    {companySettings.companyName || 'SL VENDAS PRO'}
                  </span>
                  <span className="text-[9px] text-slate-500 block">{sale.storeName}</span>
                </div>

                <div className="py-1">
                  <div className="font-black text-sm text-slate-900 leading-snug line-clamp-2">
                    {sale.items[0]?.productName || 'Artigo Comercial'}
                  </div>
                  <span className="block font-mono text-[9px] text-slate-500 mt-0.5">
                    SKU: {sale.items[0]?.productCode || 'GEN-001'}
                  </span>
                </div>

                <div className="p-2 bg-slate-100 rounded-lg border border-slate-300">
                  <span className="text-[9px] text-slate-600 block uppercase font-bold">PREÇO DE VENDA</span>
                  <span className="text-lg font-black text-slate-950 tracking-tight block">
                    {formatMZN(sale.items[0]?.price || sale.total)}
                  </span>
                </div>

                {/* Barcode visual representation */}
                <div className="pt-1 flex flex-col items-center">
                  <div className="w-44 h-8 bg-black/10 rounded flex items-center justify-center p-1">
                    <div className="flex gap-[1.5px] items-end h-full">
                      {[1,3,2,4,1,2,3,1,4,2,1,3,2,1,4,1,2,3,1,2,4,1,3].map((w, i) => (
                        <div
                          key={i}
                          className="bg-black h-full"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-[9px] font-bold tracking-widest text-slate-800 mt-0.5">
                    {sale.items[0]?.productCode || sale.receiptNumber}
                  </span>
                </div>

                <div className="pt-1 text-[8px] text-slate-400 flex justify-between border-t border-slate-200">
                  <span>Validade: S/D</span>
                  <span>Emissão: {sale.createdAt.split(' ')[0]}</span>
                </div>
              </div>
            ) : (
              /* THERMAL RECEIPT (58mm or 80mm) */
              <>
                {/* Store Header */}
                <div className={`text-center ${economyMode ? 'pb-2' : 'pb-3'} border-b border-dashed border-slate-400`}>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 uppercase">
                    {companySettings.companyName || 'SL VENDAS PRO'}
                  </h2>
                  <p className="text-[9px] text-slate-600 font-sans font-medium">
                    SISTEMA MULTIEMPRESA MZ &bull; PDV OFICIAL
                  </p>
                  <div className={`mt-1 text-[10px] leading-tight text-slate-700 ${economyMode ? 'space-y-0' : 'space-y-0.5'}`}>
                    <p className="font-bold">{sale.storeName}</p>
                    <p>Quelimane - Zambézia - Moçambique</p>
                    <p>NUIT: 400 982 119 | Tel: +258 84 987 6543</p>
                  </div>
                </div>

                {/* Sale Metadata */}
                <div className={`${economyMode ? 'py-1.5' : 'py-2.5'} border-b border-dashed border-slate-400 space-y-0.5 text-[10px] sm:text-[11px] text-slate-800`}>
                  <div className="flex justify-between">
                    <span>DOC / FACTURA:</span>
                    <span className="font-bold text-slate-950">{sale.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATA / HORA:</span>
                    <span>{sale.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OPERADOR:</span>
                    <span className="font-medium truncate max-w-[140px]">{sale.sellerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CLIENTE:</span>
                    <span className="font-medium truncate max-w-[140px]">{sale.customerName || 'Cliente Balcão'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESTADO:</span>
                    <span className="font-bold text-emerald-800">
                      {sale.status === 'paid' ? 'PAGO' : 'ESTORNADO'}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className={`${economyMode ? 'py-1.5' : 'py-2'} border-b border-dashed border-slate-400`}>
                  <div className="grid grid-cols-12 font-bold pb-1 text-[9px] text-slate-600 uppercase border-b border-slate-300">
                    <span className="col-span-6">DESCRIÇÃO</span>
                    <span className="col-span-2 text-center">QTD</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>

                  <div className="divide-y divide-slate-100 py-0.5">
                    {sale.items.map((it, idx) => (
                      <div key={idx} className={`grid grid-cols-12 ${economyMode ? 'py-0.5' : 'py-1'} text-[10px] leading-tight`}>
                        <div className="col-span-6 pr-1 font-medium text-slate-900 truncate">
                          {it.productName}
                          <span className="block text-[8px] text-slate-500 font-sans">
                            {it.productCode}
                          </span>
                        </div>
                        <div className="col-span-2 text-center text-slate-700 font-mono">
                          {it.quantity}x
                        </div>
                        <div className="col-span-4 text-right font-bold text-slate-950 font-mono">
                          {it.subtotal.toFixed(2)} MT
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className={`${economyMode ? 'py-1.5' : 'py-2'} border-b border-dashed border-slate-400 space-y-0.5 text-[10px] sm:text-[11px]`}>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{sale.subtotal.toFixed(2)} MT</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-medium">
                      <span>Desconto Aplicado:</span>
                      <span className="font-mono">- {sale.discount.toFixed(2)} MT</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs sm:text-sm font-black text-slate-950 pt-1 border-t border-slate-300">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-emerald-800 font-mono font-black">{formatMZN(sale.total)}</span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className={`${economyMode ? 'py-1.5' : 'py-2'} border-b border-dashed border-slate-400 text-[10px] space-y-0.5 text-slate-800`}>
                  <div className="flex justify-between">
                    <span>FORMA DE PAGAMENTO:</span>
                    <span className="font-bold uppercase text-slate-950">
                      {sale.paymentMethod === 'mpesa'
                        ? 'M-Pesa (Vodacom)'
                        : sale.paymentMethod === 'emola'
                        ? 'e-Mola (Movitel)'
                        : sale.paymentMethod === 'dinheiro'
                        ? 'Dinheiro Físico'
                        : sale.paymentMethod === 'cartao'
                        ? 'POS / Cartão Bancário'
                        : sale.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                  {sale.paymentRef && (
                    <div className="flex justify-between text-slate-600">
                      <span>REF. TRANSAÇÃO:</span>
                      <span className="font-mono font-bold text-slate-900">{sale.paymentRef}</span>
                    </div>
                  )}
                  {sale.paidAmount && sale.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>VALOR ENTREGUE:</span>
                        <span className="font-mono">{sale.paidAmount.toFixed(2)} MT</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-950">
                        <span>TROCO:</span>
                        <span className="font-mono font-extrabold text-emerald-800">
                          {(sale.changeAmount || 0).toFixed(2)} MT
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer and Thermal Barcode Stamp */}
                <div className={`${economyMode ? 'pt-2' : 'pt-3'} text-center space-y-1.5`}>
                  <div className="flex justify-center items-center py-1 bg-slate-50 border border-slate-200 rounded">
                    <span className="tracking-[0.25em] font-mono font-bold text-[10px] text-slate-800">
                      * {sale.receiptNumber} *
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-600 font-sans italic">
                    {companySettings.footerMessage || 'Obrigado pela sua preferência! Volte sempre.'}
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono">
                    Documento Processado por Computador &bull; SL VENDAS PRO
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Pronto para impressão em impressora Bluetooth ou USB</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-950/60 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {printFormat === 'label' ? 'Etiqueta' : `(${printFormat})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
