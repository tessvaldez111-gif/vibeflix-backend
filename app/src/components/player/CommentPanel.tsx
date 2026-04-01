// ===== Comment Panel (Bottom Sheet for Comments) =====
import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { commentService } from '../../services/comment.service';
import { useAuthStore } from '../../stores';
import { formatRelativeTime } from '../../utils/format';
import { COLORS, SPACING } from '../../utils/constants';
import { scale, rf, getSpacing } from '../../utils/responsive';
import type { Comment } from '../../types';

interface Props {
  visible: boolean;
  dramaId: number;
  episodeId?: number;
  onClose: () => void;
}

const CommentPanel: React.FC<Props> = memo(({ visible, dramaId, episodeId, onClose }) => {
  const { t } = useTranslation();
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
      Alert.alert(t('login_required'), t('login_to_comment'));
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
      Alert.alert(t('error'), err?.message || t('comment_failed'));
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
              <Text style={styles.headerTitle}>{t('comments')}</Text>
              <View style={styles.sortRow}>
                <TouchableOpacity
                  style={[styles.sortBtn, sortMode === 'latest' && styles.sortBtnActive]}
                  onPress={() => handleSortChange('latest')}
                >
                  <Text style={[styles.sortText, sortMode === 'latest' && styles.sortTextActive]}>{t('sort_latest')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortBtn, sortMode === 'hot' && styles.sortBtnActive]}
                  onPress={() => handleSortChange('hot')}
                >
                  <Text style={[styles.sortText, sortMode === 'hot' && styles.sortTextActive]}>{t('sort_hot')}</Text>
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
                    <Text style={styles.emptyText}>{t('no_comments')}</Text>
                    <Text style={styles.emptySub}>{t('be_first_comment')}</Text>
                  </View>
                ) : null
              }
              ListFooterComponent={
                loading ? (
                  <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginVertical: 12 }} />
                ) : hasMore ? (
                  <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                    <Text style={styles.loadMoreText}>{t('load_more')}</Text>
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
                placeholder={isAuthenticated ? t('comment_placeholder') : t('login_to_comment')}
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
                  <Text style={styles.sendText}>{t('send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

const S = () => getSpacing();

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#1E1C28',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    height: '70%',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingTop: scale(12),
    paddingHorizontal: S().md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: scale(12),
  },
  handleBar: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: scale(12),
  },
  headerTitle: {
    color: '#FFF',
    fontSize: rf(16),
    fontWeight: '700',
    marginBottom: scale(10),
  },
  sortRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  sortBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(5),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sortBtnActive: {
    backgroundColor: COLORS.primary,
  },
  sortText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: rf(13),
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#FFF',
  },
  list: {
    flex: 1,
    paddingHorizontal: S().md,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  avatarText: {
    color: '#FFF',
    fontSize: rf(14),
    fontWeight: '700',
  },
  commentBody: {
    flex: 1,
  },
  commentName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: rf(12),
    marginBottom: scale(3),
  },
  commentContent: {
    color: '#FFF',
    fontSize: rf(14),
    lineHeight: rf(20),
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(6),
    gap: scale(16),
  },
  commentTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: rf(11),
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  likeIcon: {
    fontSize: rf(14),
    color: 'rgba(255,255,255,0.4)',
  },
  likeIconActive: {
    color: '#FF4757',
  },
  likeCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: rf(11),
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: scale(60),
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: rf(15),
    fontWeight: '600',
  },
  emptySub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: rf(13),
    marginTop: scale(6),
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: scale(12),
  },
  loadMoreText: {
    color: COLORS.primaryLight,
    fontSize: rf(13),
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S().md,
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: scale(10),
  },
  input: {
    flex: 1,
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: scale(16),
    color: '#FFF',
    fontSize: rf(14),
  },
  sendBtn: {
    width: scale(56),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFF',
    fontSize: rf(14),
    fontWeight: '600',
  },
});

export default CommentPanel;
