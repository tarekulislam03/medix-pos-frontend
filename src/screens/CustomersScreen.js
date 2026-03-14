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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    payCustomerDue,
} from '../services/customerService';
import { useResponsive } from '../utils/responsive';

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
                    {hasDue && (
                        <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>Unpaid</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.cell, styles.actionsCell, { flex: 1.5 }]}>
                    {hasDue && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: COLORS.successLight }]}
                            onPress={() => openPayModal(item)}
                            title="Clear Dues"
                        >
                            <Ionicons name="wallet-outline" size={20} color={COLORS.success} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openEditModal(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
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
                    <GradientButton
                        title="Add Customer"
                        onPress={openAddModal}
                        icon={<Ionicons name="add-circle-outline" size={22} color={COLORS.white} />}
                    />
                </View>
            </View>

            {/* ─── FILTER/SEARCH BAR ─── */}
            <View style={[styles.filterBar, r.isSmall && { flexDirection: 'column', alignItems: 'stretch' }]}>
                {/* Search */}
                <View style={[styles.searchBox, r.isSmall ? { width: '100%' } : { minWidth: 280 }]}>
                    <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search customers..."
                        placeholderTextColor={COLORS.textMuted}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ─── TABLE ─── */}
            <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Customer Name</Text>
                    <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Phone</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Due Balance</Text>
                    <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Body */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.emptyText}>Loading customers...</Text>
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
                        <Ionicons name="people-outline" size={56} color={COLORS.border} />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No customers match your search' : 'No customers yet'}
                        </Text>
                        {!searchQuery && (
                            <GradientButton
                                title="Add First Customer"
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
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '60%', large: '50%', xlarge: 500 }) }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={[styles.modalIcon, {
                                    backgroundColor: modalMode === 'edit' ? COLORS.warningLight : COLORS.primaryGhost
                                }]}>
                                    <Ionicons
                                        name={modalMode === 'edit' ? 'create-outline' : 'person-add-outline'}
                                        size={22}
                                        color={modalMode === 'edit' ? COLORS.warning : COLORS.primary}
                                    />
                                </View>
                                <Text style={styles.modalTitle}>
                                    {modalMode === 'edit' ? 'Edit Customer' : 'Add New Customer'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
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
                            <GradientButton
                                title="Cancel"
                                variant="secondary"
                                onPress={closeModal}
                                style={{ flex: 1 }}
                            />
                            <GradientButton
                                title={modalMode === 'edit' ? 'Update Customer' : 'Add Customer'}
                                onPress={handleSave}
                                loading={saving}
                                icon={<Ionicons name={modalMode === 'edit' ? 'checkmark' : 'add'} size={20} color={COLORS.white} />}
                                style={{ flex: 2 }}
                            />
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
                                    <Ionicons name="wallet-outline" size={22} color={COLORS.success} />
                                </View>
                                <Text style={styles.modalTitle}>Clear Dues</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPayModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
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

                            <Text style={[styles.fieldLabel, { marginBottom: SPACING.sm }]}>Payment Method</Text>
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
                            <GradientButton
                                title="Cancel"
                                variant="secondary"
                                onPress={() => setPayModalVisible(false)}
                                style={{ flex: 1 }}
                            />
                            <GradientButton
                                title="Record Payment"
                                onPress={handlePayDue}
                                loading={paying}
                                icon={<Ionicons name="checkmark" size={20} color={COLORS.white} />}
                                style={{ flex: 1.5 }}
                            />
                        </View>
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
                        <Text style={styles.deleteTitle}>Delete Customer?</Text>
                        <Text style={styles.deleteDesc}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontWeight: '700' }}>
                                {deletingCustomer?.customer_name || deletingCustomer?.name || 'this customer'}
                            </Text>
                            ? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <GradientButton
                                title="Cancel"
                                variant="secondary"
                                onPress={() => {
                                    setDeleteModalVisible(false);
                                    setDeletingCustomer(null);
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
    },

    // Filter Bar
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
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
    },
    cellText: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    cellDue: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    cellDueActive: {
        color: COLORS.error,
    },
    dueBadge: {
        marginTop: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.errorLight,
    },
    dueBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.error,
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

    // Form
    fieldContainer: {
        marginBottom: SPACING.lg,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    fieldInput: {
        backgroundColor: COLORS.bgInput,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        minHeight: 48,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    modalCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        maxHeight: '90%',
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.xl,
        backgroundColor: COLORS.bgSurface,
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
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        padding: SPACING.xl,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: SPACING.md,
        padding: SPACING.xl,
        backgroundColor: COLORS.bgSurface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    formGrid: {
        gap: SPACING.md,
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.errorLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    deleteTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    deleteDesc: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xxl,
        lineHeight: 24,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: SPACING.md,
        width: '100%',
    },

    // Pay Due Styles
    payDuesTitle: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
    },
    methodRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    methodTab: {
        flex: 1,
        height: 44,
        borderRadius: RADIUS.md,
        borderWidth: 1,
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
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    methodTextActive: {
        color: COLORS.primary,
    },
});
