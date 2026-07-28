import { Server } from 'socket.io';

let ioInstance = null;
export const activeUserSockets = new Map(); // userId -> Set of socket.ids

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
      if (!activeUserSockets.has(userId)) {
        activeUserSockets.set(userId, new Set());
      }
      activeUserSockets.get(userId).add(socket.id);
    }

    // Join a board room to receive real-time updates for that board
    socket.on('join_board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // Join a workspace room to receive real-time workspace updates
    socket.on('join_workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('leave_workspace', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    socket.on('disconnect', () => {
      if (userId && activeUserSockets.has(userId)) {
        const socketIds = activeUserSockets.get(userId);
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          activeUserSockets.delete(userId);
        }
      }
    });
  });

  return ioInstance;
}

// Broadcast a board mutation to all clients watching that board
export function notifyBoardUpdate(boardId, action, data) {
  if (ioInstance && boardId) {
    ioInstance.to(`board:${boardId}`).emit('board_change', { action, data });
    ioInstance.emit('board_change', { boardId, action, data });
  }
}

// Push a notification to a specific user's socket
export function notifyUser(userId, notification) {
  if (ioInstance && userId) {
    ioInstance.emit(`notification:${userId}`, notification);
  }
}

// Push workspace event to all clients connected in that workspace room and globally
export function notifyWorkspaceUpdate(workspaceId, event, data) {
  if (ioInstance && workspaceId) {
    console.log(`[SOCKET] Broadcasting workspace update: "${event}" to workspace ${workspaceId}`);
    ioInstance.to(`workspace:${workspaceId}`).emit(event, data);
    ioInstance.emit(event, data); // Global emit as fail-safe guarantee for all connected clients
  }
}

