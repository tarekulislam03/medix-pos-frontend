import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZES, FONTS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { getGstSummary } from '../services/gstService';
import * as XLSX from 'xlsx';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function GstFilingScreen() {
    const r = useResponsive();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [activeTab, setActiveTab] = useState('summary'); // summary, purchases, sales

    const fetchGst = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getGstSummary(year, month);
            if (res.success) {
                setSummary(res.summary);
                setPurchases(res.purchases || []);
                setSales(res.sales || []);
            }
        } catch (error) {
            console.error('Failed to fetch GST summary:', error);
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        fetchGst();
    }, [fetchGst]);

    const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDownloadExcel = () => {
        const salesData = [];
        const hsnMap = {};

        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                salesData.push({
                    'Invoice No': sale.invoice_number,
                    'Date': new Date(sale.created_at).toLocaleDateString('en-IN'),
                    'Customer': sale.customer_name || 'Walk-in',
                    'HSN Code': item.hsn_code || 'N/A',
                    'Item Name': item.medicine_name,
                    'Qty': item.quantity,
                    'Discount': item.discount_amount || 0,
                    'Taxable Value': item.taxable_amount,
                    'Rate (%)': item.gst_percent,
                    'CGST': item.cgst_amount,
                    'SGST': item.sgst_amount,
                    'IGST': item.igst_amount || 0,
                    'Total Value': item.total
                });

                const hsn = item.hsn_code || 'N/A';
                if (!hsnMap[hsn]) {
                    hsnMap[hsn] = { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
                }
                hsnMap[hsn].qty += item.quantity;
                hsnMap[hsn].taxable += item.taxable_amount;
                hsnMap[hsn].cgst += item.cgst_amount;
                hsnMap[hsn].sgst += item.sgst_amount;
                hsnMap[hsn].igst += (item.igst_amount || 0);
                hsnMap[hsn].total += item.total;
            });
        });

        const purchaseData = [];
        purchases.forEach(purchase => {
            (purchase.items || []).forEach(item => {
                purchaseData.push({
                    'Supplier Name': purchase.supplier_name || 'N/A',
                    'Invoice No': purchase.invoice_number || purchase._id.substring(0,8),
                    'Date': new Date(purchase.purchase_date || purchase.createdAt).toLocaleDateString('en-IN'),
                    'HSN Code': item.hsn_code || 'N/A',
                    'Item Name': item.medicine_name || item.product_name || 'Unknown',
                    'Qty': item.quantity || item.received_quantity || 0,
                    'Taxable Value': item.taxable_amount || 0,
                    'Rate (%)': item.gst_percent || 0,
                    'CGST': item.cgst_amount || 0,
                    'SGST': item.sgst_amount || 0,
                    'IGST': item.igst_amount || 0,
                    'Total Value': item.total || 0
                });
            });
        });

        const hsnData = Object.keys(hsnMap).map(hsn => ({
            'HSN Code': hsn,
            'Total Qty': hsnMap[hsn].qty,
            'Total Taxable': hsnMap[hsn].taxable,
            'Total CGST': hsnMap[hsn].cgst,
            'Total SGST': hsnMap[hsn].sgst,
            'Total IGST': hsnMap[hsn].igst,
            'Total Value': hsnMap[hsn].total
        }));

        const wb = XLSX.utils.book_new();
        
        const wsSales = XLSX.utils.json_to_sheet(salesData.length ? salesData : [{ Message: 'No sales for this month' }]);
        XLSX.utils.book_append_sheet(wb, wsSales, "GSTR-1 (Sales)");

        const wsPurchases = XLSX.utils.json_to_sheet(purchaseData.length ? purchaseData : [{ Message: 'No purchases for this month' }]);
        XLSX.utils.book_append_sheet(wb, wsPurchases, "GSTR-3B (Purchases)");

        const wsHsn = XLSX.utils.json_to_sheet(hsnData.length ? hsnData : [{ Message: 'No HSN data' }]);
        XLSX.utils.book_append_sheet(wb, wsHsn, "HSN Summary");

        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
        XLSX.writeFile(wb, `GST_Report_${monthName}_${year}.xlsx`);
    };

    if (r.isSmall) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgDark, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Ionicons name="desktop-outline" size={64} color={COLORS.border} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 }}>
                    Not Available on Mobile
                </Text>
            </View>
        );
    }

    const renderPurchaseRow = ({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
            <View style={[styles.cell, { flex: 1.2 }]}><Text style={styles.cellText}>{item.bill_date ? formatDate(item.bill_date) : formatDate(item.createdAt)}</Text></View>
            <View style={[styles.cell, { flex: 1.5 }]}><Text style={styles.cellText}>{item.bill_no || '—'}</Text></View>
            <View style={[styles.cell, { flex: 2 }]}><Text style={styles.cellText} numberOfLines={1}>{item.supplier_name || '—'}</Text></View>
            <View style={[styles.cell, { flex: 1.5 }]}><Text style={styles.cellText}>{item.supplier_gstin || '—'}</Text></View>
            <View style={[styles.cell, { flex: 1.2, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{formatCurrency(item.taxable_amount)}</Text></View>
            <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{formatCurrency(item.cgst_amount)}</Text></View>
            <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.cellText}>{formatCurrency(item.sgst_amount)}</Text></View>
        </View>
    );

    const renderSaleRow = ({ item, index }) => (
        <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
            <View style={[styles.cell, { flex: 1.2 }]}><Text style={styles.cellText}>{formatDate(item.created_at)}</Text></View>
            <View style={[styles.cell, { flex: 1.5 }]}><Text style={styles.cellText}>{item.invoice_number}</Text></View>
            <View style={[styles.cell, { flex: 2 }]}><Text style={styles.cellText} numberOfLines={1}>{item.customer_name || 'Walk-in'}</Text></View>
            <View style={[styles.cell, { flex: 1.2, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{formatCurrency(item.total_taxable)}</Text></View>
            <View style={[styles.cell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.cellText}>{formatCurrency(item.total_cgst)}</Text></View>
            <View style={[styles.cell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.cellText}>{formatCurrency(item.total_sgst)}</Text></View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>GST Filing Portal</Text>
                    <Text style={styles.headerSub}>Generate and review monthly GST summaries</Text>
                </View>
                <View style={styles.headerActions}>
                    {/* Native select elements for web simplicity */}
                    {Platform.OS === 'web' ? (
                        <>
                            <select
                                style={styles.nativeSelect}
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <select
                                style={styles.nativeSelect}
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                            >
                                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </>
                    ) : null}

                    {Platform.OS === 'web' && (
                        <TouchableOpacity 
                            style={styles.downloadBtn} 
                            onPress={handleDownloadExcel}
                            disabled={loading || (!sales.length && !purchases.length)}
                        >
                            <Ionicons name="download-outline" size={16} color="#fff" />
                            <Text style={styles.downloadBtnText}>Download Excel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Scorecards */}
            {summary && (
                <View style={styles.scorecards}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Input Tax Credit</Text>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.infoLight }]}>
                                <Ionicons name="arrow-down-outline" size={FONT_SIZES.sm} color={COLORS.info} />
                            </View>
                        </View>
                        <Text style={styles.cardValue}>{formatCurrency(summary.total_input_tax)}</Text>
                        <Text style={styles.cardDesc}>From {purchases.length} purchase bills</Text>
                    </View>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Output Tax Liability</Text>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.warningLight }]}>
                                <Ionicons name="arrow-up-outline" size={FONT_SIZES.sm} color={COLORS.warning} />
                            </View>
                        </View>
                        <Text style={styles.cardValue}>{formatCurrency(summary.total_output_tax)}</Text>
                        <Text style={styles.cardDesc}>From {sales.length} sales invoices</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: summary.net_gst > 0 ? COLORS.errorLight : COLORS.successLight, borderColor: summary.net_gst > 0 ? COLORS.error : COLORS.success }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: summary.net_gst > 0 ? COLORS.error : COLORS.success }]}>
                                {summary.net_gst > 0 ? 'Net GST Payable' : 'Net GST Refundable'}
                            </Text>
                            <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
                                <Ionicons name="calculator-outline" size={FONT_SIZES.sm} color={summary.net_gst > 0 ? COLORS.error : COLORS.success} />
                            </View>
                        </View>
                        <Text style={[styles.cardValue, { color: summary.net_gst > 0 ? COLORS.error : COLORS.success }]}>{formatCurrency(Math.abs(summary.net_gst))}</Text>
                        <Text style={[styles.cardDesc, { color: summary.net_gst > 0 ? COLORS.error : COLORS.success }]}>End of month calculation</Text>
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === 'summary' && styles.activeTab]} onPress={() => setActiveTab('summary')}>
                    <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'purchases' && styles.activeTab]} onPress={() => setActiveTab('purchases')}>
                    <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>Purchases (B2B)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'sales' && styles.activeTab]} onPress={() => setActiveTab('sales')}>
                    <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>Sales (B2C)</Text>
                </TouchableOpacity>
            </View>

            {/* Content area */}
            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : activeTab === 'summary' && summary ? (
                    <View style={styles.summarySection}>
                        <View style={styles.summaryBlock}>
                            <Text style={styles.summaryBlockTitle}>Tax Breakdown</Text>
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total Taxable Purchases:</Text><Text style={styles.summaryVal}>{formatCurrency(summary.input_taxable)}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total CGST (Input):</Text><Text style={styles.summaryVal}>{formatCurrency(summary.input_cgst)}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total SGST (Input):</Text><Text style={styles.summaryVal}>{formatCurrency(summary.input_sgst)}</Text></View>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total Taxable Sales:</Text><Text style={styles.summaryVal}>{formatCurrency(summary.output_taxable)}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total CGST (Output):</Text><Text style={styles.summaryVal}>{formatCurrency(summary.output_cgst)}</Text></View>
                            <View style={styles.summaryRow}><Text style={styles.summaryKey}>Total SGST (Output):</Text><Text style={styles.summaryVal}>{formatCurrency(summary.output_sgst)}</Text></View>
                        </View>
                    </View>
                ) : activeTab === 'purchases' ? (
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.th}>Date</Text></View>
                            <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>Invoice No</Text></View>
                            <View style={[styles.thCell, { flex: 2 }]}><Text style={styles.th}>Supplier Name</Text></View>
                            <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>GSTIN</Text></View>
                            <View style={[styles.thCell, { flex: 1.2, alignItems: 'flex-end' }]}><Text style={styles.th}>Taxable</Text></View>
                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.th}>CGST</Text></View>
                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>SGST</Text></View>
                        </View>
                        <FlatList
                            data={purchases}
                            keyExtractor={item => item._id}
                            renderItem={renderPurchaseRow}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                ) : activeTab === 'sales' ? (
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <View style={[styles.thCell, { flex: 1.2 }]}><Text style={styles.th}>Date</Text></View>
                            <View style={[styles.thCell, { flex: 1.5 }]}><Text style={styles.th}>Invoice No</Text></View>
                            <View style={[styles.thCell, { flex: 2 }]}><Text style={styles.th}>Customer</Text></View>
                            <View style={[styles.thCell, { flex: 1.2, alignItems: 'flex-end' }]}><Text style={styles.th}>Taxable</Text></View>
                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end' }]}><Text style={styles.th}>CGST</Text></View>
                            <View style={[styles.thCell, { flex: 1, alignItems: 'flex-end', borderRightWidth: 0 }]}><Text style={styles.th}>SGST</Text></View>
                        </View>
                        <FlatList
                            data={sales}
                            keyExtractor={item => item._id}
                            renderItem={renderSaleRow}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgDark, padding: SPACING.xl },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    headerTitle: { fontSize: FONT_SIZES.lg, fontFamily: FONTS.bold, color: COLORS.textPrimary },
    headerSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 4, fontFamily: FONTS.regular },
    headerActions: { flexDirection: 'row', gap: SPACING.sm },
    nativeSelect: {
        height: 32,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        fontSize: FONT_SIZES.xs,
        fontFamily: FONTS.regular,
        color: COLORS.textPrimary,
        outlineStyle: 'none',
        cursor: 'pointer'
    },

    scorecards: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.xl },
    card: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        padding: SPACING.md,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    cardTitle: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    iconBox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardValue: { fontSize: FONT_SIZES.xl, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
    cardDesc: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },

    tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.border, marginBottom: SPACING.md },
    tab: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: COLORS.primary },
    tabText: { fontSize: FONT_SIZES.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    activeTabText: { color: COLORS.primary, fontFamily: FONTS.bold },

    contentArea: { flex: 1 },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    summarySection: { flex: 1, alignItems: 'center', paddingTop: SPACING.xl },
    summaryBlock: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 0.5, borderColor: COLORS.border, width: 380, padding: SPACING.xl },
    summaryBlockTitle: { fontSize: FONT_SIZES.md, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md, textAlign: 'center' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs },
    summaryKey: { fontSize: FONT_SIZES.xs, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    summaryVal: { fontSize: FONT_SIZES.xs, fontFamily: FONTS.bold, color: COLORS.textPrimary },
    divider: { height: 0.5, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

    tableContainer: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.sm, borderWidth: 0.5, borderColor: COLORS.border, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: COLORS.bgSurface, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
    thCell: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderRightWidth: 0.5, borderRightColor: COLORS.border },
    th: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
    tableRowAlt: { backgroundColor: COLORS.bgInput },
    cell: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderRightWidth: 0.5, borderRightColor: COLORS.border, justifyContent: 'center' },
    cellText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textPrimary },
});
