import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView
} from "react-native";
import { calculateLayout } from "../utils/labelLayoutEngine";
import { buildLabelsHTML, printLabels58mm } from "../utils/printLabel";
import { WebView } from "react-native-webview";

export default function LabelPreviewModal({
  visible,
  onClose,
  labelItems,
}) {
  if (!visible) return null;

  const layout = calculateLayout(labelItems);
  const { config, rows } = layout;
  const htmlContent = buildLabelsHTML(labelItems);

  // Collect all warnings
  let allWarnings = [];
  rows.forEach(r => {
    if (r.leftLabel?.warnings) allWarnings.push(...r.leftLabel.warnings);
    if (r.rightLabel?.warnings) allWarnings.push(...r.rightLabel.warnings);
  });
  // Unique warnings
  allWarnings = [...new Set(allWarnings)];

  const handlePrint = () => {
    printLabels58mm(labelItems);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Label Print Preview</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          {allWarnings.length > 0 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Warnings</Text>
              {allWarnings.map((warn, i) => (
                <Text key={i} style={styles.warningText}>• {warn}</Text>
              ))}
            </View>
          )}

          <Text style={styles.infoText}>
            Printer Width: {config.printerWidth} | Safe Print Area: {config.usableWidth}
          </Text>
          <Text style={styles.instructionText}>
            The dashed red box represents the printable area boundaries. 
            Content outside this box may be clipped.
          </Text>

          <View style={styles.previewContainer}>
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={htmlContent}
                style={{
                  width: '80mm',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'white',
                  outline: '1px dashed red'
                }}
              />
            ) : (
              <View style={{ width: 80 * 3.8, height: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: 'red', borderStyle: 'dashed' }}>
                 <WebView 
                    source={{ html: htmlContent }} 
                    style={{ flex: 1 }} 
                 />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
              <Text style={styles.printBtnText}>Print Labels</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "95%",
    maxWidth: 600,
    height: "90%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    fontSize: 16,
    color: "#666",
  },
  warningBox: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  warningTitle: {
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 4,
  },
  warningText: {
    color: "#856404",
    fontSize: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#e0e0e0",
    padding: 16,
    alignItems: "center",
    borderRadius: 6,
    overflow: "hidden",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  cancelBtnText: {
    color: "#666",
    fontWeight: "bold",
  },
  printBtn: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  printBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
