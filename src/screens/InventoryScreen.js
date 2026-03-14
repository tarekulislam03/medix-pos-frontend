import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    autoImportBill,
    confirmAutoImport,
} from '../services/inventoryService';
import { printLabels58mm } from '../utils/printLabel';
import { useResponsive } from '../utils/responsive';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── FILTER TABS ────────────────────────────────
const FILTERS = [
    { key: 'all', label: 'All Products', icon: 'cube-outline' },
    { key: 'low_stock', label: 'Low Stock', icon: 'warning-outline' },
    { key: 'expiring_soon', label: 'Expiring Soon', icon: 'time-outline' },
    { key: 'expired', label: 'Expired', icon: 'skull-outline' },
    { key: 'zero_stock', label: 'Zero Stock', icon: 'close-circle-outline' },
];

// ─── EMPTY PRODUCT FORM ────────────────────────
const EMPTY_FORM = {
    medicine_name: '',
    mrp: '',
    cost_price: '',
    quantity: '',
    alert_threshold: '',
    expiry_date: '',
    supplier_name: '',
    description: '',
    tablets_per_strip: '',
};

// ─── FORM FIELD COMPONENT ───────────────────────
const FormField = ({ label, value, onChangeText, placeholder, keyboardType, multiline, required, editable = true }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
            {label}
            {required && <Text style={{ color: COLORS.error }}> *</Text>}
        </Text>
        <TextInput
            style={[
                styles.fieldInput,
                multiline && styles.fieldInputMultiline,
                !editable && styles.fieldInputDisabled,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            keyboardType={keyboardType || "default"}
            multiline={multiline}
            editable={editable}
        />
    </View>
);

// ─── DATE FIELD COMPONENT ───────────────────────
const DateField = ({ label, value, onChangeDate, required, editable = true }) => {
    const [show, setShow] = useState(false);

    const dateValue = value ? new Date(value) : new Date();

    const onChange = (event, selectedDate) => {
        if (Platform.OS !== 'ios') {
            setShow(false);
        }
        if (selectedDate) {
            // Using local time to prevent timezone shift issues
            const dateStr = [
                selectedDate.getFullYear(),
                String(selectedDate.getMonth() + 1).padStart(2, '0'),
                String(selectedDate.getDate()).padStart(2, '0')
            ].join('-');
            onChangeDate(dateStr);
        }
    };

    if (Platform.OS === 'web') {
        const inputStyle = {
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: COLORS.textPrimary,
            fontFamily: 'inherit',
            cursor: editable ? 'pointer' : 'not-allowed',
        };
        // Need to use createElement to avoid TS/JSX strict issues on native bundles if they parse it
        return (
            <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                    {label}
                    {required && <Text style={{ color: COLORS.error }}> *</Text>}
                </Text>
                <View style={[styles.fieldInput, !editable && styles.fieldInputDisabled, { flexDirection: 'row', alignItems: 'center' }]}>
                    {React.createElement('input', {
                        type: 'date',
                        value: value,
                        onChange: (e) => onChangeDate(e.target.value),
                        disabled: !editable,
                        style: inputStyle,
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
                {label}
                {required && <Text style={{ color: COLORS.error }}> *</Text>}
            </Text>
            <TouchableOpacity
                style={[styles.fieldInput, !editable && styles.fieldInputDisabled, { justifyContent: 'center' }]}
                onPress={() => editable && setShow(true)}
                activeOpacity={editable ? 0.7 : 1}
            >
                <Text style={{ color: value ? COLORS.textPrimary : COLORS.textMuted }}>
                    {value || "YYYY-MM-DD"}
                </Text>
            </TouchableOpacity>

            {show && (
                <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={onChange}
                />
            )}
        </View>
    );
};

export default function InventoryScreen({ navigation }) {
    const r = useResponsive();
    // Data
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters & Search
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Label printing modal
    const [labelModalVisible, setLabelModalVisible] = useState(false);
    const [labelSearch, setLabelSearch] = useState('');
    const [labelItems, setLabelItems] = useState({}); // { [productId]: copies }
    const [generatingLabels, setGeneratingLabels] = useState(false);

    // Delete confirm
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ─── AUTO IMPORT STATE ────────────────────────
    const [autoImportUploading, setAutoImportUploading] = useState(false);
    const [autoImportReviewVisible, setAutoImportReviewVisible] = useState(false);
    const [autoImportItems, setAutoImportItems] = useState([]);
    const [autoImportConfirming, setAutoImportConfirming] = useState(false);
    const [autoImportError, setAutoImportError] = useState(''); // in-app error (web-safe)
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // ─── FETCH ──────────────────────────────────────
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getProducts();
            const list = response?.data ?? response?.products ?? response ?? [];
            setProducts(Array.isArray(list) ? list : []);
        } catch (err) {
            console.log('Failed to fetch products:', err.message);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // ─── FILTER & SEARCH ────────────────────────────
    useEffect(() => {
        let result = [...products];

        // Apply filter
        if (activeFilter === 'low_stock') {
            result = result.filter((p) => {
                const qty = p.quantity ?? p.stock ?? 0;
                const threshold = p.alert_threshold ?? 10;
                return qty <= threshold;
            });
        } else if (activeFilter === 'expiring_soon') {
            const now = new Date();
            const threeMonths = new Date();
            threeMonths.setMonth(threeMonths.getMonth() + 3);
            result = result.filter((p) => {
                if (!p.expiry_date) return false;
                const exp = new Date(p.expiry_date);
                return exp >= now && exp <= threeMonths;
            });
        } else if (activeFilter === 'expired') {
            const now = new Date();
            result = result.filter((p) => {
                if (!p.expiry_date) return false;
                return new Date(p.expiry_date) < now;
            });
        } else if (activeFilter === 'zero_stock') {
            result = result.filter((p) => (p.quantity ?? p.stock ?? 0) === 0);
        }

        // Apply search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    (p.medicine_name || '').toLowerCase().includes(q) ||
                    (p.supplier_name || '').toLowerCase().includes(q)
            );
        }

        setFilteredProducts(result);
    }, [products, activeFilter, searchQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    // ─── MODAL HANDLERS ─────────────────────────────
    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setModalMode('add');
        setModalVisible(true);
    };

    const openEditModal = (product) => {
        setFormData({
            medicine_name: product.medicine_name || '',
            mrp: String(product.mrp ?? ''),
            cost_price: String(product.cost_price ?? ''),
            quantity: String(product.quantity ?? ''),
            alert_threshold: String(product.alert_threshold ?? ''),
            expiry_date: product.expiry_date
                ? product.expiry_date.split('T')[0]
                : '',
            supplier_name: product.supplier_name || '',
            description: product.description || '',
            tablets_per_strip: product.tablets_per_strip ? String(product.tablets_per_strip) : '',
        });
        setEditingId(product._id || product.id);
        setModalMode('edit');
        setModalVisible(true);
    };

    const openViewModal = (product) => {
        setFormData({
            medicine_name: product.medicine_name || '',
            mrp: String(product.mrp ?? ''),
            cost_price: String(product.cost_price ?? ''),
            quantity: String(product.quantity ?? ''),
            alert_threshold: String(product.alert_threshold ?? ''),
            expiry_date: product.expiry_date
                ? product.expiry_date.split('T')[0]
                : '',
            supplier_name: product.supplier_name || '',
            description: product.description || '',
            tablets_per_strip: product.tablets_per_strip ? String(product.tablets_per_strip) : '',
        });
        setEditingId(product._id || product.id);
        setModalMode('view');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setFormData(EMPTY_FORM);
        setEditingId(null);
    };

    // ─── SAVE (CREATE / UPDATE) ─────────────────────
    const handleSave = async () => {
        // Validate
        if (!formData.medicine_name.trim()) {
            Alert.alert('Validation', 'Medicine name is required.');
            return;
        }
        if (!formData.mrp || isNaN(Number(formData.mrp))) {
            Alert.alert('Validation', 'Valid MRP is required.');
            return;
        }
        if (!formData.quantity || isNaN(Number(formData.quantity))) {
            Alert.alert('Validation', 'Valid quantity is required.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                medicine_name: formData.medicine_name.trim(),
                mrp: Number(formData.mrp),
                cost_price: formData.cost_price ? Number(formData.cost_price) : undefined,
                quantity: Number(formData.quantity),
                alert_threshold: Number(formData.alert_threshold) || 10,
                expiry_date: formData.expiry_date || undefined,
                supplier_name: formData.supplier_name.trim() || undefined,
                description: formData.description.trim() || undefined,
                tablets_per_strip: formData.tablets_per_strip ? Number(formData.tablets_per_strip) : undefined,
            };

            if (modalMode === 'edit' && editingId) {
                await updateProduct(editingId, payload);
            } else {
                await createProduct(payload);
            }

            closeModal();
            await fetchProducts();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    // ─── DELETE ─────────────────────────────────────
    const confirmDelete = (product) => {
        setDeletingProduct(product);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deletingProduct) return;
        setDeleting(true);
        try {
            await deleteProduct(deletingProduct._id || deletingProduct.id);
            setDeleteModalVisible(false);
            setDeletingProduct(null);
            await fetchProducts();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete product');
        } finally {
            setDeleting(false);
        }
    };

    const openBlobInNewTab = (blob, type) => {
        if (Platform.OS === 'web') {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else {
            Alert.alert('Info', 'Printing is supported on the web version.');
        }
    };

    // ─── AUTO IMPORT HANDLERS ─────────────────────
    /**
     * Convert various expiry date formats to YYYY-MM-DD.
     * Medicines expire at the END of the month shown on the pack.
     * Handles: MM/YYYY  MM/YY  MM-YYYY  MM-YY  YYYY-MM-DD  (passthrough)
     */
    const parseExpiryDate = (raw) => {
        if (!raw) return '';
        const s = String(raw).trim();

        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

        // MM/YYYY or MM-YYYY (4-digit year)
        const m4 = s.match(/^(\d{1,2})[\/-](\d{4})$/);
        if (m4) {
            const month = parseInt(m4[1], 10);
            const year = parseInt(m4[2], 10);
            const last = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this
            return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        }

        // MM/YY or MM-YY (2-digit year)
        const m2 = s.match(/^(\d{1,2})[\/-](\d{2})$/);
        if (m2) {
            const month = parseInt(m2[1], 10);
            const year = 2000 + parseInt(m2[2], 10);
            const last = new Date(year, month, 0).getDate();
            return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        }

        // Fallback — return as-is
        return s;
    };

    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 3500);
    };

    const handleAutoImportPress = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await processAutoImportFile(file);
            };
            input.click();
        } else {
            Alert.alert('Unsupported', 'Auto Import is currently supported on the web version.');
        }
    };

    const processAutoImportFile = async (file) => {
        setAutoImportUploading(true);
        setAutoImportError('');
        try {
            const result = await autoImportBill(file);

            // Log raw response so you can inspect in browser console
            console.log('[AutoImport] Raw API response:', JSON.stringify(result, null, 2));

            // Try every common envelope shape the backend might use
            let extracted =
                result?.products ??
                result?.data?.products ??
                result?.data?.medicines ??
                result?.data?.items ??
                result?.medicines ??
                result?.items ??
                (Array.isArray(result?.data) ? result.data : null) ??
                (Array.isArray(result) ? result : null) ??
                [];

            if (!Array.isArray(extracted) || extracted.length === 0) {
                // Show what we actually got so the user/dev can debug
                const preview = JSON.stringify(result).slice(0, 200);
                setAutoImportError(
                    `No medicines could be extracted from the image.\n\nAPI returned: ${preview}`
                );
                setAutoImportReviewVisible(true); // open modal to show the error
                return;
            }

            // Log each extracted item so we can see exact field names in the console
            extracted.forEach((item, idx) => {
                console.log(`[AutoImport] Item[${idx}] keys:`, Object.keys(item), '| values:', item);
            });

            // Normalise each row — try every common field name the API might use
            const normalised = extracted.map((item, idx) => ({
                _key: String(idx),
                medicine_name:
                    item.medicine_name ??
                    item.name ??
                    item.product_name ??
                    item.drug_name ??
                    item.item_name ??
                    item.brand_name ??
                    item.medicine ??
                    item.product ??
                    item.title ??
                    item.description ??
                    '',
                quantity: String(
                    item.quantity ??
                    item.qty ??
                    item.stock ??
                    item.units ??
                    ''
                ),
                mrp: String(
                    item.mrp ??
                    item.price ??
                    item.unit_price ??
                    item.rate ??
                    item.cost ??
                    item.amount ??
                    ''
                ),
                cost_price: String(
                    item.cost_price ??
                    item.cost ??
                    item.purchase_price ??
                    item.buy_price ??
                    item.purchase_rate ??
                    item.net_rate ??
                    ''
                ),
                supplier_name: String(
                    item.supplier_name ??
                    item.supplier ??
                    item.vendor_name ??
                    item.vendor ??
                    item.mfg ??
                    item.manufacturer ??
                    ''
                ),
                expiry_date: parseExpiryDate(
                    item.expiry_date ??
                    item.expiry ??
                    item.exp_date ??
                    item.exp ??
                    item.expiration ??
                    item.expiration_date ??
                    ''
                ),
            }));
            setAutoImportItems(normalised);
            setAutoImportReviewVisible(true);
        } catch (err) {
            console.error('[AutoImport] Error:', err);
            const msg = err?.message || err?.response?.data?.message || 'Failed to process the image. Please try again.';
            setAutoImportError(msg);
            setAutoImportReviewVisible(true); // open modal to show the error
        } finally {
            setAutoImportUploading(false);
        }
    };

    const updateAutoImportRow = (key, field, value) => {
        setAutoImportItems((prev) =>
            prev.map((item) =>
                item._key === key ? { ...item, [field]: value } : item
            )
        );
    };

    const removeAutoImportRow = (key) => {
        setAutoImportItems((prev) => prev.filter((item) => item._key !== key));
    };

    const handleConfirmAutoImport = async () => {
        // Guard against double-invocation (e.g. fast double-click)
        if (autoImportConfirming) return;
        if (autoImportItems.length === 0) {
            setAutoImportError('No items to import. Please keep at least one row.');
            return;
        }
        // Validate — every row needs a medicine name
        const invalid = autoImportItems.find((item) => !item.medicine_name.trim());
        if (invalid) {
            setAutoImportError('All rows must have a medicine name. Please fill in or remove empty rows.');
            return;
        }
        setAutoImportConfirming(true);
        setAutoImportError('');
        try {
            // Use createProduct for each item so we're guaranteed to use the
            // same working endpoint as the normal Add Product flow.
            const results = [];

            for (const item of autoImportItems) {
                try {
                    const res = await createProduct({
                        medicine_name: item.medicine_name.trim(),
                        quantity: Number(item.quantity) || 0,
                        mrp: Number(item.mrp) || 0,
                        cost_price: Number(item.cost_price) || undefined,
                        supplier_name: item.supplier_name ? item.supplier_name.trim() : undefined,
                        expiry_date: item.expiry_date || undefined,
                        alert_threshold: 10,
                    });

                    results.push({ status: "fulfilled", value: res });

                } catch (err) {
                    results.push({ status: "rejected", reason: err });
                }
            }

            const failed = results.filter((r) => r.status === 'rejected');
            const success = results.filter((r) => r.status === 'fulfilled');

            if (failed.length > 0 && success.length === 0) {
                // All failed
                setAutoImportError(
                    `All ${failed.length} product(s) failed to import.\n` +
                    (failed[0].reason?.message || '')
                );
                return;
            }

            // At least some succeeded
            setAutoImportReviewVisible(false);
            setAutoImportItems([]);
            setAutoImportError('');

            if (failed.length > 0) {
                showToast(`⚠ ${success.length} imported, ${failed.length} failed`);
            } else {
                showToast(`✓ ${success.length} product${success.length !== 1 ? 's' : ''} added to inventory`);
            }

            await fetchProducts();
        } catch (err) {
            const msg = err?.message || 'Failed to save products. Please try again.';
            setAutoImportError(msg);
        } finally {
            setAutoImportConfirming(false);
        }
    };

    const closeAutoImportReview = () => {
        setAutoImportReviewVisible(false);
        setAutoImportItems([]);
        setAutoImportError('');
    };

    // ─── LABEL MODAL HANDLERS ────────────────────────
    const openLabelModal = () => {
        setLabelItems({});
        setLabelSearch('');
        setLabelModalVisible(true);
    };

    const closeLabelModal = () => {
        setLabelModalVisible(false);
        setLabelItems({});
        setLabelSearch('');
    };

    const toggleLabelItem = (id) => {
        setLabelItems((prev) => {
            const next = { ...prev };
            if (next[id] !== undefined) {
                delete next[id];
            } else {
                next[id] = 1;
            }
            return next;
        });
    };

    const setLabelCopies = (id, copies) => {
        const num = parseInt(copies, 10);
        setLabelItems((prev) => ({
            ...prev,
            [id]: isNaN(num) || num < 1 ? 1 : num,
        }));
    };

    const labelSelectedCount = Object.keys(labelItems).length;

    const filteredLabelProducts = useMemo(() => {
        if (!labelSearch.trim()) return products;
        const q = labelSearch.toLowerCase();
        return products.filter(
            (p) =>
                (p.medicine_name || '').toLowerCase().includes(q) ||
                (p.supplier_name || '').toLowerCase().includes(q)
        );
    }, [products, labelSearch]);

    const handleGenerateLabels = () => {
        if (labelSelectedCount === 0) {
            Alert.alert('No Selection', 'Please select at least one product to generate labels.');
            return;
        }

        const totalCopies = Object.values(labelItems).reduce((sum, copies) => sum + (parseInt(copies, 10) || 1), 0);
        if (totalCopies > 14) {
            Alert.alert('Limit Exceeded', 'You cannot generate more than 14 barcode labels at once.');
            return;
        }
        setGeneratingLabels(true);
        try {
            // Build the list of { product, copies } from the selected items
            const items = Object.entries(labelItems).map(([productId, copies]) => {
                const product = products.find(p => (p._id || p.id) === productId);
                return { product: product || { _id: productId, medicine_name: 'Unknown' }, copies };
            });
            printLabels58mm(items);
            closeLabelModal();
        } catch (err) {
            Alert.alert('Label Error', err.message || 'Failed to generate labels.');
        } finally {
            setGeneratingLabels(false);
        }
    };

    // ─── HELPERS ────────────────────────────────────
    const getStockStatus = (product) => {
        const qty = product.quantity ?? product.stock ?? 0;
        const threshold = product.alert_threshold ?? 10;
        if (qty === 0) return { label: 'Out of Stock', color: COLORS.error, bg: COLORS.errorLight };
        if (qty <= threshold) return { label: 'Low Stock', color: COLORS.warning, bg: COLORS.warningLight };
        return { label: 'In Stock', color: COLORS.success, bg: COLORS.successLight };
    };

    const getExpiryStatus = (product) => {
        if (!product.expiry_date) return null;
        const exp = new Date(product.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: 'Expired', color: COLORS.error, bg: COLORS.errorLight };
        if (diffDays <= 90) return { label: `${diffDays}d left`, color: COLORS.warning, bg: COLORS.warningLight };
        return null;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // ─── COUNT BADGES ────────────────────────────────
    const lowStockCount = products.filter((p) => {
        const qty = p.quantity ?? p.stock ?? 0;
        const threshold = p.alert_threshold ?? 10;
        return qty <= threshold;
    }).length;

    const expiringSoonCount = products.filter((p) => {
        if (!p.expiry_date) return false;
        const exp = new Date(p.expiry_date);
        const now = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        return exp >= now && exp <= threeMonths;
    }).length;

    const expiredCount = products.filter((p) => {
        if (!p.expiry_date) return false;
        return new Date(p.expiry_date) < new Date();
    }).length;

    const zeroStockCount = products.filter((p) => (p.quantity ?? p.stock ?? 0) === 0).length;

    // ─── RENDER PRODUCT ROW ─────────────────────────
    const renderProduct = ({ item, index }) => {
        const stockStatus = getStockStatus(item);
        const expiryStatus = getExpiryStatus(item);

        return (
            <TouchableOpacity
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
                onPress={() => openViewModal(item)}
                activeOpacity={0.7}
            >
                {/* Name */}
                <View style={[styles.cell, { flex: 2.5 }]}>
                    <Text style={styles.cellName} numberOfLines={1}>
                        {item.medicine_name || '—'}
                    </Text>
                    <Text style={styles.cellSub} numberOfLines={1}>
                        {item.supplier_name || 'No supplier'}
                    </Text>
                </View>

                {/* MRP */}
                <View style={[styles.cell, { flex: 0.8 }]}>
                    <Text style={styles.cellPrice}>₹{Number(item.mrp ?? 0).toFixed(2)}</Text>
                </View>

                {/* Stock */}
                <View style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}>
                    <Text style={[styles.cellText, { fontWeight: '700' }]}>
                        {item.quantity ?? item.stock ?? 0}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: stockStatus.bg }]}>
                        <Text style={[styles.statusText, { color: stockStatus.color }]}>
                            {stockStatus.label}
                        </Text>
                    </View>
                </View>

                {/* Expiry */}
                <View style={[styles.cell, { flex: 1.2, paddingLeft: SPACING.lg }]}>
                    <Text style={styles.cellText}>{formatDate(item.expiry_date)}</Text>
                    {expiryStatus && (
                        <View style={[styles.statusBadge, { backgroundColor: expiryStatus.bg }]}>
                            <Text style={[styles.statusText, { color: expiryStatus.color }]}>
                                {expiryStatus.label}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Last Updated */}
                <View style={[styles.cell, { flex: 1.2, paddingLeft: SPACING.lg }]}>
                    <Text style={styles.cellText}>{formatDate(item.updatedAt || item.createdAt)}</Text>
                </View>

                {/* Actions */}
                <View style={[styles.cell, styles.actionsCell, { flex: 1.1 }]}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openEditModal(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => printLabels58mm([{ product: item, copies: 1 }])}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="barcode-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => confirmDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // ─── RENDER ─────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Inventory</Text>
                    <Text style={styles.headerSub}>
                        {products.length} products • {lowStockCount} low stock • {expiringSoonCount} expiring
                        {expiredCount > 0 ? ` • ${expiredCount} expired` : ''}
                        {zeroStockCount > 0 ? ` • ${zeroStockCount} out of stock` : ''}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {/* Auto Bill Import */}
                    <TouchableOpacity
                        style={[styles.importBtn, autoImportUploading && styles.importBtnLoading]}
                        onPress={handleAutoImportPress}
                        activeOpacity={0.75}
                        disabled={autoImportUploading}
                    >
                        {autoImportUploading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
                        )}
                        <Text style={styles.importBtnText}>
                            {autoImportUploading ? 'Processing...' : 'Auto Import Bill'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.printLabelsBtn}
                        onPress={openLabelModal}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="pricetag-outline" size={20} color={COLORS.accent} />
                        <Text style={styles.printLabelsBtnText}>Print Labels</Text>
                    </TouchableOpacity>
                    <GradientButton
                        title="Add Product"
                        onPress={openAddModal}
                        icon={<Ionicons name="add-circle-outline" size={22} color={COLORS.white} />}
                    />
                </View>
            </View>

            {/* ─── FILTER TABS ─── */}
            <View style={[styles.filterBar, r.isSmall && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={[styles.filterTabs, r.isSmall && { flexWrap: 'wrap' }]}>
                    {FILTERS.map((filter) => {
                        const isActive = activeFilter === filter.key;
                        const count =
                            filter.key === 'low_stock'
                                ? lowStockCount
                                : filter.key === 'expiring_soon'
                                    ? expiringSoonCount
                                    : filter.key === 'expired'
                                        ? expiredCount
                                        : filter.key === 'zero_stock'
                                            ? zeroStockCount
                                            : products.length;

                        // Danger tabs (expired / zero_stock) get red styling
                        const isExpiredTab = filter.key === 'expired';
                        const isZeroTab = filter.key === 'zero_stock';
                        const isDangerTab = isExpiredTab || isZeroTab;
                        const dangerCount = isExpiredTab ? expiredCount : isZeroTab ? zeroStockCount : 0;
                        const dangerActive = isActive && isDangerTab;

                        return (
                            <TouchableOpacity
                                key={filter.key}
                                style={[
                                    styles.filterTab,
                                    isActive && styles.filterTabActive,
                                    dangerActive && { backgroundColor: COLORS.error, borderColor: COLORS.error },
                                ]}
                                onPress={() => setActiveFilter(filter.key)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={filter.icon}
                                    size={18}
                                    color={isActive ? COLORS.white : (isDangerTab && dangerCount > 0 ? COLORS.error : COLORS.textMuted)}
                                />
                                <Text style={[
                                    styles.filterTabText,
                                    isActive && styles.filterTabTextActive,
                                    !isActive && isDangerTab && dangerCount > 0 && { color: COLORS.error, fontWeight: '700' },
                                ]}>
                                    {filter.label}
                                </Text>
                                <View style={[
                                    styles.filterCount,
                                    isActive && styles.filterCountActive,
                                    dangerActive && { backgroundColor: 'rgba(255,255,255,0.25)' },
                                    !isActive && isDangerTab && dangerCount > 0 && { backgroundColor: COLORS.errorLight },
                                ]}>
                                    <Text style={[
                                        styles.filterCountText,
                                        isActive && styles.filterCountTextActive,
                                        !isActive && isDangerTab && dangerCount > 0 && { color: COLORS.error, fontWeight: '800' },
                                    ]}>
                                        {count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Filters right side: Search */}
                <View style={[styles.filterBarRight, r.isSmall && { marginTop: SPACING.md }]} >

                    {/* Search */}
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search medicines..."
                            placeholderTextColor={COLORS.textMuted}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* ─── TABLE ─── */}
            <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2.5 }]}>Medicine</Text>
                    <Text style={[styles.th, { flex: 0.8 }]}>MRP</Text>
                    <Text style={[styles.th, { flex: 0.8, textAlign: 'center' }]}>Stock</Text>
                    <Text style={[styles.th, { flex: 1.2, paddingLeft: SPACING.lg }]}>Expiry</Text>
                    <Text style={[styles.th, { flex: 1.2, paddingLeft: SPACING.lg }]}>Last Updated</Text>
                    <Text style={[styles.th, { flex: 1.1, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Body */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.emptyText}>Loading products...</Text>
                    </View>
                ) : filteredProducts.length > 0 ? (
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={(item, i) => item._id || item.id || String(i)}
                        renderItem={renderProduct}
                        showsVerticalScrollIndicator={false}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                    />
                ) : (
                    <View style={styles.centerBox}>
                        <Ionicons
                            name={
                                activeFilter === 'low_stock' ? 'warning-outline' :
                                    activeFilter === 'expiring_soon' ? 'time-outline' :
                                        activeFilter === 'expired' ? 'skull-outline' :
                                            activeFilter === 'zero_stock' ? 'close-circle-outline' :
                                                'cube-outline'
                            }
                            size={56}
                            color={(activeFilter === 'expired' || activeFilter === 'zero_stock') ? COLORS.error : COLORS.border}
                        />
                        <Text style={[
                            styles.emptyText,
                            (activeFilter === 'expired' || activeFilter === 'zero_stock') && !searchQuery && { color: COLORS.success },
                        ]}>
                            {searchQuery
                                ? 'No products match your search'
                                : activeFilter === 'expired'
                                    ? '✓ No expired products — stock is clean!'
                                    : activeFilter === 'zero_stock'
                                        ? '✓ All products have stock — nothing is empty!'
                                        : `No ${activeFilter === 'all' ? '' : activeFilter.replace('_', ' ')} products`}
                        </Text>
                        {activeFilter === 'all' && !searchQuery && (
                            <GradientButton
                                title="Add First Product"
                                small
                                onPress={openAddModal}
                                style={{ marginTop: SPACING.md }}
                            />
                        )}
                    </View>
                )}
            </View>

            {/* ─── ADD / EDIT MODAL ─── */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '85%', large: '70%', xlarge: 700 }) }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, {
                                    backgroundColor: modalMode === 'view' ? COLORS.infoLight :
                                        modalMode === 'edit' ? COLORS.warningLight : COLORS.primaryGhost
                                }]}>
                                    <Ionicons
                                        name={modalMode === 'view' ? 'eye-outline' : modalMode === 'edit' ? 'create-outline' : 'add-circle-outline'}
                                        size={22}
                                        color={modalMode === 'view' ? COLORS.info : modalMode === 'edit' ? COLORS.warning : COLORS.primary}
                                    />
                                </View>
                                <Text style={styles.modalTitle}>
                                    {modalMode === 'view' ? 'Product Details' : modalMode === 'edit' ? 'Edit Product' : 'Add New Product'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Body */}
                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={styles.modalBodyContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {modalMode === 'view' ? (
                                <View style={styles.detailsContainer}>
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailSectionTitle}>Basic Information</Text>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Medicine Name</Text>
                                                <Text style={[styles.detailValue, { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }]}>{formData.medicine_name || '—'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Supplier Name</Text>
                                                <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '600' }]}>
                                                    <Ionicons name="business-outline" size={14} /> {formData.supplier_name || 'No supplier documented'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailSectionTitle}>Pricing & Stock</Text>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>MRP</Text>
                                                <Text style={styles.detailValue}>₹{formData.mrp || '0.00'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Cost Price</Text>
                                                <Text style={[styles.detailValue, { color: COLORS.success, fontWeight: '700' }]}>
                                                    ₹{formData.cost_price || '0.00'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Current Stock</Text>
                                                <Text style={[styles.detailValue, { fontWeight: '700' }]}>{formData.quantity || '0'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Alert Threshold</Text>
                                                <Text style={styles.detailValue}>{formData.alert_threshold || '10'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailSectionTitle}>Additional Details</Text>
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Expiry Date</Text>
                                                <Text style={styles.detailValue}>
                                                    {formData.expiry_date ? formData.expiry_date : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Tablets per Strip</Text>
                                                <Text style={styles.detailValue}>{formData.tablets_per_strip || '—'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <View style={styles.detailItem}>
                                                <Text style={styles.detailLabel}>Description</Text>
                                                <Text style={styles.detailValue}>{formData.description || 'No description provided.'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.formGrid}>
                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="Medicine Name"
                                                value={formData.medicine_name}
                                                onChangeText={(v) => setFormData({ ...formData, medicine_name: v })}
                                                placeholder="e.g. Paracetamol 500mg"
                                                required
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="MRP (₹)"
                                                value={formData.mrp}
                                                onChangeText={(v) => setFormData({ ...formData, mrp: v })}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                                required
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="Cost Price (₹)"
                                                value={formData.cost_price}
                                                onChangeText={(v) => setFormData({ ...formData, cost_price: v })}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="Quantity"
                                                value={formData.quantity}
                                                onChangeText={(v) => setFormData({ ...formData, quantity: v })}
                                                placeholder="0"
                                                keyboardType="numeric"
                                                required
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1 }}>
                                            <DateField
                                                label="Expiry Date"
                                                value={formData.expiry_date}
                                                onChangeDate={(v) => setFormData({ ...formData, expiry_date: v })}
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                        <View style={{ flex: 1.5 }}>
                                            <FormField
                                                label="Supplier Name"
                                                value={formData.supplier_name}
                                                onChangeText={(v) => setFormData({ ...formData, supplier_name: v })}
                                                placeholder="e.g. ABC Pharma"
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="Alert Threshold"
                                                value={formData.alert_threshold}
                                                onChangeText={(v) => setFormData({ ...formData, alert_threshold: v })}
                                                placeholder="10"
                                                keyboardType="numeric"
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <FormField
                                                label="Tablets per Strip"
                                                value={formData.tablets_per_strip}
                                                onChangeText={(v) => setFormData({ ...formData, tablets_per_strip: v.replace(/[^0-9]/g, '') })}
                                                placeholder="e.g. 10"
                                                keyboardType="numeric"
                                                editable={modalMode !== 'view'}
                                            />
                                        </View>
                                    </View>

                                    <FormField
                                        label="Description"
                                        value={formData.description}
                                        onChangeText={(v) => setFormData({ ...formData, description: v })}
                                        placeholder="Optional product description..."
                                        multiline
                                        editable={modalMode !== 'view'}
                                    />
                                </View>
                            )}
                        </ScrollView>

                        {/* Modal Footer */}
                        {modalMode !== 'view' && (
                            <View style={styles.modalFooter}>
                                <GradientButton
                                    title="Cancel"
                                    variant="secondary"
                                    onPress={closeModal}
                                    style={{ flex: 1 }}
                                />
                                <GradientButton
                                    title={modalMode === 'edit' ? 'Update Product' : 'Add Product'}
                                    onPress={handleSave}
                                    loading={saving}
                                    icon={<Ionicons name={modalMode === 'edit' ? 'checkmark' : 'add'} size={20} color={COLORS.white} />}
                                    style={{ flex: 2 }}
                                />
                            </View>
                        )}
                        {modalMode === 'view' && (
                            <View style={styles.modalFooter}>
                                <GradientButton
                                    title="Close"
                                    variant="secondary"
                                    onPress={closeModal}
                                    style={{ flex: 1 }}
                                />
                                <GradientButton
                                    title="Edit"
                                    onPress={() => setModalMode('edit')}
                                    icon={<Ionicons name="create-outline" size={20} color={COLORS.white} />}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ─── DELETE CONFIRM MODAL ─── */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, { width: r.pick({ small: '90%', medium: 400, large: 400, xlarge: 400 }) }]}>
                        <View style={styles.deleteIconBox}>
                            <Ionicons name="warning" size={36} color={COLORS.error} />
                        </View>
                        <Text style={styles.deleteTitle}>Delete Product?</Text>
                        <Text style={styles.deleteDesc}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {deletingProduct?.medicine_name || 'this product'}
                            </Text>
                            ? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <GradientButton
                                title="Cancel"
                                variant="secondary"
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setDeletingProduct(null);
                                }}
                                style={{ flex: 1 }}
                            />
                            <GradientButton
                                title="Delete"
                                variant="danger"
                                onPress={handleDelete}
                                loading={deleting}
                                icon={<Ionicons name="trash" size={18} color={COLORS.white} />}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── LABEL PRINTING MODAL ─── */}
            <Modal visible={labelModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.labelModalCard, { width: r.pick({ small: '95%', medium: '85%', large: '70%', xlarge: 750 }) }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, { backgroundColor: COLORS.accentLight }]}>
                                    <Ionicons name="pricetag-outline" size={22} color={COLORS.accent} />
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>Print Labels</Text>
                                    <Text style={styles.labelModalSub}>
                                        {labelSelectedCount} product{labelSelectedCount !== 1 ? 's' : ''} selected
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={closeLabelModal} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={styles.labelSearchBox}>
                            <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.labelSearchInput}
                                value={labelSearch}
                                onChangeText={setLabelSearch}
                                placeholder="Search products..."
                                placeholderTextColor={COLORS.textMuted}
                            />
                            {labelSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setLabelSearch('')}>
                                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Product List */}
                        <FlatList
                            data={filteredLabelProducts}
                            keyExtractor={(item, i) => item._id || item.id || String(i)}
                            style={styles.labelList}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.labelEmptyBox}>
                                    <Ionicons name="cube-outline" size={40} color={COLORS.border} />
                                    <Text style={styles.labelEmptyText}>No products found</Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const id = item._id || item.id;
                                const isChecked = labelItems[id] !== undefined;
                                return (
                                    <View style={[styles.labelRow, isChecked && styles.labelRowSelected]}>
                                        <TouchableOpacity
                                            style={styles.labelRowLeft}
                                            onPress={() => toggleLabelItem(id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                                {isChecked && (
                                                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.labelProductName} numberOfLines={1}>
                                                    {item.medicine_name || '—'}
                                                </Text>
                                                <Text style={styles.labelProductSub} numberOfLines={1}>
                                                    MRP: ₹{Number(item.mrp ?? 0).toFixed(2)}  •  Stock: {item.quantity ?? item.stock ?? 0}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        {isChecked && (
                                            <View style={styles.labelCopiesBox}>
                                                <Text style={styles.labelCopiesLabel}>Copies</Text>
                                                <View style={styles.labelCopiesInputRow}>
                                                    <TouchableOpacity
                                                        style={styles.labelCopiesStepBtn}
                                                        onPress={() => setLabelCopies(id, (labelItems[id] || 1) - 1)}
                                                    >
                                                        <Ionicons name="remove" size={16} color={COLORS.textSecondary} />
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={styles.labelCopiesInput}
                                                        value={String(labelItems[id] || 1)}
                                                        onChangeText={(v) => setLabelCopies(id, v)}
                                                        keyboardType="numeric"
                                                        selectTextOnFocus
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.labelCopiesStepBtn}
                                                        onPress={() => setLabelCopies(id, (labelItems[id] || 1) + 1)}
                                                    >
                                                        <Ionicons name="add" size={16} color={COLORS.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                        />

                        {/* Limit Warning Message */}
                        {(() => {
                            const totalCopies = Object.values(labelItems).reduce((sum, copies) => sum + (parseInt(copies, 10) || 1), 0);
                            if (totalCopies > 14) {
                                return (
                                    <View style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#fef2f2', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#fca5a5', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="warning" size={20} color="#dc2626" />
                                        <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', flex: 1 }}>
                                            Too many labels requested ({totalCopies}). The maximum allowed per batch is 14.
                                        </Text>
                                    </View>
                                );
                            }
                            return null;
                        })()}

                        {/* Footer */}
                        <View style={styles.labelModalFooter}>
                            <GradientButton
                                title="Cancel"
                                variant="secondary"
                                onPress={closeLabelModal}
                                style={{ flex: 1 }}
                            />
                            <GradientButton
                                title={generatingLabels ? 'Generating...' : `Generate ${labelSelectedCount} Label${labelSelectedCount !== 1 ? 's' : ''}`}
                                onPress={handleGenerateLabels}
                                loading={generatingLabels}
                                disabled={labelSelectedCount === 0 || Object.values(labelItems).reduce((sum, copies) => sum + (parseInt(copies, 10) || 1), 0) > 14}
                                icon={<Ionicons name="print" size={20} color={COLORS.white} />}
                                style={{ flex: 2 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── AUTO IMPORT REVIEW MODAL ─── */}
            <Modal visible={autoImportReviewVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.autoImportModalCard, { width: r.pick({ small: '97%', medium: '92%', large: '80%', xlarge: 860 }) }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, { backgroundColor: COLORS.primaryGhost }]}>
                                    <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>Review Extracted Medicines</Text>
                                    <Text style={styles.autoImportSubtitle}>
                                        {autoImportItems.length} item{autoImportItems.length !== 1 ? 's' : ''} detected — edit before confirming
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={closeAutoImportReview} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* ─── Error Banner (web-safe, replaces Alert) ─── */}
                        {!!autoImportError && (
                            <View style={styles.aiErrorBanner}>
                                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                                <Text style={styles.aiErrorText} selectable>{autoImportError}</Text>
                            </View>
                        )}

                        {/* Column Headers — only show when there are items to review */}
                        {!autoImportError && (
                            <View style={styles.aiTableHeader}>
                                <Text style={[styles.aiTh, { flex: 2.2 }]}>Medicine Name *</Text>
                                <Text style={[styles.aiTh, { flex: 0.7 }]}>Qty</Text>
                                <Text style={[styles.aiTh, { flex: 0.8 }]}>MRP</Text>
                                <Text style={[styles.aiTh, { flex: 0.8 }]}>Cost</Text>
                                <Text style={[styles.aiTh, { flex: 1.5 }]}>Supplier</Text>
                                <Text style={[styles.aiTh, { flex: 1.3 }]}>Expiry</Text>
                                <Text style={[styles.aiTh, { flex: 0.4 }]}></Text>
                            </View>
                        )}

                        {/* Editable Rows */}
                        <ScrollView style={styles.aiTableBody} showsVerticalScrollIndicator={false}>
                            {autoImportError ? null : autoImportItems.length === 0 ? (
                                <View style={styles.aiEmptyBox}>
                                    <Ionicons name="cube-outline" size={40} color={COLORS.border} />
                                    <Text style={styles.aiEmptyText}>No items — all rows removed</Text>
                                </View>
                            ) : (
                                autoImportItems.map((item, idx) => (
                                    <View
                                        key={item._key}
                                        style={[styles.aiTableRow, idx % 2 === 0 && styles.aiTableRowAlt]}
                                    >
                                        {/* Medicine Name */}
                                        <View style={{ flex: 2.2, paddingRight: 6 }}>
                                            <TextInput
                                                style={styles.aiCellInput}
                                                value={item.medicine_name}
                                                onChangeText={(v) => updateAutoImportRow(item._key, 'medicine_name', v)}
                                                placeholder="Medicine name"
                                                placeholderTextColor={COLORS.textMuted}
                                            />
                                        </View>
                                        {/* Quantity */}
                                        <View style={{ flex: 0.7, paddingRight: 6 }}>
                                            <TextInput
                                                style={styles.aiCellInput}
                                                value={item.quantity}
                                                onChangeText={(v) => updateAutoImportRow(item._key, 'quantity', v)}
                                                placeholder="0"
                                                placeholderTextColor={COLORS.textMuted}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {/* MRP */}
                                        <View style={{ flex: 0.8, paddingRight: 6 }}>
                                            <TextInput
                                                style={styles.aiCellInput}
                                                value={item.mrp}
                                                onChangeText={(v) => updateAutoImportRow(item._key, 'mrp', v)}
                                                placeholder="0.00"
                                                placeholderTextColor={COLORS.textMuted}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {/* Cost Price */}
                                        <View style={{ flex: 0.8, paddingRight: 6 }}>
                                            <TextInput
                                                style={styles.aiCellInput}
                                                value={item.cost_price}
                                                onChangeText={(v) => updateAutoImportRow(item._key, 'cost_price', v)}
                                                placeholder="0.00"
                                                placeholderTextColor={COLORS.textMuted}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        {/* Supplier Name */}
                                        <View style={{ flex: 1.5, paddingRight: 6 }}>
                                            <TextInput
                                                style={styles.aiCellInput}
                                                value={item.supplier_name}
                                                onChangeText={(v) => updateAutoImportRow(item._key, 'supplier_name', v)}
                                                placeholder="Supplier"
                                                placeholderTextColor={COLORS.textMuted}
                                            />
                                        </View>
                                        {/* Expiry Date */}
                                        <View style={{ flex: 1.3, paddingRight: 6 }}>
                                            {Platform.OS === 'web' ? (
                                                React.createElement('input', {
                                                    type: 'date',
                                                    value: item.expiry_date,
                                                    onChange: (e) => updateAutoImportRow(item._key, 'expiry_date', e.target.value),
                                                    style: {
                                                        width: '100%',
                                                        height: 40,
                                                        backgroundColor: COLORS.bgInput,
                                                        border: `1px solid ${COLORS.border}`,
                                                        borderRadius: 8,
                                                        paddingLeft: 10,
                                                        paddingRight: 10,
                                                        fontSize: 14,
                                                        color: COLORS.textPrimary,
                                                        fontFamily: 'inherit',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                        boxSizing: 'border-box',
                                                    },
                                                })
                                            ) : (
                                                <TextInput
                                                    style={styles.aiCellInput}
                                                    value={item.expiry_date}
                                                    onChangeText={(v) => updateAutoImportRow(item._key, 'expiry_date', v)}
                                                    placeholder="YYYY-MM-DD"
                                                    placeholderTextColor={COLORS.textMuted}
                                                />
                                            )}
                                        </View>
                                        {/* Remove Row */}
                                        <View style={{ flex: 0.4, alignItems: 'center' }}>
                                            <TouchableOpacity
                                                onPress={() => removeAutoImportRow(item._key)}
                                                style={styles.aiRemoveBtn}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.aiCancelBtn} onPress={closeAutoImportReview}>
                                <Text style={styles.aiCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <GradientButton
                                title={autoImportConfirming ? 'Importing...' : `Confirm Import (${autoImportItems.length})`}
                                onPress={handleConfirmAutoImport}
                                loading={autoImportConfirming}
                                disabled={autoImportItems.length === 0 || autoImportConfirming}
                                icon={<Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />}
                                style={{ flex: 2 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── SUCCESS TOAST ─── */}
            {toastVisible && (
                <View style={styles.toastContainer} pointerEvents="none">
                    <View style={styles.toastBox}>
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                        <Text style={styles.toastText}>{toastMessage}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// ─── STYLES ─────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    headerSub: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
        minHeight: 46,
    },
    importBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.primary,
    },
    importBtnLoading: {
        opacity: 0.7,
    },

    // Filter Bar
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.lg,
    },
    filterTabs: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgSurface,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryDark,
    },
    filterTabText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    filterTabTextActive: {
        color: COLORS.white,
    },
    filterCount: {
        minWidth: 24,
        height: 22,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    filterCountActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    filterCountTextActive: {
        color: COLORS.white,
    },
    filterBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flexWrap: 'wrap',
    },
    dateFilterBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        height: 44,
        minWidth: 160,
        gap: SPACING.sm,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        height: 44,
        minWidth: 240,
        gap: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },

    // Table
    tableContainer: {
        flex: 1,
        marginHorizontal: SPACING.xxl,
        marginTop: SPACING.lg,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.bgSurface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    th: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        minHeight: 64,
    },
    tableRowAlt: {
        backgroundColor: COLORS.bgInput,
    },
    cell: {
        paddingRight: SPACING.sm,
    },
    cellName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    cellSub: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    cellText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    cellPrice: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.primary,
    },
    statusBadge: {
        marginTop: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    actionsCell: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    actionBtn: {
        width: 42,
        height: 42,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryGhost,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnDanger: {
        backgroundColor: COLORS.errorLight,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxxl,
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: FONT_SIZES.lg,
        color: COLORS.textMuted,
        fontWeight: '600',
    },

    // ─── MODAL ────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        maxWidth: 700,
        maxHeight: '85%',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        ...SHADOWS.lg,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    modalIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.bgSurface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        maxHeight: 400,
    },
    modalBodyContent: {
        padding: SPACING.xl,
    },
    detailsContainer: {
        flexDirection: 'column',
        gap: SPACING.md,
    },
    detailCard: {
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.sm,
    },
    detailSectionTitle: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    detailRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.md,
        gap: SPACING.lg,
    },
    detailItem: {
        flex: 1,
        minWidth: 120,
    },
    detailLabel: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: SPACING.md,
        padding: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },

    // Form
    formGrid: {
        gap: SPACING.md,
    },
    formRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    fieldContainer: {
        marginBottom: SPACING.sm,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    fieldInput: {
        backgroundColor: COLORS.bgInput,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        minHeight: 48,
    },
    fieldInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    fieldInputDisabled: {
        backgroundColor: COLORS.bgSurface,
        color: COLORS.textMuted,
    },

    // Delete Modal
    deleteModal: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xxl,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    deleteIconBox: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    deleteTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    deleteDesc: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },

    // ─── PRINT LABELS ────────────────────────
    printLabelsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
        backgroundColor: COLORS.accentLight,
        minHeight: 46,
    },
    printLabelsBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.accent,
    },

    // Label Modal
    labelModalCard: {
        maxWidth: 750,
        maxHeight: '88%',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        ...SHADOWS.lg,
        overflow: 'hidden',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: RADIUS.sm / 2,
        borderWidth: 2,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    labelModalSub: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    labelSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        height: 50,
        gap: SPACING.sm,
    },
    labelSearchInput: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
    },
    labelList: {
        maxHeight: 400,
    },
    labelEmptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxxl,
        gap: SPACING.sm,
    },
    labelEmptyText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        minHeight: 62,
    },
    labelRowSelected: {
        backgroundColor: COLORS.primaryGhost,
    },
    labelRowLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    labelProductName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    labelProductSub: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    labelCopiesBox: {
        alignItems: 'center',
        marginLeft: SPACING.md,
    },
    labelCopiesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    labelCopiesInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    labelCopiesStepBtn: {
        width: 32,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgSurface,
    },
    labelCopiesInput: {
        width: 42,
        height: 34,
        textAlign: 'center',
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    labelModalFooter: {
        flexDirection: 'row',
        gap: SPACING.md,
        padding: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },

    // ─── AUTO IMPORT MODAL ────────────────────────
    autoImportModalCard: {
        maxWidth: 860,
        maxHeight: '90%',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        ...SHADOWS.lg,
        overflow: 'hidden',
    },
    autoImportSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    aiTableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgSurface,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    aiTh: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    aiTableBody: {
        maxHeight: 380,
    },
    aiTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        minHeight: 58,
    },
    aiTableRowAlt: {
        backgroundColor: COLORS.bgInput,
    },
    aiCellInput: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 8,
        fontSize: FONT_SIZES.sm,
        color: COLORS.textPrimary,
        height: 40,
    },
    aiRemoveBtn: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiEmptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxxl,
        gap: SPACING.sm,
    },
    aiEmptyText: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    aiErrorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        backgroundColor: COLORS.errorLight,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.error,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
    },
    aiErrorText: {
        flex: 1,
        fontSize: FONT_SIZES.sm,
        color: COLORS.error,
        lineHeight: 20,
    },
    aiCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgSurface,
    },
    aiCancelBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },

    // ─── TOAST ───────────────────────────────────
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toastBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.success,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        ...SHADOWS.md,
    },
    toastText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.white,
    },
});
