import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ActionSheetIOS, Vibration,
} from 'react-native';
import type { AlertButton } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../constants/theme';
import { Message, Profile } from '../../types';
import { RootStackParams } from '../../navigation';
import AvatarComponent from '../../components/Avatar';

type Props = NativeStackScreenProps<RootStackParams, 'Chat'>;

const TYPING_TIMEOUT = 2500; // stop showing indicator after 2.5s of no input

export default function ChatScreen({ route, navigation }: Props) {
  const { matchId, otherUser } = route.params as { matchId: string; otherUser: Profile };
  const { user } = useAuth();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [blocked, setBlocked]         = useState(false);

  const listRef         = useRef<FlatList>(null);
  const typingTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef     = useRef(false);
  const channelRef      = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    checkBlocked();
    subscribeRealtime();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  // ── Check if blocked ──────────────────────────────
  async function checkBlocked() {
    const { data } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', user!.id)
      .eq('blocked_id', otherUser.id)
      .maybeSingle();
    setBlocked(!!data);
  }

  // ── Load messages ─────────────────────────────────
  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(60);

    setMessages(data ?? []);
    setLoading(false);

    // Mark unread as read
    const unread = (data ?? [])
      .filter(m => !m.read && m.sender_id !== user?.id)
      .map(m => m.id);
    if (unread.length > 0) {
      await supabase.from('messages').update({ read: true }).in('id', unread);
    }
  }

  // ── Realtime: messages + typing ───────────────────
  function subscribeRealtime() {
    const channel = supabase.channel(`chat:${matchId}`, {
      config: { broadcast: { self: false } },
    });

    // New messages
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, (payload) => {
      const msg = payload.new as Message;
      setMessages(prev => [msg, ...prev]);
      if (msg.sender_id !== user?.id) {
        supabase.from('messages').update({ read: true }).eq('id', msg.id);
      }
    });

    // Deleted messages (soft delete — deleted_at set)
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, (payload) => {
      const updated = payload.new as Message;
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    });

    // Typing indicator via Broadcast (ephemeral, not stored)
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload?.userId === otherUser.id) {
        setOtherTyping(true);
        // Auto-hide after 3s in case stop event is missed
        setTimeout(() => setOtherTyping(false), 3000);
      }
    });

    channel.on('broadcast', { event: 'stop_typing' }, (payload) => {
      if (payload.payload?.userId === otherUser.id) {
        setOtherTyping(false);
      }
    });

    channel.subscribe();
    channelRef.current = channel;
  }

  // ── Typing broadcast ──────────────────────────────
  function handleTextChange(val: string) {
    setText(val);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current?.send({
        type: 'broadcast', event: 'typing',
        payload: { userId: user!.id },
      });
    }

    // Reset debounce timer
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      channelRef.current?.send({
        type: 'broadcast', event: 'stop_typing',
        payload: { userId: user!.id },
      });
    }, TYPING_TIMEOUT);
  }

  // ── Send message ──────────────────────────────────
  async function sendMessage() {
    const content = text.trim();
    if (!content || sending || blocked) return;
    setText('');

    // Stop typing indicator immediately on send
    isTypingRef.current = false;
    channelRef.current?.send({
      type: 'broadcast', event: 'stop_typing',
      payload: { userId: user!.id },
    });

    setSending(true);
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: user!.id,
      content,
    });
    setSending(false);
  }

  // ── Delete / unsend ───────────────────────────────
  async function deleteMessage(msg: Message) {
    await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', msg.id)
      .eq('sender_id', user!.id); // RLS double-check
  }

  function handleLongPress(msg: Message) {
    if (msg.sender_id !== user?.id || msg.deleted_at) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Unsend message'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (idx) => { if (idx === 1) deleteMessage(msg); }
      );
    } else {
      Alert.alert('Unsend message', 'This will remove the message for both users.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unsend', style: 'destructive', onPress: () => deleteMessage(msg) },
      ]);
    }
  }

  // ── Block user ────────────────────────────────────
  async function handleBlock() {
    Alert.alert(
      `Block ${otherUser.name}?`,
      'They won\'t be able to message you and won\'t appear in your discover feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive',
          onPress: async () => {
            await supabase.from('blocks').insert({
              blocker_id: user!.id,
              blocked_id: otherUser.id,
            });
            setBlocked(true);
            Alert.alert('Blocked', `${otherUser.name} has been blocked.`);
          },
        },
      ]
    );
  }

  // ── Report user ───────────────────────────────────
  function handleReport() {
    const reasons = [
      'Inappropriate behaviour',
      'Harassment or abuse',
      'Fake profile',
      'Unsafe sparring',
      'Spam',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Report ${otherUser.name}`,
          options: ['Cancel', ...reasons],
          cancelButtonIndex: 0,
          destructiveButtonIndex: -1,
        },
        async (idx) => {
          if (idx === 0) return;
          const reason = reasons[idx - 1];
          await supabase.from('reports').insert({
            reporter_id: user!.id,
            reported_id: otherUser.id,
            match_id: matchId,
            reason,
          });
          Alert.alert('Report submitted', 'Thank you. We\'ll review this shortly.');
        }
      );
    } else {
      const reportButtons: AlertButton[] = [
        ...reasons.map(r => ({
          text: r,
          onPress: async () => {
            await supabase.from('reports').insert({
              reporter_id: user!.id,
              reported_id: otherUser.id,
              match_id: matchId,
              reason: r,
            });
            Alert.alert('Report submitted', 'Thank you. We\'ll review this shortly.');
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ];

      Alert.alert(
        `Report ${otherUser.name}`,
        'Select a reason:',
        reportButtons
      );
    }
  }

  // ── Header menu (block + report) ──────────────────
  function handleHeaderPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', blocked ? 'Unblock' : 'Block', 'Report'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) blocked ? handleUnblock() : handleBlock();
          if (idx === 2) handleReport();
        }
      );
    } else {
      Alert.alert(otherUser.name, '', [
        { text: blocked ? 'Unblock' : 'Block', style: 'destructive', onPress: blocked ? handleUnblock : handleBlock },
        { text: 'Report', onPress: handleReport },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function handleUnblock() {
    await supabase.from('blocks')
      .delete()
      .eq('blocker_id', user!.id)
      .eq('blocked_id', otherUser.id);
    setBlocked(false);
  }

  // ── Helpers ───────────────────────────────────────
  function formatMsgTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isMine   = item.sender_id === user?.id;
    const isDeleted = !!item.deleted_at;
    const prevMsg  = messages[index + 1];
    const showTime = !prevMsg ||
      new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>{formatMsgTime(item.created_at)}</Text>
        )}
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          activeOpacity={isDeleted ? 1 : 0.7}
          disabled={isDeleted}
        >
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isDeleted && styles.bubbleDeleted,
          ]}>
            <Text style={[
              styles.bubbleText,
              isMine && !isDeleted && styles.bubbleTextMine,
              isDeleted && styles.bubbleTextDeleted,
            ]}>
              {isDeleted ? (isMine ? 'You unsent a message' : 'Message unsent') : item.content}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={handleHeaderPress}>
          <AvatarComponent
            name={otherUser.name}
            userId={otherUser.id}
            avatarUrl={otherUser.avatar_url}
            size={36}
          />
          <View>
            <Text style={styles.headerName}>{otherUser.name}</Text>
            <Text style={styles.headerSub}>
              {otherTyping
                ? '✍️ typing...'
                : `${otherUser.martial_arts?.[0] ?? ''} · ${otherUser.weight_kg ?? ''} kg`
              }
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={handleHeaderPress}>
          <Text style={styles.menuIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Blocked banner */}
      {blocked && (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedText}>
            You've blocked {otherUser.name}. Unblock to send messages.
          </Text>
          <TouchableOpacity onPress={handleUnblock}>
            <Text style={styles.unblockText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            keyExtractor={m => m.id}
            contentContainerStyle={styles.messageList}
            renderItem={renderMessage}
          />
        )}

        {/* Typing indicator */}
        {otherTyping && (
          <View style={styles.typingRow}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>● ● ●</Text>
            </View>
            <Text style={styles.typingLabel}>{otherUser.name.split(' ')[0]} is typing</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={blocked ? 'Unblock to send messages' : 'Message...'}
            placeholderTextColor={colors.textHint}
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
            editable={!blocked}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending || blocked) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending || blocked}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  flex:       { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn:    { padding: 8 },
  backText:   { fontSize: 22, color: colors.text },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerName: { fontSize: font.base, fontWeight: '600', color: colors.text },
  headerSub:  { fontSize: 11, color: colors.textMuted },
  menuBtn:    { padding: 8 },
  menuIcon:   { fontSize: 22, color: colors.textMuted, letterSpacing: 2 },

  blockedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2C1A0E',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  blockedText:  { fontSize: font.sm, color: colors.accentLight, flex: 1 },
  unblockText:  { fontSize: font.sm, color: colors.accent, fontWeight: '600', marginLeft: spacing.sm },

  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubble: {
    maxWidth: '78%', borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 2,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.bgCard,
    alignSelf: 'flex-start',
    borderWidth: 0.5, borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleDeleted: {
    backgroundColor: 'transparent',
    borderWidth: 0.5, borderColor: colors.border,
    borderStyle: 'dashed',
  },
  bubbleText:        { fontSize: font.base, color: colors.text, lineHeight: 20 },
  bubbleTextMine:    { color: '#fff' },
  bubbleTextDeleted: { color: colors.textHint, fontStyle: 'italic', fontSize: font.sm },
  timeLabel: {
    textAlign: 'center', fontSize: 11,
    color: colors.textHint, marginVertical: 8,
  },

  typingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: 4, gap: 8,
  },
  typingBubble: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderBottomLeftRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 0.5, borderColor: colors.border,
  },
  typingDots:  { fontSize: 8, color: colors.textMuted, letterSpacing: 3 },
  typingLabel: { fontSize: 11, color: colors.textHint },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    gap: 8, paddingBottom: 20,
  },
  input: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    color: colors.text, fontSize: font.base,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5, borderColor: colors.border,
  },
  sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
});
