import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    TextInput,
    Platform,
    Modal,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../services/expenseService';
import { useResponsive } from '../utils/responsive';
import api from '../services/api';

const CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Inventory', 'Maintenance', 'Marketing', 'Miscellaneous'];
const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank'];

export default function ExpensesScreen() {
    const r = useResponsive();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthlySalesProfit, setMonthlySalesProfit] = useState(0);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const data = await getExpenses();
            setExpenses(data);

            const monthReq = await api.get('/sales/monthly').catch(e => null);
            if (monthReq && monthReq.data && monthReq.data.data) {
                setMonthlySalesProfit(monthReq.data.data.total_profit || 0);
            }
        } catch (error) {
            console.error('Failed to fetch expenses', error);
            if (Platform.OS === 'web') window.alert("Failed to load expenses.");
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentId(null);
        setTitle('');
        setAmount('');
        setCategory(CATEGORIES[0]);
        setPaymentMethod(PAYMENT_METHODS[0]);
        setNotes('');
        setModalVisible(true);
    };

    const openEditModal = (expense) => {
        setIsEditing(true);
        setCurrentId(expense._id);
        setTitle(expense.title);
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setPaymentMethod(expense.payment_method);
        setNotes(expense.notes || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !amount.trim()) {
            if (Platform.OS === 'web') window.alert("Title and amount are required.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: title.trim(),
                amount: Number(amount),
                category,
                payment_method: paymentMethod,
                notes: notes.trim()
            };

            if (isEditing) {
                await updateExpense(currentId, payload);
            } else {
                await addExpense(payload);
            }
            
            setModalVisible(false);
            fetchExpenses();
        } catch (error) {
            console.error('Failed to save expense', error);
            if (Platform.OS === 'web') window.alert("Failed to save expense.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this expense?")) {
                executeDelete(id);
            }
        }
    };

    const executeDelete = async (id) => {
        try {
            await deleteExpense(id);
            fetchExpenses();
        } catch (error) {
            console.error('Failed to delete expense', error);
        }
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netProfit = monthlySalesProfit - totalExpenses;

    const renderItem = ({ item, index }) => (
        <View style={styles.tableRow}>
            <View style={[styles.tdCell, { flex: 1.2 }]}>
                <Text style={styles.tdValue}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.tdCell, { flex: 2.5 }]}>
                <Text style={styles.tdName} numberOfLines={2}>{item.title}</Text>
                {item.notes ? <Text style={styles.tdSubtext} numberOfLines={1}>{item.notes}</Text> : null}
            </View>
            <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.category}</Text>
                </View>
            </View>
            <View style={[styles.tdCell, { flex: 1.2, alignItems: 'center' }]}>
                <Text style={[styles.tdValue, { textTransform: 'uppercase' }]}>{item.payment_method}</Text>
            </View>
            <View style={[styles.tdCell, { flex: 1.5, alignItems: 'flex-end' }]}>
                <Text style={[styles.tdValue, { fontWeight: '700', color: COLORS.error }]}>₹{Number(item.amount).toFixed(2)}</Text>
            </View>
            <View style={[styles.tdCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 12, borderRightWidth: 0 }]}>
                <TouchableOpacity onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)}>
                    <Ionicons name="trash" size={16} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Expense Tracking</Text>
                    <Text style={styles.headerSub}>Manage your shop and operational expenses</Text>
                </View>
                <TouchableOpacity
                    style={[styles.actionHeaderBtnPrimary, { height: r.isSmall ? 32 : 32, paddingHorizontal: r.isSmall ? 10 : 12 }]}
                    onPress={openAddModal}
                >
                    <Ionicons name="add-outline" size={16} color={COLORS.white} />
                    {!r.isSmall && <Text style={styles.actionHeaderBtnPrimaryText}>Add expense</Text>}
                </TouchableOpacity>
            </View>

            {/* Stats Cards Row */}
            <View style={[styles.statsRow, r.isSmall && { flexDirection: 'column' }]}>
                {/* Total Expenses */}
                <View style={[styles.statCard, { flex: 1 }]}>
                    <View style={styles.statHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                            <Ionicons name="trending-down" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statLabel}>TOTAL EXPENSES</Text>
                    </View>
                    <Text style={styles.statValue}>
                        ₹{totalExpenses.toFixed(2)}
                    </Text>
                </View>

                {/* Total Profit */}
                <View style={[styles.statCard, { flex: 1 }]}>
                    <View style={styles.statHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                            <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statLabel}>TOTAL PROFIT</Text>
                    </View>
                    <Text style={styles.statValue}>
                        ₹{monthlySalesProfit.toFixed(2)}
                    </Text>
                </View>

                {/* Actual Net Profit */}
                <View style={[styles.statCard, { flex: 1 }]}>
                    <View style={styles.statHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                            <Ionicons name={netProfit >= 0 ? "trending-up" : "trending-down"} size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statLabel}>NET PROFIT</Text>
                    </View>
                    <Text style={styles.statValue}>
                        ₹{netProfit.toFixed(2)}
                    </Text>
                </View>
            </View>

            {/* Table */}
            <View style={styles.historySection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Expense History</Text>
                </View>
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.th}>Date</Text></View>
                        <View style={[styles.thCell, { flex: 2.5 }]}><Text style={styles.th}>Title & Notes</Text></View>
                        <View style={[styles.thCell, { flex: 1.5, alignItems: 'center' }]}><Text style={styles.th}>Category</Text></View>
                        <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}><Text style={styles.th}>Payment</Text></View>
                        <View style={[styles.thCell, { flex: 1.5, alignItems: 'flex-end' }]}><Text style={styles.th}>Amount</Text></View>
                        <View style={[styles.thCell, { flex: 1, alignItems: 'center', borderRightWidth: 0 }]}><Text style={styles.th}>Actions</Text></View>
                    </View>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={expenses}
                            keyExtractor={(item) => item._id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            ListEmptyComponent={
                                <View style={styles.centerBox}>
                                    <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
                                    <Text style={styles.emptyText}>No expenses recorded yet.</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>

            {/* Add / Edit Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ padding: 24 }} contentContainerStyle={{ gap: 16 }}>
                            <View>
                                <Text style={styles.label}>Expense Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Shop Rent"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View>
                                <Text style={styles.label}>Amount (₹) *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View>
                                <Text style={styles.label}>Category</Text>
                                <View style={styles.chipContainer}>
                                    {CATEGORIES.map(cat => (
                                        <TouchableOpacity 
                                            key={cat} 
                                            style={[styles.chip, category === cat && styles.chipActive]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <Text style={styles.label}>Payment Method</Text>
                                <View style={styles.chipContainer}>
                                    {PAYMENT_METHODS.map(method => (
                                        <TouchableOpacity 
                                            key={method} 
                                            style={[styles.chip, paymentMethod === method && styles.chipActive]}
                                            onPress={() => setPaymentMethod(method)}
                                        >
                                            <Text style={[styles.chipText, paymentMethod === method && styles.chipTextActive]}>
                                                {method.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <Text style={styles.label}>Notes (Optional)</Text>
                                <TextInput
                                    style={[styles.input, { height: 80 }]}
                                    placeholder="Any additional details..."
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Expense'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 12, backgroundColor: COLORS.bgDark },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: COLORS.white, padding: 12, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border },
    headerTitle: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
    headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        flex: 1
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    statLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase' },
    statValue: { fontSize: 22, color: COLORS.textPrimary },

    historySection: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        paddingTop: 12,
        flex: 1
    },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'uppercase' },
    
    actionHeaderBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
        justifyContent: 'center',
    },
    actionHeaderBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    
    // ─── ENTERPRISE TABLE STYLES ───
    tableContainer: { flex: 1, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
    tableHeader: { flexDirection: 'row', backgroundColor: COLORS.borderLight, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, height: 28 },
    thCell: { paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: COLORS.border, justifyContent: 'center' },
    th: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
    tdCell: { paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 0.5, borderRightColor: COLORS.border, justifyContent: 'center' },
    tdName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
    tdValue: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
    tdSubtext: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
    badge: { alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, backgroundColor: COLORS.bgInput, borderWidth: 0.5, borderColor: COLORS.border },
    badgeText: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
    
    centerBox: { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 },
    emptyText: { fontSize: 12, color: '#6B807A', marginTop: 12 },
    
    // ─── ENTERPRISE MODAL STYLES ───
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 440, backgroundColor: COLORS.white, borderRadius: 4, maxHeight: '90%', borderWidth: 0.5, borderColor: COLORS.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.borderLight, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
    modalTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'uppercase' },
    label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
    input: { borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 2, padding: 8, fontSize: 13, color: COLORS.textPrimary, backgroundColor: COLORS.bgInput, marginBottom: 12 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
    chipTextActive: { color: COLORS.white },
    modalFooter: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.white, borderTopWidth: 0.5, borderTopColor: COLORS.border, gap: 12, justifyContent: 'flex-end' },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
    cancelBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 2, backgroundColor: COLORS.primary, minWidth: 100, alignItems: 'center' },
    saveBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white }
});
