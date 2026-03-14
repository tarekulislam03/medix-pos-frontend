import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

export default function BarcodeScanner({ visible, onClose, onScanned }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) setScanned(false);
    }, [visible]);

    const handleBarCodeScanned = ({ data }) => {
        if (scanned) return;
        setScanned(true);
        onScanned(data);
        onClose();
    };

    if (!visible) return null;

    if (!permission) {
        return (
            <Modal visible={visible} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.box}>
                        <Text style={styles.permText}>Requesting camera permission...</Text>
                    </View>
                </View>
            </Modal>
        );
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} animationType="fade" transparent>
                <View style={styles.overlay}>
                    <View style={styles.box}>
                        <Ionicons name="camera-outline" size={52} color={COLORS.textMuted} />
                        <Text style={styles.permText}>
                            Camera permission is required to scan barcodes.
                        </Text>
                        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                            <Text style={styles.grantBtnText}>Grant Permission</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.scannerContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    barcodeScannerSettings={{
                        barcodeTypes: [
                            'ean13', 'ean8', 'upc_a', 'upc_e',
                            'code128', 'code39', 'code93',
                            'itf14', 'codabar', 'qr',
                        ],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />

                <View style={styles.scanOverlay}>
                    <View style={styles.scanHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text style={styles.scanTitle}>Scan Barcode</Text>
                        <View style={{ width: 48 }} />
                    </View>

                    <View style={styles.frameContainer}>
                        <View style={styles.frame}>
                            <View style={[styles.corner, styles.cTL]} />
                            <View style={[styles.corner, styles.cTR]} />
                            <View style={[styles.corner, styles.cBL]} />
                            <View style={[styles.corner, styles.cBR]} />
                        </View>
                        <Text style={styles.scanHint}>Position barcode within the frame</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const C = 28;
const W = 4;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xxxl,
        alignItems: 'center',
        width: 360,
        gap: SPACING.lg,
    },
    permText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        lineHeight: 24,
    },
    grantBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: RADIUS.md,
        minHeight: 50,
        justifyContent: 'center',
    },
    grantBtnText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: FONT_SIZES.md,
    },
    cancelBtn: {
        paddingVertical: SPACING.sm,
    },
    cancelBtnText: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.md,
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: COLORS.black,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    scanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: SPACING.xl,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingBottom: SPACING.lg,
    },
    closeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanTitle: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
    },
    frameContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    frame: {
        width: 300,
        height: 200,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: C,
        height: C,
    },
    cTL: {
        top: 0,
        left: 0,
        borderTopWidth: W,
        borderLeftWidth: W,
        borderColor: COLORS.primaryLight,
        borderTopLeftRadius: 10,
    },
    cTR: {
        top: 0,
        right: 0,
        borderTopWidth: W,
        borderRightWidth: W,
        borderColor: COLORS.primaryLight,
        borderTopRightRadius: 10,
    },
    cBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: W,
        borderLeftWidth: W,
        borderColor: COLORS.primaryLight,
        borderBottomLeftRadius: 10,
    },
    cBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: W,
        borderRightWidth: W,
        borderColor: COLORS.primaryLight,
        borderBottomRightRadius: 10,
    },
    scanHint: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FONT_SIZES.md,
        textAlign: 'center',
        marginTop: SPACING.xl,
    },
});
