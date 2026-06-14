import { Platform } from "react-native";
import { calculateLayout } from "./labelLayoutEngine";
import * as Print from "expo-print";

/**
 * Builds the HTML content for the labels using the layout engine.
 */
export function buildLabelsHTML(labelItems) {
  const layout = calculateLayout(labelItems);
  const { config, rows } = layout;

  const isLeftAligned = config.rollPlacement === 'left';
  const marginOffset = isLeftAligned ? '0' : 'auto';

  let pagesHtml = "";

  rows.forEach((row) => {
    const buildLabel = (prod) => {
      if (!prod) return `<div class="label-half empty"></div>`;
      return `
        <div class="label-half">
          <div class="name" style="font-size: ${prod.nameFontSize}">${prod.name}</div>
          <div class="mrp">MRP ₹${prod.price}</div>
          <svg class="barcode"
               jsbarcode-format="CODE128"
               jsbarcode-value="${prod.barcode}"
               jsbarcode-height="25"
               jsbarcode-width="1"
               jsbarcode-displayValue="false"
               jsbarcode-margin="0">
          </svg>
          <div class="code">${prod.barcode}</div>
        </div>
      `;
    };

    pagesHtml += `
      <div class="page-row">
         ${buildLabel(row.leftLabel)}
         ${buildLabel(row.rightLabel)}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

<style>
/* 
  Physical page is 80mm wide. Height is auto to minimize paper waste.
*/
@page {
  size: ${config.printerWidth} auto; 
  margin: 0;
}

html, body {
  width: ${config.printerWidth};
  margin: 0;
  padding: 0;
  background-color: #fff;
  font-family: Arial, sans-serif, monospace;
}

.printable-area {
  width: ${config.rollWidth};
  margin-left: ${marginOffset};
  margin-right: ${marginOffset};
  display: flex;
  flex-direction: column;
}

.page-row {
  width: ${config.usableWidth};
  height: ${config.labelHeight};
  margin: 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  page-break-inside: avoid;
}

.label-half {
  width: ${config.labelWidth};
  height: ${config.labelHeight};
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
  font-weight: bold;
  line-height: 1.1;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: ${config.maxMedicineNameLines};
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis; 
  margin-bottom: 1px;
}

.mrp {
  font-size: ${config.fonts.mrp};
  font-weight: bold;
  margin-bottom: 2px;
}

/* Barcode Sizing */
.barcode {
  height: 25px; /* Adjust height visually */
  max-width: 95%; /* Keep inside */
  margin: 0;
  padding: 0;
  shape-rendering: crispEdges; /* optimized for SVG 203 DPI */
}

.code {
  font-size: ${config.fonts.barcodeText};
  letter-spacing: 0.5px;
  margin: 0;
  padding: 0;
}

@media print {
  html, body {
    width: ${config.printerWidth} !important;
  }
}
</style>
</head>

<body>
  <div class="printable-area">
    ${pagesHtml}
  </div>

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

export async function printLabels58mm(labelItems) {
  const html = buildLabelsHTML(labelItems);

  if (Platform.OS === "web") {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const messageListener = (event) => {
      if (event.data === "LABELS_READY") {
        window.removeEventListener("message", messageListener);
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
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
  } else {
    // Native print handling (iOS / Android)
    try {
      await Print.printAsync({
        html,
        width: 80 * 2.83465, // 80mm in points
      });
    } catch (err) {
      console.error("Print failed", err);
    }
  }
}
