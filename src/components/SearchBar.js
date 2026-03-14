import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

export default function SearchBar({
    value,
    onChangeText,
    placeholder = 'Search products...',
    onSubmit,
    inputRef,
    autoFocus = false,
}) {
    return (
        <View style={styles.container}>
            <Ionicons
                name="search-outline"
                size={22}
                color={COLORS.textMuted}
                style={styles.icon}
            />
            <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                autoFocus={autoFocus}
                returnKeyType="search"
                onSubmitEditing={onSubmit}
                autoCapitalize="none"
                autoCorrect={false}
            />
            {value?.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    style={styles.clearBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.lg,
        height: 56,
    },
    icon: {
        marginRight: SPACING.sm,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.md,
        color: COLORS.textPrimary,
        height: '100%',
    },
    clearBtn: {
        marginLeft: SPACING.sm,
        padding: SPACING.xs,
    },
});
