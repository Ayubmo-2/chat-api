import type { MessageDTO } from '@chat-api/shared';

const s = {
  list: { display: 'flex', flexDirection: 'column-reverse' as const, gap: '0.75rem' },
  msg: { display: 'flex', flexDirection: 'column' as const, gap: '0.15rem' },
  meta: { display: 'flex', gap: '0.5rem', alignItems: 'baseline' },
  username: { fontWeight: 700, color: '#a78bfa', fontSize: '0.9rem' },
  time: { fontSize: '0.7rem', color: '#4a5568' },
  content: { color: '#e2e8f0', lineHeight: 1.5 },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ messages }: { messages: MessageDTO[] }) {
  if (messages.length === 0) {
    return (
      <div style={{ color: '#4a5568', textAlign: 'center', padding: '3rem' }}>
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div style={s.list}>
      {messages.map((msg) => (
        <div key={msg.id} style={s.msg}>
          <div style={s.meta}>
            <span style={s.username}>{msg.username}</span>
            <span style={s.time}>{formatTime(msg.createdAt)}</span>
          </div>
          <div style={s.content}>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}
