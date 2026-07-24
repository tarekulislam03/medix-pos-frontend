import React, { useState, useEffect, useCallback } from 'react';
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
import { COLORS } from '../../../core/constants/theme';
import Skeleton from '../../../core/components/Skeleton';
import {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    payCustomerDue,
} from '../services/customerService';
import { useResponsive } from '../../../core/utils/responsive';

const EMPTY_FORM = {
    name: '',
    phone_no: '',
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
            {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
        />
    </View>
);

export default function CustomersScreen({ navigation }) {
    const r = useResponsive();

    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Delete confirm state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingCustomer, setDeletingCustomer] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Pay due state
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [payingCustomer, setPayingCustomer] = useState(null);
    const [payFormData, setPayFormData] = useState({ amount: '', method: 'cash' });
    const [paying, setPaying] = useState(false);

    // ─── FETCH ──────────────────────────────────────
    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getCustomers();
            const list = response?.data ?? response?.customers ?? response ?? [];
            setCustomers(Array.isArray(list) ? list : []);
        } catch (err) {
            console.log('Failed to fetch customers:', err.message);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // ─── SEARCH ─────────────────────────────────────
    useEffect(() => {
        let result = [...customers];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    (c.customer_name || '').toLowerCase().includes(q) ||
                    (c.phone_number || '').toLowerCase().includes(q) ||
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.phone || '').toLowerCase().includes(q)
            );
        }
        setFilteredCustomers(result);
    }, [customers, searchQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCustomers();
        setRefreshing(false);
    };

    // ─── MODAL HANDLERS ─────────────────────────────
    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setModalMode('add');
        setModalVisible(true);
    };

    const openEditModal = (c) => {
        setFormData({
            name: c.customer_name || c.name || '',
            phone_no: c.phone_no || c.phone_number || c.phone || '',
        });
        setEditingId(c._id || c.id || c.customer_id);
        setModalMode('edit');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setFormData(EMPTY_FORM);
        setEditingId(null);
    };

    // ─── SAVE (CREATE / UPDATE) ─────────────────────
    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Validation', 'Customer name is required.');
            return;
        }
        if (!formData.phone_no.trim()) {
            Alert.alert('Validation', 'Phone number is required.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                phone_no: formData.phone_no.trim(),
            };

            if (modalMode === 'edit' && editingId) {
                await updateCustomer(editingId, payload);
            } else {
                await createCustomer(payload);
            }

            closeModal();
            await fetchCustomers();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to save customer');
        } finally {
            setSaving(false);
        }
    };

    // ─── DELETE ─────────────────────────────────────
    const confirmDelete = (c) => {
        setDeletingCustomer(c);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deletingCustomer) return;
        setDeleting(true);
        try {
            await deleteCustomer(deletingCustomer._id || deletingCustomer.id || deletingCustomer.customer_id);
            setDeleteModalVisible(false);
            setDeletingCustomer(null);
            await fetchCustomers();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete customer');
        } finally {
            setDeleting(false);
        }
    };

    // ─── CLEAR DUE ──────────────────────────────────
    const openPayModal = (c) => {
        const due = Number(c.due_balance ?? c.total_due ?? c.credit_balance ?? c.due ?? 0);
        setPayingCustomer(c);
        setPayFormData({ amount: due.toString(), method: 'cash' });
        setPayModalVisible(true);
    };

    const handlePayDue = async () => {
        if (!payingCustomer) return;
        const amount = parseFloat(payFormData.amount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Validation', 'Please enter a valid amount.');
            return;
        }

        setPaying(true);
        try {
            await payCustomerDue(payingCustomer._id || payingCustomer.id || payingCustomer.customer_id, {
                amount_paid: amount,
                payment_method: payFormData.method,
            });
            setPayModalVisible(false);
            setPayingCustomer(null);
            await fetchCustomers();
            Alert.alert('Success', 'Payment recorded successfully');
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to record payment');
        } finally {
            setPaying(false);
        }
    };

    // ─── RENDER ROW ─────────────────────────
    const renderCustomer = ({ item, index }) => {
        const name = item.customer_name || item.name || '—';
        const phone = item.phone_number || item.phone_no || '—';
        const dueBalance = Number(item.due_balance ?? item.total_due ?? item.credit_balance ?? item.due ?? 0);
        const hasDue = dueBalance > 0;

        return (
            <TouchableOpacity
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.cell, { flex: 2 }]}>
                    <Text style={styles.cellName} numberOfLines={1}>{name}</Text>
                </View>

                <View style={[styles.cell, { flex: 1.5, alignItems: 'center' }]}>
                    <Text style={styles.cellText}>{phone}</Text>
                </View>

                <View style={[styles.cell, { flex: 1, alignItems: 'center' }]}>
                    <Text style={[styles.cellDue, hasDue && styles.cellDueActive]}>
                        ₹{dueBalance.toFixed(2)}
                    </Text>
                </View>

                <View style={[styles.cell, styles.actionsCell, { flex: 1.5, borderRightWidth: 0 }]}>
                    {hasDue && (
                        <TouchableOpacity
                            testID="pay-due-btn"
                            style={[styles.actionBtn, { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGhost }]}
                            onPress={(e) => { e.stopPropagation(); openPayModal(item); }}
                            title="Clear Dues"
                        >
                            <Ionicons name="wallet-outline" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={(e) => { e.stopPropagation(); openEditModal(item); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={(e) => { e.stopPropagation(); confirmDelete(item); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Customers</Text>
                    <Text style={styles.headerSub}>
                        {customers.length} total customers
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.btnPrimary} onPress={openAddModal}>
                        <Ionicons name="add-circle-outline" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                        <Text style={styles.btnPrimaryText}>Add Customer</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── FILTER/SEARCH BAR ─── */}
            <View style={[styles.filterBar, r.isSmall && { flexDirection: 'column', alignItems: 'stretch' }]}>
                {/* Search */}
                <View style={[styles.searchBox, r.isSmall ? { width: '100%' } : { minWidth: 280 }]}>
                    <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search customers..."
                        placeholderTextColor={COLORS.textMuted}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ─── TABLE ─── */}
            <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <View style={[styles.thCell, { flex: 2 }]}>
                        <Text style={styles.th}>Customer Name</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.5, alignItems: 'center' }]}>
                        <Text style={styles.th}>Phone</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1, alignItems: 'center' }]}>
                        <Text style={styles.th}>Due Balance</Text>
                    </View>
                    <View style={[styles.thCell, { flex: 1.5, alignItems: 'center', borderRightWidth: 0 }]}>
                        <Text style={styles.th}>Actions</Text>
                    </View>
                </View>

                {/* Table Body */}
                {loading ? (
                    <View style={{ flex: 1, padding: 12, gap: 8 }}>
                        {[...Array(6)].map((_, i) => (
                            <View key={i} style={[styles.tableRow, { height: 46, paddingHorizontal: 12 }]}>
                                <Skeleton width="30%" height={14} style={{ flex: 2 }} />
                                <Skeleton width="20%" height={14} style={{ flex: 1.5, alignSelf: 'center' }} />
                                <Skeleton width="15%" height={14} style={{ flex: 1, alignSelf: 'center' }} />
                                <Skeleton width="20%" height={20} style={{ flex: 1.5, alignSelf: 'center', marginLeft: 16 }} />
                            </View>
                        ))}
                    </View>
                ) : filteredCustomers.length > 0 ? (
                    <FlatList
                        data={filteredCustomers}
                        keyExtractor={(item, i) => item._id || item.id || item.customer_id || String(i)}
                        renderItem={renderCustomer}
                        showsVerticalScrollIndicator={false}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                    />
                ) : (
                    <View style={styles.centerBox}>
                        <Ionicons name="people-outline" size={44} color={COLORS.border} />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No customers match your search' : 'No customers yet'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10 }]} onPress={openAddModal}>
                                <Text style={styles.btnPrimaryText}>Add First Customer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* ─── ADD / EDIT MODAL ─── */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '60%', large: '50%', xlarge: 500 }) }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, {
                                    backgroundColor: modalMode === 'edit' ? 'rgba(184, 134, 11, 0.10)' : COLORS.primaryGhost
                                }]}>
                                    <Ionicons
                                        name={modalMode === 'edit' ? 'create-outline' : 'person-add-outline'}
                                        size={18}
                                        color={modalMode === 'edit' ? COLORS.warning : COLORS.primary}
                                    />
                                </View>
                                <Text style={styles.modalTitle}>
                                    {modalMode === 'edit' ? 'Edit Customer' : 'Add New Customer'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Modal Body */}
                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGrid}>
                                <FormField
                                    label="Customer Name"
                                    value={formData.name}
                                    onChangeText={(v) => setFormData({ ...formData, name: v })}
                                    placeholder="e.g. John Doe"
                                    required
                                />
                                <FormField
                                    label="Phone Number"
                                    value={formData.phone_no}
                                    onChangeText={(v) => setFormData({ ...formData, phone_no: v })}
                                    placeholder="e.g. 9876543210"
                                    keyboardType="phone-pad"
                                    required
                                />
                            </View>
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={closeModal}>
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }]} onPress={handleSave}>
                                <Ionicons name={modalMode === 'edit' ? 'checkmark' : 'add'} size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnPrimaryText}>
                                    {modalMode === 'edit' ? 'Update Customer' : 'Add Customer'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── PAY DUE MODAL ─── */}
            <Modal visible={payModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: 400, large: 400, xlarge: 400 }) }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, { backgroundColor: COLORS.successLight }]}>
                                    <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalTitle}>Clear Dues</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPayModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.payDuesTitle}>
                                Paying for {payingCustomer?.name || payingCustomer?.customer_name}
                            </Text>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Amount to Pay (₹)</Text>
                                <TextInput
                                    style={styles.fieldInput}
                                    value={payFormData.amount}
                                    onChangeText={(v) => setPayFormData({ ...payFormData, amount: v })}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Payment Method</Text>
                            <View style={styles.methodRow}>
                                {['cash', 'upi', 'card'].map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.methodTab,
                                            payFormData.method === m && styles.methodTabActive
                                        ]}
                                        onPress={() => setPayFormData({ ...payFormData, method: m })}
                                    >
                                        <Text style={[
                                            styles.methodText,
                                            payFormData.method === m && styles.methodTextActive
                                        ]}>{m.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setPayModalVisible(false)}>
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnPrimary, { flex: 1.5 }]} onPress={handlePayDue}>
                                <Ionicons name="checkmark" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnPrimaryText}>Record Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── DELETE CONFIRM MODAL ─── */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.deleteModal, { width: r.pick({ small: '90%', medium: 400, large: 400, xlarge: 400 }) }]}>
                        <View style={styles.deleteIconBox}>
                            <Ionicons name="warning-outline" size={32} color={COLORS.error} />
                        </View>
                        <Text style={styles.deleteTitle}>Delete Customer?</Text>
                        <Text style={styles.deleteDesc}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {deletingCustomer?.customer_name || deletingCustomer?.name || 'this customer'}
                            </Text>
                            ? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={[styles.btnSecondary, { flex: 1 }]}
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setDeletingCustomer(null);
                                }}
                            >
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnDanger, { flex: 1 }]}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnDangerText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── STYLES ─────────────────────────────────────
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Filter Bar
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        marginBottom: 10,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        paddingHorizontal: 8,
        height: 32,
        gap: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textPrimary,
        height: '100%',
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
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
    tableRowAlt: {
        backgroundColor: '#F8FAF9',
    },
    cell: {
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        height: '100%',
    },
    cellName: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    cellText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    cellDue: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    cellDueActive: {
        color: COLORS.error,
    },
    actionsCell: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
    },
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
    actionBtnDanger: {
        backgroundColor: COLORS.errorLight,
        borderColor: COLORS.error,
    },
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 8,
        opacity: 0.20,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    // Form / Fields
    fieldContainer: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    fieldInput: {
        backgroundColor: COLORS.bgInput,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 2,
        paddingHorizontal: 8,
        height: 34,
        fontSize: 12,
        color: COLORS.textPrimary,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    fieldInputMultiline: {
        minHeight: 60,
        textAlignVertical: 'top',
        paddingVertical: 6,
    },
    fieldInputDisabled: {
        backgroundColor: COLORS.bgSurface,
        color: COLORS.textMuted,
    },
    // Buttons (Flat POS style)
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
    btnPrimaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
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
    btnSecondaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
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
    btnDangerText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    modalCard: {
        backgroundColor: COLORS.white,
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: COLORS.bgSurface,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalIcon: {
        width: 28,
        height: 28,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    modalCloseBtn: {
        width: 24,
        height: 24,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        padding: 16,
    },
    formGrid: {
        gap: 10,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 8,
        padding: 16,
        backgroundColor: COLORS.bgSurface,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
    },
    // Delete Modal
    deleteModal: {
        backgroundColor: COLORS.white,
        borderRadius: 3,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        padding: 20,
        alignItems: 'center',
    },
    deleteIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: COLORS.error,
    },
    deleteTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    deleteDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    // Pay Due
    payDuesTitle: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    methodRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    methodTab: {
        flex: 1,
        height: 34,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgInput,
    },
    methodTabActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
    },
    methodText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    methodTextActive: {
        color: COLORS.primary,
    },
});
