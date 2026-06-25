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
import { uploadPurchaseBill, getPurchases, deletePurchase, createManualPurchase } from '../services/purchaseService';

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
export default function PurchaseScreen({ route, navigation }) {
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

    // Upload form modal state
    const [uploadFormVisible, setUploadFormVisible] = useState(false);
    const [autoImportNoticeVisible, setAutoImportNoticeVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        supplier_name: '',
        bill_date: '',
        total_amount: '',
    });

    // Preview modal
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);

    // Manual Purchase modal
    const [manualPurchaseModalVisible, setManualPurchaseModalVisible] = useState(false);
    const [manualPurchaseLoading, setManualPurchaseLoading] = useState(false);
    const [manualPurchaseForm, setManualPurchaseForm] = useState({
        supplier_name: '',
        supplier_gstin: '',
        bill_no: '',
        bill_date: '',
        notes: '',
        items: [],
        taxable_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        total_amount: 0,
    });

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
        if (route?.params?.openAddModal) {
            setManualPurchaseModalVisible(true);
            navigation.setParams({ openAddModal: undefined });
        }
    }, [route?.params?.openAddModal, navigation]);

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

    // ─── MANUAL PURCHASE ──────────────────────────────────────────────────
    const handleManualPurchaseItemChange = (index, field, value) => {
        const newItems = [...manualPurchaseForm.items];
        
        if (field === 'expiry_date') {
            let formatted = value.replace(/\D/g, '');
            if (formatted.length > 4) {
                formatted = formatted.substring(0, 4);
            }
            if (formatted.length >= 3) {
                formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
            }
            value = formatted;
        }

        newItems[index][field] = value;
        
        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        newItems.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const discountedRate = rate - (rate * (discount / 100));
            const itemTaxable = qty * discountedRate;
            const itemGst = Number(item.gst) || 0;
            const itemGstAmt = (itemTaxable * itemGst) / 100;
            
            taxable += itemTaxable;
            cgst += itemGstAmt / 2;
            sgst += itemGstAmt / 2;
        });
        
        setManualPurchaseForm({
            ...manualPurchaseForm,
            items: newItems,
            taxable_amount: taxable,
            cgst_amount: cgst,
            sgst_amount: sgst,
            total_amount: taxable + cgst + sgst
        });
    };

    const addManualPurchaseItem = () => {
        setManualPurchaseForm({
            ...manualPurchaseForm,
            items: [
                ...manualPurchaseForm.items,
                { medicine_name: '', mrp: '', quantity: '', batch_number: '', expiry_date: '', hsn_code: '', gst: '', rate: '', discount: '' }
            ]
        });
    };

    const removeManualPurchaseItem = (index) => {
        const newItems = manualPurchaseForm.items.filter((_, i) => i !== index);
        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        newItems.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const discountedRate = rate - (rate * (discount / 100));
            const itemTaxable = qty * discountedRate;
            const itemGst = Number(item.gst) || 0;
            const itemGstAmt = (itemTaxable * itemGst) / 100;
            taxable += itemTaxable;
            cgst += itemGstAmt / 2;
            sgst += itemGstAmt / 2;
        });
        setManualPurchaseForm({
            ...manualPurchaseForm,
            items: newItems,
            taxable_amount: taxable,
            cgst_amount: cgst,
            sgst_amount: sgst,
            total_amount: taxable + cgst + sgst
        });
    };

    const handleSaveManualPurchase = async () => {
        if (!manualPurchaseForm.supplier_name.trim()) {
            Alert.alert('Validation Error', 'Supplier Name is required.');
            return;
        }
        if (manualPurchaseForm.items.length === 0) {
            Alert.alert('Validation Error', 'Please add at least one item.');
            return;
        }
        for (let i = 0; i < manualPurchaseForm.items.length; i++) {
            if (!manualPurchaseForm.items[i].medicine_name.trim()) {
                Alert.alert('Validation Error', `Item #${i + 1} must have a Product Name.`);
                return;
            }
        }

        setManualPurchaseLoading(true);
        try {
            const payload = { ...manualPurchaseForm };
            payload.items = payload.items.map(item => {
                let formattedExpiry = item.expiry_date;
                if (formattedExpiry && formattedExpiry.includes('/')) {
                    const parts = formattedExpiry.split('/');
                    if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 2) {
                        const month = parseInt(parts[0], 10);
                        const year = 2000 + parseInt(parts[1], 10);
                        // Get the last day of the month (month is 1-based here, so passing it to Date as monthIndex gets the 0th day of the NEXT month, i.e., last day of current month)
                        const lastDay = new Date(year, month, 0).getDate();
                        // Format to YYYY-MM-DD so Mongoose parses it reliably
                        formattedExpiry = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    }
                }
                return { ...item, expiry_date: formattedExpiry };
            });

            await createManualPurchase(payload);
            Alert.alert('Success', 'Manual purchase saved successfully!');
            setManualPurchaseModalVisible(false);
            setManualPurchaseForm({
                supplier_name: '', supplier_gstin: '', bill_no: '', bill_date: '', notes: '',
                items: [], taxable_amount: 0, cgst_amount: 0, sgst_amount: 0, total_amount: 0,
            });
            fetchPurchases();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to save manual purchase.');
        } finally {
            setManualPurchaseLoading(false);
        }
    };

    // ─── UPLOAD (Step 1: Pick file → show form) ───────────────────────────
    const handleUploadBill = async () => {
        setAutoImportNoticeVisible(true);
    };

    const confirmUploadBill = async () => {
        setAutoImportNoticeVisible(false);
        try {
            let file = null;

            if (Platform.OS === 'web') {
                file = await pickFileWeb();
            } else {
                Alert.alert('Not Supported', 'File picker is only available on web browsers.');
                return;
            }

            if (!file) return; // user cancelled

            // Store the file and show the form modal
            setSelectedFile(file);
            setUploadForm({
                supplier_name: '',
                bill_date: new Date().toISOString().split('T')[0],
                total_amount: '',
            });
            setUploadFormVisible(true);
        } catch (err) {
            console.error('File pick error:', err);
        }
    };

    // ─── UPLOAD (Step 2: Submit form → upload) ────────────────────────────
    const handleUploadSubmit = async () => {
        if (!selectedFile) return;

        setUploadFormVisible(false);
        setUploading(true);
        setUploadProgress('Uploading bill to cloud...');

        try {
            const formData = new FormData();
            formData.append('bill', selectedFile, selectedFile.name);

            // Append manual fields
            if (uploadForm.supplier_name.trim()) {
                formData.append('supplier_name', uploadForm.supplier_name.trim());
            }
            if (uploadForm.bill_date) {
                formData.append('bill_date', uploadForm.bill_date);
            }
            if (uploadForm.total_amount) {
                formData.append('total_amount', uploadForm.total_amount);
            }

            await uploadPurchaseBill(formData);

            setUploadProgress('Upload successful!');
            await fetchPurchases();
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Upload Failed', err?.message || 'Could not upload the bill. Check Cloudinary config.');
        } finally {
            setUploading(false);
            setUploadProgress('');
            setSelectedFile(null);
        }
    };

    const handleUploadCancel = () => {
        setUploadFormVisible(false);
        setSelectedFile(null);
        setUploadForm({ supplier_name: '', bill_date: '', total_amount: '' });
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

    // ─── MOBILE CARD ROW ──────────────────────────────────────────────────
    const renderMobileCard = ({ item, index }) => {
        const hasBill = !!item.bill_image_url;
        const statusLabel = item.status?.toUpperCase() ?? 'PENDING';
        return (
            <View style={styles.mobileCard}>
                {/* Card Header: Supplier + Status */}
                <View style={styles.mobileCardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.mobileCardSupplier} numberOfLines={1}>
                            {item.supplier_name || '— No Supplier —'}
                        </Text>
                        {item.supplier_gstin ? <Text style={styles.mobileCardGstin}>{item.supplier_gstin}</Text> : null}
                    </View>
                    <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
                        <Text style={[styles.statusText, styles[`statusText_${item.status}`]]}>
                            {statusLabel}
                        </Text>
                    </View>
                </View>

                {/* Card Body: Key details in a 2-col grid */}
                <View style={styles.mobileCardBody}>
                    <View style={styles.mobileDetailRow}>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>Date</Text>
                            <Text style={styles.mobileDetailValue}>
                                {item.bill_date ? formatDate(item.bill_date) : formatDate(item.createdAt)}
                            </Text>
                        </View>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>Invoice No</Text>
                            <Text style={styles.mobileDetailValue}>{item.bill_no || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.mobileDetailRow}>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>Amount</Text>
                            <Text style={[styles.mobileDetailValue, { fontWeight: '600', color: COLORS.primary }]}>
                                {item.total_amount > 0 ? `₹${Number(item.total_amount).toFixed(2)}` : '—'}
                            </Text>
                        </View>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>Items</Text>
                            <Text style={styles.mobileDetailValue}>
                                {item.items_count > 0 ? item.items_count : '—'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.mobileDetailRow}>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>Taxable</Text>
                            <Text style={styles.mobileDetailValue}>
                                {item.taxable_amount > 0 ? `₹${item.taxable_amount.toFixed(2)}` : '—'}
                            </Text>
                        </View>
                        <View style={styles.mobileDetailItem}>
                            <Text style={styles.mobileDetailLabel}>CGST / SGST</Text>
                            <Text style={styles.mobileDetailValue}>
                                {item.cgst_amount > 0 ? `₹${item.cgst_amount.toFixed(2)}` : '—'} / {item.sgst_amount > 0 ? `₹${item.sgst_amount.toFixed(2)}` : '—'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Card Footer: Actions */}
                <View style={styles.mobileCardFooter}>
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

    // ─── DESKTOP TABLE ROW ─────────────────────────────────────────────────
    const renderRow = ({ item, index }) => {
        const hasBill = !!item.bill_image_url;
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
        <View style={[styles.container, r.isSmall && { padding: 10, overflow: 'hidden' }]}>

            {/* ─── HEADER ─── */}
            <View style={[styles.header, r.isSmall && styles.headerMobile]}>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <Text style={styles.headerTitle}>Purchase Orders</Text>
                    <Text style={styles.headerSub} numberOfLines={r.isSmall ? 2 : 1}>
                        {filteredPurchases.length} record{filteredPurchases.length !== 1 ? 's' : ''}{r.isSmall ? '' : ' · Bills uploaded from inventory AI import'}
                    </Text>
                </View>

                <View style={[styles.headerActions, r.isSmall && styles.headerActionsMobile]}>
                    {/* Manual Purchase & Upload Bill */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={[styles.btnSecondary, r.isSmall && { height: 38 }]}
                            onPress={() => setManualPurchaseModalVisible(true)}
                        >
                            <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={[styles.btnSecondaryText, { color: COLORS.primary }]}>Add Purchase</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btnPrimary, r.isSmall && { height: 38 }]}
                            onPress={handleUploadBill}
                            disabled={uploading}
                        >
                            <Ionicons name="cloud-upload-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                            <Text style={styles.btnPrimaryText}>{uploading ? 'Uploading...' : 'Upload Bill'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date + Search row on mobile */}
                    <View style={[styles.filterRow, r.isSmall && styles.filterRowMobile]}>
                        {/* Date Filter */}
                        <View style={[styles.dateFilterRow, r.isSmall && { minWidth: 0, maxWidth: 140 }]}>
                            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                style={{
                                    height: r.isSmall ? 34 : 28,
                                    width: r.isSmall ? 100 : undefined,
                                    maxWidth: r.isSmall ? 110 : undefined,
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
                        <View style={[styles.searchBox, r.isSmall && styles.searchBoxMobile, { minWidth: 0 }]}>
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
            </View>

            {/* ─── UPLOAD INFO BANNER (only shown while uploading) ─── */}
            {uploading && (
                <View style={styles.uploadBanner}>
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.uploadBannerText}>{uploadProgress || 'Processing…'}</Text>
                </View>
            )}

            {/* ─── CONTENT: Cards on mobile, Table on desktop ─── */}
            {r.isSmall ? (
                /* ─── MOBILE: Card List ─── */
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Loading purchases…</Text>
                        </View>
                    ) : filteredPurchases.length > 0 ? (
                        <FlatList
                            data={filteredPurchases}
                            keyExtractor={(item) => item._id}
                            renderItem={renderMobileCard}
                            showsVerticalScrollIndicator={false}
                            onRefresh={onRefresh}
                            refreshing={refreshing}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    ) : (
                        <View style={styles.centerBox}>
                            <Ionicons name="receipt-outline" size={44} color={COLORS.border} />
                            <Text style={styles.emptyText}>No purchase records yet</Text>
                            <Text style={styles.emptySubText}>AI Imported bills from inventory will appear here.</Text>
                        </View>
                    )}
                </View>
            ) : (
                /* ─── DESKTOP: Table ─── */
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
            )}

            {/* ─── IMAGE PREVIEW MODAL ─── */}
            <ImagePreviewModal
                visible={previewVisible}
                imageUrl={previewUrl}
                onClose={() => { setPreviewVisible(false); setPreviewUrl(null); }}
            />

            {/* ─── DELETE CONFIRM MODAL ─── */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, r.isSmall && { width: '90%', maxWidth: 380 }]}>
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

            {/* ─── MANUAL PURCHASE MODAL ─── */}
            <Modal visible={manualPurchaseModalVisible} transparent animationType="slide">
                <View style={formStyles.overlay}>
                    <View style={[formStyles.container, { width: '95%', maxWidth: 1000, maxHeight: '90%' }]}>
                        <View style={formStyles.header}>
                            <View>
                                <Text style={formStyles.title}>Manual Purchase Entry</Text>
                                <Text style={formStyles.subtitle}>Enter supplier and item details</Text>
                            </View>
                            <TouchableOpacity onPress={() => setManualPurchaseModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={formStyles.body}>
                            {/* Supplier Section */}
                            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10 }}>1. Supplier Info</Text>
                            <View style={{ flexDirection: r.isSmall ? 'column' : 'row', gap: 15, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={formStyles.label}>Supplier Name <Text style={{ color: COLORS.error }}>*</Text></Text>
                                    <TextInput style={formStyles.input} placeholder="Supplier Name" value={manualPurchaseForm.supplier_name} onChangeText={(t) => setManualPurchaseForm({ ...manualPurchaseForm, supplier_name: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={formStyles.label}>GST No.</Text>
                                    <TextInput style={formStyles.input} placeholder="GSTIN" value={manualPurchaseForm.supplier_gstin} onChangeText={(t) => setManualPurchaseForm({ ...manualPurchaseForm, supplier_gstin: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={formStyles.label}>Invoice ID</Text>
                                    <TextInput style={formStyles.input} placeholder="Invoice ID" value={manualPurchaseForm.bill_no} onChangeText={(t) => setManualPurchaseForm({ ...manualPurchaseForm, bill_no: t })} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={formStyles.label}>Bill Date</Text>
                                    <TextInput style={formStyles.input} placeholder="YYYY-MM-DD" value={manualPurchaseForm.bill_date} onChangeText={(t) => setManualPurchaseForm({ ...manualPurchaseForm, bill_date: t })} />
                                </View>
                            </View>

                            {/* Items Section */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>2. Items Info</Text>
                                <TouchableOpacity onPress={addManualPurchaseItem} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                    <Ionicons name="add" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0284C7' }}>Add Row</Text>
                                </TouchableOpacity>
                            </View>

                            {manualPurchaseForm.items.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginBottom: 20 }}>
                                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>No items added. Click "Add Row" to start.</Text>
                                </View>
                            ) : (
                                <View style={{ gap: 10, marginBottom: 20 }}>
                                    {manualPurchaseForm.items.map((item, idx) => (
                                        <View key={idx} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary }}>Item #{idx + 1}</Text>
                                                <TouchableOpacity onPress={() => removeManualPurchaseItem(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={{ flexDirection: r.isSmall ? 'column' : 'row', gap: 10, flexWrap: 'wrap' }}>
                                                <View style={{ flex: 2, minWidth: 140 }}>
                                                    <Text style={formStyles.label}>Product Name <Text style={{ color: COLORS.error }}>*</Text></Text>
                                                    <TextInput style={formStyles.input} placeholder="Product Name" value={item.medicine_name} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'medicine_name', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 60 }}>
                                                    <Text style={formStyles.label}>MRP</Text>
                                                    <TextInput style={formStyles.input} keyboardType="numeric" placeholder="0.00" value={item.mrp} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'mrp', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 60 }}>
                                                    <Text style={formStyles.label}>Rate</Text>
                                                    <TextInput style={formStyles.input} keyboardType="numeric" placeholder="0.00" value={item.rate} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'rate', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 50 }}>
                                                    <Text style={formStyles.label}>Disc %</Text>
                                                    <TextInput style={formStyles.input} keyboardType="numeric" placeholder="0" value={item.discount} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'discount', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 50 }}>
                                                    <Text style={formStyles.label}>Qty</Text>
                                                    <TextInput style={formStyles.input} keyboardType="numeric" placeholder="0" value={item.quantity} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'quantity', t)} />
                                                </View>
                                                <View style={{ flex: 1.5, minWidth: 80 }}>
                                                    <Text style={formStyles.label}>Batch</Text>
                                                    <TextInput style={formStyles.input} placeholder="Batch" value={item.batch_number} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'batch_number', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 60 }}>
                                                    <Text style={formStyles.label}>Expiry</Text>
                                                    <TextInput style={formStyles.input} placeholder="MM/YY" value={item.expiry_date} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'expiry_date', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 60 }}>
                                                    <Text style={formStyles.label}>HSN</Text>
                                                    <TextInput style={formStyles.input} placeholder="HSN" value={item.hsn_code} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'hsn_code', t)} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 50 }}>
                                                    <Text style={formStyles.label}>GST %</Text>
                                                    <TextInput style={formStyles.input} keyboardType="numeric" placeholder="0" value={item.gst} onChangeText={(t) => handleManualPurchaseItemChange(idx, 'gst', t)} />
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Tax Details Section */}
                            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10 }}>3. Tax & Totals</Text>
                            <View style={{ flexDirection: r.isSmall ? 'column' : 'row', gap: 15, backgroundColor: '#F0FDFA', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#CCFBF1' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Taxable Amount</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>₹{manualPurchaseForm.taxable_amount.toFixed(2)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Total CGST</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>₹{manualPurchaseForm.cgst_amount.toFixed(2)}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Total SGST</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>₹{manualPurchaseForm.sgst_amount.toFixed(2)}</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 6, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Total Amount</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F766E' }}>₹{manualPurchaseForm.total_amount.toFixed(2)}</Text>
                                </View>
                            </View>

                        </ScrollView>
                        <View style={formStyles.footer}>
                            <TouchableOpacity style={formStyles.cancelBtn} onPress={() => setManualPurchaseModalVisible(false)} disabled={manualPurchaseLoading}>
                                <Text style={formStyles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={formStyles.saveBtn} onPress={handleSaveManualPurchase} disabled={manualPurchaseLoading}>
                                {manualPurchaseLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.saveBtnText}>Save Purchase</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── UPLOAD FORM MODAL ─── */}
            <Modal visible={uploadFormVisible} animationType="fade" transparent onRequestClose={handleUploadCancel}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.uploadFormModal, r.isSmall && { width: '92%', maxWidth: 400 }]}>
                        {/* Modal Header */}
                        <View style={styles.uploadFormHeader}>
                            <View style={styles.uploadFormIconBox}>
                                <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.uploadFormTitle}>Bill Details</Text>
                                <Text style={styles.uploadFormSubtitle}>
                                    {selectedFile?.name || 'Selected file'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleUploadCancel} style={styles.uploadFormCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Form Fields */}
                        <View style={styles.uploadFormBody}>
                            {/* Supplier Name */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Supplier Name</Text>
                                <View style={styles.formInputRow}>
                                    <Ionicons name="business-outline" size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Enter supplier name"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={uploadForm.supplier_name}
                                        onChangeText={(val) => setUploadForm(prev => ({ ...prev, supplier_name: val }))}
                                    />
                                </View>
                            </View>

                            {/* Invoice Date */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Invoice Date</Text>
                                <View style={styles.formInputRow}>
                                    <Ionicons name="calendar-outline" size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                                    {Platform.OS === 'web' ? (
                                        <input
                                            type="date"
                                            value={uploadForm.bill_date}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, bill_date: e.target.value }))}
                                            style={{
                                                flex: 1,
                                                height: 34,
                                                fontSize: 13,
                                                fontFamily: 'Inter, sans-serif',
                                                color: '#2E3B38',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                cursor: 'pointer',
                                            }}
                                        />
                                    ) : (
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={COLORS.textMuted}
                                            value={uploadForm.bill_date}
                                            onChangeText={(val) => setUploadForm(prev => ({ ...prev, bill_date: val }))}
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Total Amount */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Total Amount (₹)</Text>
                                <View style={styles.formInputRow}>
                                    <Text style={{ fontSize: 15, color: COLORS.textMuted, marginRight: 8, fontWeight: '500' }}>₹</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="0.00"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={uploadForm.total_amount}
                                        onChangeText={(val) => setUploadForm(prev => ({ ...prev, total_amount: val.replace(/[^0-9.]/g, '') }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Modal Footer */}
                        <View style={styles.uploadFormFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={handleUploadCancel}>
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={handleUploadSubmit}>
                                <Ionicons name="cloud-upload-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnPrimaryText}>Upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/*  AUTO IMPORT NOTICE MODAL  */}
            <Modal visible={autoImportNoticeVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: 450, large: 500, xlarge: 500 }), padding: 0, overflow: 'hidden' }]}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.warningLight, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="information-circle-outline" size={24} color={COLORS.warning} />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>Notice</Text>
                                    <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>Auto Import Unavailable</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setAutoImportNoticeVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Body */}
                        <View style={{ padding: 24 }}>
                            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 24 }}>
                                We're very sorry for the inconvenience. The auto bill import feature is under repair. It will be available from 28.06.26.
                            </Text>
                            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 24, marginTop: 12 }}>
                                Send the bill images via whatsapp to this number - <Text style={{ fontWeight: '700', color: COLORS.primary }}>8101402916</Text>. We will take care of the purchase entry and stock update.
                            </Text>
                            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 24, marginTop: 12, fontWeight: '600' }}>
                                OR, You can still add your bill through manual entry.
                            </Text>
                        </View>

                        {/* Footer */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 20, paddingTop: 0, gap: 12 }}>
                            <TouchableOpacity
                                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }}
                                onPress={() => setAutoImportNoticeVisible(false)}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: COLORS.primary }}
                                onPress={() => {
                                    setAutoImportNoticeVisible(false);
                                    setManualPurchaseModalVisible(true);
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Manual Purchase Upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const formStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    container: { backgroundColor: '#fff', borderRadius: 0, padding: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, display: 'flex', flexDirection: 'column' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    title: { fontSize: 15, fontWeight: '700', color: '#0F172A', textTransform: 'uppercase' },
    subtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
    body: { flex: 1 },
    label: { fontSize: 10, fontWeight: '600', color: '#475569', marginBottom: 4, textTransform: 'uppercase' },
    input: { height: 28, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 0, paddingHorizontal: 6, backgroundColor: '#FFFFFF', fontSize: 12, color: '#0F172A', outlineStyle: 'none' },
    inputFocus: { borderColor: '#2563EB', backgroundColor: '#F0F9FF' },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 10 },
    cancelBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 0, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
    cancelBtnText: { color: '#475569', fontSize: 12, fontWeight: '600' },
    saveBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 0, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center', minWidth: 120 },
    saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    tableHeader: { backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingVertical: 6, paddingHorizontal: 4 },
    tableHeaderText: { fontSize: 10, fontWeight: '700', color: '#334155', textTransform: 'uppercase' },
    tableCell: { paddingHorizontal: 2, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
    tableRow: { flexDirection: 'row', backgroundColor: '#FFFFFF' },
    tableRowHover: { backgroundColor: '#F8FAFC' }
});

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
    headerMobile: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 10,
    },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerActionsMobile: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
    },

    // Filter row (date + search together)
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    filterRowMobile: {
        flexDirection: 'row',
        gap: 8,
    },

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
    searchBoxMobile: {
        flex: 1,
        width: undefined,
        height: 34,
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

    // ─── MOBILE CARD STYLES ──────────────────────────────────────────────
    mobileCard: {
        backgroundColor: COLORS.white,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        marginBottom: 10,
        overflow: 'hidden',
        maxWidth: '100%',
    },
    mobileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: '#F8FAF9',
    },
    mobileCardSupplier: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    mobileCardGstin: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    mobileCardBody: {
        padding: 12,
        gap: 8,
    },
    mobileDetailRow: {
        flexDirection: 'row',
        gap: 12,
    },
    mobileDetailItem: {
        flex: 1,
    },
    mobileDetailLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    mobileDetailValue: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    mobileCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: '#FAFBFA',
    },

    // ─── DESKTOP TABLE STYLES ────────────────────────────────────────────
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

    // ─── Upload Form Modal ────────────────────────────────────────────
    uploadFormModal: {
        width: 420,
        backgroundColor: COLORS.white,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    uploadFormHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: '#F8FAF9',
        gap: 10,
    },
    uploadFormIconBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: COLORS.primaryGhost,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadFormTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    uploadFormSubtitle: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    uploadFormCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 4,
        backgroundColor: COLORS.bgDark,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadFormBody: {
        padding: 16,
        gap: 14,
    },
    formGroup: {
        gap: 5,
    },
    formLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    formInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 4,
        paddingHorizontal: 10,
        height: 38,
    },
    formInput: {
        flex: 1,
        height: '100%',
        fontSize: 13,
        color: COLORS.textPrimary,
        outlineStyle: 'none',
    },
    uploadFormFooter: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        backgroundColor: '#F8FAF9',
    },
});
