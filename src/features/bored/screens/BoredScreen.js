import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../core/constants/theme';

import TicTacToe from '../components/games/TicTacToe';
import DinoGame from '../components/games/DinoGame';
import FlappyBirdBored from '../components/games/FlappyBirdBored';

export default function BoredScreen() {
    const [activeGame, setActiveGame] = useState('dino'); // 'dino', 'flappy', 'tictactoe'

    const { width } = useWindowDimensions();
    const isMobile = width < 600;

    return (
        <View style={[styles.container, { padding: isMobile ? 10 : 20 }]}>
            {/* Header */}
            <View style={[styles.header, { padding: isMobile ? 12 : 20, marginBottom: isMobile ? 16 : 24 }]}>
                <Ionicons name="game-controller" size={isMobile ? 24 : 28} color={COLORS.primary} />
                <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.title, { fontSize: isMobile ? 18 : 22 }]}>Games</Text>
                    <Text style={[styles.subtitle, { fontSize: isMobile ? 12 : 14 }]}>Take a quick break and play some mini-games!</Text>
                </View>
            </View>

            {/* Game Selector Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    <TouchableOpacity
                        style={[styles.tab, activeGame === 'dino' && styles.activeTab]}
                        onPress={() => setActiveGame('dino')}
                    >
                        <Text style={{ fontSize: 18, marginRight: 8 }}>🦖</Text>
                        <Text style={[styles.tabText, activeGame === 'dino' && styles.activeTabText]}>Dino Run</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeGame === 'flappy' && styles.activeTab]}
                        onPress={() => setActiveGame('flappy')}
                    >
                        <Text style={{ fontSize: 18, marginRight: 8 }}>🐦</Text>
                        <Text style={[styles.tabText, activeGame === 'flappy' && styles.activeTabText]}>Flappy Bird</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeGame === 'tictactoe' && styles.activeTab]}
                        onPress={() => setActiveGame('tictactoe')}
                    >
                        <Text style={{ fontSize: 18, marginRight: 8 }}>❌</Text>
                        <Text style={[styles.tabText, activeGame === 'tictactoe' && styles.activeTabText]}>Tic Tac Toe</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Game Canvas Container */}
            <View style={[styles.gameContainer, { padding: isMobile ? 10 : 20 }]}>
                {activeGame === 'dino' && <DinoGame />}
                {activeGame === 'flappy' && <FlappyBirdBored />}
                {activeGame === 'tictactoe' && <TicTacToe />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: COLORS.bgSurface,
        padding: 20,
        borderRadius: 16,
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 22,
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    tabsContainer: {
        marginBottom: 24,
    },
    tabsScroll: {
        gap: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgSurface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryGhost,
    },
    tabText: {
        fontFamily: FONTS.bold,
        fontSize: 15,
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    gameContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: 'transparent',
        borderRadius: 16,
        padding: 20,
    }
});
