import { Platform } from 'react-native';
import { getStoreSettings } from './storeSettings';

/**
 * Builds a professional, highly readable 58mm thermal receipt HTML document.
 * Designed for clarity: bold headers, generous spacing, clear item lines,
 * rupee symbol (₹), and a crisp total section.
 */
export function buildReceiptHTML(invoice) {
  const store = getStoreSettings();

  const items = invoice?.items || [];
  const payMethod = (invoice?.payment_method || 'cash').toUpperCase();
  const invoiceNo = invoice?.invoice_number || invoice?.invoiceNumber || invoice?._id || '—';
  const customerName =
    invoice?.customer_name ||
    invoice?.customer?.name ||
    invoice?.customer?.customer_name ||
    null;

  // ── Date / Time ──────────────────────────────
  const now = invoice?.date ? new Date(invoice.date) : new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Totals ───────────────────────────────────
  const subtotal = invoice?.subtotal ?? items.reduce((sum, item) => {
    const p = item.selling_price ?? item.mrp ?? item.price ?? 0;
    const q = item.cart_quantity ?? item.quantity ?? 0;
    return sum + p * q;
  }, 0);

  const totalDiscount = invoice?.total_discount ?? items.reduce((sum, item) => {
    const p = item.selling_price ?? item.mrp ?? item.price ?? 0;
    const q = item.cart_quantity ?? item.quantity ?? 0;
    const d = item.discount_percent ?? item.discount ?? 0;
    return sum + (p * q * d / 100);
  }, 0);

  const doctorFee = Number(invoice?.doctor_fee ?? 0);
  const otcItems = Array.isArray(invoice?.otc_items) ? invoice.otc_items : [];
  const otcTotal = Number(invoice?.otc_total ?? otcItems.reduce((s, i) => s + (Number(i.price) || 0), 0));

  const grandTotal = invoice?.grand_total ?? invoice?.grandTotal ?? invoice?.total ?? (subtotal - totalDiscount + doctorFee + otcTotal);
  const amountPaid = invoice?.amount_paid ?? invoice?.paid_amount ?? invoice?.amountPaid ?? null;
  const dueAmount = invoice?.due_amount ?? invoice?.dueAmount ?? null;
  const qrAmount = (amountPaid != null && amountPaid > 0) ? amountPaid : grandTotal;

  // ── Item rows ────────────────────────────────
  let itemsHTML = '';
  items.forEach((item, idx) => {
    const name = item.medicine_name || item.product_name || item.name || 'Item';
    const qty = item.cart_quantity ?? item.quantity ?? 0;
    const price = item.selling_price ?? item.mrp ?? item.price ?? 0;
    const disc = item.discount_percent ?? item.discount ?? 0;

    // Loose sale support
    const isLoose = item.is_loose_sale || item.is_loose_mode;
    const tabletCount = item.loose_tablet_count;
    const pricePerTablet = item.loose_price_per_tablet;

    const lineTotal = item.total ?? item.line_total ??
      (isLoose
        ? (item.loose_total_price ?? pricePerTablet * tabletCount)
        : (price * qty * (1 - disc / 100)));

    const qtyLine = isLoose
      ? `${tabletCount} tab × ₹${Number(pricePerTablet).toFixed(2)}/tab`
      : `${qty} × ₹${Number(price).toFixed(2)}${disc > 0 ? `  <span class="disc">(-${disc}%)</span>` : ''}`;

    // Separate items with subtle divider (skip for last)
    const divider = idx < items.length - 1 ? '<div class="item-div"></div>' : '';

    itemsHTML += `
<div class="item-block">
  <div class="item-name">${name}${isLoose ? ' <span class="loose-tag">LOOSE</span>' : ''}</div>
  <div class="item-row">
    <span class="item-calc">${qtyLine}</span>
    <span class="item-total">₹${Number(lineTotal).toFixed(2)}</span>
  </div>
</div>${divider}`;
  });

  // ── Conditional lines ─────────────────────────
  const gstLine = store.gstNo
    ? `<div class="store-phone">GST: ${store.gstNo}</div>`
    : '';

  const discLine = totalDiscount > 0
    ? `<div class="summary-row discount-row">
        <span>Discount</span>
        <span>-₹${Number(totalDiscount).toFixed(2)}</span>
       </div>`
    : '';

  const taxLine = (invoice?.tax != null && invoice.tax > 0)
    ? `<div class="summary-row">
        <span>GST / Tax</span>
        <span>₹${Number(invoice.tax).toFixed(2)}</span>
       </div>`
    : '';

  const paidLine = (amountPaid != null)
    ? `<div class="summary-row">
        <span>Paid Amount</span>
        <span>₹${Number(amountPaid).toFixed(2)}</span>
       </div>`
    : '';

  const changeLine = '';

  const dueLine = (dueAmount != null && dueAmount > 0)
    ? `<div class="summary-row due-row">
        <span>Due Amount</span>
        <span>₹${Number(dueAmount).toFixed(2)}</span>
       </div>`
    : '';

  const doctorFeeLine = doctorFee > 0
    ? `<div class="summary-row doctor-row">
        <span>Doctor Fee</span>
        <span>₹${Number(doctorFee).toFixed(2)}</span>
       </div>`
    : '';

  const otcLinesHTML = otcItems.length > 0 && otcTotal > 0
    ? otcItems
      .filter(i => Number(i.price) > 0)
      .map(i => `<div class="summary-row otc-row">
        <span>${String(i.name)}</span>
        <span>₹${Number(i.price).toFixed(2)}</span>
       </div>`)
      .join('')
    : '';

  const customerLine = customerName
    ? `<div class="meta-row"><span class="meta-label">Customer</span><span class="meta-val">${customerName}</span></div>`
    : '';

  // ── UPI configuration ─────────────────────────
  const upiId = store.upiId || '8101402916@okbizaxis';
  const upiStoreName = store.storeName.replace(/[^a-zA-Z0-9]/g, '');
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiStoreName)}&am=${Number(qrAmount).toFixed(2)}&cu=INR`;

  // ── Payment badge color ───────────────────────
  const payColors = { CASH: '#166534', UPI: '#5B21B6', CARD: '#1D4ED8' };
  const payColor = payColors[payMethod] || '#166534';
  const payBg = { CASH: '#DCFCE7', UPI: '#EDE9FE', CARD: '#DBEAFE' }[payMethod] || '#DCFCE7';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt #${invoiceNo}</title>
<style>
  /* ── Page setup for 58mm thermal printer ── */
  @page {
    size: 58mm auto;
    margin: 0;
  }
  @media print {
    html, body { width: 58mm; }
    .no-print  { display: none !important; }
  }

  /* ── Reset ── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Base — ALL BLACK, ALL BOLD, LARGE for thermal printers ── */
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    font-weight: 700;
    color: #000;
    background: #fff;
    width: 58mm;
    padding: 4mm 3mm 10mm 3mm;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Store Header ── */
  .store-name {
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.2;
    color: #000;
    margin-bottom: 4px;
  }
  .store-addr {
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    color: #000;
    line-height: 1.4;
  }
  .store-phone {
    font-size: 13px;
    text-align: center;
    font-weight: 900;
    color: #000;
    margin-top: 2px;
  }

  /* ── Dividers — all solid black ── */
  .solid { border-top: 2px solid #000; margin: 6px 0; }
  .dash  { border-top: 1px dashed #000; margin: 6px 0; }
  .thick { border-top: 3px double #000; margin: 8px 0; }

  /* ── Invoice meta block ── */
  .meta-block  { font-size: 13px; font-weight: 700; line-height: 1.7; color: #000; }
  .meta-row    { display: flex; justify-content: space-between; align-items: baseline; padding: 1px 0; }
  .meta-label  { color: #000; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  .meta-val    { font-weight: 900; font-size: 13px; text-align: right; color: #000; }

  /* ── Pay badge — plain bold text for thermal ── */
  .pay-badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #000;
    border: 2px solid #000;
  }

  /* ── Column header ── */
  .col-header {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #000;
    padding-bottom: 3px;
  }

  /* ── Item rows ── */
  .item-block  { padding: 5px 0; }
  .item-name   {
    font-weight: 900;
    font-size: 14px;
    line-height: 1.3;
    word-break: break-word;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    color: #000;
  }
  .item-row    { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px; }
  .item-calc   { font-size: 13px; font-weight: 700; color: #000; flex: 1; }
  .item-total  { font-size: 14px; font-weight: 900; white-space: nowrap; margin-left: 4px; color: #000; }
  .item-div    { border-top: 1px dashed #000; margin: 4px 0; }
  .disc        { font-size: 12px; font-weight: 700; color: #000; }
  .loose-tag   {
    display: inline-block;
    font-size: 11px;
    font-weight: 900;
    padding: 1px 4px;
    color: #000;
    border: 1px solid #000;
    vertical-align: middle;
    letter-spacing: 0.5px;
  }

  /* ── Summary section ── */
  .summary-section { font-size: 13px; font-weight: 700; }
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
    color: #000;
    font-weight: 700;
    font-size: 13px;
  }
  .discount-row { color: #000; font-weight: 900; }
  .due-row      { color: #000; font-weight: 900; }
  .doctor-row   { color: #000; font-weight: 900; }
  .otc-row      { color: #000; font-weight: 700; }

  /* ── Grand Total ── */
  .total-section {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 0 4px;
  }
  .total-label {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #000;
  }
  .total-amount {
    font-size: 23px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #000;
  }

  /* ── Items count ── */
  .items-count {
    font-size: 12px;
    font-weight: 700;
    color: #000;
    text-align: right;
    margin-top: 2px;
  }

  /* ── Footer ── */
  .footer-block {
    margin-top: 8px;
    text-align: center;
  }
  .footer-thanks {
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #000;
  }
  .footer-sub {
    font-size: 12px;
    font-weight: 700;
    color: #000;
    margin-top: 3px;
  }
  .footer-line {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }

  /* ── UPI QR Code ── */
  .qr-section {
    text-align: center;
    padding: 8px 0;
  }
  .qr-title {
    font-size: 13px;
    font-weight: 900;
    color: #000;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .qr-img {
    width: 160px;
    height: 160px;
    margin: 0 auto;
    display: block;
  }
  .qr-upi-id {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    margin-top: 4px;
    word-break: break-all;
  }
  .qr-amount {
    font-size: 13px;
    font-weight: 900;
    color: #000;
    margin-top: 2px;
  }
</style>
</head>
<body>

  <!-- ══ STORE HEADER ══ -->
  <div class="store-name">${store.storeName}</div>
  <div class="store-addr">${store.address}</div>
  <div class="store-phone">📞 ${store.phone}</div>
  ${gstLine}

  <div class="solid"></div>

  <!-- ══ INVOICE META ══ -->
  <div class="meta-block">
    <div class="meta-row">
      <span class="meta-label">Invoice</span>
      <span class="meta-val">#${invoiceNo}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date</span>
      <span class="meta-val">${dateStr}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Time</span>
      <span class="meta-val">${timeStr}</span>
    </div>
    ${customerLine}
    <div class="meta-row">
      <span class="meta-label">Payment</span>
      <span><span class="pay-badge">${payMethod}</span></span>
    </div>
  </div>

  <div class="dash"></div>

  <!-- ══ COLUMN HEADERS ══ -->
  <div class="col-header">
    <span>ITEM</span>
    <span>AMOUNT</span>
  </div>

  <div class="dash"></div>

  <!-- ══ ITEMS ══ -->
  ${itemsHTML}

  <div class="solid"></div>

  <!-- ══ SUMMARY ══ -->
  <div class="summary-section">
    <div class="summary-row">
      <span>Subtotal</span>
      <span>₹${Number(subtotal).toFixed(2)}</span>
    </div>
    ${discLine}
    ${doctorFeeLine}
    ${otcLinesHTML}
    ${taxLine}
  </div>

  <div class="thick"></div>

  <!-- ══ GRAND TOTAL ══ -->
  <div class="total-section">
    <span class="total-label">TOTAL</span>
    <span class="total-amount">₹${Number(grandTotal).toFixed(2)}</span>
  </div>
  <div class="items-count">${items.length} item${items.length !== 1 ? 's' : ''}</div>

  <div class="solid"></div>

  <!-- ══ PAYMENT STATUS ══ -->
  <div class="summary-section">
    ${paidLine}
    ${changeLine}
    ${dueLine}
  </div>

  <!-- ══ UPI QR CODE ══ -->
  <div class="qr-section">
    <div class="dash"></div>
    <div class="qr-title">█ Scan to Pay via UPI █</div>
    <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}" alt="UPI QR" />
    <div class="qr-amount">₹${Number(qrAmount).toFixed(2)}</div>
    <div class="qr-upi-id">UPI: ${upiId}</div>
    <div class="dash"></div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div class="footer-block">
    <div class="footer-line"></div>
    <div class="footer-thanks">✦ Thank You For Your Purchase! ✦</div>
    <div class="footer-sub">${store.storeName} • ${dateStr}</div>
    <div class="footer-sub">Powered by Medix ERP</div>
  </div>

</body>
</html>`;
}

/**
 * Prints the 58mm receipt via a hidden iframe, triggering the native print dialog.
 * Automatically opens on web only.
 */
export function printReceipt58mm(invoice) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const html = buildReceiptHTML(invoice);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;';
  document.body.appendChild(iframe);

  const doPrint = () => {
    if (iframe._printed) return;
    iframe._printed = true;
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 500);
  };

  // Attach onload before writing, and ensure a fallback timeout guarantees printing
  iframe.onload = doPrint;
  setTimeout(doPrint, 1500);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}
