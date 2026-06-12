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
import { COLORS } from '../constants/theme';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { useResponsive } from '../utils/responsive';

const EMPTY_FORM = {
    name: '',
    contact_person: '',
    phone_no: '',
    email: '',
    address: '',
};

// ─── FORM FIELD COMPONENT ───────────────────────
const FormField = ({ label, value, onChangeText, placeholder, keyboardType, multiline, required, editable = true, autoCapitalize = "sentences", autoCorrect = true, textContentType, autoComplete }) => (
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
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            textContentType={textContentType}
            autoComplete={autoComplete}
            {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
        />
    </View>
);

export default function SupplierScreen({ navigation }) {
    const r = useResponsive();

    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Delete confirm state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingSupplier, setDeletingSupplier] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ─── RIGHT PANEL: Required medicines + dispatch ───
    const [medicines, setMedicines] = useState([]);
    const [medLoading, setMedLoading] = useState(false);
    const [selectedMeds, setSelectedMeds] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [sending, setSending] = useState(false);
    const [medFilterDate, setMedFilterDate] = useState('');

    // ─── FETCH SUPPLIERS ────────────────────────────
    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/supplier/get');
            const list = response?.data?.data ?? [];
            setSuppliers(Array.isArray(list) ? list : []);
        } catch (err) {
            console.log('Failed to fetch suppliers:', err.message);
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    // ─── FETCH REQUIRED MEDICINES ───────────────────
    const fetchMedicines = useCallback(async (dateFilter) => {
        setMedLoading(true);
        try {
            let url = '/required-medicine/get?status=pending';
            if (dateFilter) url += `&date=${dateFilter}`;
            const res = await api.get(url);
            setMedicines(res?.data?.data ?? []);
        } catch (err) {
            console.warn('Fetch medicines failed:', err.message);
        } finally {
            setMedLoading(false);
        }
    }, []);

    useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

    // ─── SEARCH ─────────────────────────────────────
    useEffect(() => {
        let result = [...suppliers];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (s) =>
                    (s.name || '').toLowerCase().includes(q) ||
                    (s.contact_person || '').toLowerCase().includes(q) ||
                    (s.phone_no || '').toLowerCase().includes(q) ||
                    (s.email || '').toLowerCase().includes(q)
            );
        }
        setFilteredSuppliers(result);
    }, [suppliers, searchQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSuppliers();
        setRefreshing(false);
    };

    // ─── MODAL HANDLERS ─────────────────────────────
    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setModalMode('add');
        setModalVisible(true);
    };

    const openEditModal = (s) => {
        setFormData({
            name: s.name || '',
            contact_person: s.contact_person || '',
            phone_no: s.phone_no || '',
            email: s.email || '',
            address: s.address || '',
        });
        setEditingId(s._id || s.id);
        setModalMode('edit');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setFormData(EMPTY_FORM);
        setEditingId(null);
    };

    // ─── SAVE ───────────────────────────────────────
    const handleSave = async () => {
        if (!formData.name.trim()) { Alert.alert('Validation', 'Supplier name is required.'); return; }
        if (!formData.phone_no.trim()) { Alert.alert('Validation', 'Phone number is required.'); return; }

        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                contact_person: formData.contact_person.trim(),
                phone_no: formData.phone_no.trim(),
                email: formData.email.trim(),
                address: formData.address.trim(),
            };
            if (modalMode === 'edit' && editingId) {
                await api.put(`/supplier/update/${editingId}`, payload);
            } else {
                await api.post('/supplier/create', payload);
            }
            closeModal();
            await fetchSuppliers();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    // ─── DELETE ─────────────────────────────────────
    const confirmDelete = (s) => { setDeletingSupplier(s); setDeleteModalVisible(true); };

    const handleDelete = async () => {
        if (!deletingSupplier) return;
        setDeleting(true);
        try {
            await api.delete(`/supplier/delete/${deletingSupplier._id || deletingSupplier.id}`);
            setDeleteModalVisible(false);
            setDeletingSupplier(null);
            await fetchSuppliers();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete supplier');
        } finally {
            setDeleting(false);
        }
    };

    // ─── MEDICINE SELECTION ─────────────────────────
    const toggleMedSelection = (id) => {
        setSelectedMeds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const selectAllMeds = () => {
        if (selectedMeds.length === medicines.length) {
            setSelectedMeds([]);
        } else {
            setSelectedMeds(medicines.map(m => m._id));
        }
    };

    // ─── SEND ORDER EMAIL ───────────────────────────
    const handleSendOrder = async () => {
        if (selectedMeds.length === 0) {
            Alert.alert('Selection Required', 'Please select at least one medicine.');
            return;
        }
        if (!selectedSupplier) {
            Alert.alert('Supplier Required', 'Please select a supplier from the list on the left by tapping its row.');
            return;
        }
        if (!selectedSupplier.email) {
            Alert.alert('No Email', `Supplier "${selectedSupplier.name}" does not have an email address. Please edit the supplier and add one.`);
            return;
        }

        setSending(true);
        try {
            const payload = { supplierId: selectedSupplier._id, medicineIds: selectedMeds };
            const res = await api.post('/required-medicine/send-order', payload);
            Alert.alert('Success', res?.data?.message || 'Order dispatched!');
            setSelectedMeds([]);
            setSelectedSupplier(null);
            fetchMedicines(medFilterDate || undefined);
        } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to send order.');
        } finally {
            setSending(false);
        }
    };

    // ─── RENDER SUPPLIER ROW ────────────────────────
    const renderSupplier = ({ item, index }) => {
        const isActive = selectedSupplier?._id === item._id;
        return (
            <TouchableOpacity
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt, isActive && styles.tableRowActive]}
                onPress={() => setSelectedSupplier(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.cell, { flex: 2 }]}>
                    <Text style={styles.cellName} numberOfLines={1}>{item.name || '—'}</Text>
                </View>
                <View style={[styles.cell, { flex: 1.5, alignItems: 'center' }]}>
                    <Text style={styles.cellText} numberOfLines={1}>{item.contact_person || '—'}</Text>
                </View>
                <View style={[styles.cell, { flex: 1.5, alignItems: 'center' }]}>
                    <Text style={styles.cellText}>{item.phone_no || '—'}</Text>
                </View>
                <View style={[styles.cell, styles.actionsCell, { flex: 1, borderRightWidth: 0 }]}>
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
            {/* Two-column layout */}
            <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>

                {/* ═══════ LEFT: Supplier CRUD ═══════ */}
                <View style={{ flex: 2.5 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>Suppliers</Text>
                            <Text style={styles.headerSub}>{suppliers.length} total suppliers</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.btnPrimary} onPress={openAddModal}>
                                <Ionicons name="add-circle-outline" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnPrimaryText}>Add Supplier</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search */}
                    <View style={styles.filterBar}>
                        <View style={[styles.searchBox, { minWidth: 280 }]}>
                            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search suppliers..."
                                placeholderTextColor={COLORS.textMuted}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Table */}
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <View style={[styles.thCell, { flex: 2 }]}>
                                <Text style={styles.th}>Supplier Name</Text>
                            </View>
                            <View style={[styles.thCell, { flex: 1.5, alignItems: 'center' }]}>
                                <Text style={styles.th}>Contact Person</Text>
                            </View>
                            <View style={[styles.thCell, { flex: 1.5, alignItems: 'center' }]}>
                                <Text style={styles.th}>Phone</Text>
                            </View>
                            <View style={[styles.thCell, { flex: 1, alignItems: 'center', borderRightWidth: 0 }]}>
                                <Text style={styles.th}>Actions</Text>
                            </View>
                        </View>

                        {loading ? (
                            <View style={{ flex: 1, padding: 12, gap: 8 }}>
                                {[...Array(6)].map((_, i) => (
                                    <View key={i} style={[styles.tableRow, { height: 46, paddingHorizontal: 12 }]}>
                                        <Skeleton width="30%" height={14} style={{ flex: 2 }} />
                                        <Skeleton width="20%" height={14} style={{ flex: 1.5, alignSelf: 'center' }} />
                                        <Skeleton width="20%" height={14} style={{ flex: 1.5, alignSelf: 'center' }} />
                                        <Skeleton width="15%" height={20} style={{ flex: 1, alignSelf: 'center', marginLeft: 16 }} />
                                    </View>
                                ))}
                            </View>
                        ) : filteredSuppliers.length > 0 ? (
                            <FlatList
                                data={filteredSuppliers}
                                keyExtractor={(item, i) => item._id || item.id || String(i)}
                                renderItem={renderSupplier}
                                showsVerticalScrollIndicator={false}
                                onRefresh={onRefresh}
                                refreshing={refreshing}
                            />
                        ) : (
                            <View style={styles.centerBox}>
                                <Ionicons name="business-outline" size={44} color={COLORS.border} />
                                <Text style={styles.emptyText}>
                                    {searchQuery ? 'No suppliers match your search' : 'No suppliers yet'}
                                </Text>
                                {!searchQuery && (
                                    <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10 }]} onPress={openAddModal}>
                                        <Text style={styles.btnPrimaryText}>Add First Supplier</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* ═══════ RIGHT: Medicine Select & Send ═══════ */}
                <View style={{ flex: 1.5, borderLeftWidth: 0.5, borderLeftColor: COLORS.border, paddingLeft: 10 }}>
                    {/* Selected Supplier Badge */}
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '500', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            SEND ORDER TO
                        </Text>
                        {selectedSupplier ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryGhost, borderWidth: 0.5, borderColor: COLORS.primary, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 6, gap: 6 }}>
                                <Ionicons name="business-outline" size={14} color={COLORS.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }} numberOfLines={1}>{selectedSupplier.name}</Text>
                                    <Text style={{ fontSize: 10, color: COLORS.textMuted }} numberOfLines={1}>{selectedSupplier.email || 'No email'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedSupplier(null)}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: COLORS.bgInput, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 8 }}>
                                <Text style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>← Select a supplier from the table</Text>
                            </View>
                        )}
                    </View>

                    {/* Date filter */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <TextInput
                            style={{
                                flex: 1, height: 30, backgroundColor: COLORS.bgInput, borderWidth: 0.5,
                                borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 8, fontSize: 11,
                                color: COLORS.textPrimary,
                                ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
                            }}
                            value={medFilterDate}
                            onChangeText={setMedFilterDate}
                            placeholder="Filter by date (YYYY-MM-DD)"
                            placeholderTextColor={COLORS.textMuted}
                            onSubmitEditing={() => fetchMedicines(medFilterDate || undefined)}
                        />
                        <TouchableOpacity
                            style={{ height: 30, paddingHorizontal: 8, backgroundColor: COLORS.primary, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => fetchMedicines(medFilterDate || undefined)}
                        >
                            <Ionicons name="funnel-outline" size={14} color="#fff" />
                        </TouchableOpacity>
                        {medFilterDate ? (
                            <TouchableOpacity
                                style={{ height: 30, paddingHorizontal: 8, borderWidth: 0.5, borderColor: COLORS.error, backgroundColor: COLORS.errorLight, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => { setMedFilterDate(''); fetchMedicines(); }}
                            >
                                <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.error }}>Clear</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Select all bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <TouchableOpacity onPress={selectAllMeds} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons
                                name={medicines.length > 0 && selectedMeds.length === medicines.length ? 'checkbox' : 'square-outline'}
                                size={16}
                                color={COLORS.primary}
                            />
                            <Text style={{ fontSize: 10, fontWeight: '500', color: COLORS.textSecondary }}>
                                {selectedMeds.length > 0 ? `${selectedMeds.length} selected` : 'Select all'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{medicines.length} pending</Text>
                    </View>

                    {/* Medicine list */}
                    <View style={{ flex: 1, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
                        {/* List Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF2F1', height: 28, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border }}>
                            <Text style={{ fontSize: 10, fontWeight: '500', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>Medicine Name</Text>
                            <Text style={{ fontSize: 10, fontWeight: '500', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, width: 70, textAlign: 'center' }}>Date</Text>
                        </View>

                        {medLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
                        ) : medicines.length > 0 ? (
                            <FlatList
                                data={medicines}
                                keyExtractor={(item, i) => item._id || String(i)}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item, index }) => {
                                    const isSelected = selectedMeds.includes(item._id);
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
                                                index % 2 === 0 && { backgroundColor: '#F8FAF9' },
                                                isSelected && { backgroundColor: COLORS.primaryGhost },
                                            ]}
                                            onPress={() => toggleMedSelection(item._id)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={isSelected ? 'checkbox' : 'square-outline'}
                                                size={16}
                                                color={isSelected ? COLORS.primary : COLORS.border}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }} numberOfLines={1}>{item.name}</Text>
                                            <Text style={{ fontSize: 10, color: COLORS.textMuted, width: 70, textAlign: 'center' }}>
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, opacity: 0.3 }}>
                                <Ionicons name="document-text-outline" size={36} color={COLORS.border} />
                                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>No pending medicines</Text>
                            </View>
                        )}
                    </View>

                    {/* Send button */}
                    <TouchableOpacity
                        style={[
                            styles.btnPrimary,
                            { marginTop: 8, height: 36, backgroundColor: '#059669', borderColor: '#059669', gap: 6 },
                            (selectedMeds.length === 0 || !selectedSupplier) && { opacity: 0.4 },
                        ]}
                        onPress={handleSendOrder}
                        disabled={selectedMeds.length === 0 || !selectedSupplier || sending}
                        activeOpacity={0.7}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>
                                    Send Order ({selectedMeds.length})
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── ADD / EDIT MODAL ─── */}
            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { width: r.pick({ small: '95%', medium: '60%', large: '50%', xlarge: 500 }) }]}>
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
                                    {modalMode === 'edit' ? 'Edit Supplier' : 'Add New Supplier'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGrid}>
                                <FormField label="Supplier Name" value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. MedPharm Distributors" required />
                                <FormField label="Contact Person" value={formData.contact_person} onChangeText={(v) => setFormData({ ...formData, contact_person: v })} placeholder="e.g. John Doe" />
                                <FormField label="Phone Number" value={formData.phone_no} onChangeText={(v) => setFormData({ ...formData, phone_no: v })} placeholder="e.g. 9876543210" keyboardType="phone-pad" required />
                                <TextInput
                                    value={formData.email}
                                    onChangeText={(text) => {
                                        console.log(text);
                                        setFormData({ ...formData, email: text });
                                    }}
                                    style={{
                                        borderWidth: 1,
                                        padding: 10,
                                    }}
                                />
                                <FormField label="Address" value={formData.address} onChangeText={(v) => setFormData({ ...formData, address: v })} placeholder="e.g. 123 Medical Lane, City" multiline />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={closeModal}>
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }]} onPress={handleSave}>
                                <Ionicons name={modalMode === 'edit' ? 'checkmark' : 'add'} size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                                <Text style={styles.btnPrimaryText}>
                                    {modalMode === 'edit' ? 'Update Supplier' : 'Add Supplier'}
                                </Text>
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
                        <Text style={styles.deleteTitle}>Delete Supplier?</Text>
                        <Text style={styles.deleteDesc}>
                            Are you sure you want to delete{' '}
                            <Text style={{ fontWeight: '700' }}>{deletingSupplier?.name || 'this supplier'}</Text>
                            ? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => { setDeleteModalVisible(false); setDeletingSupplier(null); }}>
                                <Text style={styles.btnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnDanger, { flex: 1 }]} onPress={handleDelete}>
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
    container: { flex: 1, backgroundColor: COLORS.bgDark, padding: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, marginBottom: 10 },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    filterBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, marginBottom: 10 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border, paddingHorizontal: 8, height: 32, gap: 6 },
    searchInput: { flex: 1, fontSize: 12, color: COLORS.textPrimary, height: '100%', paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
    tableContainer: { flex: 1, backgroundColor: COLORS.white, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#EFF2F1', height: 34, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
    thCell: { justifyContent: 'center', paddingHorizontal: 10, borderRightWidth: 0.5, borderRightColor: COLORS.border, height: '100%' },
    th: { fontSize: 10, fontWeight: '500', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', alignItems: 'stretch', height: 46, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
    tableRowAlt: { backgroundColor: '#F8FAF9' },
    tableRowActive: { backgroundColor: COLORS.primaryGhost, borderLeftWidth: 2, borderLeftColor: COLORS.primary },
    cell: { justifyContent: 'center', paddingHorizontal: 10, borderRightWidth: 0.5, borderRightColor: COLORS.border, height: '100%' },
    cellName: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
    cellText: { fontSize: 12, color: COLORS.textSecondary },
    actionsCell: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRightWidth: 0.5, borderRightColor: COLORS.border },
    actionBtn: { width: 28, height: 28, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
    actionBtnDanger: { backgroundColor: COLORS.errorLight, borderColor: COLORS.error },
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, opacity: 0.20 },
    emptyText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
    fieldContainer: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
    fieldInput: { backgroundColor: COLORS.bgInput, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 8, height: 34, fontSize: 12, color: COLORS.textPrimary, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
    fieldInputMultiline: { minHeight: 60, textAlignVertical: 'top', paddingVertical: 6 },
    fieldInputDisabled: { backgroundColor: COLORS.bgSurface, color: COLORS.textMuted },
    btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, paddingHorizontal: 12, borderRadius: 2, backgroundColor: COLORS.primary, borderWidth: 0.5, borderColor: COLORS.primary },
    btnPrimaryText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
    btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, paddingHorizontal: 12, borderRadius: 2, backgroundColor: COLORS.white, borderWidth: 0.5, borderColor: COLORS.border },
    btnSecondaryText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    btnDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, paddingHorizontal: 12, borderRadius: 2, backgroundColor: COLORS.error, borderWidth: 0.5, borderColor: COLORS.error },
    btnDangerText: { fontSize: 12, fontWeight: '600', color: COLORS.white },
    modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { backgroundColor: COLORS.white, borderRadius: 3, borderWidth: 0.5, borderColor: COLORS.border, overflow: 'hidden', maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.bgSurface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalIcon: { width: 28, height: 28, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
    modalCloseBtn: { width: 24, height: 24, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    modalBody: { padding: 16 },
    formGrid: { gap: 10 },
    modalFooter: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: COLORS.bgSurface, borderTopWidth: 0.5, borderTopColor: COLORS.border },
    deleteModal: { backgroundColor: COLORS.white, borderRadius: 3, borderWidth: 0.5, borderColor: COLORS.border, padding: 20, alignItems: 'center' },
    deleteIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 0.5, borderColor: COLORS.error },
    deleteTitle: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    deleteDesc: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    deleteActions: { flexDirection: 'row', gap: 8, width: '100%' },
});
