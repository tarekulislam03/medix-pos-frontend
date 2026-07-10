import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStockMovements } from '../services/stockMovementService';

// Enterprise theme colors from existing screens
const COLORS = {
    bgDark: '#F4F7F6',
    white: '#FFFFFF',
    border: '#E0E5E3',
    textPrimary: '#1E2624',
    textSecondary: '#4A5C56',
    textMuted: '#A0B2AD',
    primary: '#1DAB87',
    success: '#1DAB87',
    error: '#E74C3C',
};

export default function StockLedgerScreen() {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Pagination / view mode
    const [viewAll, setViewAll] = useState(false);

    useEffect(() => {
        fetchMovements();
    }, [viewAll]);

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const params = {};
            // Set limit based on viewAll state
            if (!viewAll) {
                params.limit = 10;
            } else {
                params.limit = 1000; // arbitrary large number to "view all"
            }
            
            const res = await getStockMovements(params);
            if (res && res.data) {
                setMovements(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch stock movements:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMovements();
    };

    const renderMovement = ({ item, index }) => {
        let typeColor = COLORS.textPrimary;
        let typeBg = '#EFF2F1';
        let sign = "";

        if (item.transaction_type === "SALE") {
            typeColor = COLORS.error;
            typeBg = '#FDEDED';
        } else if (item.transaction_type === "PURCHASE" || item.transaction_type === "RETURN") {
            typeColor = COLORS.success;
            typeBg = '#E8F7F3';
            sign = "+";
        } else if (item.transaction_type === "MANUAL_ADJUSTMENT" || item.transaction_type === "INITIAL_STOCK") {
            typeColor = '#2980B9';
            typeBg = '#EAF2F8';
            if (item.quantity_change > 0) sign = "+";
        }

        const dateStr = `${new Date(item.createdAt).toLocaleDateString()} ${new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

        return (
            <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.cell, { flex: 1.5 }]}>
                    <Text style={styles.cellText}>{dateStr}</Text>
                </View>
                <View style={[styles.cell, { flex: 2.5 }]}>
                    <Text style={styles.cellName} numberOfLines={1}>{item.medicine_name}</Text>
                </View>
                <View style={[styles.cell, { flex: 1.5 }]}>
                    <View style={[styles.statusBadge, { backgroundColor: typeBg }]}>
                        <Text style={[styles.statusText, { color: typeColor }]}>
                            {item.transaction_type.replace('_', ' ')}
                        </Text>
                    </View>
                </View>
                <View style={[styles.cell, { flex: 1 }]}>
                    <Text style={[styles.cellText, { color: typeColor, fontWeight: '600' }]}>
                        {sign}{item.quantity_change}
                    </Text>
                </View>
                <View style={[styles.cell, { flex: 1 }]}>
                    <Text style={[styles.cellText, { fontWeight: '600' }]}>{item.current_stock}</Text>
                </View>
                <View style={[styles.cell, { flex: 2, borderRightWidth: 0 }]}>
                    <Text style={styles.cellText} numberOfLines={2}>{item.remarks}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Stock Ledger</Text>
                    <Text style={styles.headerSub}>Track inward and outward stock movements</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleRefresh}>
                        <Ionicons name="refresh-outline" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                        <Text style={styles.btnPrimaryText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Table */}
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>DATE & TIME</Text></View>
                    <View style={[styles.thCell, { flex: 2.5 }]}><Text style={styles.th}>PRODUCT NAME</Text></View>
                    <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>TRANSACTION TYPE</Text></View>
                    <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>CHANGE</Text></View>
                    <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>BALANCE</Text></View>
                    <View style={[styles.thCell, { flex: 2, borderRightWidth: 0 }]}><Text style={styles.th}>REMARKS</Text></View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={movements}
                        keyExtractor={(item) => item._id}
                        renderItem={renderMovement}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
                                <Text style={styles.emptyText}>No stock movements found.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Pagination / View All */}
            {!loading && movements.length > 0 && (
                <View style={styles.paginationContainer}>
                    {!viewAll ? (
                        <TouchableOpacity style={styles.btnSecondary} onPress={() => setViewAll(true)}>
                            <Text style={styles.btnSecondaryText}>View All Movements</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btnSecondary} onPress={() => setViewAll(false)}>
                            <Text style={styles.btnSecondaryText}>Show Top 10</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

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
    // Buttons
    btnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
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
        paddingHorizontal: 16,
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
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textPrimary,
    },
    cellText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    centerBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 13,
        color: COLORS.textMuted,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 12,
    },
});
