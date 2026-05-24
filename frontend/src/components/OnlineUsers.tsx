const s = {
  user: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', fontSize: '0.875rem' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#68d391', flexShrink: 0 },
  name: { color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
};

interface Props {
  users: Array<{ userId: string; username: string }>;
}

export default function OnlineUsers({ users }: Props) {
  if (users.length === 0) {
    return <div style={{ color: '#4a5568', fontSize: '0.8rem' }}>No one online</div>;
  }

  return (
    <>
      {users.map((u) => (
        <div key={u.userId} style={s.user}>
          <div style={s.dot} />
          <span style={s.name}>{u.username}</span>
        </div>
      ))}
    </>
  );
}
