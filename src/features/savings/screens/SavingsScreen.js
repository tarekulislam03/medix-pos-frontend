import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../core/constants/theme';
import { getExpirySavings } from '../services/savingsService';
import Skeleton from '../../../core/components/Skeleton';

const MONTH_NAMES = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export default function SavingsScreen() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const result = await getExpirySavings();
            if (result) setData(result);
        } catch (e) {
            console.error('Failed to fetch savings:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const renderLoading = () => (
        <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.statCard, { height: 80, flex: 1 }]}><Skeleton width="100%" height="100%" /></View>
                <View style={[styles.statCard, { height: 80, flex: 1 }]}><Skeleton width="100%" height="100%" /></View>
                <View style={[styles.statCard, { height: 80, flex: 1 }]}><Skeleton width="100%" height="100%" /></View>
            </View>
            <Text style={[styles.sectionTitle, { opacity: 0.20, marginTop: 10 }]}>Currently At Risk</Text>
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <View style={[styles.thCell, { flex: 2 }]}><Skeleton width="40%" height={10} /></View>
                    <View style={[styles.thCell, { flex: 1 }]}><Skeleton width="50%" height={10} /></View>
                    <View style={[styles.thCell, { flex: 1 }]}><Skeleton width="30%" height={10} /></View>
                    <View style={[styles.thCell, { flex: 1.5 }]}><Skeleton width="40%" height={10} /></View>
                    <View style={[styles.thCell, { flex: 1.5, borderRightWidth: 0 }]}><Skeleton width="40%" height={10} /></View>
                </View>
                {[...Array(5)].map((_, i) => (
                    <View key={i} style={[styles.tableRow, { height: 46 }]}>
                        <View style={[styles.cell, { flex: 2 }]}><Skeleton width="50%" height={12} /></View>
                        <View style={[styles.cell, { flex: 1 }]}><Skeleton width="70%" height={12} /></View>
                        <View style={[styles.cell, { flex: 1 }]}><Skeleton width="40%" height={12} /></View>
                        <View style={[styles.cell, { flex: 1.5 }]}><Skeleton width="60%" height={12} /></View>
                        <View style={[styles.cell, { flex: 1.5, borderRightWidth: 0 }]}><Skeleton width="50%" height={16} /></View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Savings</Text>
                    <Text style={styles.headerSub}>Expiry Loss Prevention & Tracking</Text>
                </View>
                <TouchableOpacity style={styles.btnSecondary} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.btnSecondaryText}>Refresh Data</Text>
                </TouchableOpacity>
            </View>

            {/* ─── CONTENT BODY ─── */}
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    renderLoading()
                ) : !data ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>Could not load savings data</Text>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {/* ─── GRAND TOTAL BAR ─── */}
                        <View style={styles.grandTotalBar}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                                <Text style={styles.grandTotalLabel}>TOTAL ESTIMATED LOSS SAVED:</Text>
                            </View>
                            <Text style={styles.grandTotalValue}>{formatCurrency(data.grand_total_saved)}</Text>
                        </View>

                        {/* ─── STATS ROW ─── */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { flex: 1 }]}>
                                <View style={styles.statHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: COLORS.primaryGhost }]}>
                                        <Ionicons name="cart-outline" size={14} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.statLabel}>SOLD IN TIME</Text>
                                </View>
                                <Text style={styles.statValue}>{formatCurrency(data.grand_sold_near_expiry_saved)}</Text>
                                <Text style={styles.statSub}>Near-expiry items successfully sold</Text>
                            </View>

                            <View style={[styles.statCard, { flex: 1 }]}>
                                <View style={styles.statHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: COLORS.infoLight }]}>
                                        <Ionicons name="swap-horizontal-outline" size={14} color={COLORS.info} />
                                    </View>
                                    <Text style={styles.statLabel}>SUPPLIER RETURNS</Text>
                                </View>
                                <Text style={styles.statValue}>{formatCurrency(data.grand_supplier_return_saved)}</Text>
                                <Text style={styles.statSub}>Expired stock returned for credit</Text>
                            </View>

                            <View style={[styles.statCard, { flex: 1 }]}>
                                <View style={styles.statHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: data.at_risk.count > 0 ? COLORS.warningLight : COLORS.primaryGhost }]}>
                                        <Ionicons name="warning-outline" size={14} color={data.at_risk.count > 0 ? COLORS.warning : COLORS.primary} />
                                    </View>
                                    <Text style={styles.statLabel}>CURRENTLY AT RISK</Text>
                                </View>
                                <Text style={[styles.statValue, data.at_risk.count > 0 && { color: COLORS.warning }]}>
                                    {formatCurrency(data.at_risk.value)}
                                </Text>
                                <Text style={styles.statSub}>{data.at_risk.count} items expiring within 90 days</Text>
                            </View>
                        </View>

                        {/* ─── AT-RISK TABLE ─── */}
                        {data.at_risk.items && data.at_risk.items.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>At-Risk Items (Expiring Soon)</Text>
                                <View style={styles.tableContainer}>
                                    <View style={styles.tableHeader}>
                                        <View style={[styles.thCell, { flex: 2 }]}><Text style={styles.th}>MEDICINE</Text></View>
                                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>BATCH</Text></View>
                                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>QTY</Text></View>
                                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>EXPIRY</Text></View>
                                        <View style={[styles.thCell, { flex: 1.5, borderRightWidth: 0 }]}><Text style={styles.th}>AT-RISK VALUE</Text></View>
                                    </View>

                                    {data.at_risk.items.map((item, idx) => {
                                        const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
                                        const now = new Date();
                                        const daysLeft = expiryDate ? Math.ceil((expiryDate - now) / 86400000) : null;
                                        const isExpired = daysLeft !== null && daysLeft < 0;
                                        
                                        let typeColor = COLORS.textPrimary;
                                        let typeBg = '#EFF2F1';
                                        let statusText = '—';

                                        if (isExpired) {
                                            typeColor = COLORS.error;
                                            typeBg = '#FDEDED';
                                            statusText = 'EXPIRED';
                                        } else if (daysLeft !== null && daysLeft <= 30) {
                                            typeColor = COLORS.warning;
                                            typeBg = '#FDF5E6';
                                            statusText = `${daysLeft}d left (Critical)`;
                                        } else if (daysLeft !== null) {
                                            typeColor = COLORS.info;
                                            typeBg = '#EAF2F8';
                                            statusText = `${daysLeft}d left`;
                                        }

                                        return (
                                            <View key={item._id || idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                                                <View style={[styles.cell, { flex: 2 }]}>
                                                    <Text style={styles.cellName} numberOfLines={1}>{item.medicine_name}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1 }]}>
                                                    <Text style={styles.cellText}>{item.batch_number || '—'}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1 }]}>
                                                    <Text style={styles.cellText}>{item.quantity}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5 }]}>
                                                    <View style={[styles.statusBadge, { backgroundColor: typeBg }]}>
                                                        <Text style={[styles.statusText, { color: typeColor }]}>{statusText}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5, borderRightWidth: 0 }]}>
                                                    <Text style={[styles.cellText, { fontWeight: '600' }]}>
                                                        {formatCurrency((item.cost_price || item.mrp || 0) * item.quantity)}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* ─── MONTHLY BREAKDOWN ─── */}
                        {data.monthly && data.monthly.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                                <View style={styles.tableContainer}>
                                    <View style={styles.tableHeader}>
                                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>MONTH</Text></View>
                                        <View style={[styles.thCell, { flex: 1 }]}><Text style={styles.th}>ITEMS</Text></View>
                                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>SOLD IN TIME</Text></View>
                                        <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>RETURNED</Text></View>
                                        <View style={[styles.thCell, { flex: 1.5, borderRightWidth: 0 }]}><Text style={styles.th}>TOTAL SAVED</Text></View>
                                    </View>

                                    {data.monthly.map((m, idx) => {
                                        const monthLabel = `${MONTH_NAMES[m.month]} ${m.year}`;
                                        return (
                                            <View key={m.key} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                                                <View style={[styles.cell, { flex: 1.5 }]}>
                                                    <Text style={[styles.cellText, { fontWeight: '500' }]}>{monthLabel}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1 }]}>
                                                    <Text style={styles.cellText}>{m.items_count}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5 }]}>
                                                    <Text style={[styles.cellText, { color: COLORS.success }]}>{formatCurrency(m.sold_near_expiry_saved)}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5 }]}>
                                                    <Text style={[styles.cellText, { color: COLORS.info }]}>{formatCurrency(m.supplier_return_saved)}</Text>
                                                </View>
                                                <View style={[styles.cell, { flex: 1.5, borderRightWidth: 0 }]}>
                                                    <Text style={[styles.cellText, { fontWeight: '700', color: COLORS.primary }]}>{formatCurrency(m.total_saved)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                        
                        {/* Info Note */}
                        <View style={styles.infoNote}>
                            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.infoText}>Savings estimated based on cost price of medicines sold within 90 days of expiry + returned items.</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
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
        color: COLORS.primary,
    },
    scroll: {
        paddingBottom: 60,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 12,
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    // Grand Total Banner
    grandTotalBar: {
        backgroundColor: '#E8F7F3',
        borderWidth: 0.5,
        borderColor: COLORS.success,
        borderRadius: 2,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    grandTotalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.success,
    },
    // Stats row
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: 2,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        padding: 12,
        justifyContent: 'center',
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    statSub: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    // Table
    tableContainer: {
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
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 10,
        fontSize: 13,
        color: COLORS.textMuted,
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 8,
    },
    infoText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
});
