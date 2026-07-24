import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { COLORS, FONTS } from '../../../../core/constants/theme';

const TicTacToe = () => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true); // Player is X
    const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
    const [gameOver, setGameOver] = useState(false);
    
    // For premium feel
    const [scaleAnims] = useState(Array(9).fill(0).map(() => new Animated.Value(0)));
    const strikeAnim = useRef(new Animated.Value(0)).current;

    const calculateWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return { winner: squares[a], line: lines[i], index: i };
            }
        }
        return null;
    };

    const checkGameState = (currentBoard) => {
        const winResult = calculateWinner(currentBoard);
        if (winResult) {
            setGameOver(true);
            if (winResult.winner === 'X') {
                setScores(s => ({ ...s, player: s.player + 1 }));
            } else {
                setScores(s => ({ ...s, ai: s.ai + 1 }));
            }
            // Animate strikethrough
            Animated.timing(strikeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: false
            }).start();
            return true;
        }
        
        if (currentBoard.every(s => s !== null)) {
            setGameOver(true);
            setScores(s => ({ ...s, draws: s.draws + 1 }));
            return true;
        }
        return false;
    };

    // AI Logic
    const makeAIMove = (currentBoard) => {
        const emptyIndices = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (emptyIndices.length === 0) return;

        // 1. Try to win
        for (let i of emptyIndices) {
            const testBoard = [...currentBoard];
            testBoard[i] = 'O';
            if (calculateWinner(testBoard)?.winner === 'O') return i;
        }

        // 2. Try to block X
        for (let i of emptyIndices) {
            const testBoard = [...currentBoard];
            testBoard[i] = 'X';
            if (calculateWinner(testBoard)?.winner === 'X') return i;
        }

        // 3. Take center if available
        if (emptyIndices.includes(4)) return 4;

        // 4. Random move
        const randomIdx = Math.floor(Math.random() * emptyIndices.length);
        return emptyIndices[randomIdx];
    };

    useEffect(() => {
        if (!isPlayerTurn && !gameOver) {
            const timer = setTimeout(() => {
                const move = makeAIMove(board);
                if (move !== undefined) {
                    const newBoard = [...board];
                    newBoard[move] = 'O';
                    setBoard(newBoard);
                    
                    // Animate O
                    Animated.spring(scaleAnims[move], {
                        toValue: 1,
                        friction: 4,
                        useNativeDriver: true
                    }).start();

                    if (!checkGameState(newBoard)) {
                        setIsPlayerTurn(true);
                    }
                }
            }, 600); // Artificial thinking delay
            return () => clearTimeout(timer);
        }
    }, [isPlayerTurn, gameOver, board]);

    const handlePress = (index) => {
        if (board[index] || gameOver || !isPlayerTurn) return;

        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        setIsPlayerTurn(false);

        // Animate X
        Animated.spring(scaleAnims[index], {
            toValue: 1,
            friction: 4,
            useNativeDriver: true
        }).start();

        checkGameState(newBoard);
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setGameOver(false);
        setIsPlayerTurn(true);
        scaleAnims.forEach(anim => anim.setValue(0));
        strikeAnim.setValue(0);
    };

    const renderSquare = (index) => {
        const val = board[index];
        const winResult = calculateWinner(board);
        const isWinningSquare = winResult && winResult.line.includes(index);

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.square,
                    isWinningSquare && styles.winningSquare
                ]}
                onPress={() => handlePress(index)}
                activeOpacity={0.6}
            >
                <Animated.Text style={[
                    styles.squareText,
                    { color: val === 'X' ? COLORS.primary : '#E74C3C' },
                    { transform: [{ scale: scaleAnims[index] }] }
                ]}>
                    {val}
                </Animated.Text>
            </TouchableOpacity>
        );
    };

    const winResult = calculateWinner(board);
    const isDraw = gameOver && !winResult;

    // Determine Strikethrough style
    const getStrikeStyle = () => {
        if (!winResult) return { display: 'none' };
        
        const idx = winResult.index;
        // Board size: 3 * 80 + 2 * 6(gaps) = 252
        // Centers: col0: 40, col1: 126, col2: 212
        
        let style = { display: 'flex' };
        
        // Horizontal lines (0, 1, 2)
        if (idx === 0) style = { ...style, top: 40, left: 10, width: '92%' };
        if (idx === 1) style = { ...style, top: 126, left: 10, width: '92%' };
        if (idx === 2) style = { ...style, top: 212, left: 10, width: '92%' };
        
        // Vertical lines (3, 4, 5)
        if (idx === 3) style = { ...style, top: 10, left: 40, height: '92%', width: 6 };
        if (idx === 4) style = { ...style, top: 10, left: 126, height: '92%', width: 6 };
        if (idx === 5) style = { ...style, top: 10, left: 212, height: '92%', width: 6 };
        
        // Diagonals (6, 7)
        if (idx === 6) { // top-left to bottom-right
            style = { ...style, top: 123, left: -20, width: '115%', transform: [{ rotate: '45deg' }] };
        }
        if (idx === 7) { // bottom-left to top-right
            style = { ...style, top: 123, left: -20, width: '115%', transform: [{ rotate: '-45deg' }] };
        }
        
        return style;
    };

    const strikeStyle = getStrikeStyle();
    
    // Scale the width/height based on strikeAnim
    let animStyle = {};
    if (winResult) {
        if ([0, 1, 2, 6, 7].includes(winResult.index)) {
            // Horizontal or diagonal lines animate width
            animStyle = {
                width: strikeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', strikeStyle.width]
                })
            };
        } else {
            // Vertical lines animate height
            animStyle = {
                height: strikeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', strikeStyle.height]
                })
            };
        }
    }

    const { width: windowWidth } = useWindowDimensions();
    const CANVAS_WIDTH = 360;
    const CANVAS_HEIGHT = 540; // Increased to fit the restart button
    const containerWidth = Math.min(CANVAS_WIDTH, windowWidth - 40);
    const scaleFactor = containerWidth / CANVAS_WIDTH;

    return (
        <View style={[styles.container, { 
            width: CANVAS_WIDTH * scaleFactor, 
            height: CANVAS_HEIGHT * scaleFactor 
        }]}>
            <View style={[styles.scaleWrapper, { transform: [{ scale: scaleFactor }] }]}>
            {/* Scoreboard */}
            <View style={styles.scoreBoard}>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreLabel}>YOU (X)</Text>
                    <Text style={[styles.scoreValue, { color: COLORS.primary }]}>{scores.player}</Text>
                </View>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreLabel}>DRAWS</Text>
                    <Text style={[styles.scoreValue, { color: '#7f8c8d' }]}>{scores.draws}</Text>
                </View>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreLabel}>AI (O)</Text>
                    <Text style={[styles.scoreValue, { color: '#E74C3C' }]}>{scores.ai}</Text>
                </View>
            </View>
            
            <View style={styles.statusContainer}>
                {winResult ? (
                    <Text style={styles.statusText}>
                        <Text style={{fontFamily: FONTS.bold, color: winResult.winner === 'X' ? COLORS.primary : '#E74C3C'}}>
                            {winResult.winner === 'X' ? 'You Won! 🎉' : 'AI Won! 🤖'}
                        </Text>
                    </Text>
                ) : isDraw ? (
                    <Text style={[styles.statusText, { fontFamily: FONTS.bold }]}>It's a Draw! 🤝</Text>
                ) : (
                    <Text style={styles.statusText}>
                        {isPlayerTurn ? 'Your Turn' : 'AI is thinking...'}
                    </Text>
                )}
            </View>

            <View style={styles.boardContainer}>
                <View style={styles.board}>
                    {[0, 1, 2].map(row => (
                        <View key={row} style={styles.row}>
                            {[0, 1, 2].map(col => renderSquare(row * 3 + col))}
                        </View>
                    ))}
                    
                    {/* Strikethrough Animation Layer */}
                    {winResult && (
                        <Animated.View 
                            style={[
                                styles.strikethrough,
                                strikeStyle,
                                animStyle
                            ]} 
                        />
                    )}
                </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
                <Text style={styles.resetButtonText}>{gameOver ? 'Play Again' : 'Restart'}</Text>
            </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        alignSelf: 'center',
        borderRadius: 20,
    },
    scaleWrapper: {
        width: 360,
        height: 540, // Increased to match new CANVAS_HEIGHT
        alignItems: 'center',
        padding: 24,
        backgroundColor: COLORS.bgCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        transformOrigin: 'top left', // Scale from top-left
    },
    scoreBoard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    scoreBadge: {
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        minWidth: 80,
    },
    scoreLabel: {
        fontFamily: FONTS.bold,
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    scoreValue: {
        fontFamily: FONTS.bold,
        fontSize: 22,
    },
    statusContainer: {
        marginBottom: 24,
        height: 24,
        justifyContent: 'center',
    },
    statusText: {
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    boardContainer: {
        backgroundColor: COLORS.border,
        borderRadius: 12,
        padding: 8, // outer rim
    },
    board: {
        backgroundColor: COLORS.border,
        gap: 6, // grid lines thickness
        position: 'relative', // for strikethrough overlay
    },
    row: {
        flexDirection: 'row',
        gap: 6,
    },
    square: {
        width: 80,
        height: 80,
        backgroundColor: COLORS.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    winningSquare: {
        backgroundColor: '#f1f8f5',
    },
    squareText: {
        fontFamily: FONTS.bold,
        fontSize: 42,
    },
    strikethrough: {
        position: 'absolute',
        backgroundColor: COLORS.primaryDark,
        height: 6, // default thickness
        borderRadius: 3,
        zIndex: 10,
    },
    resetButton: {
        marginTop: 32,
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    resetButtonText: {
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
        fontSize: 15,
        letterSpacing: 0.5,
    }
});

export default TicTacToe;
