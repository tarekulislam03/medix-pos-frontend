import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import api from '../services/api';
import { COLORS } from '../constants/theme';

export default function AdminPurchaseUploadScreen() {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [jsonPayload, setJsonPayload] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch all stores
        api.get('/user/stores')
            .then(res => {
                if (res.data?.success) {
                    setStores(res.data.data);
                }
            })
            .catch(err => {
                console.error("Failed to load stores", err);
                Alert.alert('Error', 'Failed to load stores');
            });
    }, []);

    const handleSubmit = async () => {
        if (!selectedStore) {
            return Alert.alert('Validation Error', 'Please select a store.');
        }
        if (!jsonPayload.trim()) {
            return Alert.alert('Validation Error', 'Please provide the JSON payload.');
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonPayload);
        } catch (e) {
            return Alert.alert('Format Error', 'Invalid JSON payload. Please check your JSON syntax.');
        }

        setLoading(true);
        try {
            // Inject storeId into payload so backend knows which store to update
            parsed.storeId = selectedStore;

            const res = await api.post('/purchase/manual', parsed);
            if (res.data?.success) {
                Alert.alert('Success', 'Manual purchase successfully uploaded to the selected store!');
                setJsonPayload('');
            } else {
                Alert.alert('Error', res.data?.message || 'Failed to upload purchase');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Upload Error', error?.message || 'An error occurred during upload');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Admin Panel: Purchase Upload</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Select Store</Text>
                {Platform.OS === 'web' ? (
                    <select
                        style={styles.webSelect}
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                    >
                        <option value="">-- Choose a Store --</option>
                        {stores.map(s => (
                            <option key={s._id} value={s._id}>{s.storeName}</option>
                        ))}
                    </select>
                ) : (
                    <View style={styles.fallbackPicker}>
                        {stores.map(s => (
                            <TouchableOpacity 
                                key={s._id} 
                                style={[styles.storeBtn, selectedStore === s._id && styles.storeBtnActive]}
                                onPress={() => setSelectedStore(s._id)}
                            >
                                <Text style={[styles.storeBtnText, selectedStore === s._id && styles.storeBtnTextActive]}>
                                    {s.storeName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>JSON Payload</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    placeholder={`{\n  "supplier_name": "...",\n  "items": [...]\n}`}
                    value={jsonPayload}
                    onChangeText={setJsonPayload}
                />
            </View>

            <TouchableOpacity 
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
                onPress={handleSubmit} 
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.submitBtnText}>Submit to Selected Store</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    scrollContent: {
        padding: 20,
        maxWidth: 800,
        marginHorizontal: 'auto',
        width: '100%',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
        marginBottom: 8,
    },
    webSelect: {
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        fontSize: 14,
        fontFamily: 'inherit',
    },
    fallbackPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    storeBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgSurface,
    },
    storeBtnActive: {
        backgroundColor: COLORS.primaryGhost,
        borderColor: COLORS.primary,
    },
    storeBtnText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    storeBtnTextActive: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    textArea: {
        height: 350,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 12,
        fontSize: 13,
        fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
        textAlignVertical: 'top',
        outlineStyle: 'none',
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});
