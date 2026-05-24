// ─── Client → Server ─────────────────────────────────────────────────────────

export interface JoinRoomMessage {
  type: 'join_room';
  roomId: string;
  token: string;
}

export interface SendMessagePayload {
  type: 'message';
  roomId: string;
  content: string;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
}

export type ClientMessage = JoinRoomMessage | SendMessagePayload | HeartbeatMessage;

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface MessageReceivedEvent {
  type: 'message_received';
  messageId: string;
  userId: string;
  username: string;
  roomId: string;
  content: string;
  ts: string;
}

export interface PresenceUpdateEvent {
  type: 'presence_update';
  roomId: string;
  userId: string;
  username: string;
  status: 'online' | 'offline';
}

export interface RoomJoinedEvent {
  type: 'room_joined';
  roomId: string;
  onlineUsers: Array<{ userId: string; username: string }>;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type ServerMessage =
  | MessageReceivedEvent
  | PresenceUpdateEvent
  | RoomJoinedEvent
  | ErrorEvent;

// ─── REST API types ───────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  userId: string;
  username: string;
  email: string;
}

export interface PaginatedMessages {
  messages: MessageDTO[];
  nextCursor: string | null;
}

export interface MessageDTO {
  id: string;
  content: string;
  userId: string;
  username: string;
  roomId: string;
  createdAt: string;
}

export interface RoomDTO {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
}
