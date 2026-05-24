import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomDTO } from '@chat-api/shared';
import { apiFetch, authHeader } from '@/lib/api';

const s = {
  page: { display: 'flex', flexDirection: 'column' as const, height: '100vh', padding: '2rem', maxWidth: '600px', margin: '0 auto', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  logoutBtn: { padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#2d3748', color: '#e2e8f0', cursor: 'pointer' },
  form: { display: 'flex', gap: '0.5rem' },
  input: { flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #2d3748', background: '#1a1d27', color: '#e2e8f0', fontSize: '1rem' },
  btn: { padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  roomList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  roomCard: { padding: '1rem', borderRadius: '8px', background: '#1a1d27', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #2d3748' },
  roomName: { fontWeight: 600 },
  memberCount: { fontSize: '0.8rem', color: '#a0aec0' },
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [newRoomName, setNewRoomName] = useState('');

  async function fetchRooms() {
    const res = await apiFetch('/rooms', { headers: authHeader() });
    if (res.status === 401) { navigate('/login'); return; }
    setRooms(await res.json());
  }

  useEffect(() => { fetchRooms(); }, []);

  async function createRoom(e: FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    await apiFetch('/rooms', {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoomName.trim() }),
    });
    setNewRoomName('');
    fetchRooms();
  }

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Rooms</div>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>
      <form style={s.form} onSubmit={createRoom}>
        <input
          style={s.input}
          placeholder="New room name..."
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
        />
        <button style={s.btn} type="submit">Create</button>
      </form>
      <div style={s.roomList}>
        {rooms.map((room) => (
          <div key={room.id} style={s.roomCard} onClick={() => navigate(`/rooms/${room.id}`)}>
            <div style={s.roomName}># {room.name}</div>
            <div style={s.memberCount}>{room.memberCount} member{room.memberCount !== 1 ? 's' : ''}</div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div style={{ color: '#a0aec0', textAlign: 'center', padding: '2rem' }}>
            No rooms yet. Create one above!
          </div>
        )}
      </div>
    </div>
  );
}
