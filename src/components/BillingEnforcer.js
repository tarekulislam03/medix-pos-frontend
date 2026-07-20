import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BillingEnforcer({ children }) {
    const [billingStatus, setBillingStatus] = useState('active'); // active, warning, blocked
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [utrNumber, setUtrNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Store previous states to detect transitions reliably
    const prevScheduleRef = React.useRef(null);
    const prevStatusRef = React.useRef('active');

    useEffect(() => {
        fetchBillingStatus();
        const timer = setInterval(() => {
            fetchBillingStatus(true);
        }, 10000); // Check every 10 seconds
        return () => clearInterval(timer);
    }, []);

    const fetchBillingStatus = async (isPolling = false) => {
        try {
            const res = await api.get('/store/billing/status');
            if (res.data) {
                setBillingStatus(res.data.status);
                setSchedule(res.data.schedule);
            }
        } catch (error) {
            console.log("Failed to fetch billing status:", error);
            // If failed, assume active to not mistakenly block user on network error
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitUtr = async () => {
        if (!utrNumber.trim()) {
            Alert.alert("Error", "Please enter a valid UTR number.");
            return;
        }
        try {
            setSubmitting(true);
            await api.post('/store/billing/pay', {
                scheduleId: schedule._id,
                utrNumber: utrNumber.trim()
            });
            Alert.alert("Success", "Payment details submitted. Waiting for admin confirmation.");
            // Update local state to show 'uploaded'
            setSchedule(prev => ({ ...prev, paymentStatus: 'uploaded' }));
        } catch (error) {
            console.error("Submit UTR error:", error);
            Alert.alert("Error", "Failed to submit UTR. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bgDark, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const showModal = (billingStatus === 'blocked') || (billingStatus === 'warning' && !warningDismissed);

    return (
        <View style={{ flex: 1 }}>
            {children}

            {showModal && schedule && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
                    <View style={styles.overlay}>
                        <View style={styles.card}>
                            {billingStatus === 'warning' && (
                                <Pressable style={styles.closeBtn} onPress={() => setWarningDismissed(true)}>
                                    <Ionicons name="close" size={24} color="#A0B2AD" />
                                </Pressable>
                            )}
                            
                            <View style={styles.header}>
                                <Ionicons 
                                    name={billingStatus === 'blocked' ? "lock-closed" : "warning"} 
                                    size={40} 
                                    color={billingStatus === 'blocked' ? COLORS.error : "#F5A623"} 
                                    style={{ marginBottom: 10 }}
                                />
                                <Text style={styles.title}>
                                    {billingStatus === 'blocked' ? "App Access Blocked" : "Payment Reminder"}
                                </Text>
                            </View>

                            <View style={styles.body}>
                                <Text style={styles.message}>
                                    {billingStatus === 'blocked' 
                                        ? "Your payment is overdue by more than 10 days. Please clear your dues to regain access to the app."
                                        : "Your upcoming payment is due soon. Please ensure payment is made to avoid service interruption."}
                                </Text>

                                <View style={styles.amountBox}>
                                    <Text style={styles.amountLabel}>Amount Due:</Text>
                                    <Text style={styles.amountValue}>₹{schedule.amount}</Text>
                                </View>
                                <View style={styles.amountBox}>
                                    <Text style={styles.amountLabel}>Due Date:</Text>
                                    <Text style={styles.amountValue}>{new Date(schedule.dueDate).toDateString()}</Text>
                                </View>

                                {schedule.paymentStatus === 'uploaded' ? (
                                    <View style={styles.waitingBox}>
                                        <Ionicons name="time-outline" size={24} color="#F5A623" />
                                        <Text style={styles.waitingText}>Payment UTR uploaded. Waiting for confirmation from Admin.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.paymentSection}>
                                        <Text style={styles.payInstruction}>Please scan the QR or pay via UPI and enter the UTR number below:</Text>
                                        
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter UTR Number"
                                            placeholderTextColor="rgba(0,0,0,0.4)"
                                            value={utrNumber}
                                            onChangeText={setUtrNumber}
                                        />
                                        
                                        <Pressable 
                                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                            onPress={handleSubmitUtr}
                                            disabled={submitting}
                                        >
                                            <Text style={styles.submitBtnText}>
                                                {submitting ? "Submitting..." : "Submit Payment Details"}
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: 450,
        maxWidth: '95%',
        overflow: 'hidden',
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    header: {
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 20,
        backgroundColor: '#F4F7F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E5E3',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E2624',
    },
    body: {
        padding: 24,
    },
    message: {
        fontSize: 15,
        color: '#4A5C56',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 20,
    },
    amountBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E5E3',
    },
    amountLabel: {
        fontSize: 16,
        color: '#4A5C56',
        fontWeight: '500',
    },
    amountValue: {
        fontSize: 16,
        color: '#1E2624',
        fontWeight: 'bold',
    },
    paymentSection: {
        marginTop: 20,
    },
    payInstruction: {
        fontSize: 14,
        color: '#4A5C56',
        marginBottom: 10,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#F4F7F6',
        borderWidth: 1,
        borderColor: '#D1D8D6',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1E2624',
        marginBottom: 15,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    waitingBox: {
        marginTop: 20,
        backgroundColor: '#FFF4E5',
        padding: 15,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    waitingText: {
        flex: 1,
        marginLeft: 10,
        color: '#D97706',
        fontSize: 14,
        fontWeight: '500',
    }
});
