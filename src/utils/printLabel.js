import { Platform } from "react-native";
import { getStoreSettings } from './storeSettings';

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr).slice(0,5);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${mm}/${yy}`;
    } catch {
        return '';
    }
}

function buildLabel(product) {
  // Fallbacks for name
  const name =
    product.medicine_name ||
    product.product_name ||
    product.name ||
    "MEDICINE";

  // Format price safely
  const price = Number(
    product.mrp ?? product.price ?? product.selling_price ?? 0
  ).toFixed(2);

  const barcode = product.short_barcode || product.barcode || product._id || product.id || "000000";
  const batch = product.batch_number || product.batch || "N/A";
  const exp = formatShortDate(product.expiry_date || product.expiry || product.exp_date);

  return `
    <div class="label-half">
      <div class="name">${name}</div>
      <div class="mrp">MRP ₹${price}</div>
      <div class="details">Exp:${exp} | B:${batch}</div>
      <canvas class="barcode"
           jsbarcode-format="CODE128"
           jsbarcode-value="${barcode}"
           jsbarcode-height="25"
           jsbarcode-width="1"
           jsbarcode-displayValue="false"
           jsbarcode-margin="0">
      </canvas>
      <div class="code">${barcode}</div>
    </div>
  `;
}

export function buildLabelsHTML(labelItems) {
  const settings = getStoreSettings();
  const is80mm = settings.printerSize === '80mm';
  
  const columns = is80mm ? 3 : 2;
  const pageWidth = is80mm ? '76mm' : '50mm';
  const gap = is80mm ? '0.5mm' : '0mm';

  let labelsArray = [];

  labelItems.forEach(({ product, copies }) => {
    for (let i = 0; i < copies; i++) {
      labelsArray.push(product);
    }
  });

  // Enforce a maximum of 30 individual labels to prevent memory issues
  if (labelsArray.length > 30) {
    labelsArray = labelsArray.slice(0, 30);
  }

  let pagesHtml = "";
  for (let i = 0; i < labelsArray.length; i += columns) {
    let rowHtml = `<div class="page-row">`;
    for (let c = 0; c < columns; c++) {
       const prod = labelsArray[i + c];
       if (prod) {
           rowHtml += buildLabel(prod);
       } else {
           rowHtml += `<div class="label-half empty"></div>`;
       }
    }
    rowHtml += `</div>`;
    pagesHtml += rowHtml;
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

<style>
/* 
  Use a square page to trick Chrome into preventing auto-Landscape rotation. 
*/
@page {
  size: ${pageWidth} auto; 
  margin: 0;
}

html, body {
  width: ${pageWidth};
  margin: 0;
  padding: 0;
  background-color: #fff;
  font-family: Arial, sans-serif, monospace;
}

.page-row {
  width: ${pageWidth};
  height: 25mm;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  gap: ${gap};
}

.label-half {
  width: 25mm;
  height: 25mm;
  box-sizing: border-box;
  padding: 0px;
  margin: 0px;
  margin-bottom: 1mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
}

.label-half.empty {
  visibility: hidden;
}

/* Typography & Truncation */
.name {
  font-size: 8px;
  font-weight: bold;
  line-height: 1.1;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; 
  margin-bottom: 1px;
}

.mrp {
  font-size: 7.5px;
  font-weight: bold;
  margin-bottom: 1px;
}

.details {
  font-size: 6px;
  font-weight: normal;
  margin-bottom: 1px;
  white-space: nowrap;
}

/* Barcode Sizing */
.barcode {
  height: 20px; /* Reduced slightly to fit details */
  max-width: 23mm;
  margin: 0;
  padding: 0;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.code {
  font-size: 7px;
  letter-spacing: 0.5px;
  margin: 0;
  padding: 0;
}

@media print {
  html, body {
    width: ${pageWidth} !important;
  }
}
</style>
</head>

<body>
  ${pagesHtml}

  <script>
    window.onload = function() {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode(".barcode").init();
        window.parent.postMessage("LABELS_READY", "*");
      }
    };
  </script>
</body>
</html>
  `;
}

export function printLabels58mm(labelItems) {
  if (Platform.OS !== "web") return;

  const html = buildLabelsHTML(labelItems);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Listen for the message from the iframe to know JSBarcode is done rendering
  const messageListener = (event) => {
    if (event.data === "LABELS_READY") {
      window.removeEventListener("message", messageListener);

      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }
  };

  window.addEventListener("message", messageListener);

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      window.removeEventListener("message", messageListener);
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    }
  }, 2000);
}

