import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
import { searchMasterMedicines, bulkAddFromMaster } from '../services/masterDatabaseService';
import { useResponsive } from '../utils/responsive';

export default function MasterDatabaseScreen({ navigation }) {
    const r = useResponsive();

    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // selectedItems map: { [item_id]: { mrp: "...", stock: "..." } }
    const [selectedItems, setSelectedItems] = useState({});
    const [adding, setAdding] = useState(false);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (search.trim().length >= 2) {
                setLoading(true);
                searchMasterMedicines(search.trim())
                    .then(res => setResults(res.data || []))
                    .catch(err => {
                        console.error('Master DB search error:', err);
                        Alert.alert('Error', 'Failed to search master database');
                    })
                    .finally(() => setLoading(false));
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const toggleSelection = (item) => {
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[item._id]) {
                delete next[item._id];
            } else {
                next[item._id] = { 
                    mrp: item.mrp?.toString() || '0', 
                    stock: '' 
                };
            }
            return next;
        });
    };

    const updateSelectedItem = (id, field, value) => {
        setSelectedItems(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSelectAll = () => {
        if (Object.keys(selectedItems).length === results.length && results.length > 0) {
            setSelectedItems({});
        } else {
            const next = {};
            results.forEach(item => { 
                next[item._id] = { 
                    mrp: item.mrp?.toString() || '0', 
                    stock: '',
                    expiry: ''
                }; 
            });
            setSelectedItems(next);
        }
    };

    const handleAddSelected = async () => {
        const itemsToAdd = results
            .filter(m => selectedItems[m._id])
            .map(m => {
                const parseNum = (val) => {
                    if (!val) return 0;
                    const str = String(val).replace(/,/g, '.').replace(/[^\d.-]/g, '');
                    return parseFloat(str) || 0;
                };

                let parsedExpiry = null;
                const expiryVal = selectedItems[m._id].expiry;
                if (expiryVal) {
                    const parts = expiryVal.split('/');
                    if (parts.length === 2) {
                        let month = parseInt(parts[0], 10);
                        let year = parseInt(parts[1], 10);
                        if (!isNaN(month) && !isNaN(year)) {
                            if (year < 100) year += 2000;
                            if (month >= 1 && month <= 12) {
                                // Use 28th to avoid end-of-month bugs, safe for all months
                                const mm = month.toString().padStart(2, '0');
                                parsedExpiry = `${year}-${mm}-28`;
                            }
                        }
                    }
                }

                return {
                    medicine_name: m.medicine_name,
                    mrp: parseNum(selectedItems[m._id].mrp),
                    stock: parseNum(selectedItems[m._id].stock),
                    expiry_date: parsedExpiry
                };
            });

        if (itemsToAdd.length === 0) return;

        setAdding(true);
        try {
            const res = await bulkAddFromMaster(itemsToAdd);
            const addedCount = res.added?.length || 0;
            const skippedCount = res.skipped?.length || 0;
            
            Alert.alert(
                'Success',
                `${addedCount} product(s) added to your inventory.${skippedCount > 0 ? `\n${skippedCount} skipped (already exist).` : ''}`,
                [
                    { text: 'Go to Inventory', onPress: () => navigation.navigate('Inventory') },
                    { text: 'Add More', style: 'cancel' }
                ]
            );
            
            setSelectedItems({});
            
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to add products to inventory.');
        } finally {
            setAdding(false);
        }
    };

    const selectedCount = Object.keys(selectedItems).length;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Header */}
            <View style={[styles.header, r.isSmall && { height: 'auto', paddingVertical: SPACING.md }]}>
                <View style={styles.headerTitleRow}>
                    <Ionicons name="library" size={18} color={COLORS.primary} />
                    <Text style={styles.headerTitle}>Master Database</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>IMPORT</Text>
                    </View>
                </View>
                
                {!r.isSmall && selectedCount > 0 && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={styles.actionHeaderBtnPrimary}
                            onPress={handleAddSelected}
                            disabled={adding}
                        >
                            {adding ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="add-outline" size={16} color={COLORS.white} />}
                            <Text style={styles.actionHeaderBtnPrimaryText}>Add Selected ({selectedCount})</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Filter / Search Bar */}
            <View style={[styles.filterBar, r.isSmall && styles.filterBarMobile]}>
                <View style={[styles.searchBox, !r.isSmall && { width: 320 }]}>
                    <Ionicons name="search" size={14} color={COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search medicines..."
                        placeholderTextColor={COLORS.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="characters"
                        autoFocus
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results Table */}
            <View style={styles.listContainer}>
                {/* Table Header */}
                {!r.isSmall && results.length > 0 && (
                    <View style={styles.tableHeader}>
                        <View style={[styles.thCell, { flex: 0.2, alignItems: 'center' }]}>
                            <TouchableOpacity onPress={handleSelectAll}>
                                <Ionicons 
                                    name={selectedCount === results.length ? "checkbox" : "square-outline"} 
                                    size={16} 
                                    color={selectedCount === results.length ? COLORS.primary : COLORS.textMuted} 
                                />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.thCell, { flex: 2 }]}><Text style={styles.thText}>MEDICINE NAME</Text></View>
                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.thText}>DEFAULT MRP</Text></View>
                    </View>
                )}
                
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        renderItem={({ item }) => {
                            const isSelected = !!selectedItems[item._id];
                            return (
                                <View style={[styles.rowContainer, isSelected && styles.rowSelected]}>
                                    <TouchableOpacity 
                                        style={styles.rowTop} 
                                        onPress={() => toggleSelection(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.tdCell, { flex: r.isSmall ? 0.3 : 0.2, alignItems: 'center' }]}>
                                            <Ionicons 
                                                name={isSelected ? "checkbox" : "square-outline"} 
                                                size={18} 
                                                color={isSelected ? COLORS.primary : COLORS.textMuted} 
                                            />
                                        </View>
                                        <View style={[styles.tdCell, { flex: 2 }]}>
                                            <Text style={styles.cellTextBold} numberOfLines={2}>{item.medicine_name}</Text>
                                        </View>
                                        <View style={[styles.tdCell, { flex: 1 }]}>
                                            <Text style={styles.cellText}>₹{item.mrp?.toFixed(2)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {isSelected && (
                                        <View style={styles.expandedInputs}>
                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.inputLabel}>MRP (,1)</Text>
                                                    <TextInput
                                                        style={styles.inputField}
                                                        value={selectedItems[item._id].mrp}
                                                        onChangeText={(val) => updateSelectedItem(item._id, 'mrp', val)}
                                                        keyboardType="decimal-pad"
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.inputLabel}>ADD STOCK</Text>
                                                    <TextInput
                                                        style={styles.inputField}
                                                        value={selectedItems[item._id].stock}
                                                        onChangeText={(val) => updateSelectedItem(item._id, 'stock', val)}
                                                        keyboardType="decimal-pad"
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.inputLabel}>EXPIRY (MM/YY)</Text>
                                                    <TextInput
                                                        style={styles.inputField}
                                                        value={selectedItems[item._id].expiry || ''}
                                                        onChangeText={(val) => {
                                                            const digits = val.replace(/\D/g, '');
                                                            let formatted = digits;
                                                            if (digits.length >= 3) {
                                                                formatted = digits.substring(0, 2) + '/' + digits.substring(2, 4);
                                                            }
                                                            updateSelectedItem(item._id, 'expiry', formatted);
                                                        }}
                                                        placeholder="MM/YY"
                                                        keyboardType="numbers-and-punctuation"
                                                        maxLength={5}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={32} color={COLORS.border} style={{ marginBottom: SPACING.sm }} />
                                <Text style={styles.emptyText}>
                                    {search.length < 2 
                                        ? "Start typing to search master medicines" 
                                        : "No matching medicines found"}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Mobile Sticky Footer */}
            {r.isSmall && selectedCount > 0 && (
                <View style={styles.mobileFooter}>
                    <TouchableOpacity 
                        style={[styles.actionHeaderBtnPrimary, { width: '100%', height: 40 }]}
                        onPress={handleAddSelected}
                        disabled={adding}
                    >
                        {adding ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="add-outline" size={16} color={COLORS.white} />}
                        <Text style={styles.actionHeaderBtnPrimaryText}>Add Selected ({selectedCount})</Text>
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark },
    
    // Header (Enterprise Style)
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: SPACING.lg, 
        paddingVertical: 10, 
        backgroundColor: COLORS.bgSurface, 
        height: 52, 
        borderBottomWidth: 0.5, 
        borderBottomColor: COLORS.border 
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    badge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 0.5, borderColor: COLORS.primaryGhost, marginLeft: 4 },
    badgeText: { fontSize: 9, fontWeight: '700', color: COLORS.primaryDark, letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    
    // Action Button (Flat)
    actionHeaderBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        borderWidth: 0.5,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        paddingHorizontal: 12,
        height: 32
    },
    actionHeaderBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },

    // Search Bar Area
    filterBar: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: SPACING.lg, 
        paddingVertical: 8, 
        backgroundColor: COLORS.white, 
        borderBottomWidth: 0.5, 
        borderBottomColor: COLORS.borderLight, 
        gap: SPACING.md 
    },
    filterBarMobile: { flexDirection: 'column', alignItems: 'stretch', paddingVertical: SPACING.sm, gap: SPACING.sm },
    searchBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: COLORS.bgInput, 
        borderRadius: 2, 
        borderWidth: 0.5, 
        borderColor: COLORS.border, 
        paddingHorizontal: 10, 
        height: 32 
    },
    searchInput: { flex: 1, paddingVertical: 0, paddingHorizontal: 8, fontSize: 13, color: COLORS.textPrimary, outlineStyle: 'none' },

    // Table
    listContainer: { flex: 1, backgroundColor: COLORS.bgDark },
    tableHeader: { 
        flexDirection: 'row', 
        paddingHorizontal: SPACING.lg, 
        paddingVertical: 8, 
        backgroundColor: COLORS.bgSurface, 
        borderBottomWidth: 0.5, 
        borderBottomColor: COLORS.borderLight 
    },
    thCell: { paddingHorizontal: SPACING.sm, justifyContent: 'center' },
    thText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.5 },
    
    rowContainer: { backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight },
    rowTop: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingVertical: 10, alignItems: 'center' },
    rowSelected: { backgroundColor: COLORS.primarySoft },
    tdCell: { paddingHorizontal: SPACING.sm, justifyContent: 'center' },
    cellText: { fontSize: 13, color: COLORS.textPrimary },
    cellTextBold: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

    // Expanded Inputs
    expandedInputs: { flexDirection: 'row', gap: SPACING.xl, paddingHorizontal: SPACING.lg, paddingLeft: 60, paddingBottom: 12, paddingTop: 4 },
    inputGroup: { flex: 1, maxWidth: 160 },
    inputLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
    inputField: { 
        backgroundColor: COLORS.bgInput, 
        borderWidth: 0.5, 
        borderColor: COLORS.border, 
        borderRadius: 2, 
        paddingHorizontal: 8, 
        paddingVertical: 6, 
        fontSize: 13, 
        color: COLORS.textPrimary, 
        outlineStyle: 'none' 
    },

    // Empty state
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13 },

    // Mobile footer
    mobileFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight, elevation: 10 }
});
