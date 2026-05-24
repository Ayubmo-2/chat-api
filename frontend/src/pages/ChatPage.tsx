import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ServerMessage, MessageDTO } from '@chat-api/shared';
import { apiFetch, authHeader } from '@/lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import MessageList from '../components/MessageList';
import OnlineUsers from '../components/OnlineUsers';

const s = {
  page: { display: 'flex', height: '100vh', background: '#0f1117' },
  sidebar: { width: '220px', background: '#1a1d27', borderRight: '1px solid #2d3748', padding: '1rem', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  sidebarTitle: { fontWeight: 700, fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  header: { padding: '1rem 1.5rem', borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontWeight: 700, fontSize: '1.1rem' },
  backBtn: { padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#2d3748', color: '#e2e8f0', cursor: 'pointer' },
  messageArea: { flex: 1, overflowY: 'auto' as const, padding: '1rem 1.5rem' },
  inputBar: { padding: '1rem 1.5rem', borderTop: '1px solid #2d3748', display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #2d3748', background: '#1a1d27', color: '#e2e8f0', fontSize: '1rem' },
  sendBtn: { padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  status: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px' },
};

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; username: string }>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joined, setJoined] = useState(false);
  const sendRef = useRef<((msg: any) => void) | null>(null);
  const token = localStorage.getItem('accessToken') ?? '';

  useEffect(() => {
    apiFetch(`/rooms/${roomId}`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setRoomName(d.name ?? ''))
      .catch(() => {});
  }, [roomId]);

  async function loadHistory(cursor?: string) {
    const url = `/rooms/${roomId}/messages${cursor ? `?cursor=${cursor}` : ''}`;
    const res = await apiFetch(url, { headers: authHeader() });
    if (!res.ok) return;
    const data = await res.json();
    setMessages((prev) => (cursor ? [...prev, ...data.messages] : data.messages));
    setNextCursor(data.nextCursor);
  }

  useEffect(() => { loadHistory(); }, [roomId]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'room_joined':
        setJoined(true);
        setOnlineUsers(msg.onlineUsers);
        break;
      case 'message_received':
        setMessages((prev) => [
          { id: msg.messageId, content: msg.content, userId: msg.userId, username: msg.username, roomId: msg.roomId, createdAt: msg.ts },
          ...prev,
        ]);
        break;
      case 'presence_update':
        setOnlineUsers((prev) => {
          if (msg.status === 'online') {
            if (prev.find((u) => u.userId === msg.userId)) return prev;
            return [...prev, { userId: msg.userId, username: msg.username }];
          }
          return prev.filter((u) => u.userId !== msg.userId);
        });
        break;
    }
  }, []);

  const { send, connected } = useWebSocket({ onMessage: handleMessage, enabled: !!roomId });
  sendRef.current = send;

  useEffect(() => {
    if (connected && roomId && !joined) {
      send({ type: 'join_room', roomId, token });
    }
  }, [connected, roomId, joined, token, send]);

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !joined) return;
    send({ type: 'message', roomId: roomId!, content: text.trim() });
    setText('');
  }

  const connColor = connected ? '#68d391' : '#fc8181';

  return (
    <div style={s.page}>
      <div style={s.sidebar}>
        <div style={s.sidebarTitle}>Online ({onlineUsers.length})</div>
        <OnlineUsers users={onlineUsers} />
      </div>
      <div style={s.main}>
        <div style={s.header}>
          <div style={s.roomName}># {roomName}</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ ...s.status, background: connColor + '22', color: connColor }}>
              {connected ? (joined ? 'joined' : 'connecting...') : 'offline'}
            </div>
            <button style={s.backBtn} onClick={() => navigate('/rooms')}>Back</button>
          </div>
        </div>
        <div style={s.messageArea}>
          <MessageList messages={messages} />
          {nextCursor && (
            <button
              style={{ ...s.sendBtn, margin: '1rem auto', display: 'block', background: '#2d3748' }}
              onClick={() => loadHistory(nextCursor)}
            >
              Load older messages
            </button>
          )}
        </div>
        <form style={s.inputBar} onSubmit={sendMessage}>
          <input
            style={s.input}
            placeholder={joined ? 'Type a message...' : 'Joining room...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!joined}
          />
          <button style={s.sendBtn} type="submit" disabled={!joined || !text.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
