import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    TouchableOpacity,
    Image,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { getAutoImportBills, savePurchaseJson } from '../services/purchaseService';

const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${minutes} ${ampm}`;
};

const ImagePreviewModal = ({ visible, imageUrl, onClose }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={previewStyles.overlay}>
            <View style={previewStyles.container}>
                <View style={previewStyles.header}>
                    <Text style={previewStyles.title}>Bill Image</Text>
                    <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn}>
                        <Ionicons name="close" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>
                <View style={previewStyles.imageWrap}>
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={previewStyles.image}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={previewStyles.noImage}>
                            <Ionicons name="image-outline" size={48} color={COLORS.border} />
                            <Text style={previewStyles.noImageText}>No image available</Text>
                        </View>
                    )}
                </View>
                <View style={previewStyles.footer}>
                    {imageUrl && Platform.OS === 'web' && (
                        <TouchableOpacity 
                            style={[previewStyles.closeBtnFull, { backgroundColor: COLORS.primary, borderColor: COLORS.primary, marginRight: 8 }]} 
                            onPress={() => window.open(imageUrl, '_blank')}
                        >
                            <Text style={[previewStyles.closeBtnText, { color: COLORS.white }]}>Download / View Original</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={previewStyles.closeBtnFull} onPress={onClose}>
                        <Text style={previewStyles.closeBtnText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const previewStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 800,
        backgroundColor: COLORS.white,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
    },
    title: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: COLORS.bgDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    imageWrap: {
        height: 600,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: { width: '100%', height: '100%' },
    noImage: { alignItems: 'center', gap: 8 },
    noImageText: { fontSize: 14, color: COLORS.textMuted },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
        justifyContent: 'flex-end',
    },
    closeBtnFull: {
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
});


export default function AdminAutoImportBillsScreen() {
    const r = useResponsive();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Preview
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);

    // JSON Upload Modal
    const [jsonModalVisible, setJsonModalVisible] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [jsonPayload, setJsonPayload] = useState('');
    const [submittingJson, setSubmittingJson] = useState(false);

    const [notificationPermission, setNotificationPermission] = useState(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );
    const previousBillsRef = useRef([]);
    const initialLoadRef = useRef(true);

    const requestNotificationPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                Alert.alert('Success', 'Notifications enabled!');
            } else {
                Alert.alert('Warning', 'Notifications were denied.');
            }
        }
    };

    const fetchBills = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const res = await getAutoImportBills();
            const newBills = res?.data ?? [];
            setBills(newBills);

            // Trigger notification if this is not the first load AND there are new bills
            if (!initialLoadRef.current) {
                const oldIds = new Set(previousBillsRef.current.map(b => b._id));
                const newIds = newBills.filter(b => !oldIds.has(b._id));
                
                if (newIds.length > 0) {
                    Alert.alert('DEBUG', `Found ${newIds.length} new bills! old=${oldIds.size}, new=${newBills.length}`);
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('New Bill Uploaded', {
                                body: 'A store has uploaded a new bill for processing.',
                            });
                        } catch(e) {
                            console.error('Notification failed:', e);
                        }
                    }
                }
            }

            previousBillsRef.current = newBills;
            initialLoadRef.current = false;
        } catch (err) {
            console.error('Fetch auto-import bills failed:', err.message);
            if (!isPolling) Alert.alert('Error', 'Failed to load bills.');
            if (!isPolling) setBills([]);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBills();

        // Request notification permission on web - moved to manual button to prevent blocking
        
        // Poll every 10 seconds (faster for testing)
        const intervalId = setInterval(() => {
            fetchBills(true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, [fetchBills]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBills();
        setRefreshing(false);
    };

    const handleOpenJsonModal = (billId) => {
        setSelectedBillId(billId);
        setJsonPayload('');
        setJsonModalVisible(true);
    };

    const handleSubmitJson = async () => {
        if (!jsonPayload.trim()) {
            Alert.alert('Error', 'Please enter JSON payload.');
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonPayload);
        } catch (e) {
            Alert.alert('Invalid JSON', 'The payload you entered is not valid JSON.');
            return;
        }

        // Handle if user pasted the entire server response instead of just the data object
        if (parsedData.data && typeof parsedData.data === 'object') {
            parsedData = parsedData.data;
        }

        // Must attach purchase_id to link it to the existing bill
        parsedData.purchase_id = selectedBillId;

        // If the AI payload uses "extracted_items" instead of "items", map it over
        if (parsedData.extracted_items && !parsedData.items) {
            parsedData.items = parsedData.extracted_items;
        }

        setSubmittingJson(true);
        try {
            await savePurchaseJson(selectedBillId, parsedData);
            Alert.alert('Success', 'JSON payload saved! You can now review it in the main Purchase screen.');
            setJsonModalVisible(false);
            setSelectedBillId(null);
            setJsonPayload('');
            fetchBills();
        } catch (err) {
            console.error('Submit JSON error:', err.message);
            Alert.alert('Upload Failed', err?.message || 'Could not process JSON payload.');
        } finally {
            setSubmittingJson(false);
        }
    };

    const handleDownload = (url, storeName) => {
        if (!url) return;
        
        // If it's a Cloudinary URL, we can force download by adding fl_attachment
        if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
            const downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
            window.location.href = downloadUrl;
            return;
        }

        // Fallback for other URLs
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `bill_${storeName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
            })
            .catch(err => {
                console.error('Download failed', err);
                window.open(url, '_blank');
            });
    };

    const renderItem = ({ item }) => {
        const storeName = item.storeId?.storeName || 'Unknown Store';
        const uploadTime = formatDate(item.createdAt);
        const hasBill = !!item.bill_image_url;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.storeName}>{storeName}</Text>
                        <Text style={styles.uploadTime}>{uploadTime}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.status?.toUpperCase() || 'PROCESSING'}</Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.detailText}>Supplier (if provided): {item.supplier_name || 'N/A'}</Text>
                    <Text style={styles.detailText}>Amount (if provided): ₹{item.total_amount || '0'}</Text>
                </View>
                <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {hasBill && Platform.OS === 'web' && (
                            <TouchableOpacity 
                                style={[styles.viewBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} 
                                onPress={() => handleDownload(item.bill_image_url, storeName)}
                            >
                                <Ionicons name="download-outline" size={16} color={COLORS.white} />
                                <Text style={[styles.viewBtnText, { color: COLORS.white }]}>
                                    Download
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.viewBtn, !hasBill && styles.viewBtnDisabled]} 
                            onPress={() => hasBill && setPreviewUrl(item.bill_image_url || null)}
                            disabled={!hasBill}
                        >
                            <Ionicons name="image-outline" size={16} color={hasBill ? COLORS.primary : COLORS.textMuted} />
                            <Text style={[styles.viewBtnText, !hasBill && { color: COLORS.textMuted }]}>
                                {hasBill ? 'View Bill Image' : 'No Image'}
                            </Text>
                        </TouchableOpacity>
                        {item.status !== 'received' && (
                            <TouchableOpacity 
                                style={[styles.viewBtn, { backgroundColor: COLORS.successGhost, borderColor: COLORS.success }]} 
                                onPress={() => handleOpenJsonModal(item._id)}
                            >
                                <Ionicons name="document-text-outline" size={16} color={COLORS.success} />
                                <Text style={[styles.viewBtnText, { color: COLORS.success }]}>
                                    Upload JSON
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Auto-Import Bills (Admin)</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity 
                        onPress={requestNotificationPermission} 
                        style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: notificationPermission === 'granted' ? COLORS.successGhost : COLORS.warningLight, 
                            paddingHorizontal: 12, 
                            paddingVertical: 6, 
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: notificationPermission === 'granted' ? COLORS.success : COLORS.warning
                        }}
                    >
                        <Ionicons name="notifications" size={16} color={notificationPermission === 'granted' ? COLORS.success : COLORS.warning} style={{ marginRight: 6 }} />
                        <Text style={{ color: notificationPermission === 'granted' ? COLORS.success : COLORS.warning, fontWeight: '600', fontSize: 13 }}>
                            {typeof window === 'undefined' || !('Notification' in window) 
                                ? 'Not Supported' 
                                : notificationPermission === 'granted' 
                                    ? 'Notifications On' 
                                    : 'Enable Notifications'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : bills.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
                    <Text style={styles.emptyText}>No bills uploaded for auto-import.</Text>
                </View>
            ) : (
                <FlatList
                    data={bills}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}

            <ImagePreviewModal
                visible={!!previewUrl}
                imageUrl={previewUrl}
                onClose={() => setPreviewUrl(null)}
            />

            {/* JSON Upload Modal */}
            <Modal
                visible={jsonModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setJsonModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.jsonModalContainer}>
                        <View style={styles.jsonModalHeader}>
                            <Text style={styles.jsonModalTitle}>Upload Processed JSON</Text>
                            <TouchableOpacity onPress={() => setJsonModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.jsonModalBody}>
                            <Text style={styles.jsonModalHint}>
                                Paste the AI/OCR processed JSON payload for this bill below. The format should match the expected manual purchase format.
                            </Text>
                            <TextInput
                                style={styles.jsonInput}
                                multiline
                                placeholder="Paste JSON here..."
                                value={jsonPayload}
                                onChangeText={setJsonPayload}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </ScrollView>
                        <View style={styles.jsonModalFooter}>
                            <TouchableOpacity 
                                style={[styles.jsonBtn, styles.jsonBtnCancel]} 
                                onPress={() => setJsonModalVisible(false)}
                                disabled={submittingJson}
                            >
                                <Text style={styles.jsonBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.jsonBtn, styles.jsonBtnSubmit]} 
                                onPress={handleSubmitJson}
                                disabled={submittingJson}
                            >
                                {submittingJson ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text style={styles.jsonBtnSubmitText}>Submit JSON</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    refreshBtn: {
        padding: 8,
        borderRadius: 4,
        backgroundColor: COLORS.bgDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.textMuted,
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        backgroundColor: COLORS.bgSurface,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    storeName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    uploadTime: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: COLORS.primaryGhost,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    cardBody: {
        marginBottom: 16,
    },
    detailText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
    },
    viewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primaryGhost,
        borderWidth: 1,
        borderColor: COLORS.primary,
        gap: 8,
    },
    viewBtnDisabled: {
        backgroundColor: COLORS.bgDark,
        borderColor: COLORS.border,
    },
    viewBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    jsonModalContainer: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: COLORS.bgSurface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: '90%',
    },
    jsonModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    jsonModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    jsonModalBody: {
        padding: 16,
    },
    jsonModalHint: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 12,
        lineHeight: 20,
    },
    jsonInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        padding: 12,
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        minHeight: 250,
        textAlignVertical: 'top',
    },
    jsonModalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    jsonBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    jsonBtnCancel: {
        backgroundColor: COLORS.bgDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    jsonBtnCancelText: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    jsonBtnSubmit: {
        backgroundColor: COLORS.success,
    },
    jsonBtnSubmitText: {
        color: COLORS.white,
        fontWeight: '600',
    },
});
