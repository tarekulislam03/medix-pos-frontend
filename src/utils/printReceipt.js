import { Platform } from 'react-native';
import { getStoreSettings } from './storeSettings';

function numberToWords(num) {
    if (num === 0) return "Zero";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + '' : '';
    return str.trim();
}

export function buildReceiptHTML(invoice) {
  const store = getStoreSettings();
  const is80mm = store.printerSize === '80mm';
  const showDiscPercent = store.showDiscountPercentage !== false;
  const showBarcode = store.showBarcode !== false;
  const showQrCode = store.showQrCode !== false;

  const items = invoice?.items || [];
  const payMethod = (invoice?.payment_method || 'Cash');
  const invoiceNo = invoice?.invoice_number || invoice?.invoiceNumber || invoice?._id || '—';
  const customerName = invoice?.customer_name || invoice?.customer?.name || invoice?.customer?.customer_name || 'Cash';
  const customerPhone = invoice?.customer_phone || invoice?.customer?.phone || '';

  const now = invoice?.date ? new Date(invoice.date) : new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  let totalQty = 0;
  let grossTotal = 0;
  let totalSavings = 0;

  let itemsHTML = '';
  items.forEach((item, index) => {
    const name = item.medicine_name || item.product_name || item.name || 'Item';
    const qty = item.cart_quantity ?? item.quantity ?? 0;
    const price = item.mrp ?? item.price ?? item.selling_price ?? 0;
    const discPercent = item.discount_percent ?? item.discount ?? 0;
    const isLoose = item.is_loose_sale || item.is_loose_mode;
    const tabletCount = item.loose_tablet_count || 0;
    const pricePerTablet = item.loose_price_per_tablet || 0;

    const actualQty = isLoose ? tabletCount : qty;
    const actualPrice = isLoose ? pricePerTablet : price;
    const amtBeforeDisc = actualPrice * actualQty;
    
    // Fallbacks
    const lineTotal = item.total ?? item.line_total ?? (amtBeforeDisc * (1 - discPercent / 100));

    grossTotal += amtBeforeDisc;
    totalSavings += (amtBeforeDisc - lineTotal);
    totalQty += Number(actualQty);

    const hsn = item.hsn_code || '';
    const qtyDisplay = Number(actualQty).toFixed(2);
    
    const discDisplay = showDiscPercent ? `${Number(discPercent)}%` : Number(amtBeforeDisc - lineTotal).toFixed(2);

    itemsHTML += `
      <tr>
        <td class="text-left">${index + 1}</td>
        <td class="text-left">${name}</td>
        <td class="text-center">${qtyDisplay}</td>
        <td class="text-right" style="padding-right: 4px;">${Number(actualPrice).toFixed(2)}</td>
        <td class="text-center" style="padding-left: 4px;">${discDisplay}</td>
        <td class="text-right">${Number(lineTotal).toFixed(2)}</td>
      </tr>
      ${hsn ? `<tr>
        <td></td>
        <td colspan="5" class="text-left" style="padding-bottom: 4px; padding-top: 0; font-size: ${is80mm ? '9px' : '7.5px'};">
           HSN: ${hsn}
        </td>
      </tr>` : ''}
    `;
  });

  const subtotal = items.reduce((sum, item) => sum + (item.total ?? (item.price * item.quantity)), 0);
  const totalDiscount = invoice?.total_discount || 0;
  totalSavings += totalDiscount;
  const doctorFee = Number(invoice?.doctor_fee ?? 0);
  const otcItems = Array.isArray(invoice?.otc_items) ? invoice.otc_items : [];
  const otcTotal = Number(invoice?.otc_total ?? otcItems.reduce((s, i) => s + (Number(i.price) || 0), 0));

  const netPayable = invoice?.grand_total ?? invoice?.grandTotal ?? invoice?.total ?? (grossTotal - totalSavings + doctorFee + otcTotal);
  
  // UPI configuration
  const upiId = store.upiId || '8101402916@okbizaxis';
  const upiStoreName = (store.storeName || 'Store').replace(/[^a-zA-Z0-9\s]/g, '');
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiStoreName)}&am=${Number(netPayable).toFixed(2)}&cu=INR`;
  
  let taxRowsHTML = '';
  items.forEach((item, index) => {
    const cgstAmt = Number(item.cgst_amount) || 0;
    const sgstAmt = Number(item.sgst_amount) || 0;
    if (cgstAmt > 0 || sgstAmt > 0) {
      const taxable = Number(item.taxable_amount) || 0;
      const gstPercent = Number(item.gst_percent || item.gst || item.tax_percent || 0);
      taxRowsHTML += `
        <tr>
          <td class="text-left">${index + 1}</td>
          <td class="text-center">${gstPercent}%</td>
          <td class="text-center">${Number(taxable).toFixed(2)}</td>
          <td class="text-center">${Number(cgstAmt).toFixed(2)}</td>
          <td class="text-center">${Number(sgstAmt).toFixed(2)}</td>
        </tr>
      `;
    }
  });

  let taxHTML = '';
  if (taxRowsHTML) {
    taxHTML = `
      <div class="divider-thin"></div>
      <p style="text-align: center; font-weight: bold; margin-bottom: 2px; font-size: ${is80mm ? '12px' : '10px'};">Tax Details</p>
      <table style="margin-bottom: 0;">
        <tr>
          <th class="text-left" style="width: 10%;">Sl</th>
          <th class="text-center" style="width: 15%;">GST%</th>
          <th class="text-center" style="width: 25%;">Taxable</th>
          <th class="text-center" style="width: 25%;">CGST</th>
          <th class="text-center" style="width: 25%;">SGST</th>
        </tr>
        <tr>
           <td colspan="5"><div class="divider-thin" style="margin: 0;"></div></td>
        </tr>
        ${taxRowsHTML}
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt #${invoiceNo}</title>
<style>
  @page {
    size: ${is80mm ? '80mm' : '58mm'} auto;
    margin: 0;
  }
  @media print {
    html, body { 
      width: ${is80mm ? '80mm' : '58mm'};
      margin: 0;
      padding: 0;
    }
    .no-print  { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${is80mm ? '12px' : '10px'};
    color: #000;
    background: #fff;
    width: 100%;
    max-width: ${is80mm ? '80mm' : '58mm'};
    margin: 0 auto;
    padding: ${is80mm ? '4mm 4mm' : '2mm 5mm'};
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  
  .store-name {
    font-size: ${is80mm ? '22px' : '16px'};
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }
  .store-addr {
    font-size: ${is80mm ? '14px' : '12px'};
    margin-bottom: 2px;
  }
  .divider {
    border-top: 1px solid #000;
    margin: 4px 0;
  }
  .divider-thin {
    border-top: 1px solid #000;
    margin: 2px 0;
  }
  .divider-thick {
    border-top: 1.5px solid #000;
    margin: 4px 0;
  }
  
  .info-line {
    display: flex;
    justify-content: flex-start;
  }
  .info-label {
    width: ${is80mm ? '100px' : '65px'};
  }
  .info-value {
    flex: 1;
    word-break: break-all;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th {
    font-weight: normal;
    padding-bottom: 2px;
    vertical-align: bottom;
    font-size: ${is80mm ? '12px' : '9px'};
  }
  td {
    padding-top: 1px;
    padding-bottom: 1px;
    vertical-align: top;
    word-wrap: break-word;
    font-size: ${is80mm ? '12px' : '9px'};
  }
  
  .qr-section {
    text-align: center;
    padding: 8px 0;
  }
  .qr-title {
    font-size: ${is80mm ? '14px' : '12px'};
    font-weight: bold;
    margin-bottom: 4px;
  }
  .qr-img {
    width: ${is80mm ? '100px' : '120px'};
    height: ${is80mm ? '100px' : '120px'};
    margin: 0 auto;
    display: block;
  }
  
  .footer {
    text-align: center;
    font-weight: bold;
    font-size: ${is80mm ? '14px' : '12px'};
    margin-top: 8px;
    margin-bottom: 8px;
  }
</style>
</head>
<body>
  <div class="text-center store-name">${store.storeName || 'Phamracy Store'}</div>
  <div class="text-center store-addr">${store.address || ''}</div>
  <div class="text-center store-addr">Phone : ${store.phone || ''}</div>
  ${store.gstNo ? `<div class="text-center store-addr bold">GSTIN : ${store.gstNo}</div>` : ''}
  ${store.licenceNo ? `<div class="text-center store-addr bold">DL : ${store.licenceNo}</div>` : ''}
  
  <div class="divider-thick"></div>
  <div class="text-center bold" style="font-size: ${is80mm ? '17px' : '15px'};">RECEIPT</div>
  <div class="divider-thick"></div>
  
  <div class="info-line">
    <div class="info-label">Invoice No</div>
    <div class="info-value">: ${invoiceNo}</div>
  </div>
  <div class="info-line">
    <div class="info-label">Date</div>
    <div class="info-value">: ${dateStr}</div>
  </div>
  
  ${showBarcode ? `
  <div class="text-center" style="margin: 8px 0 6px 0;">
    <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invoiceNo)}&scale=${is80mm ? 4 : 3}&height=15&includetext" style="max-width: 100%; width: ${is80mm ? '80%' : '95%'}; height: ${is80mm ? '60px' : '45px'}; image-rendering: pixelated; margin: 0 auto;" alt="Barcode" />
  </div>
  ` : ''}
  
  <div class="divider"></div>
  
  <table>
    <thead>
      <tr>
        <th class="text-left" style="width: ${is80mm ? '8%' : '7%'};">Sl</th>
        <th class="text-left" style="width: ${is80mm ? '34%' : '27%'};">Product</th>
        <th class="text-center" style="width: ${is80mm ? '11%' : '11%'};">Qty</th>
        <th class="text-right" style="width: ${is80mm ? '16%' : '18%'}; padding-right: 4px;">Rate</th>
        <th class="text-center" style="width: ${is80mm ? '15%' : '15%'}; padding-left: 4px;">${showDiscPercent ? 'Disc' : 'Disc(₹)'}</th>
        <th class="text-right" style="width: ${is80mm ? '16%' : '22%'};">Amt</th>
      </tr>
      <tr>
        <td colspan="6" style="padding: 0;"><div class="divider-thin"></div></td>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>
  
  <div class="divider-thin"></div>
  
  <div style="display: flex; justify-content: space-between; padding-right: 2px; margin-bottom: 2px;">
    <span>Gross Amount</span>
    <span>${Number(grossTotal).toFixed(2)}</span>
  </div>
  ${totalDiscount > 0 ? `
  <div style="display: flex; justify-content: space-between; padding-right: 2px; margin-bottom: 2px;">
    <span>Discount</span>
    <span>-${Number(totalDiscount).toFixed(2)}</span>
  </div>` : ''}
  ${doctorFee > 0 ? `
  <div style="display: flex; justify-content: space-between; padding-right: 2px; margin-bottom: 2px;">
    <span>Doctor Fee</span>
    <span>${Number(doctorFee).toFixed(2)}</span>
  </div>` : ''}
  ${otcItems.length > 0 && otcTotal > 0 ? otcItems.filter(i => Number(i.price) > 0).map(i => `
  <div style="display: flex; justify-content: space-between; padding-right: 2px; margin-bottom: 2px;">
    <span>${String(i.name)}</span>
    <span>${Number(i.price).toFixed(2)}</span>
  </div>`).join('') : ''}
  <div style="display: flex; justify-content: space-between; padding-right: 2px; font-weight: bold; font-size: ${is80mm ? '14px' : '12px'};">
    <span>Net Amount</span>
    <span>${Number(netPayable).toFixed(2)}</span>
  </div>
  
  <div class="divider-thin"></div>
  
  <div style="font-style: italic; margin-bottom: 4px;">
    Rupees ${numberToWords(Math.round(netPayable))} Only
  </div>
  
  <div class="divider-thick"></div>
  
  ${taxHTML}
  
  <div class="divider-thin"></div>
  <div style="margin-top: 2px; margin-bottom: 2px;">
    ${payMethod} - ${Number(netPayable).toFixed(2)}
  </div>
  <div class="divider-thin"></div>
  
  ${showQrCode ? `
  <div class="qr-section">
    <div class="qr-title">Scan to Pay</div>
    <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}" alt="UPI QR" />
  </div>
  <div class="divider-thin"></div>
  ` : ''}
  
  <div style="margin-top: 8px; margin-bottom: 4px; font-weight: bold; font-size: ${is80mm ? '13px' : '11px'};">
    Please bring this receipt in case of return.
  </div>
  
  <div class="divider-thin"></div>
  
  <div class="footer">THANK YOU. VISIT US AGAIN.</div>

</body>
</html>`;
}

/**
 * Prints the receipt via a hidden iframe, triggering the native print dialog.
 * Automatically opens on web only.
 */
let isPrinting = false;

export function printReceipt(invoice) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (isPrinting) return;
  isPrinting = true;

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
        isPrinting = false;
      }, 3000);
    }, 500);
  };

  iframe.onload = () => {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const qrImg = doc.querySelector('.qr-img');
    if (qrImg) {
      if (qrImg.complete) {
        doPrint();
      } else {
        qrImg.onload = doPrint;
        qrImg.onerror = doPrint;
      }
    } else {
      doPrint();
    }
  };
  setTimeout(doPrint, 3000);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}
