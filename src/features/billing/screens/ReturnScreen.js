import React, { useState, useRef, useEffect } from 'react';
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
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../../../core/constants/theme';
import { searchSaleByInvoice, getSaleById, updateCheckout } from '../services/billingService';
import { printReceipt } from '../../../core/utils/printReceipt';
import { useResponsive } from '../../../core/utils/responsive';

// Helper to format expiry date safely and compactly
const formatExpiryDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    if (/^\d{2}\/\d{2,4}$/.test(dateStr)) return dateStr;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
};

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Cash' },
    { key: 'upi', label: 'UPI' },
    { key: 'card', label: 'Card' },
];

export default function ReturnScreen({ navigation }) {
    const r = useResponsive();
    
    // Search Invoices
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    // Selected Invoice & Return Cart
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [returnCart, setReturnCart] = useState([]); // Array of items with original_qty and return_qty
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // Modals
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const savedInvoiceRef = useRef(null);
    
    const searchTimeout = useRef(null);
    const searchInputRef = useRef(null);

    // ─── SEARCH INVOICES ──────────────────────────
    const handleSearch = (text) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.length < 3) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await searchSaleByInvoice(text);
                if (res?.data) {
                    setSearchResults(res.data);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.warn('Invoice search error:', error.message);
            } finally {
                setSearchLoading(false);
            }
        }, 500);
    };

    const handleSubmitSearch = async () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (searchQuery.length < 3) return;

        setSearchLoading(true);
        try {
            const res = await searchSaleByInvoice(searchQuery);
            if (res?.data && res.data.length > 0) {
                // If it's an exact barcode scan, automatically select it
                const exactMatch = res.data.find(inv => 
                    inv.invoice_number === searchQuery || 
                    inv.invoice_number === searchQuery.trim() || 
                    `INV-${inv.invoice_number}` === searchQuery
                );
                
                if (exactMatch) {
                    handleSelectInvoice(exactMatch);
                } else {
                    setSearchResults(res.data);
                    setShowDropdown(true);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        } catch (error) {
            console.warn('Invoice search error:', error.message);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectInvoice = async (invoice) => {
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        setSearchLoading(true);
        try {
            // Fetch full details to get all items
            const res = await getSaleById(invoice._id || invoice.id);
            if (res?.data) {
                const fullInvoice = res.data;
                setSelectedInvoice(fullInvoice);
                
                // Initialize return cart
                // return_qty defaults to 0 (meaning nothing is being returned yet)
                const items = (fullInvoice.items || []).map(item => {
                    const isLoose = item.is_loose_mode || item.is_loose_sale;
                    return {
                        ...item,
                        is_loose_mode: isLoose,
                        original_qty: isLoose ? (item.loose_tablet_count || item.quantity) : item.quantity,
                        return_qty: 0,
                    };
                });
                setReturnCart(items);
                
                // Default refund method based on original payment method
                if (fullInvoice.payment_method) {
                    setPaymentMethod(fullInvoice.payment_method);
                }
            }
        } catch (error) {
            Alert.alert("Error", "Failed to load invoice details");
            console.error(error);
        } finally {
            setSearchLoading(false);
        }
    };

    const clearSelectedInvoice = () => {
        setSelectedInvoice(null);
        setReturnCart([]);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    // ─── CART LOGIC ──────────────────────────
    const updateReturnQty = (item, newQty) => {
        if (newQty < 0) newQty = 0;
        if (newQty > item.original_qty) newQty = item.original_qty;
        
        setReturnCart(prev => prev.map(c => 
            c._id === item._id ? { ...c, return_qty: newQty } : c
        ));
    };

    // ─── CALCULATE TOTALS ──────────────────────────
    const getPrice = (item) => Number(item.mrp || item.selling_price || item.price || 0);

    const calculateTotals = () => {
        if (!selectedInvoice) return { originalTotal: 0, returnTotal: 0, newTotal: 0, refundAmount: 0 };
        
        let returnMedicineSubtotal = 0;
        let returnDiscountTotal = 0;
        
        returnCart.forEach(item => {
            if (item.return_qty > 0) {
                const isLoose = item.is_loose_mode;
                
                let subtotal = 0;
                let discount = 0;
                
                if (isLoose) {
                    const pricePerTab = Number(item.loose_price_per_tablet || getPrice(item) / (item.tablets_per_strip || 10));
                    subtotal = pricePerTab * item.return_qty;
                    // Usually loose items don't have discount, but if they do:
                    const discPercent = item.discount_percent || 0;
                    discount = (subtotal * discPercent) / 100;
                } else {
                    const price = getPrice(item);
                    subtotal = price * item.return_qty;
                    const discPercent = item.discount_percent || 0;
                    discount = (subtotal * discPercent) / 100;
                }
                
                returnMedicineSubtotal += subtotal;
                returnDiscountTotal += discount;
            }
        });
        
        const returnMedicineTotal = returnMedicineSubtotal - returnDiscountTotal;
        
        const originalTotal = Number(selectedInvoice.grand_total || 0);
        
        // We only refund medicine cost. Doctor fee and OTC items are assumed non-refundable by default.
        const returnTotalValue = returnMedicineTotal;
        const newTotalValue = originalTotal - returnTotalValue;
        
        return {
            originalTotal,
            returnTotal: returnTotalValue,
            newTotal: newTotalValue > 0 ? newTotalValue : 0,
            refundAmount: returnTotalValue
        };
    };

    const totals = calculateTotals();
    const hasItemsToReturn = returnCart.some(item => item.return_qty > 0);

    // ─── PROCESS RETURN ──────────────────────────
    const handleProcessReturn = () => {
        if (!hasItemsToReturn) {
            window.alert("Please set return quantities for at least one item.");
            return;
        }
        setConfirmModalVisible(true);
    };

    const processReturnAPI = async () => {
        setConfirmModalVisible(false);
        setCheckoutLoading(true);
        try {
            // Build updated items array
            // It should only contain items that are kept (original_qty - return_qty)
            const updatedItems = [];
            
            returnCart.forEach(item => {
                const keptQty = item.original_qty - item.return_qty;
                if (keptQty > 0) {
                    if (item.is_loose_mode) {
                        updatedItems.push({
                            product_id: item.product_id,
                            quantity: 1, // Still 1 pack for loose mode in DB
                            is_loose_mode: true,
                            loose_tablet_count: keptQty,
                            loose_price_per_tablet: item.loose_price_per_tablet,
                            discount_percent: item.discount_percent || 0
                        });
                    } else {
                        updatedItems.push({
                            product_id: item.product_id,
                            quantity: keptQty,
                            discount_percent: item.discount_percent || 0
                        });
                    }
                }
            });

            // Prepare payload for updateSaleById
            const payload = {
                items: updatedItems,
                payment_method: paymentMethod, // updated method
                amount_paid: totals.newTotal, // Assume fully paid for the new total
                doctor_fee: selectedInvoice.doctor_fee || 0,
                otc_items: selectedInvoice.otc_items || [],
                customer_id: selectedInvoice.customer ? (selectedInvoice.customer._id || selectedInvoice.customer) : null,
                customer_name_fallback: selectedInvoice.customer_name || ''
            };
            
            // If the updated cart is completely empty, it might fail validation on backend (items required).
            // Usually returns handle this, but if backend requires at least one item, we might need a delete instead.
            // Assuming updateCheckout can handle it or we prevent full return if backend complains.
            if (updatedItems.length === 0) {
                // If the entire bill is returned, ideally we should delete it or mark as cancelled.
                // For now, we'll try to update it. If it fails, we warn.
                if (window.confirm("This will return all items. The invoice will be empty. Proceed?")) {
                    // we'll proceed
                } else {
                    setCheckoutLoading(false);
                    return;
                }
            }

            const response = await updateCheckout(selectedInvoice._id, payload);
            
            if (response?.success) {
                savedInvoiceRef.current = response.data;
                setPrintModalVisible(true);
                setSelectedInvoice(null);
                setReturnCart([]);
                setSearchQuery('');
            } else {
                throw new Error(response?.message || "Failed to process return");
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Something went wrong while processing the return");
        } finally {
            setCheckoutLoading(false);
        }
    };

    const closePrintModal = () => {
        setPrintModalVisible(false);
        savedInvoiceRef.current = null;
    };

    const handlePrintReceipt = () => {
        if (savedInvoiceRef.current) {
            printReceipt(savedInvoiceRef.current);
        }
        closePrintModal();
    };

    // ─── LAYOUT RENDER ──────────────────────────
    const leftFlex = r.pick({ small: 1.8, medium: 2.2, large: 3, xlarge: 3.2 });
    const rightFlex = r.pick({ small: 1.0, medium: 1.2, large: 1.3, xlarge: 1.4 });

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
            <View style={styles.container}>
                {/* ═══════════ LEFT PANE ═══════════ */}
                <View style={[styles.leftPane, { flex: leftFlex }]}>
                    
                    {/* ── Meta Bar ── */}
                    <View style={erpStyles.metaBar}>
                        <View style={erpStyles.metaItem}>
                            <Text style={erpStyles.metaLabel}>MODE:</Text>
                            <Text style={[erpStyles.metaValue, { color: COLORS.error }]}>SALES RETURN</Text>
                        </View>
                        <Text style={erpStyles.metaSep}>│</Text>
                        <View style={erpStyles.metaItem}>
                            <Text style={erpStyles.metaLabel}>DATE:</Text>
                            <Text style={erpStyles.metaValue}>{new Date().toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={erpStyles.metaItem}>
                            <Ionicons name="return-down-back" size={10} color={COLORS.error} style={{marginRight: 4}} />
                            <Text style={[erpStyles.metaValue, { color: COLORS.error }]}>RETURN DESK</Text>
                        </View>
                    </View>

                    {/* ── Search Bar Row ── */}
                    <View style={styles.inputBarRow}>
                        <View style={[styles.inputBarCell, { flex: 1 }]}>
                            {!selectedInvoice ? (
                                <View style={styles.searchRelativeWrap}>
                                    <View style={styles.inlineInputBar}>
                                        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                                        <TextInput
                                            ref={searchInputRef}
                                            style={styles.inlineInput}
                                            value={searchQuery}
                                            onChangeText={handleSearch}
                                            onSubmitEditing={handleSubmitSearch}
                                            placeholder="Scan barcode or type Invoice Number (e.g. INV-12345)..."
                                            placeholderTextColor={COLORS.textMuted}
                                            autoFocus
                                            returnKeyType="search"
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    // Don't steal focus if a modal is open
                                                    if (confirmModalVisible || printModalVisible) return;
                                                    
                                                    if (Platform.OS === 'web') {
                                                        const tag = document.activeElement?.tagName?.toLowerCase();
                                                        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
                                                    }
                                                    searchInputRef.current?.focus();
                                                }, 100);
                                            }}
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}>
                                                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 4 }} />}
                                    </View>

                                    {/* Invoice Search Dropdown */}
                                    {showDropdown && searchResults.length > 0 && (
                                        <View style={erpStyles.dropdownBox}>
                                            <View style={erpStyles.dropdownHeader}>
                                                <Text style={[erpStyles.dropdownHeaderCol, { flex: 1.5 }]}>INVOICE NO</Text>
                                                <Text style={[erpStyles.dropdownHeaderCol, { flex: 1 }]}>DATE</Text>
                                                <Text style={[erpStyles.dropdownHeaderCol, { flex: 2 }]}>CUSTOMER</Text>
                                                <Text style={[erpStyles.dropdownHeaderCol, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                                            </View>
                                            <ScrollView style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled">
                                                {searchResults.map((inv, idx) => {
                                                    const dateStr = new Date(inv.created_at).toLocaleDateString('en-GB');
                                                    const name = inv.customer_name || 'Walk-in Customer';
                                                    
                                                    return (
                                                        <TouchableOpacity
                                                            key={inv._id}
                                                            style={[
                                                                erpStyles.dropdownRow, 
                                                                idx % 2 === 1 && { backgroundColor: '#F8F9F9' }
                                                            ]}
                                                            onPress={() => handleSelectInvoice(inv)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={[erpStyles.dropdownColTextBold, { flex: 1.5 }]} numberOfLines={1}>
                                                                #{inv.invoice_number}
                                                            </Text>
                                                            <Text style={[erpStyles.dropdownColText, { flex: 1 }]} numberOfLines={1}>{dateStr}</Text>
                                                            <Text style={[erpStyles.dropdownColText, { flex: 2 }]} numberOfLines={1}>{name}</Text>
                                                            <Text style={[erpStyles.dropdownColTextBold, { flex: 1, textAlign: 'right', color: '#059669' }]} numberOfLines={1}>
                                                                ₹{Number(inv.grand_total || 0).toFixed(2)}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.selectedInvoiceBar}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="document-text" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                                            <Text style={styles.selectedInvoiceText}>#{selectedInvoice.invoice_number}</Text>
                                        </View>
                                        <Text style={{ color: COLORS.border }}>|</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="person" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                                            <Text style={styles.selectedInvoiceSub}>{selectedInvoice.customer_name || 'Walk-in'}</Text>
                                        </View>
                                        <Text style={{ color: COLORS.border }}>|</Text>
                                        <Text style={styles.selectedInvoiceSub}>Orig Total: ₹{Number(selectedInvoice.grand_total).toFixed(2)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={clearSelectedInvoice} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* ── Ruled Table ── */}
                    <View style={styles.tableContainer}>
                        <FlatList
                            data={returnCart}
                            keyExtractor={(item, i) => item._id || item.product_id || String(i)}
                            contentContainerStyle={returnCart.length === 0 ? { flexGrow: 1 } : null}
                            ListHeaderComponent={() => (
                                <View style={styles.tableHeader}>
                                    <View style={[styles.thCell, { flex: 2.5 }]}>
                                        <Text style={styles.th}>Medicine</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.0, alignItems: 'center' }]}>
                                        <Text style={styles.th}>Sold Qty</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.2, alignItems: 'center' }]}>
                                        <Text style={[styles.th, { color: COLORS.error }]}>Return Qty</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.0, alignItems: 'center' }]}>
                                        <Text style={styles.th}>MRP</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 0.9, alignItems: 'center' }]}>
                                        <Text style={styles.th}>Disc%</Text>
                                    </View>
                                    <View style={[styles.thCell, { flex: 1.2, alignItems: 'flex-end', borderRightWidth: 0 }]}>
                                        <Text style={styles.th}>Refund Amt</Text>
                                    </View>
                                </View>
                            )}
                            stickyHeaderIndices={[0]}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyTable}>
                                    <Ionicons name="return-down-back-outline" size={44} color={COLORS.border} />
                                    <Text style={styles.emptyText}>No Invoice Selected</Text>
                                    <Text style={styles.emptySubtext}>Search and select an invoice to begin return</Text>
                                </View>
                            )}
                            renderItem={({ item, index }) => {
                                const isLoose = item.is_loose_mode;
                                const price = getPrice(item);
                                const disc = item.discount_percent || 0;
                                
                                let refundLineTotal = 0;
                                if (isLoose) {
                                    const pricePerTab = Number(item.loose_price_per_tablet || price / (item.tablets_per_strip || 10));
                                    refundLineTotal = pricePerTab * item.return_qty * (1 - disc / 100);
                                } else {
                                    refundLineTotal = price * item.return_qty * (1 - disc / 100);
                                }
                                
                                const isReturning = item.return_qty > 0;

                                return (
                                    <View style={[
                                        styles.tableRow, 
                                        index % 2 !== 0 && { backgroundColor: '#F9F9F9' },
                                        isReturning && { backgroundColor: '#FEF2F2' } // Light red tint if returning
                                    ]}>
                                        <View style={[styles.tdCell, { flex: 2.5, paddingVertical: 4 }]}>
                                            <Text style={[styles.tdName, isReturning && { color: COLORS.error }]} numberOfLines={2}>
                                                {item.medicine_name || 'Unknown'} {isLoose ? '(Loose)' : ''}
                                            </Text>
                                        </View>

                                        {/* Sold Qty */}
                                        <View style={[styles.tdCell, { flex: 1.0, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Text style={styles.tdValue}>{item.original_qty}</Text>
                                        </View>
                                        
                                        {/* Return Qty Editable */}
                                        <View style={[styles.tdCell, { flex: 1.2, alignItems: 'center', justifyContent: 'center' }]}>
                                            <View style={[styles.qtyCell, isReturning && { borderColor: COLORS.error }]}>
                                                <TouchableOpacity
                                                    onPress={() => updateReturnQty(item, item.return_qty - 1)}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Ionicons name="remove" size={14} color={isReturning ? COLORS.error : COLORS.primary} />
                                                </TouchableOpacity>
                                                <TextInput
                                                    style={[styles.qtyEditInput, isReturning && { color: COLORS.error }]}
                                                    value={String(item.return_qty)}
                                                    onChangeText={(t) => {
                                                        const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                                                        if (!isNaN(n)) updateReturnQty(item, n);
                                                        else if (t === '') updateReturnQty(item, 0);
                                                    }}
                                                    keyboardType="number-pad"
                                                    selectTextOnFocus
                                                    textAlign="center"
                                                />
                                                <TouchableOpacity
                                                    onPress={() => updateReturnQty(item, item.return_qty + 1)}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Ionicons name="add" size={14} color={isReturning ? COLORS.error : COLORS.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {/* MRP */}
                                        <View style={[styles.tdCell, { flex: 1.0, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Text style={styles.tdValue}>₹{isLoose ? Number(item.loose_price_per_tablet).toFixed(2) + '/t' : price.toFixed(2)}</Text>
                                        </View>

                                        {/* Disc */}
                                        <View style={[styles.tdCell, { flex: 0.9, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Text style={[styles.tdValue, disc > 0 && { color: COLORS.error }]}>
                                                {disc > 0 ? `${disc}%` : '-'}
                                            </Text>
                                        </View>

                                        {/* Refund Amt */}
                                        <View style={[styles.tdCell, { flex: 1.2, alignItems: 'flex-end', justifyContent: 'center', borderRightWidth: 0 }]}>
                                            <Text style={[styles.tdValue, isReturning && { color: COLORS.error, fontWeight: '700' }]}>
                                                {isReturning ? `₹${refundLineTotal.toFixed(2)}` : '-'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>

                    {/* ── Status Panel ── */}
                    <View style={erpStyles.statusPanel}>
                        <View style={erpStyles.statusItem}>
                            <Text style={erpStyles.statusLabel}>RETURN ITEMS:</Text>
                            <Text style={[erpStyles.statusValue, hasItemsToReturn && { color: COLORS.error }]}>
                                {returnCart.filter(i => i.return_qty > 0).length} / {returnCart.length}
                            </Text>
                        </View>
                        <Text style={erpStyles.statusSep}>│</Text>
                        <View style={erpStyles.statusItem}>
                            <Text style={erpStyles.statusLabel}>RETURN QTY:</Text>
                            <Text style={[erpStyles.statusValue, hasItemsToReturn && { color: COLORS.error }]}>
                                {returnCart.reduce((sum, item) => sum + item.return_qty, 0)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Text style={erpStyles.statusLabel}>Terminal 01</Text>
                    </View>
                </View>

                {/* ═══════════ RIGHT PANE ═══════════ */}
                <View style={[styles.rightPane, { flex: rightFlex }]}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, padding: 8, paddingBottom: 12 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── Return Summary Section ── */}
                        <View style={erpStyles.erpTotalsBox}>
                            <View style={erpStyles.erpTotalRow}>
                                <Text style={erpStyles.erpTotalLabel}>ORIGINAL BILL TOTAL</Text>
                                <Text style={erpStyles.erpTotalValue}>₹{totals.originalTotal.toFixed(2)}</Text>
                            </View>
                            <View style={[erpStyles.erpTotalRow, { backgroundColor: '#FEF2F2' }]}>
                                <Text style={erpStyles.erpTotalLabel}>RETURN VALUE</Text>
                                <Text style={[erpStyles.erpTotalValue, { color: COLORS.error }]}>
                                    -₹{totals.returnTotal.toFixed(2)}
                                </Text>
                            </View>
                            <View style={erpStyles.erpTotalRow}>
                                <Text style={erpStyles.erpTotalLabel}>NEW BILL TOTAL</Text>
                                <Text style={erpStyles.erpTotalValue}>₹{totals.newTotal.toFixed(2)}</Text>
                            </View>
                            <View style={[erpStyles.erpGrandTotalRow, { backgroundColor: '#FEE2E2' }]}>
                                <Text style={[erpStyles.erpGrandTotalLabel, { color: '#B91C1C' }]}>TOTAL REFUND</Text>
                                <Text style={[erpStyles.erpGrandTotalValue, { color: '#B91C1C' }]}>₹{totals.refundAmount.toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* ── Refund Method ── */}
                        <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase' }}>
                            Refund Method
                        </Text>
                        <View style={[styles.payChipsRow, { marginBottom: 16, gap: 4 }]}>
                            {PAYMENT_METHODS.map((m) => (
                                <TouchableOpacity
                                    key={m.key}
                                    style={[
                                        styles.payChip,
                                        { height: 32, borderRadius: 2, borderWidth: 1, borderColor: '#C4CCCA', backgroundColor: '#F3F5F4' },
                                        paymentMethod === m.key && [styles.payChipActive, { borderColor: COLORS.error, backgroundColor: '#FEF2F2' }]
                                    ]}
                                    onPress={() => setPaymentMethod(m.key)}
                                    activeOpacity={0.7}
                                    disabled={!selectedInvoice}
                                >
                                    <Text style={[
                                        styles.payChipText,
                                        paymentMethod === m.key && [styles.payChipTextActive, { color: COLORS.error }]
                                    ]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── Process Return Button ── */}
                        <TouchableOpacity
                            style={[
                                styles.payBtn,
                                (!selectedInvoice || !hasItemsToReturn || checkoutLoading) && styles.payBtnDisabled,
                                hasItemsToReturn && { backgroundColor: COLORS.error, borderColor: COLORS.error }
                            ]}
                            onPress={handleProcessReturn}
                            disabled={!selectedInvoice || !hasItemsToReturn || checkoutLoading}
                            activeOpacity={0.8}
                        >
                            {checkoutLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="return-down-back" size={18} color="#fff" />
                                    <Text style={styles.payBtnText}>
                                        PROCESS RETURN
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        
                        {!hasItemsToReturn && selectedInvoice && (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>
                                Select quantities in cart to return
                            </Text>
                        )}
                        
                    </ScrollView>
                </View>
            </View>

            {/* ── Custom Confirm Modal ── */}
            <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
                <View style={printStyles.overlay}>
                    <View style={[printStyles.card, { padding: 20, maxWidth: 340 }]}>
                        <View style={[printStyles.iconCircle, { backgroundColor: '#FEF2F2', width: 56, height: 56 }]}>
                            <Ionicons name="alert-circle" size={32} color={COLORS.error} />
                        </View>
                        <Text style={printStyles.heading}>Confirm Return</Text>
                        <Text style={[printStyles.sub, { marginBottom: 16 }]}>
                            Are you sure you want to process this return?
                        </Text>
                        
                        <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6, width: '100%', marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Refund Amount:</Text>
                                <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 16 }}>₹{totals.refundAmount.toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Refund Method:</Text>
                                <Text style={{ color: COLORS.textPrimary, fontWeight: '700', textTransform: 'uppercase' }}>{paymentMethod}</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity 
                                style={[styles.payBtn, { flex: 1, backgroundColor: COLORS.white, borderColor: COLORS.border }]} 
                                onPress={() => setConfirmModalVisible(false)}
                            >
                                <Text style={[styles.payBtnText, { color: COLORS.textPrimary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.payBtn, { flex: 1, backgroundColor: COLORS.error, borderColor: COLORS.error }]} 
                                onPress={processReturnAPI}
                            >
                                <Text style={styles.payBtnText}>Confirm Return</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Print / Save Modal ── */}
            <Modal visible={printModalVisible} transparent animationType="fade" onRequestClose={closePrintModal}>
                <View style={printStyles.overlay}>
                    <View style={printStyles.card}>
                        <View style={printStyles.iconCircle}>
                            <Ionicons name="checkmark" size={32} color={COLORS.success} />
                        </View>
                        <Text style={printStyles.heading}>Return Processed</Text>
                        <Text style={printStyles.sub}>
                            The items have been returned and stock updated.{'\n'}
                            Refund Amount: ₹{totals.refundAmount.toFixed(2)}
                        </Text>
                        <View style={printStyles.divider} />
                        <View style={printStyles.optionRow}>
                            <TouchableOpacity style={[printStyles.optionBtn, printStyles.optionPrint]} onPress={handlePrintReceipt} activeOpacity={0.8}>
                                <View style={printStyles.optionIconWrap}>
                                    <Ionicons name="print" size={24} color={COLORS.white} />
                                </View>
                                <Text style={printStyles.optionLabel}>Print Updated Bill</Text>
                                <Text style={printStyles.optionSub}>58mm Thermal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[printStyles.optionBtn, printStyles.optionSave]} onPress={closePrintModal} activeOpacity={0.8}>
                                <View style={[printStyles.optionIconWrap, printStyles.optionIconSave]}>
                                    <Ionicons name="arrow-forward" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={[printStyles.optionLabel, printStyles.optionLabelSave]}>Done</Text>
                                <Text style={[printStyles.optionSub, { color: COLORS.textMuted }]}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ═══════════════════════════════════════════════
// STYLES (Copied from BillingScreen for consistency)
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPane: {
        backgroundColor: COLORS.bgCard,
        borderRightWidth: 0.5,
        borderRightColor: COLORS.border,
        flexDirection: 'column',
    },
    rightPane: {
        backgroundColor: COLORS.bgSurface,
    },
    inputBarRow: {
        flexDirection: 'row',
        height: 34,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    inputBarCell: {
        justifyContent: 'center',
    },
    searchRelativeWrap: {
        flex: 1,
    },
    inlineInputBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    inlineInput: {
        flex: 1,
        height: '100%',
        fontSize: 12,
        color: COLORS.textPrimary,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    selectedInvoiceBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        backgroundColor: COLORS.primaryGhost,
    },
    selectedInvoiceText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    selectedInvoiceSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EBEBEB',
        borderBottomWidth: 1,
        borderBottomColor: '#C4CCCA',
    },
    thCell: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRightWidth: 0.5,
        borderRightColor: '#C4CCCA',
        justifyContent: 'center',
    },
    th: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B807A',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8E5',
        backgroundColor: COLORS.white,
    },
    tdCell: {
        paddingHorizontal: 8,
        borderRightWidth: 0.5,
        borderRightColor: '#E2E8E5',
    },
    tdName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    tdValue: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    qtyCell: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.primary,
        borderRadius: 2,
        backgroundColor: COLORS.white,
        height: 24,
    },
    qtyBtn: {
        paddingHorizontal: 4,
        height: '100%',
        justifyContent: 'center',
        backgroundColor: COLORS.bgSurface,
    },
    qtyEditInput: {
        width: 32,
        height: '100%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
        borderLeftWidth: 0.5,
        borderRightWidth: 0.5,
        borderColor: COLORS.borderLight,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
    },
    emptyTable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    emptySubtext: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    payChipsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    payChip: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payChipActive: {},
    payChipText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    payChipTextActive: {},
    payBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 2,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.primary,
    },
    payBtnDisabled: {
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        opacity: 0.5,
    },
    payBtnText: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '700',
        color: COLORS.white,
    },
});

const erpStyles = StyleSheet.create({
    metaBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EBEBEB',
        borderBottomWidth: 1,
        borderBottomColor: '#C4CCCA',
        paddingHorizontal: 8,
        height: 22,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#6B807A',
        letterSpacing: 0.5,
        marginRight: 4,
    },
    metaValue: {
        fontSize: 10,
        fontWeight: '600',
        color: '#1A2B28',
    },
    metaSep: {
        fontSize: 9,
        color: '#C4CCCA',
        marginHorizontal: 8,
    },
    statusPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F5F4',
        borderTopWidth: 1,
        borderTopColor: '#C4CCCA',
        paddingHorizontal: 12,
        height: 28,
        marginTop: 'auto',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B807A',
        marginRight: 4,
    },
    statusValue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1A2B28',
    },
    statusSep: {
        fontSize: 10,
        color: '#C4CCCA',
        marginHorizontal: 10,
    },
    erpTotalsBox: {
        borderWidth: 1,
        borderColor: '#C4CCCA',
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
    },
    erpTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8E5',
    },
    erpTotalLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B807A',
    },
    erpTotalValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A2B28',
    },
    erpGrandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: '#D1FAE5',
    },
    erpGrandTotalLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#065F46',
    },
    erpGrandTotalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#065F46',
    },
    dropdownBox: {
        position: 'absolute',
        top: 34,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#C4CCCA',
        borderRadius: 2,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden',
    },
    dropdownHeader: {
        flexDirection: 'row',
        backgroundColor: '#EBEBEB',
        borderBottomWidth: 1,
        borderBottomColor: '#C4CCCA',
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    dropdownHeaderCol: {
        fontSize: 9,
        fontWeight: '700',
        color: '#6B807A',
        letterSpacing: 0.5,
    },
    dropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8E5',
    },
    dropdownColText: {
        fontSize: 11,
        color: '#1A2B28',
    },
    dropdownColTextBold: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1A2B28',
    },
});

const printStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '85%',
        maxWidth: Math.min(360, Dimensions.get('window').width * 0.85),
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: 20,
        alignItems: 'center',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.successLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    heading: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    sub: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    divider: {
        height: 0.5,
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
        borderRadius: RADIUS.md,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 6,
    },
    optionPrint: {
        backgroundColor: COLORS.primary,
    },
    optionSave: {
        backgroundColor: COLORS.white,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    optionIconWrap: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    optionIconSave: {
        backgroundColor: COLORS.primaryGhost,
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
        textAlign: 'center',
    },
    optionLabelSave: {
        color: COLORS.textPrimary,
    },
    optionSub: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '500',
    },
});
