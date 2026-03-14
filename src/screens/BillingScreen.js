import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Modal,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { searchProducts, processCheckout } from '../services/billingService';
import { searchCustomer, getCustomerLastPurchase, getCustomerCredit, payCustomerDue } from '../services/customerService';
import { getProductById, createProduct, getLoosePrice } from '../services/inventoryService';
import { printReceipt58mm } from '../utils/printReceipt';
import { useResponsive } from '../utils/responsive';

// ═══════════════════════════════════════════════
// INPUT MODAL COMPONENT  (keyboard / mouse friendly)
// ═══════════════════════════════════════════════
function NumpadModal({ visible, onClose, onConfirm, title, subtitle, unit, allowDecimal = false, maxValue = 9999 }) {
    const [value, setValue] = useState('');
    const inputRef = useRef(null);

    // Auto-focus when modal opens
    React.useEffect(() => {
        if (visible) {
            setValue('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [visible]);

    const handleChangeText = (text) => {
        // Allow only valid numeric input
        const cleaned = allowDecimal
            ? text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')   // one dot only
            : text.replace(/[^0-9]/g, '');
        const num = parseFloat(cleaned);
        if (cleaned === '' || cleaned === '.') { setValue(cleaned); return; }
        if (!isNaN(num) && num <= maxValue) setValue(cleaned);
    };

    const handleConfirm = () => {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0) onConfirm(num);
        setValue('');
    };

    const handleClose = () => {
        setValue('');
        onClose();
    };

    const isValid = value !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={npStyles.overlay}>
                <View style={npStyles.container}>
                    {/* Header */}
                    <View style={npStyles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={npStyles.title}>{title || 'Enter Value'}</Text>
                            {subtitle ? <Text style={npStyles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
                        </View>
                        <TouchableOpacity onPress={handleClose} style={npStyles.closeBtn}>
                            <Ionicons name="close" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Input field */}
                    <View style={npStyles.inputSection}>
                        <View style={npStyles.inputRow}>
                            <TextInput
                                ref={inputRef}
                                style={npStyles.textInput}
                                value={value}
                                onChangeText={handleChangeText}
                                placeholder="0"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
                                returnKeyType="done"
                                onSubmitEditing={isValid ? handleConfirm : undefined}
                                selectTextOnFocus
                                autoFocus
                            />
                            {unit ? <Text style={npStyles.unitLabel}>{unit}</Text> : null}
                        </View>
                        {maxValue < 9999 && (
                            <Text style={npStyles.limitHint}>Max: {maxValue}</Text>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={npStyles.actions}>
                        <TouchableOpacity style={npStyles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                            <Text style={npStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[npStyles.confirmBtn, !isValid && npStyles.confirmDisabled]}
                            onPress={handleConfirm}
                            disabled={!isValid}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="checkmark" size={22} color="#fff" />
                            <Text style={npStyles.confirmText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const npStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: Math.min(340, Dimensions.get('window').width * 0.85),
        maxWidth: 400,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.bgSurface,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },
    inputSection: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xl,
        backgroundColor: COLORS.bgSurface,
        alignItems: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
        width: '100%',
    },
    textInput: {
        flex: 1,
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.primary,
        paddingVertical: SPACING.md,
        textAlign: 'center',
        outlineStyle: 'none',
    },
    unitLabel: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginLeft: 4,
    },
    limitHint: {
        marginTop: 6,
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    actions: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    confirmBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    confirmDisabled: {
        backgroundColor: COLORS.border,
    },
    confirmText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: '#fff',
    },
});

// ═══════════════════════════════════════════════
// PAYMENT MODAL — collects cash received, handles credit/due
// ═══════════════════════════════════════════════
function PaymentModal({ visible, onClose, onConfirm, grandTotal, customerCredit = 0, customerName = '' }) {
    const [receivedStr, setReceivedStr] = useState('');
    const [addedDueStr, setAddedDueStr] = useState('');
    const receivedRef = useRef(null);
    const dueRef = useRef(null);

    // Reset whenever modal opens and auto-focus received field
    React.useEffect(() => {
        if (visible) {
            setReceivedStr('');
            setAddedDueStr('');
            setTimeout(() => receivedRef.current?.focus(), 150);
        }
    }, [visible]);

    const previousDueAdded = parseFloat(addedDueStr) || 0;
    const effectiveTotal = grandTotal + previousDueAdded;
    const receivedNum = parseFloat(receivedStr) || 0;
    const change = receivedNum - effectiveTotal;
    const due = effectiveTotal - receivedNum;

    // Allow confirming with 0 received or entered amount
    const canConfirm =
        effectiveTotal === 0 ||
        (receivedNum > 0 && receivedNum <= effectiveTotal);

    const handleReceivedChange = (text) => {
        const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        setReceivedStr(cleaned);
    };

    const handleDueChange = (text) => {
        const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        const num = parseFloat(cleaned);
        if (cleaned === '' || cleaned === '.') { setAddedDueStr(cleaned); return; }
        if (!isNaN(num) && num <= customerCredit) setAddedDueStr(cleaned);
        else if (!isNaN(num) && num > customerCredit) setAddedDueStr(customerCredit.toString());
    };

    const handleConfirm = () => {
        onConfirm({
            amount_paid: receivedNum,
            previous_due_payment: previousDueAdded,
            due_amount: Math.max(0, due),
            change_amount: Math.max(0, change),
        });
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={pmStyles.overlay}>
                <View style={[pmStyles.container, { paddingBottom: 6 }]}>

                    {/* Header */}
                    <View style={pmStyles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={pmStyles.headerTitle}>Collect Payment</Text>
                            {customerName ? (
                                <Text style={pmStyles.headerSub}>
                                    {customerName} <Text style={{ fontWeight: '700', color: COLORS.error }}>• Prev Due: ₹{customerCredit.toFixed(2)}</Text>
                                </Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={onClose} style={pmStyles.closeBtn}>
                            <Ionicons name="close" size={22} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 10 }} bouncing={false} showsVerticalScrollIndicator={false}>
                        {/* Grand Total Strip */}
                        <View style={pmStyles.totalStrip}>
                            <View style={pmStyles.totalStripItem}>
                                <Text style={pmStyles.stripLabel}>Current Bill</Text>
                                <Text style={pmStyles.stripValue}>₹{grandTotal.toFixed(2)}</Text>
                            </View>
                            <View style={[pmStyles.totalStripItem, pmStyles.totalStripMid]}>
                                <Text style={pmStyles.stripLabel}>Added Due</Text>
                                <Text style={[pmStyles.stripValue, previousDueAdded > 0 && { color: COLORS.error }]}>+₹{previousDueAdded.toFixed(2)}</Text>
                            </View>
                            <View style={[pmStyles.totalStripItem, pmStyles.totalStripLast]}>
                                <Text style={pmStyles.stripLabel}>Effective Total</Text>
                                <Text style={[pmStyles.stripValue, pmStyles.effectiveTotalVal]}>₹{effectiveTotal.toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* ── Keyboard Input Fields ── */}
                        <View style={pmStyles.fieldsSection}>
                            {/* Cash Received */}
                            <View style={pmStyles.fieldGroup}>
                                <Text style={pmStyles.fieldLabel}>Cash Received</Text>
                                <View style={pmStyles.fieldInputWrap}>
                                    <Text style={pmStyles.currencySymbol}>₹</Text>
                                    <TextInput
                                        ref={receivedRef}
                                        style={pmStyles.fieldInput}
                                        value={receivedStr}
                                        onChangeText={handleReceivedChange}
                                        placeholder="0.00"
                                        placeholderTextColor={COLORS.textMuted}
                                        keyboardType="decimal-pad"
                                        returnKeyType="next"
                                        onSubmitEditing={() => customerCredit > 0 && dueRef.current?.focus()}
                                        selectTextOnFocus
                                    />
                                </View>
                            </View>

                            {/* Pay Previous Due — only if customer has credit */}
                            {customerCredit > 0 && (
                                <View style={pmStyles.fieldGroup}>
                                    <Text style={pmStyles.fieldLabel}>
                                        Pay Previous Due
                                        <Text style={{ color: COLORS.textMuted }}> (max ₹{customerCredit.toFixed(2)})</Text>
                                    </Text>
                                    <View style={[pmStyles.fieldInputWrap, pmStyles.fieldInputWrapDue]}>
                                        <Text style={pmStyles.currencySymbol}>₹</Text>
                                        <TextInput
                                            ref={dueRef}
                                            style={pmStyles.fieldInput}
                                            value={addedDueStr}
                                            onChangeText={handleDueChange}
                                            placeholder="0.00"
                                            placeholderTextColor={COLORS.textMuted}
                                            keyboardType="decimal-pad"
                                            returnKeyType="done"
                                            selectTextOnFocus
                                        />
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Live change / due status stripe */}
                        <View style={pmStyles.statusStripe}>
                            {receivedNum > 0 ? (
                                change >= 0 ? (
                                    <View style={pmStyles.changeBadge}>
                                        <Ionicons name="arrow-up-circle" size={18} color="#16A34A" />
                                        <Text style={pmStyles.changeText}>Change: ₹{change.toFixed(2)}</Text>
                                    </View>
                                ) : (
                                    <View style={[pmStyles.changeBadge, pmStyles.dueBadge]}>
                                        <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                                        <Text style={pmStyles.dueText}>Short by: ₹{due.toFixed(2)}</Text>
                                    </View>
                                )
                            ) : (
                                <Text style={pmStyles.statusHint}>Type the cash amount received from customer</Text>
                            )}
                        </View>

                        {/* Quick-fill buttons */}
                        <View style={pmStyles.quickFill}>
                            {[50, 100, 200, 500].map(amt => (
                                <TouchableOpacity
                                    key={amt}
                                    style={pmStyles.quickBtn}
                                    onPress={() => setReceivedStr(String(amt))}
                                >
                                    <Text style={pmStyles.quickBtnText}>₹{amt}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[pmStyles.quickBtn, pmStyles.exactBtn]}
                                onPress={() => setReceivedStr(effectiveTotal.toFixed(2))}
                            >
                                <Text style={[pmStyles.quickBtnText, { color: COLORS.primary }]}>Exact</Text>
                            </TouchableOpacity>
                            {customerCredit > 0 && (
                                <TouchableOpacity
                                    style={[pmStyles.quickBtn, pmStyles.exactBtn]}
                                    onPress={() => {
                                        setAddedDueStr(customerCredit.toString());
                                        const total = grandTotal + customerCredit;
                                        if (receivedNum < total) setReceivedStr(total.toFixed(2));
                                    }}
                                >
                                    <Text style={[pmStyles.quickBtnText, { color: COLORS.error }]}>Clear Due</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Confirm */}
                        <View style={pmStyles.actions}>
                            <TouchableOpacity style={pmStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={pmStyles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[pmStyles.confirmBtn, !canConfirm && pmStyles.confirmDisabled]}
                                onPress={handleConfirm}
                                disabled={!canConfirm}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                <Text style={pmStyles.confirmText}>
                                    {due > 0 && receivedNum > 0 ? `Confirm (Due ₹${due.toFixed(2)})` : 'Confirm Payment'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const pmStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center' },
    container: {
        width: Math.min(420, Dimensions.get('window').width * 0.9),
        maxHeight: Dimensions.get('window').height * 0.88,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    },
    headerTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
    headerSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
    closeBtn: {
        width: 30, height: 30, borderRadius: RADIUS.full,
        backgroundColor: COLORS.bgSurface, alignItems: 'center', justifyContent: 'center',
    },
    // Total strip
    totalStrip: {
        flexDirection: 'row', backgroundColor: COLORS.bgSurface,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    totalStripItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    totalStripMid: { borderLeftWidth: 1, borderLeftColor: COLORS.borderLight },
    totalStripLast: { borderLeftWidth: 1, borderLeftColor: COLORS.border },
    stripLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
    stripValue: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.textPrimary, marginTop: 1 },
    effectiveTotalVal: { color: COLORS.primary, fontSize: FONT_SIZES.lg },
    // Keyboard input fields
    fieldsSection: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        gap: SPACING.md,
    },
    fieldGroup: {
        gap: 4,
    },
    fieldLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        backgroundColor: COLORS.primaryGhost,
    },
    fieldInputWrapDue: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.errorLight,
    },
    currencySymbol: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '700',
        color: COLORS.primary,
        paddingRight: 4,
    },
    fieldInput: {
        flex: 1,
        fontSize: FONT_SIZES.xl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        paddingVertical: 10,
        outlineStyle: 'none',
    },
    // Legacy / Keep for compatibility
    inputsRow: { flexDirection: 'row' },
    inputBox: { flex: 1 },
    inputBoxActive: {},
    displayLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
    displayValue: { fontSize: 32, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 1 },
    // Status Stripe
    statusStripe: {
        alignItems: 'center', paddingVertical: 6,
        backgroundColor: COLORS.bgSurface,
        minHeight: 34,
        justifyContent: 'center'
    },
    statusHint: { fontSize: FONT_SIZES.xs, fontWeight: '500', color: COLORS.textMuted },
    changeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#dcfce7', paddingHorizontal: SPACING.sm, paddingVertical: 3,
        borderRadius: RADIUS.full,
    },
    changeText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#16A34A' },
    dueBadge: { backgroundColor: COLORS.errorLight },
    dueText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.error },
    // Quick fill
    quickFill: {
        flexDirection: 'row', gap: 5, flexWrap: 'wrap',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: COLORS.bgSurface,
        borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    },
    quickBtn: {
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', backgroundColor: COLORS.white,
    },
    exactBtn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGhost },
    quickBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
    // Actions
    actions: {
        flexDirection: 'row', padding: 6, gap: 6,
        borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    },
    cancelBtn: {
        flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
        borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    },
    cancelText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
    confirmBtn: {
        flex: 2.5, flexDirection: 'row', paddingVertical: 10, borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    confirmDisabled: { backgroundColor: COLORS.border },
    confirmText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#fff' },
});




export default function BillingScreen({ navigation }) {
    const r = useResponsive();
    // Search Products
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Customer Selection
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerCredit, setCustomerCredit] = useState(0);   // outstanding due balance

    // Cart
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // Payment Modal (credit/due system)
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    // Print / Save modal
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const savedInvoiceRef = useRef(null);

    // Last Purchase Custom Modal
    const [lastPurchaseModalVisible, setLastPurchaseModalVisible] = useState(false);
    const [pendingLastItems, setPendingLastItems] = useState(null);

    // Free / Manual Entry Row (for unlisted medicines)
    const [showFreeEntry, setShowFreeEntry] = useState(false);
    const [freeEntry, setFreeEntry] = useState({ name: '', mrp: '', stock: '' });
    const [freeEntryLoading, setFreeEntryLoading] = useState(false);


    const searchTimeout = useRef(null);
    const customerSearchTimeout = useRef(null);
    const searchInputRef = useRef(null);

    // ─── KEEP FOCUS ON SEARCH INPUT ──────────────────────
    // Always re-focus the barcode/product search input unless an
    // explicit interactive element (input, textarea, select) was clicked.
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const refocus = () => {
            setTimeout(() => {
                const active = document.activeElement;
                const tag = active?.tagName?.toLowerCase();
                // If another input/textarea/select is focused, don't steal focus
                if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
                searchInputRef.current?.focus();
            }, 0);
        };

        document.addEventListener('click', refocus, true);
        return () => document.removeEventListener('click', refocus, true);
    }, []);

    // Re-focus search input when modals close
    useEffect(() => {
        if (!paymentModalVisible && !printModalVisible && !lastPurchaseModalVisible && !showFreeEntry) {
            const t = setTimeout(() => searchInputRef.current?.focus(), 200);
            return () => clearTimeout(t);
        }
    }, [paymentModalVisible, printModalVisible, lastPurchaseModalVisible, showFreeEntry]);

    // ─── SEARCH CUSTOMERS ──────────────────────────
    const handleCustomerSearch = useCallback((query) => {
        setCustomerQuery(query);
        if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);

        if (!query.trim()) {
            setCustomerResults([]);
            setShowCustomerDropdown(false);
            return;
        }

        customerSearchTimeout.current = setTimeout(async () => {
            setCustomerLoading(true);
            try {
                const response = await searchCustomer(query.trim());
                const list = response?.data ?? response ?? [];
                // top 5 recommendations
                setCustomerResults(Array.isArray(list) ? list.slice(0, 5) : []);
                setShowCustomerDropdown(true);
            } catch {
                setCustomerResults([]);
            } finally {
                setCustomerLoading(false);
            }
        }, 350);
    }, []);

    const handleSelectCustomer = async (c) => {
        setSelectedCustomer(c);
        setCustomerCredit(0);
        setCustomerQuery('');
        setCustomerResults([]);
        setShowCustomerDropdown(false);

        const cid = c._id || c.id || c.customer_id;

        // Fetch credit balance in background
        try {
            const creditRes = await getCustomerCredit(cid);

            console.log("Credit API Response:", creditRes);

            const balance =
                creditRes?.credit_balance ??
                creditRes?.due_amount ??
                creditRes?.balance ??
                0;

            setCustomerCredit(balance);
        } catch {
            // credit endpoint might not exist yet — silently ignore
        }

        // Auto-load last purchase if available
        try {
            const res = await getCustomerLastPurchase(cid);
            const invoiceData = res?.data;
            if (!invoiceData) return;
            const lastItems = invoiceData.items;

            if (Array.isArray(lastItems) && lastItems.length > 0) {
                console.log(lastItems);
                setPendingLastItems(lastItems);
                setLastPurchaseModalVisible(true);
            }
        } catch (e) {
            setCustomerLoading(false);
            console.warn('Could not load last purchase:', e.message);
        }
    };

    // ─── SEARCH PRODUCTS ─────────────────────────────
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!query.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const response = await searchProducts({ query: query.trim(), type: 'name' });
                const products = response?.data ?? response?.products ?? response ?? [];
                setSearchResults(Array.isArray(products) ? products : []);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 350);
    }, []);

    // ─── CART ───────────────────────────────────────
    const addToCart = useCallback((product) => {
        setCart((prev) => {
            const pid = product._id || product.id || product.product_id;
            const existing = prev.find((i) => (i._id || i.id || i.product_id) === pid);
            const maxStock = product.quantity ?? product.stock ?? 999;

            if (existing) {
                if (existing.cart_quantity >= maxStock) {
                    Alert.alert('Stock Limit', `Only ${maxStock} units available.`);
                    return prev;
                }
                return prev.map((i) =>
                    (i._id || i.id || i.product_id) === pid
                        ? { ...i, cart_quantity: i.cart_quantity + 1 }
                        : i
                );
            }
            return [...prev, { ...product, available_stock: maxStock, cart_quantity: 1, discount_percent: 0 }];
        });
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        // Re-focus search input so barcode scanner / keyboard stays active
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }, []);

    // Submit (Enter key / barcode scanner)
    const handleSubmitSearch = useCallback(async () => {
        const query = searchQuery.trim();
        if (!query) return;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setSearchLoading(true);
        try {
            const response = await searchProducts({ query, type: 'name' });
            const products = response?.data ?? response?.products ?? response ?? [];
            const list = Array.isArray(products) ? products : [];

            if (list.length === 1) {
                addToCart(list[0]);
            } else {
                setSearchResults(list);
                setShowDropdown(true);
            }
        } catch {
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
            // Always re-focus search input after submit (barcode scan)
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [searchQuery, addToCart]);

    const updateQuantity = useCallback((item, newQty) => {
        const pid = item._id || item.id || item.product_id;
        if (newQty <= 0) {
            setCart((prev) => prev.filter((i) => (i._id || i.id || i.product_id) !== pid));
            return;
        }
        const maxStock = item.available_stock ?? item.quantity ?? item.stock ?? 999;
        if (newQty > maxStock) {
            Alert.alert('Stock Limit', `Only ${maxStock} units available.`);
            return;
        }
        setCart((prev) =>
            prev.map((i) =>
                (i._id || i.id || i.product_id) === pid ? { ...i, cart_quantity: newQty } : i
            )
        );
    }, []);

    const updateDiscount = useCallback((item, discount) => {
        const pid = item._id || item.id || item.product_id;
        setCart((prev) =>
            prev.map((i) =>
                (i._id || i.id || i.product_id) === pid ? { ...i, discount_percent: discount } : i
            )
        );
    }, []);

    const removeFromCart = useCallback((item) => {
        const pid = item._id || item.id || item.product_id;
        setCart((prev) => prev.filter((i) => (i._id || i.id || i.product_id) !== pid));
    }, []);

    // ─── LOOSE TABLET MODE ──────────────────────────────────────────
    // Toggle between strip-based and loose-tablet-based selling for a product
    const toggleLooseMode = useCallback((item) => {
        const pid = item._id || item.id || item.product_id;
        setCart((prev) =>
            prev.map((i) => {
                if ((i._id || i.id || i.product_id) !== pid) return i;
                const nowLoose = !i.is_loose_mode;
                return {
                    ...i,
                    is_loose_mode: nowLoose,
                    // Reset loose fields when toggling on; preserve original strip qty when toggling off
                    loose_tablet_count: nowLoose ? (i.loose_tablet_count ?? 1) : undefined,
                    loose_price_per_tablet: i.loose_price_per_tablet ?? null,
                    loose_total_price: i.loose_total_price ?? null,
                    loose_loading: nowLoose, // will trigger fetch
                    loose_error: null,
                };
            })
        );
    }, []);

    // Update tablet count and fetch latest price from API
    const updateLooseTablets = useCallback(async (item, tabletCount) => {
        const pid = item._id || item.id || item.product_id;
        const n = Math.max(1, Math.floor(Number(tabletCount) || 1));

        // Optimistically update count + set loading
        setCart((prev) =>
            prev.map((i) =>
                (i._id || i.id || i.product_id) === pid
                    ? { ...i, loose_tablet_count: n, loose_loading: true, loose_error: null }
                    : i
            )
        );

        try {
            const result = await getLoosePrice(pid, n);
            const price_per_tablet = result?.price_per_tablet ?? 0;
            const total_price = result?.total_price ?? price_per_tablet * n;
            setCart((prev) =>
                prev.map((i) =>
                    (i._id || i.id || i.product_id) === pid
                        ? {
                            ...i,
                            loose_tablet_count: n,
                            loose_price_per_tablet: price_per_tablet,
                            loose_total_price: total_price,
                            loose_loading: false,
                            loose_error: null,
                        }
                        : i
                )
            );
        } catch (err) {
            const errMsg = err?.message || 'Price fetch failed';
            setCart((prev) =>
                prev.map((i) =>
                    (i._id || i.id || i.product_id) === pid
                        ? { ...i, loose_loading: false, loose_error: errMsg }
                        : i
                )
            );
        }
    }, []);

    const clearCart = useCallback(() => {
        if (cart.length === 0) return;
        Alert.alert('Void Sale', 'Remove all items from this sale?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Void', style: 'destructive', onPress: () => setCart([]) },
        ]);
    }, [cart]);

    // ─── TOTALS ─────────────────────────────────────
    const cartSummary = useMemo(() => {
        let subtotal = 0;
        let totalDiscount = 0;

        cart.forEach((item) => {
            if (item.is_loose_mode) {
                // Loose tablet pricing — use the API-returned total
                const looseTotal = item.loose_total_price ?? 0;
                subtotal += looseTotal;
                // Discount doesn't apply to loose tablet items (price_per_tablet already is the discounted rate)
            } else {
                const price = item.mrp ?? item.selling_price ?? item.price ?? 0;
                const qty = item.cart_quantity ?? 1;
                const lineGross = price * qty;
                const lineDisc = lineGross * ((item.discount_percent ?? 0) / 100);
                subtotal += lineGross;
                totalDiscount += lineDisc;
            }
        });

        return {
            subtotal,
            totalDiscount,
            grandTotal: subtotal - totalDiscount,
            itemCount: cart.reduce((s, i) => s + (i.is_loose_mode ? (i.loose_tablet_count ?? 1) : (i.cart_quantity ?? 1)), 0),
        };
    }, [cart]);

    // ─── CHECKOUT ──────────────────────────────────────
    // Step 1: PAY button → open payment modal
    const handleCheckout = async () => {
        if (cart.length === 0) {
            Alert.alert('Empty Cart', 'Add items before checkout.');
            return;
        }

        // Always refresh credit before opening payment
        if (selectedCustomer) {
            try {
                const cid =
                    selectedCustomer._id ||
                    selectedCustomer.id ||
                    selectedCustomer.customer_id;

                const creditRes = await getCustomerCredit(cid);

                const balance =
                    creditRes?.customer_credit_balance ??
                    creditRes?.credit_balance ??
                    creditRes?.due_amount ??
                    0;

                console.log("Fresh credit fetched:", balance);

                setCustomerCredit(Number(balance) || 0);
            } catch (err) {
                console.warn("Credit fetch failed:", err.message);
                setCustomerCredit(0);
            }
        }

        setPaymentModalVisible(true);
    };


    // Step 2: Payment modal confirms → call API
    const processPayment = async ({
        amount_paid,
        cash_received,
        previous_due_payment,
        due_amount,
        change_amount,
    }) => {
        setPaymentModalVisible(false);
        const cartSnapshot = [...cart];
        setCheckoutLoading(true);

        try {
            const payload = {
                items: cartSnapshot.map((item) => ({
                    product_id: item._id || item.id || item.product_id,
                    quantity: item.is_loose_mode ? 1 : item.cart_quantity,
                    discount_percent: item.is_loose_mode ? 0 : (item.discount_percent ?? 0),
                    // Loose sale extra fields (backend may ignore if not supported yet)
                    ...(item.is_loose_mode ? {
                        is_loose_sale: true,
                        loose_tablet_count: item.loose_tablet_count ?? 1,
                        loose_price_per_tablet: item.loose_price_per_tablet ?? 0,
                        loose_total_price: item.loose_total_price ?? 0,
                    } : {}),
                })),
                payment_method: paymentMethod,
                amount_paid,
                previous_due_payment
            };

            if (selectedCustomer) {
                payload.customer_id =
                    selectedCustomer._id ||
                    selectedCustomer.id ||
                    selectedCustomer.customer_id;
            }

            const response = await processCheckout(payload);

            const rawInvoice =
                response?.invoice ?? response?.data ?? response;

            const newCredit =
                response?.customer_credit_balance ?? 0;

            const savedDue =
                response?.due_amount ?? due_amount ?? 0;

            // Update credit properly
            setCustomerCredit(Number(newCredit) || 0);

            savedInvoiceRef.current = rawInvoice;

            setCart([]);
            setSearchQuery('');
            setSearchResults([]);

            if (savedDue > 0 && selectedCustomer) {
                Alert.alert(
                    'Due Saved',
                    `₹${savedDue.toFixed(2)} saved to customer account.`,
                    [{ text: 'OK' }]
                );
            }

            // DO NOT clear selectedCustomer
            // DO NOT reset credit

            setPrintModalVisible(true);
        } catch (err) {
            Alert.alert(
                'Checkout Failed',
                err.message || 'Unable to process'
            );
        } finally {
            setCheckoutLoading(false);
        }
    };

    // ─── PRINT HANDLERS ─────────────────────────────
    const handlePrintAndSave = () => {
        setPrintModalVisible(false);
        // Open a 58mm thermal receipt popup
        printReceipt58mm(savedInvoiceRef.current);
    };

    const handleSaveOnly = () => {
        setPrintModalVisible(false);
    };

    // ─── HELPERS ────────────────────────────────────
    const getName = (item) => item.medicine_name || item.product_name || item.name || 'Item';
    const getPrice = (item) => item.mrp ?? item.selling_price ?? item.price ?? 0;


    // ─── CUSTOMER STRIP: update credit display and clear button ─────────────────────────
    // Helper to clear selected customer and reset credit
    const clearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerCredit(0);
    };

    // ─── FREE ENTRY: confirm & save unlisted medicine ───────────────
    const handleConfirmFreeEntry = async () => {
        const name = freeEntry.name.trim();
        const mrp = parseFloat(freeEntry.mrp);
        const stock = parseInt(freeEntry.stock, 10);

        if (!name) { Alert.alert('Required', 'Please enter a medicine name.'); return; }
        if (isNaN(mrp) || mrp <= 0) { Alert.alert('Required', 'Please enter a valid MRP.'); return; }
        if (isNaN(stock) || stock <= 0) { Alert.alert('Required', 'Please enter the stock quantity.'); return; }

        setFreeEntryLoading(true);
        let savedProduct = null;
        try {
            // Save to inventory with the entered stock quantity
            const res = await createProduct({
                medicine_name: name,
                mrp,
                selling_price: mrp,
                quantity: stock,
                category: 'General',
            });
            savedProduct = res?.data ?? res;
        } catch (err) {
            console.warn('createProduct failed (still adding to cart):', err.message);
        } finally {
            setFreeEntryLoading(false);
        }

        // Add to cart with qty=1, discount editable inline
        const cartItem = {
            _id: savedProduct?._id ?? `manual_${Date.now()}`,
            medicine_name: name,
            mrp,
            selling_price: mrp,
            available_stock: savedProduct?.quantity ?? stock,
            quantity: savedProduct?.quantity ?? stock,
            cart_quantity: 1,
            discount_percent: 0,
            is_manual_entry: true,
        };
        setCart(prev => [...prev, cartItem]);
        setFreeEntry({ name: '', mrp: '', stock: '' });
        setShowFreeEntry(false);
    };

    const PAYMENT_METHODS = [
        { key: 'cash', label: 'CASH', icon: 'cash-outline', color: '#16A34A' },
        { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline', color: '#7C3AED' },
        { key: 'card', label: 'CARD', icon: 'card-outline', color: '#3B82F6' },
    ];

    // Responsive panel flex ratios — tuned for 1280×800 (xlarge)
    const leftFlex = r.pick({ small: 1, medium: 2.2, large: 3, xlarge: 3.2 });
    const rightFlex = r.pick({ small: 1, medium: 1.2, large: 1.3, xlarge: 1.4 });
    const isStacked = r.isSmall;
    // Search box height responsive
    const searchBoxH = r.pick({ small: 48, medium: 52, large: 56, xlarge: 52 });

    return (
        <View style={[styles.container, isStacked && { flexDirection: 'column' }]}>
            {/* ═══════════ LEFT PANEL ═══════════ */}
            <View style={[styles.leftPanel, { flex: leftFlex }]}>

                {/* ── Customer Selection ── */}
                <View style={[styles.searchRow, { borderBottomWidth: 0, paddingBottom: 0, zIndex: 200 }]}>
                    {selectedCustomer ? (
                        <View style={{ gap: 4 }}>
                            <View style={[styles.searchBox, { height: searchBoxH, backgroundColor: COLORS.primaryGhost, borderColor: COLORS.primaryLight, justifyContent: 'space-between' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="person" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZES.md }} numberOfLines={1}>
                                        {selectedCustomer.name || selectedCustomer.customer_name}
                                        <Text style={{ fontWeight: '400', fontSize: FONT_SIZES.sm }}> ({selectedCustomer.phone_no || selectedCustomer.phone_number})</Text>
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={clearCustomer} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="close-circle" size={22} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                            {/* Credit badge */}
                            {customerCredit > 0 && (
                                <View style={styles.creditBadgeStrip}>
                                    <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                                    <Text style={styles.creditBadgeText}>Outstanding due: ₹{customerCredit.toFixed(2)}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.searchRelativeWrap}>
                            <View style={[styles.searchBox, { height: searchBoxH }]}>
                                <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={customerQuery}
                                    onChangeText={handleCustomerSearch}
                                    placeholder="Select Customer (Search by name/phone)..."
                                    placeholderTextColor={COLORS.textMuted}
                                />
                                {customerQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => { setCustomerQuery(''); setCustomerResults([]); setShowCustomerDropdown(false); }}>
                                        <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                )}
                                {customerLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
                            </View>

                            {/* Customer Dropdown — floats absolutely below the input */}
                            {showCustomerDropdown && customerResults.length > 0 && (
                                <View style={styles.floatingDropdown}>
                                    <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                                        {customerResults.map((c, idx) => (
                                            <TouchableOpacity
                                                key={c._id || c.id || idx}
                                                style={[styles.dropdownItem, { borderBottomColor: COLORS.borderLight, borderBottomWidth: 1 }]}
                                                onPress={() => handleSelectCustomer(c)}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.dropdownName}>{c.name || c.customer_name}</Text>
                                                    <Text style={styles.dropdownMeta}>{c.phone_no || c.phone_number}</Text>
                                                </View>
                                                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Search Bar + Floating Dropdown — wrapped in relative container */}
                <View style={[styles.searchRow, { zIndex: 100 }]}>
                    <View style={styles.searchRelativeWrap}>
                        <View style={[styles.searchBox, { height: searchBoxH }]}>
                            <Ionicons name="search" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                            <TextInput
                                ref={searchInputRef}
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                onSubmitEditing={handleSubmitSearch}
                                placeholder="Scan barcode or type product name..."
                                placeholderTextColor={COLORS.textMuted}
                                autoFocus
                                returnKeyType="search"
                                onBlur={() => {
                                    // Auto-refocus unless user clicked another input
                                    setTimeout(() => {
                                        if (Platform.OS === 'web') {
                                            const tag = document.activeElement?.tagName?.toLowerCase();
                                            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
                                        }
                                        searchInputRef.current?.focus();
                                    }, 100);
                                }}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}>
                                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                            {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
                        </View>

                        {/* Product Search Dropdown — floats absolutely below the search box */}
                        {showDropdown && searchResults.length > 0 && (
                            <View style={styles.floatingDropdown}>
                                <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
                                    {searchResults.map((product, idx) => (
                                        <TouchableOpacity
                                            key={product._id || product.id || idx}
                                            style={styles.dropdownItem}
                                            onPress={() => addToCart(product)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.dropdownName} numberOfLines={1}>{getName(product)}</Text>
                                                <Text style={styles.dropdownMeta}>
                                                    Stock: {product.quantity ?? product.stock ?? '—'}
                                                </Text>
                                            </View>
                                            <Text style={styles.dropdownPrice}>₹{Number(getPrice(product)).toFixed(2)}</Text>
                                            <Ionicons name="add-circle" size={26} color={COLORS.primary} style={{ marginLeft: 8 }} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Item Table ── */}
                <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { width: 36 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>Item Info</Text>
                        <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>Qty</Text>
                        <Text style={[styles.th, { flex: 1.0, textAlign: 'center' }]}>Price</Text>
                        <Text style={[styles.th, { flex: 0.8, textAlign: 'center' }]}>Disc%</Text>
                        <Text style={[styles.th, { flex: 1.0, textAlign: 'right' }]}>Amount</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Table Body */}
                    {cart.length > 0 ? (
                        <FlatList
                            data={cart}
                            keyExtractor={(item, i) => item._id || item.id || String(i)}
                            renderItem={({ item, index }) => {
                                const isLoose = !!item.is_loose_mode;
                                const price = getPrice(item);
                                const qty = item.cart_quantity ?? 1;
                                const disc = item.discount_percent ?? 0;
                                const tabletCount = item.loose_tablet_count ?? 1;
                                const lineTotal = isLoose
                                    ? (item.loose_total_price ?? 0)
                                    : price * qty * (1 - disc / 100);
                                const canLoose = !!(item.tablets_per_strip && item.tablets_per_strip > 0);

                                return (
                                    <View>
                                        <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                                            <Text style={[styles.td, { width: 36 }]}>{index + 1}</Text>
                                            <View style={{ flex: 3, justifyContent: 'center' }}>
                                                <Text style={styles.tdName} numberOfLines={1}>
                                                    {getName(item)}
                                                </Text>
                                                {/* Loose / Strip toggle pill */}
                                                {canLoose && (
                                                    <TouchableOpacity
                                                        style={[looseStyles.modePill, isLoose && looseStyles.modePillLoose]}
                                                        onPress={() => {
                                                            toggleLooseMode(item);
                                                            if (!isLoose) {
                                                                // fetch price immediately when switching to loose
                                                                setTimeout(() => updateLooseTablets(item, item.loose_tablet_count ?? 1), 0);
                                                            }
                                                        }}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Ionicons
                                                            name={isLoose ? 'tablet-portrait-outline' : 'layers-outline'}
                                                            size={11}
                                                            color={isLoose ? '#7C3AED' : COLORS.textMuted}
                                                        />
                                                        <Text style={[looseStyles.modePillText, isLoose && looseStyles.modePillTextLoose]}>
                                                            {isLoose ? 'Loose' : 'Strip'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {/* Quantity / Tablet Count */}
                                            {isLoose ? (
                                                <View style={[styles.qtyCell, { flex: 1.2 }]}>
                                                    <TouchableOpacity
                                                        onPress={() => updateLooseTablets(item, tabletCount - 1)}
                                                        style={styles.qtyBtn}
                                                    >
                                                        <Ionicons name="remove" size={16} color='#7C3AED' />
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={[styles.qtyEditInput, { color: '#7C3AED' }]}
                                                        value={String(tabletCount)}
                                                        onChangeText={(t) => {
                                                            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                                                            if (!isNaN(n) && n >= 1) updateLooseTablets(item, n);
                                                            else if (t === '') updateLooseTablets(item, 1);
                                                        }}
                                                        keyboardType="number-pad"
                                                        selectTextOnFocus
                                                        textAlign="center"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => updateLooseTablets(item, tabletCount + 1)}
                                                        style={styles.qtyBtn}
                                                    >
                                                        <Ionicons name="add" size={16} color='#7C3AED' />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={[styles.qtyCell, { flex: 1.2 }]}>
                                                    <TouchableOpacity
                                                        onPress={() => updateQuantity(item, qty - 1)}
                                                        style={styles.qtyBtn}
                                                    >
                                                        <Ionicons name="remove" size={16} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={styles.qtyEditInput}
                                                        value={String(qty)}
                                                        onChangeText={(t) => {
                                                            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                                                            const maxStock = item.available_stock ?? item.quantity ?? item.stock ?? 999;
                                                            if (!isNaN(n) && n >= 1 && n <= maxStock) updateQuantity(item, n);
                                                            else if (t === '') updateQuantity(item, 1);
                                                        }}
                                                        keyboardType="number-pad"
                                                        selectTextOnFocus
                                                        textAlign="center"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => updateQuantity(item, qty + 1)}
                                                        style={styles.qtyBtn}
                                                    >
                                                        <Ionicons name="add" size={16} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {/* Price per unit (or per tablet in loose mode) */}
                                            <Text style={[styles.td, { flex: 1.0, textAlign: 'center' }]} numberOfLines={1}>
                                                {isLoose
                                                    ? (item.loose_loading ? '...' : `₹${Number(item.loose_price_per_tablet ?? 0).toFixed(2)}`)
                                                    : `₹${Number(price).toFixed(2)}`}
                                            </Text>

                                            {/* Disc% — disabled in loose mode */}
                                            <View style={{ flex: 0.8, alignItems: 'center', justifyContent: 'center' }}>
                                                {isLoose ? (
                                                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>—</Text>
                                                ) : (
                                                    <View style={[
                                                        styles.discTap,
                                                        disc > 0 && styles.discActive,
                                                        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
                                                    ]}>
                                                        <TextInput
                                                            style={[
                                                                styles.discEditInput,
                                                                disc > 0 && styles.discActiveText,
                                                            ]}
                                                            value={disc > 0 ? String(disc) : ''}
                                                            onChangeText={(t) => {
                                                                const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                                                const n = parseFloat(cleaned);
                                                                if (cleaned === '' || cleaned === '.') { updateDiscount(item, 0); return; }
                                                                if (!isNaN(n) && n >= 0 && n <= 100) updateDiscount(item, n);
                                                            }}
                                                            placeholder="%"
                                                            placeholderTextColor={COLORS.textMuted}
                                                            keyboardType="decimal-pad"
                                                            selectTextOnFocus
                                                            textAlign="center"
                                                        />
                                                        <Text style={[styles.discTapText, disc > 0 && styles.discActiveText]}>%</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text style={[styles.tdAmount, { flex: 1.0 }]} numberOfLines={1}>
                                                {isLoose && item.loose_loading ? '...' : `₹${Number(lineTotal).toFixed(2)}`}
                                            </Text>
                                            <TouchableOpacity onPress={() => removeFromCart(item)} style={styles.deleteBtn}>
                                                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                            </TouchableOpacity>
                                        </View>
                                        {/* Loose error / info strip */}
                                        {isLoose && item.loose_error && (
                                            <View style={looseStyles.errorStrip}>
                                                <Ionicons name="warning-outline" size={13} color={COLORS.error} />
                                                <Text style={looseStyles.errorText}>{item.loose_error}</Text>
                                            </View>
                                        )}
                                        {isLoose && !item.loose_error && item.loose_price_per_tablet && (
                                            <View style={looseStyles.infoStrip}>
                                                <Text style={looseStyles.infoText}>
                                                    {tabletCount} tablet{tabletCount !== 1 ? 's' : ''} × ₹{Number(item.loose_price_per_tablet).toFixed(2)}/tab = ₹{Number(lineTotal).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyTable}>
                            <Ionicons name="cart-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No items in cart</Text>
                            <Text style={styles.emptySubtext}>Scan or search to add products</Text>
                        </View>
                    )}

                    {/* ── Free / Manual Entry Row ── */}
                    {showFreeEntry && (
                        <View style={styles.freeEntryRow}>
                            {/* Medicine Name */}
                            <TextInput
                                style={[styles.freeEntryInput, { flex: 3 }]}
                                placeholder="Medicine name *"
                                placeholderTextColor={COLORS.textMuted}
                                value={freeEntry.name}
                                onChangeText={t => setFreeEntry(p => ({ ...p, name: t }))}
                                autoFocus
                            />
                            {/* MRP */}
                            <TextInput
                                style={[styles.freeEntryInput, { flex: 1.0, textAlign: 'center' }]}
                                placeholder="MRP *"
                                placeholderTextColor={COLORS.textMuted}
                                value={freeEntry.mrp}
                                onChangeText={t => setFreeEntry(p => ({ ...p, mrp: t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') }))}
                                keyboardType="decimal-pad"
                                textAlign="center"
                            />
                            {/* Stock (inventory quantity) */}
                            <TextInput
                                style={[styles.freeEntryInput, { flex: 1.0, textAlign: 'center' }]}
                                placeholder="Stock *"
                                placeholderTextColor={COLORS.textMuted}
                                value={freeEntry.stock}
                                onChangeText={t => setFreeEntry(p => ({ ...p, stock: t.replace(/[^0-9]/g, '') }))}
                                keyboardType="number-pad"
                                textAlign="center"
                            />
                            {/* Confirm */}
                            <TouchableOpacity
                                style={styles.freeEntryConfirmBtn}
                                onPress={handleConfirmFreeEntry}
                                disabled={freeEntryLoading}
                                activeOpacity={0.7}
                            >
                                {freeEntryLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="checkmark" size={18} color="#fff" />}
                            </TouchableOpacity>
                            {/* Cancel */}
                            <TouchableOpacity
                                style={styles.freeEntryCancelBtn}
                                onPress={() => { setShowFreeEntry(false); setFreeEntry({ name: '', mrp: '', stock: '' }); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Add Unlisted Item Button ── */}
                    {!showFreeEntry && (
                        <TouchableOpacity
                            style={styles.addUnlistedBtn}
                            onPress={() => setShowFreeEntry(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle-outline" size={16} color={COLORS.primaryDark ?? COLORS.primary} />
                            <Text style={styles.addUnlistedText}>Add Unlisted Item</Text>
                        </TouchableOpacity>
                    )}
                </View>


            </View>

            {/* ═══════════ RIGHT PANEL ═══════════ */}
            <View style={[styles.rightPanel, { flex: rightFlex }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.rightPanelContent,
                        { padding: r.pick({ small: SPACING.sm, medium: SPACING.md, large: SPACING.md, xlarge: SPACING.md }) },
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Totals Display */}
                    <View style={styles.totalsSection}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>₹{cartSummary.subtotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Discount</Text>
                            <Text style={[styles.totalValue, cartSummary.totalDiscount > 0 && { color: COLORS.error }]}>
                                {cartSummary.totalDiscount > 0 ? `-₹${cartSummary.totalDiscount.toFixed(2)}` : '₹0.00'}
                            </Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Grand Total</Text>
                            <Text style={styles.grandTotalValue}>
                                ₹{cartSummary.grandTotal.toFixed(2)}
                            </Text>
                        </View>
                        <Text style={styles.itemCountText}>
                            {cartSummary.itemCount} item{cartSummary.itemCount !== 1 ? 's' : ''} in cart
                        </Text>
                    </View>

                    {/* PAY Button */}
                    <TouchableOpacity
                        style={[styles.payBtn, cart.length === 0 && styles.payBtnDisabled]}
                        onPress={handleCheckout}
                        disabled={cart.length === 0 || checkoutLoading}
                        activeOpacity={0.8}
                    >
                        {checkoutLoading ? (
                            <ActivityIndicator size="large" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="card-outline" size={26} color="#fff" />
                                <Text style={styles.payBtnText}>PAY</Text>
                                <Text style={styles.payBtnAmount}>₹{cartSummary.grandTotal.toFixed(2)}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Payment Methods */}
                    <View style={styles.payMethodSection}>
                        <Text style={styles.payMethodTitle}>Payment Method</Text>
                        <View style={styles.payMethodRow}>
                            {PAYMENT_METHODS.map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.payMethodBtn,
                                        paymentMethod === m.key && { borderColor: m.color, backgroundColor: m.color + '15' },
                                    ]}
                                    onPress={() => setPaymentMethod(m.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={m.icon}
                                        size={24}
                                        color={paymentMethod === m.key ? m.color : COLORS.textMuted}
                                    />
                                    <Text
                                        style={[
                                            styles.payMethodLabel,
                                            paymentMethod === m.key && { color: m.color, fontWeight: '700' },
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>


                </ScrollView>
            </View>

            {/* ═══════════ PAYMENT MODAL (Credit System) ═══════════ */}
            <PaymentModal
                visible={paymentModalVisible}
                onClose={() => setPaymentModalVisible(false)}
                onConfirm={processPayment}
                grandTotal={cartSummary.grandTotal}
                customerCredit={customerCredit}
                customerName={selectedCustomer?.name || selectedCustomer?.customer_name || ''}
            />

            {/* ═══════════ PRINT / SAVE MODAL ═══════════ */}
            <Modal
                visible={printModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPrintModalVisible(false)}
            >
                <View style={printStyles.overlay}>
                    <View style={printStyles.card}>
                        {/* Icon header */}
                        <View style={printStyles.iconCircle}>
                            <Ionicons name="checkmark-circle" size={52} color={COLORS.success} />
                        </View>

                        <Text style={printStyles.heading}>Sale Saved!</Text>
                        <Text style={printStyles.sub}>
                            The sale has been recorded successfully.{`\n`}What would you like to do next?
                        </Text>

                        {/* Divider */}
                        <View style={printStyles.divider} />

                        {/* Option buttons */}
                        <View style={printStyles.optionRow}>
                            {/* Print Bill */}
                            <TouchableOpacity
                                style={[printStyles.optionBtn, printStyles.optionPrint]}
                                onPress={handlePrintAndSave}
                                activeOpacity={0.8}
                            >
                                <View style={printStyles.optionIconWrap}>
                                    <Ionicons name="print-outline" size={32} color={COLORS.white} />
                                </View>
                                <Text style={printStyles.optionLabel}>Print Bill</Text>
                                <Text style={printStyles.optionSub}>Opens print dialog</Text>
                            </TouchableOpacity>

                            {/* Save Only */}
                            <TouchableOpacity
                                style={[printStyles.optionBtn, printStyles.optionSave]}
                                onPress={handleSaveOnly}
                                activeOpacity={0.8}
                            >
                                <View style={[printStyles.optionIconWrap, printStyles.optionIconSave]}>
                                    <Ionicons name="save-outline" size={32} color={COLORS.primary} />
                                </View>
                                <Text style={[printStyles.optionLabel, printStyles.optionLabelSave]}>Save Only</Text>
                                <Text style={[printStyles.optionSub, { color: COLORS.textMuted }]}>No print</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Last Purchase Confirmation Modal */}
            <Modal visible={lastPurchaseModalVisible} transparent animationType="fade" onRequestClose={() => setLastPurchaseModalVisible(false)}>
                <View style={printStyles.overlay}>
                    <View style={printStyles.card}>
                        <View style={[printStyles.iconCircle, { backgroundColor: COLORS.primaryGhost }]}>
                            <Ionicons name="cart" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={printStyles.heading}>Last Purchase Found</Text>
                        <Text style={printStyles.sub}>
                            Would you like to auto-fill the cart with their last purchase?
                        </Text>
                        <View style={printStyles.divider} />
                        <View style={printStyles.optionRow}>
                            <TouchableOpacity
                                style={[printStyles.optionBtn, printStyles.optionSave, { paddingVertical: SPACING.lg }]}
                                onPress={() => {
                                    setLastPurchaseModalVisible(false);
                                    setPendingLastItems(null);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[printStyles.optionLabel, printStyles.optionLabelSave]}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[printStyles.optionBtn, printStyles.optionPrint, { paddingVertical: SPACING.lg }]}
                                onPress={() => {
                                    if (pendingLastItems) {
                                        const reorderedCart = pendingLastItems.map((item) => {
                                            const prod = item.product_id || {};
                                            const isObj = typeof prod === 'object';

                                            return {
                                                _id: isObj ? (prod._id || prod.id) : prod,
                                                product_id: isObj ? (prod._id || prod.id) : prod,
                                                medicine_name: item.medicine_name || item.product_name || item.name || (isObj ? (prod.medicine_name || prod.product_name || prod.name) : 'Unknown Product'),
                                                barcode: item.short_barcode || item.barcode || (isObj ? (prod.short_barcode || prod.barcode) : undefined),
                                                mrp: item.mrp || item.price || (isObj ? (prod.mrp || prod.selling_price || prod.price) : 0),
                                                cart_quantity: item.quantity || item.cart_quantity || 1,
                                                discount_percent: item.discount_percent || 0,
                                                available_stock: isObj ? (prod.quantity ?? prod.stock ?? 999) : 999,
                                            };
                                        });
                                        setCart(reorderedCart);
                                    }
                                    setLastPurchaseModalVisible(false);
                                    setPendingLastItems(null);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={printStyles.optionLabel}>Yes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.bgDark,
    },

    // ═══ LEFT PANEL ═══
    leftPanel: {
        flex: 3,
        backgroundColor: COLORS.white,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        minWidth: 0,
    },

    // Search
    searchRow: {
        padding: SPACING.md,
        backgroundColor: COLORS.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        height: 56,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZES.lg,
        color: COLORS.textPrimary,
        height: '100%',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },

    // Relative wrapper for search fields — anchors the absolute dropdown
    searchRelativeWrap: {
        position: 'relative',
        zIndex: 100,
    },

    // Floating dropdown — absolutely positioned so it overlays content below
    floatingDropdown: {
        position: 'absolute',
        top: 56,          // sits just below the 52-56px tall input
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        zIndex: 9999,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        overflow: 'hidden',
    },

    // Legacy dropdown (kept for any other uses)
    dropdown: {
        marginHorizontal: SPACING.md,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        ...SHADOWS.md,
        zIndex: 100,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        minHeight: 52,
    },
    dropdownName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    dropdownMeta: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    dropdownPrice: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // Table
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgSidebar,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        minHeight: 42,
    },
    th: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        minHeight: 56,
    },
    tableRowAlt: {
        backgroundColor: COLORS.bgInput,
    },
    td: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    tdName: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    tdAmount: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'right',
    },

    // Qty cell — compact for 1280×800
    qtyCell: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 4,
    },
    qtyBtn: {
        width: 30,
        height: 30,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primaryGhost,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyValueTouch: {
        minWidth: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '800',
        color: COLORS.primary,
        textAlign: 'center',
    },
    qtyEditInput: {
        minWidth: 36,
        height: 30,
        fontSize: FONT_SIZES.md,
        fontWeight: '800',
        color: COLORS.primary,
        textAlign: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primaryGhost,
        paddingHorizontal: 4,
        outlineStyle: 'none',
    },

    // Discount tap target
    discTap: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: RADIUS.sm,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 30,
    },
    discTapText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    discActive: {
        borderColor: COLORS.error,
        borderStyle: 'solid',
        backgroundColor: COLORS.errorLight,
    },
    discActiveText: {
        color: COLORS.error,
        fontWeight: '700',
    },
    discEditInput: {
        width: 32,
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        textAlign: 'center',
        paddingVertical: 0,
        outlineStyle: 'none',
        backgroundColor: 'transparent',
    },
    deleteBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.sm,
    },

    // Empty
    emptyTable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    emptyText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    emptySubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
    },



    // ═══ RIGHT PANEL ═══
    rightPanel: {
        flex: 1.3,
        backgroundColor: COLORS.white,
        minWidth: 0,
    },
    rightPanelContent: {
        flexGrow: 1,
        paddingBottom: 16,
    },

    // Totals
    totalsSection: {
        backgroundColor: COLORS.bgSurface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    totalLabel: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textSecondary,
    },
    totalValue: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.xs,
        paddingTop: SPACING.sm,
        borderTopWidth: 2,
        borderTopColor: COLORS.primary,
    },
    grandTotalLabel: {
        fontSize: FONT_SIZES.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    grandTotalValue: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '900',
        color: COLORS.primary,
    },
    itemCountText: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
        textAlign: 'right',
    },

    // PAY
    payBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.md,
        gap: 3,
    },
    payBtnDisabled: {
        backgroundColor: COLORS.border,
    },
    payBtnText: {
        fontSize: FONT_SIZES.xl,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
    },
    payBtnAmount: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
    },

    // Payment Methods
    payMethodSection: {
        marginBottom: SPACING.md,
    },
    payMethodTitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    payMethodRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    payMethodBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        gap: 3,
    },
    payMethodLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: COLORS.textMuted,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    quickBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
    },
    quickBtnText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    // Customer credit badge
    creditBadgeStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: COLORS.errorLight,
        borderWidth: 1,
        borderColor: COLORS.error,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
    },
    creditBadgeText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.error,
    },

    // ── Free / Manual Entry Row ──────────────────────────────────
    freeEntryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: '#fffbeb',
        borderTopWidth: 1,
        borderTopColor: '#fde68a',
        borderBottomWidth: 1,
        borderBottomColor: '#fde68a',
    },
    freeEntryInput: {
        height: 36,
        borderWidth: 1.5,
        borderColor: '#f59e0b',
        borderRadius: RADIUS.sm,
        paddingHorizontal: 8,
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
        color: COLORS.textPrimary,
        backgroundColor: COLORS.white,
        outlineStyle: 'none',
    },
    freeEntryConfirmBtn: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freeEntryCancelBtn: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.errorLight,
        borderWidth: 1,
        borderColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addUnlistedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        paddingVertical: 5,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
    },
    addUnlistedText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '700',
        color: COLORS.primary,
    },
});

// ═══════════════════════════════════════════════
// LOOSE TABLET STYLES
// ═══════════════════════════════════════════════
const looseStyles = StyleSheet.create({
    // Pill toggle button below medicine name
    modePill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 3,
        marginTop: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
    },
    modePillLoose: {
        borderColor: '#7C3AED',
        backgroundColor: '#F5F3FF',
    },
    modePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    modePillTextLoose: {
        color: '#7C3AED',
    },
    // Info strip below loose row
    infoStrip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 3,
        backgroundColor: '#F5F3FF',
        borderBottomWidth: 1,
        borderBottomColor: '#DDD6FE',
    },
    infoText: {
        fontSize: 11,
        color: '#7C3AED',
        fontWeight: '600',
    },
    // Error strip below loose row when API fails
    errorStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: SPACING.md,
        paddingVertical: 3,
        backgroundColor: COLORS.errorLight,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.error,
    },
    errorText: {
        fontSize: 11,
        color: COLORS.error,
        fontWeight: '600',
        flex: 1,
    },
});

// ═══════════════════════════════════════════════
// PRINT / SAVE MODAL STYLES
// ═══════════════════════════════════════════════
const printStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '88%',
        maxWidth: Math.min(420, Dimensions.get('window').width * 0.88),
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.successLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    heading: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    sub: {
        fontSize: FONT_SIZES.md,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderLight,
        alignSelf: 'stretch',
        marginBottom: SPACING.xl,
    },
    optionRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        alignSelf: 'stretch',
    },
    optionBtn: {
        flex: 1,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        gap: SPACING.sm,
    },
    optionPrint: {
        backgroundColor: COLORS.primary,
    },
    optionSave: {
        backgroundColor: COLORS.white,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    optionIconWrap: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.lg,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    optionIconSave: {
        backgroundColor: COLORS.primaryGhost,
    },
    optionLabel: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '800',
        color: COLORS.white,
    },
    optionLabelSave: {
        color: COLORS.textPrimary,
    },
    optionSub: {
        fontSize: FONT_SIZES.sm,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '500',
    },
});

