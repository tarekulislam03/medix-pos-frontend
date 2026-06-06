import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { uploadPurchaseBill, getPurchases, deletePurchase } from '../services/purchaseService';

// ─── File picker helper (web only — uses <input type="file"> ────────────────
const pickFileWeb = () =>
    new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';
        input.onchange = (e) => {
            const file = e.target.files?.[0] ?? null;
            resolve(file);
        };
        input.click();
    });

// ─── Format date helper ─────────────────────────────────────────────────────
const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Bill Image Preview Modal ───────────────────────────────────────────────
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
        maxWidth: 640,
        backgroundColor: COLORS.white,
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
    },
    title: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 2,
        backgroundColor: COLORS.bgDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    imageWrap: {
        height: 420,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: { width: '100%', height: '100%' },
    noImage: { alignItems: 'center', gap: 8 },
    noImageText: { fontSize: 13, color: COLORS.textMuted },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
        justifyContent: 'flex-end',
    },
    openBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
    },
    openBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    closeBtnFull: {
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function PurchaseScreen() {
    const r = useResponsive();

    const [purchases, setPurchases] = useState([]);
    const [filteredPurchases, setFilteredPurchases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');  // status label

    // Preview modal
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);

    // Delete confirm
    const [deletingId, setDeletingId] = useState(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ─── FETCH ─────────────────────────────────────────────────────────────
    const fetchPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPurchases();
            setPurchases(res?.data ?? []);
            setFilteredPurchases(res?.data ?? []);
        } catch (err) {
            console.warn('Fetch purchases failed:', err.message);
            setPurchases([]);
            setFilteredPurchases([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

    useEffect(() => {
        let filtered = purchases;

        // Text filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.supplier_name || '').toLowerCase().includes(q)
            );
        }

        // Date filter — single day
        if (filterDate) {
            const dayStart = new Date(filterDate + 'T00:00:00');
            const dayEnd = new Date(filterDate + 'T23:59:59');
            filtered = filtered.filter(p => {
                const d = new Date(p.bill_date || p.createdAt);
                return d >= dayStart && d <= dayEnd;
            });
        }

        setFilteredPurchases(filtered);
    }, [searchQuery, filterDate, purchases]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPurchases();
        setRefreshing(false);
    };

    // ─── UPLOAD ────────────────────────────────────────────────────────────
    const handleUploadBill = async () => {
        try {
            let file = null;

            if (Platform.OS === 'web') {
                file = await pickFileWeb();
            } else {
                Alert.alert('Not Supported', 'File picker is only available on web browsers.');
                return;
            }

            if (!file) return; // user cancelled

            setUploading(true);
            setUploadProgress('Uploading bill to cloud...');

            const formData = new FormData();
            formData.append('bill', file, file.name);

            await uploadPurchaseBill(formData);

            setUploadProgress('Upload successful!');
            await fetchPurchases();
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Upload Failed', err?.message || 'Could not upload the bill. Check Cloudinary config.');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    // ─── DELETE ────────────────────────────────────────────────────────────
    const confirmDelete = (id) => {
        setDeletingId(id);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleteLoading(true);
        try {
            await deletePurchase(deletingId);
            setDeleteModalVisible(false);
            setDeletingId(null);
            await fetchPurchases();
        } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to delete purchase');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ─── PREVIEW ───────────────────────────────────────────────────────────
    const openPreview = (url) => {
        setPreviewUrl(url);
        setPreviewVisible(true);
    };

    // ─── MOBILE GUARD ──────────────────────────────────────────────────────
    if (r.isSmall) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgDark, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Ionicons name="desktop-outline" size={64} color={COLORS.border} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, textAlign: 'center' }}>
                    Not Available on Mobile
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                    This page is optimized for larger screens.{'\n'}Please use a tablet or desktop.
                </Text>
            </View>
        );
    }

    // ─── TABLE ROW ─────────────────────────────────────────────────────────
    const renderRow = ({ item, index }) => {
        const hasBill = !!item.bill_image_url;
        const isAutoImport = item.source === 'auto_import';
        return (
            <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                {/* # */}
                <View style={[styles.cell, { width: 44, alignItems: 'center' }]}>
                    <Text style={styles.cellMuted}>{index + 1}</Text>
                </View>
                {/* Date / Inv No */}
                <View style={[styles.cell, { flex: 1.6 }]}>
                    <Text style={styles.cellText}>{item.bill_date ? formatDate(item.bill_date) : formatDate(item.createdAt)}</Text>
                    {item.bill_no ? <Text style={styles.cellMuted}>{item.bill_no}</Text> : null}
                </View>
                {/* Supplier / GSTIN */}
                <View style={[styles.cell, { flex: 1.8 }]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                        {item.supplier_name || <Text style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>—</Text>}
                    </Text>
                    {item.supplier_gstin ? <Text style={styles.cellMuted}>{item.supplier_gstin}</Text> : null}
                </View>
                {/* Taxes (Taxable / CGST / SGST) */}
                <View style={[styles.cell, { flex: 2 }]}>
                    <Text style={styles.cellText}>
                        Taxable: {item.taxable_amount > 0 ? `₹${item.taxable_amount.toFixed(2)}` : '—'}
                    </Text>
                    <Text style={styles.cellMuted}>
                        CGST: {item.cgst_amount > 0 ? `₹${item.cgst_amount.toFixed(2)}` : '—'} | SGST: {item.sgst_amount > 0 ? `₹${item.sgst_amount.toFixed(2)}` : '—'}
                    </Text>
                </View>
                {/* Items */}
                <View style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}>
                    <Text style={styles.cellText}>
                        {item.items_count > 0 ? item.items_count : '—'}
                    </Text>
                </View>
                {/* Amount */}
                <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                    <Text style={styles.cellText}>
                        {item.total_amount > 0 ? `₹${Number(item.total_amount).toFixed(2)}` : '—'}
                    </Text>
                </View>
                {/* Bill Image */}
                <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                    {hasBill ? (
                        <TouchableOpacity
                            style={styles.viewBillBtn}
                            onPress={() => openPreview(item.bill_image_url)}
                        >
                            <Ionicons name="image-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.viewBillText}>View Bill</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.noBillBadge}>
                            <Text style={styles.noBillText}>No Bill</Text>
                        </View>
                    )}
                </View>
                {/* Status */}
                <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
                        <Text style={[styles.statusText, styles[`statusText_${item.status}`]]}>
                            {item.status?.toUpperCase() ?? 'PENDING'}
                        </Text>
                    </View>
                </View>
                {/* Actions */}
                <View style={[styles.cell, { flex: 0.8, alignItems: 'center', borderRightWidth: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => confirmDelete(item._id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={13} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>

            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Purchase Orders</Text>
                    <Text style={styles.headerSub}>
                        {filteredPurchases.length} record{filteredPurchases.length !== 1 ? 's' : ''} · Bills uploaded from inventory AI import
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    {/* Date Filter */}
                    <View style={styles.dateFilterRow}>
                        <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{
                                height: 28,
                                fontSize: 11,
                                fontFamily: 'Inter, sans-serif',
                                color: '#4A5C58',
                                backgroundColor: '#FFFFFF',
                                border: '0.5px solid #CDD5D1',
                                borderRadius: 2,
                                paddingLeft: 6,
                                paddingRight: 4,
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        />
                        {filterDate ? (
                            <TouchableOpacity
                                onPress={() => setFilterDate('')}
                                style={styles.dateClearBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Supplier Search */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={14} color={COLORS.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Filter by supplier..."
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* ─── UPLOAD INFO BANNER (only shown while uploading) ─── */}
            {uploading && (
                <View style={styles.uploadBanner}>
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.uploadBannerText}>{uploadProgress || 'Processing…'}</Text>
                </View>
            )}

            {/* ─── TABLE ─── */}
            <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <View style={[styles.thCell, { width: 44, alignItems: 'center' }]}>
                        <Text style={styles.th}>#</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.6 }]}>
                        <Text style={styles.th}>Date / Inv No</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.8 }]}>
                        <Text style={styles.th}>Supplier / GSTIN</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 2 }]}>
                        <Text style={styles.th}>Taxes</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 0.8, alignItems: 'center' }]}>
                        <Text style={styles.th}>Items</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}>
                        <Text style={styles.th}>Amount</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}>
                        <Text style={styles.th}>Bill</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1, alignItems: 'center' }]}>
                        <Text style={styles.th}>Status</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 0.8, alignItems: 'center', borderRightWidth: 0 }]}>
                        <Text style={styles.th}>Actions</Text>
                    </View>
                </View>

                {/* Table Body */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading purchases…</Text>
                    </View>
                ) : filteredPurchases.length > 0 ? (
                    <FlatList
                        data={filteredPurchases}
                        keyExtractor={(item) => item._id}
                        renderItem={renderRow}
                        showsVerticalScrollIndicator={false}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                    />
                ) : (
                    <View style={styles.centerBox}>
                        <Ionicons name="receipt-outline" size={44} color={COLORS.border} />
                        <Text style={styles.emptyText}>No purchase records yet</Text>
                        <Text style={styles.emptySubText}>AI Imported bills from inventory will appear here.</Text>
                    </View>
                )}
            </View>

            {/* ─── IMAGE PREVIEW MODAL ─── */}
            <ImagePreviewModal
                visible={previewVisible}
                imageUrl={previewUrl}
                onClose={() => { setPreviewVisible(false); setPreviewUrl(null); }}
            />

            {/* ─── DELETE CONFIRM MODAL ─── */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModal}>
                        <View style={styles.deleteIconBox}>
                            <Ionicons name="warning-outline" size={32} color={COLORS.error} />
                        </View>
                        <Text style={styles.deleteTitle}>Delete Purchase?</Text>
                        <Text style={styles.deleteDesc}>
                            This will remove the purchase record and its bill image reference. This cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={[styles.btnSecondary, { flex: 1 }]}
                                onPress={() => { setDeleteModalVisible(false); setDeletingId(null); }}
                            >
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnDanger, { flex: 1 }]}
                                onPress={handleDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading
                                    ? <ActivityIndicator size="small" color={COLORS.white} />
                                    : <>
                                        <Ionicons name="trash-outline" size={13} color={COLORS.white} style={{ marginRight: 4 }} />
                                        <Text style={styles.btnDangerText}>Delete</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
        padding: 12,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    // Date Filter
    dateFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dateFilterLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    dateClearBtn: {
        marginLeft: 2,
    },

    // Search Box
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        height: 32,
        width: 200,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: 6,
        fontSize: 12,
        color: COLORS.textPrimary,
        outlineStyle: 'none',
    },

    // Upload Banner
    uploadBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryGhost,
        borderWidth: 0.5,
        borderColor: COLORS.primarySoft,
        borderRadius: 2,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
    },
    uploadBannerText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },

    // Table
    tableContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#EFF2F1',
        height: 34,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    thCell: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        height: '100%',
    },
    th: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 46,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    tableRowAlt: { backgroundColor: '#F8FAF9' },
    cell: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        height: '100%',
    },
    cellText: { fontSize: 12, color: COLORS.textSecondary },
    cellMuted: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

    // Bill badge
    viewBillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 24,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
    },
    viewBillText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    noBillBadge: {
        paddingHorizontal: 8,
        height: 22,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noBillText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },

    // Status badge
    statusBadge: {
        paddingHorizontal: 7,
        height: 20,
        borderRadius: 2,
        borderWidth: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },
    status_pending: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning },
    statusText_pending: { color: COLORS.warning },
    status_received: { backgroundColor: COLORS.successLight, borderColor: COLORS.primary },
    statusText_received: { color: COLORS.primary },
    status_cancelled: { backgroundColor: COLORS.errorLight, borderColor: COLORS.error },
    statusText_cancelled: { color: COLORS.error },

    // Action buttons
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnDanger: { backgroundColor: COLORS.errorLight, borderColor: COLORS.error },

    // Empty / Loading
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 6,
        opacity: 0.3,
    },
    loadingText: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
    emptyText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500', marginTop: 4 },
    emptySubText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

    // Buttons
    btnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
    },
    btnPrimaryText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
    btnSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    btnSecondaryText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    btnDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.error,
        borderWidth: 0.5,
        borderColor: COLORS.error,
    },
    btnDangerText: { fontSize: 12, fontWeight: '600', color: COLORS.white },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModal: {
        width: 380,
        backgroundColor: COLORS.white,
        borderRadius: 2,
        padding: 20,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    deleteIconBox: {
        width: 52,
        height: 52,
        borderRadius: 2,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    deleteTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
    deleteDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    deleteActions: { flexDirection: 'row', gap: 8, width: '100%' },
});
