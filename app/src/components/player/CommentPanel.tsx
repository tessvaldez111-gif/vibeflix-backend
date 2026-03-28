// ===== Comment Panel (Bottom Sheet for Comments) =====
import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { commentService } from '../../services/comment.service';
import { useAuthStore } from '../../stores';
import { formatRelativeTime } from '../../utils/format';
import { COLORS, SPACING } from '../../utils/constants';
import type { Comment } from '../../types';

interface Props {
  visible: boolean;
  dramaId: number;
  episodeId?: number;
  onClose: () => void;
}

const CommentPanel: React.FC<Props> = memo(({ visible, dramaId, episodeId, onClose }) => {
  const { isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sortMode, setSortMode] = useState<'latest' | 'hot'>('latest');
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const loadComments = useCallback(async (p: number, sort: string) => {
    setLoading(true);
    try {
      const res = await commentService.getComments(dramaId, episodeId, p, 20, sort);
      if (p === 1) {
        setComments(res.list);
      } else {
        setComments(prev => [...prev, ...res.list]);
      }
      setHasMore(res.list.length >= 20);
    } catch (_) {}
    setLoading(false);
  }, [dramaId, episodeId]);

  // Load on open
  useEffect(() => {
    if (visible) {
      setPage(1);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
      loadComments(1, sortMode);
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, dramaId, episodeId]);

  // Change sort
  const handleSortChange = (sort: 'latest' | 'hot') => {
    setSortMode(sort);
    setPage(1);
    loadComments(1, sort);
  };

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadComments(nextPage, sortMode);
    }
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }
    const text = inputText.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const newComment = await commentService.addComment(dramaId, text, episodeId);
      setComments(prev => [newComment, ...prev]);
      setInputText('');
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to post comment');
    }
    setSubmitting(false);
  };

  // Like comment
  const handleLikeComment = async (comment: Comment) => {
    if (!isAuthenticated) return;
    try {
      if (comment.is_liked) {
        await commentService.unlikeComment(comment.id);
      } else {
        await commentService.likeComment(comment.id);
      }
      setComments(prev =>
        prev.map(c => c.id === comment.id
          ? { ...c, is_liked: !c.is_liked, like_count: c.is_liked ? c.like_count - 1 : c.like_count + 1 }
          : c
        )
      );
    } catch (_) {}
  };

  const renderItem = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.nickname || item.username || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.commentBody}>
        <Text style={styles.commentName}>{item.nickname || item.username}</Text>
        <Text style={styles.commentContent}>{item.content}</Text>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{formatRelativeTime(item.created_at)}</Text>
          <TouchableOpacity style={styles.likeBtn} onPress={() => handleLikeComment(item)} activeOpacity={0.7}>
            <Text style={[styles.likeIcon, item.is_liked && styles.likeIconActive]}>
              {item.is_liked ? '\u2764' : '\u2661'}
            </Text>
            <Text style={styles.likeCount}>{item.like_count > 0 ? item.like_count : ''}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]} onStartShouldSetResponder={() => true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handleBar} />
              <Text style={styles.headerTitle}>Comments</Text>
              <View style={styles.sortRow}>
                <TouchableOpacity
                  style={[styles.sortBtn, sortMode === 'latest' && styles.sortBtnActive]}
                  onPress={() => handleSortChange('latest')}
                >
                  <Text style={[styles.sortText, sortMode === 'latest' && styles.sortTextActive]}>Latest</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortBtn, sortMode === 'hot' && styles.sortBtnActive]}
                  onPress={() => handleSortChange('hot')}
                >
                  <Text style={[styles.sortText, sortMode === 'hot' && styles.sortTextActive]}>Hot</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Comment list */}
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderItem}
              keyExtractor={item => `c-${item.id}`}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No comments yet</Text>
                    <Text style={styles.emptySub}>Be the first to comment!</Text>
                  </View>
                ) : null
              }
              ListFooterComponent={
                loading ? (
                  <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginVertical: 12 }} />
                ) : hasMore ? (
                  <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </TouchableOpacity>
                ) : null
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              style={styles.list}
            />

            {/* Input bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder={isAuthenticated ? 'Say something...' : 'Login to comment'}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={inputText}
                onChangeText={setInputText}
                editable={isAuthenticated}
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || !isAuthenticated) && styles.sendBtnDisabled]}
                onPress={handleSubmit}
                disabled={!inputText.trim() || submitting || !isAuthenticated}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#1E1C28',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sortBtnActive: {
    backgroundColor: COLORS.primary,
  },
  sortText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#FFF',
  },
  list: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  commentBody: {
    flex: 1,
  },
  commentName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 3,
  },
  commentContent: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  commentTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  likeIconActive: {
    color: '#FF4757',
  },
  likeCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 6,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    color: COLORS.primaryLight,
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 14,
  },
  sendBtn: {
    width: 56,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CommentPanel;
