import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Webcam from 'react-webcam';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { DocScanner } from '../utils/cvUtils';
import imageCompression from 'browser-image-compression';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BillScannerModal = ({ visible, onClose, onCaptured }) => {
  const webcamRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // URL of processed image
  const [processedFile, setProcessedFile] = useState(null); // Blob for final upload

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setProcessing(true);
    try {
      // Ensure video stream is ready
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) {
          // Wait a bit more if not ready
          await new Promise(resolve => setTimeout(resolve, 300));
      }

      let imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        // Retry with a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        imageSrc = webcamRef.current.getScreenshot();
      }

      if (!imageSrc) throw new Error("Camera not responding. please try again.");

      const img = new Image();
      img.src = imageSrc;
      await new Promise(resolve => img.onload = resolve);

      const scanner = new DocScanner();
      const processedCanvas = await scanner.scan(img);

      const processedBlob = await new Promise(resolve => {
        processedCanvas.toBlob(resolve, "image/png", 0.95);
      });

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(
        new File([processedBlob], "scanned_bill.png", { type: "image/png" }), 
        options
      );
      
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreviewImage(previewUrl);
      setProcessedFile(compressedFile);
    } catch (error) {
      console.error("Capture Error:", error);
      alert(error.message || "Failed to process image. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [webcamRef]);

  const handleConfirm = () => {
    if (processedFile) {
      onCaptured(processedFile);
      handleClose();
    }
  };

  const handleRetake = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setProcessedFile(null);
  };

  const handleClose = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setProcessedFile(null);
    setCameraReady(false);
    onClose();
  };

  if (Platform.OS !== 'web') {
    return null; // This implementation is web-only
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{previewImage ? "Preview Scan" : "Scan Bill"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.contentContainer}>
          {previewImage ? (
            <View style={styles.previewContainer}>
              <img src={previewImage} style={styles.previewImage} alt="Processed Scan" />
              <View style={styles.previewBadge}>
                <Ionicons name="sparkles" size={16} color={COLORS.white} />
                <Text style={styles.previewBadgeText}>AI Enhanced</Text>
              </View>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "environment",
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                }}
                onUserMedia={() => setCameraReady(true)}
                style={styles.webcam}
              />
              
              {(!cameraReady || processing) && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.overlayText}>
                    {processing ? "Enhancing Document..." : "Starting Camera..."}
                  </Text>
                </View>
              )}

              {cameraReady && !processing && (
                <View style={styles.guideFrame}>
                  <View style={styles.scannerLine} />
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                  <Text style={styles.guideText}>Align bill within frame</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {previewImage ? (
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Confirm & Scan</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.captureButton, (processing || !cameraReady) && styles.disabledButton]} 
              onPress={capture}
              disabled={processing || !cameraReady}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 15 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    border: `1px solid ${COLORS.borderLight}`,
  },
  previewBadge: {
    position: 'absolute',
    top: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  previewBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  webcam: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  overlayText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  guideFrame: {
    position: 'absolute',
    width: '85%',
    height: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.primary,
    top: '50%',
    opacity: 0.5,
    boxShadow: `0 0 15px ${COLORS.primary}`,
  },
  guideText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 20,
  },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 45, height: 45, borderTopWidth: 4, borderLeftWidth: 4, borderColor: COLORS.primary, borderTopLeftRadius: 12 },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 45, height: 45, borderTopWidth: 4, borderRightWidth: 4, borderColor: COLORS.primary, borderTopRightRadius: 12 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 45, height: 45, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: COLORS.primary, borderBottomLeftRadius: 12 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 45, height: 45, borderBottomWidth: 4, borderRightWidth: 4, borderColor: COLORS.primary, borderBottomRightRadius: 12 },
  footer: {
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 500,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  retakeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    gap: 8,
    boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  }
});

export default BillScannerModal;
