import type { Transaction } from '../types'
import { money } from '../utils/format'

interface ReceiptProps {
  tx: Transaction
  storeName?: string
  address?: string
  contact?: string
  receiptFooter?: string
  terminalId: string
}

export function Receipt({
  tx,
  storeName = 'TINDA POS',
  address = '',
  contact = '',
  receiptFooter = '',
  terminalId
}: ReceiptProps): React.JSX.Element {
  const settledAt = new Date(tx.created_at)
  const dateLine = `${settledAt.toLocaleDateString('en-PH', { dateStyle: 'medium' })} ${settledAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}`
  const paymentLabel = tx.payment_method === 'CASH' ? 'CASH' : tx.payment_method === 'GCASH' ? 'E-TRANSFER (GCASH)' : 'CREDIT LEDGER'

  return (
    <div className="receipt print-area">
      <p className="center bold">{storeName}</p>
      {address && <p className="center">{address}</p>}
      {contact && <p className="center">Contact: {contact}</p>}

      <div className="dashed" />

      <p className="row"><span>TERMINAL</span><span>{terminalId}</span></p>
      <p className="row"><span>INVOICE</span><span>{tx.invoice_number}</span></p>
      <p className="row"><span>CASHIER</span><span>{tx.cashier_name}</span></p>
      <p className="row"><span>DATE</span><span>{dateLine}</span></p>

      <div className="dashed" />

      <div className="item-head">
        <span className="flex-1">ITEM</span>
        <span className="qty">QTY</span>
        <span className="amt">AMOUNT</span>
      </div>
      <div className="dashed thin" />
      {tx.items.map((it, idx) => (
        <div className="item" key={idx}>
          <span className="flex-1 name">{it.name}</span>
          <span className="qty">
            {it.quantity}x {money(it.unit_price_c)}
          </span>
          <span className="amt">{money(it.total_c)}</span>
        </div>
      ))}

      <div className="dashed" />

      <p className="row"><span>SUBTOTAL</span><span>{money(tx.subtotal_c)}</span></p>
      {tx.discount_c > 0 && (
        <p className="row"><span>DISCOUNT</span><span>-{money(tx.discount_c)}</span></p>
      )}
      <p className="row total"><span>TOTAL SETTLED</span><span>{money(tx.total_c)}</span></p>

      <div className="dashed" />

      <p className="row"><span>PAYMENT</span><span>{paymentLabel}</span></p>
      <p className="row"><span>AMOUNT</span><span>{money(tx.amount_tendered_c)}</span></p>
      {tx.payment_method === 'CASH' && (
        <p className="row"><span>CHANGE</span><span>{money(tx.change_c)}</span></p>
      )}

      <div className="dashed" />

      {receiptFooter && <p className="center footer">{receiptFooter}</p>}
      <p className="center">Thank you, come again!</p>
      <p className="center tiny">tindapos-web · TINDA POS</p>
    </div>
  )
}