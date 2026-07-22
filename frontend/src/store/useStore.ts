import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL as API_URL, BACKEND_BASE_URL, SOCKET_URL } from '../config/api';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  googleEmail?: string | null;
}

export interface WorkspaceMember {
  id: string;
  role: string;
  user: User;
  createdAt: string;
  presence?: 'online' | 'away' | 'offline';
  lastActive?: string;
  activity?: {
    cardsCreated: number;
    tasksCompleted: number;
    docsEdited: number;
  };
  boards?: any[];
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  progress: number;
  category: string;
  priority: string;
  ownerId: string | null;
  keyResults: string;
  milestones: string;
  linkedBoards: string;
  linkedCards: string;
  linkedDocs: string;
  activities: string;
}


export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  shortName?: string | null;
  website?: string | null;
  visibility?: string;
  boardCreationRestriction?: string;
  guestInvitesAllowed?: boolean;
  myRole?: string;
  boards: Board[];
  members: WorkspaceMember[];
  goals: Goal[];
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  background: string;
  workspaceId: string;
  isArchived: boolean;
  lists: List[];
  automations: AutomationRule[];
  milestones: Milestone[];
  savedFilters: SavedFilter[];
  myRole?: string;
  members?: any[];
  incomingEmailEnabled?: boolean | null;
  incomingEmailAddress?: string | null;
  incomingEmailListId?: string | null;
  incomingEmailDefaultPriority?: string | null;
  incomingEmailAllowedSenders?: string | null;
  incomingEmailDefaultLabelIds?: string | null;
  incomingEmailAutoAssigneeIds?: string | null;
  incomingEmailThreadAction?: string | null;
  incomingEmailSpamFilter?: boolean | null;
  incomingEmailAutomationEnabled?: boolean | null;
  incomingEmailAttachmentLimit?: number | null;
}

export interface List {
  id: string;
  name: string;
  position: number;
  boardId: string;
  cards: Card[];
}

export interface CardAssignee {
  id: string;
  cardId: string;
  userId: string;
  user: User;
}

export interface ChecklistItem {
  id: string;
  cardId: string;
  content: string;
  isCompleted: boolean;
  position: number;
}

export interface TaskDependency {
  id: string;
  cardId: string;
  dependsOnCardId: string;
  dependsOnCard: {
    id: string;
    title: string;
  };
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  position: number;
  listId: string;
  isArchived: boolean;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  coverImage: string | null;
  estimatedTime: number;
  loggedTime: number;
  isRecurring: boolean;
  recurrence: string | null;
  customFields: string; // JSON string
  milestoneId: string | null;
  assignees: CardAssignee[];
  checklists: ChecklistItem[];
  dependencies: TaskDependency[];
  comments: Comment[];
  emailDetails?: any;
  attachments?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AutomationRule {
  id: string;
  boardId: string;
  triggerType: string;
  triggerVal: string | null;
  actionType: string;
  actionVal: string | null;
}

export interface Milestone {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
}

export interface SavedFilter {
  id: string;
  boardId: string;
  name: string;
  query: string;
}

export interface DocumentItem {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  parentId: string | null;
  spaceId?: string | null;
  folderId?: string | null;
  type?: 'space' | 'folder' | 'document';
  status?: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';
  isFavorite?: boolean;
  views?: number;
  tags?: string; // JSON string of string[]
  linkedResources?: string; // JSON string of linked resources
  comments?: string; // JSON string of comments
  suggestions?: string; // JSON string of suggestions
  revisions?: string; // JSON string of revisions
  authorId?: string | null;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  id: string;
  workspaceId: string;
  type: string;
  config: {
    webhookUrl?: string;
    channelId?: string;
    repoOwner?: string;
    repoName?: string;
    secret?: string;
  };
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  content: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  title: string;
  description: string;
  source: 'GMAIL' | 'SLACK' | 'DISCORD' | 'GITHUB' | 'CALENDAR' | 'QUICK' | 'EMAIL';
  sourceDetails: string;
  status: 'NEW' | 'PROCESSING' | 'CONVERTED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  workspaceId: string;
  boardId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // Authentication
  user: User | null;
  token: string | null;
  theme: 'light' | 'dark';
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentBoard: Board | null;
  notifications: Notification[];
  documents: DocumentItem[];
  integrations: IntegrationConfig[];
  inboxItems: InboxItem[];
  workspaceActivity: any[];
  socket: Socket | null;
  isInboxOpen: boolean;
  setInboxOpen: (isOpen: boolean) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  gmailProfile: any | null;
  gmailLogs: any[];
  workspaceInvitations: any[];
  userInvitations: any[];
  workspaceEmailSettings: any | null;
  
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncedTime: Date | null;
  draggedEmail: InboxItem | null;
  dragCoords: { x: number; y: number };
  setSyncStatus: (status: 'synced' | 'syncing' | 'offline') => void;
  setLastSyncedTime: (time: Date | null) => void;
  setDraggedEmail: (email: InboxItem | null) => void;
  setDragCoords: (coords: { x: number; y: number }) => void;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  initSocketConnection: () => void;
  
  // Workspaces
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceDetails: (id: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string, description?: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  inviteMember: (workspaceId: string, usernameOrEmail: string, role?: string, customMessage?: string, boardAccess?: any) => Promise<any>;
  updateBoardMember: (workspaceId: string, userId: string, boardId: string, role: string) => Promise<any>;
  revokeBoardMember: (workspaceId: string, boardId: string, userId: string) => Promise<void>;
  fetchWorkspaceInvitations: (workspaceId: string) => Promise<void>;
  revokeInvitation: (workspaceId: string, invitationId: string) => Promise<void>;
  resendInvitation: (workspaceId: string, invitationId: string) => Promise<void>;
  fetchWorkspaceActivity: (workspaceId: string) => Promise<void>;
  fetchUserInvitations: () => Promise<void>;
  fetchMe: () => Promise<any>;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: string) => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string; avatarBase64?: string; password?: string }) => Promise<void>;
  
  // Workspace Email & Branding Customization
  fetchWorkspaceEmailSettings: (workspaceId: string) => Promise<void>;
  updateWorkspaceEmailSettings: (workspaceId: string, data: any) => Promise<void>;
  testSmtpConnection: (workspaceId: string, data: any) => Promise<any>;
  fetchInvitationDashboard: (workspaceId: string) => Promise<any>;
  fetchInvitationLogs: (workspaceId: string) => Promise<any[]>;
  verifyInvitationToken: (token: string) => Promise<any>;

  // Workspace Documents
  fetchDocuments: (workspaceId: string) => Promise<void>;
  createDocument: (
    workspaceId: string,
    title: string,
    content?: string,
    parentId?: string | null,
    spaceId?: string | null,
    folderId?: string | null,
    type?: string,
    status?: string,
    tags?: string[],
    linkedResources?: any[]
  ) => Promise<DocumentItem>;
  updateDocument: (docId: string, data: Partial<DocumentItem>) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  incrementDocViews: (docId: string) => Promise<void>;
  addDocComment: (docId: string, content: string) => Promise<void>;
  addDocSuggestion: (docId: string, originalText: string, suggestedText: string) => Promise<void>;
  respondToDocSuggestion: (docId: string, suggestionId: string, status: 'accepted' | 'rejected') => Promise<void>;

  // Integrations
  fetchIntegrations: (workspaceId: string) => Promise<void>;
  updateIntegration: (workspaceId: string, type: string, config: any, isEnabled: boolean) => Promise<void>;
  deleteIntegration: (workspaceId: string, type: string) => Promise<void>;
  
  // Goals

  createGoal: (workspaceId: string, data: Partial<Goal>) => Promise<void>;
  updateGoal: (workspaceId: string, goalId: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (workspaceId: string, goalId: string) => Promise<void>;

  // Boards
  createBoard: (workspaceId: string, name: string, description?: string, background?: string) => Promise<Board>;
  fetchBoardDetails: (boardId: string) => Promise<Board>;
  updateBoard: (boardId: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  duplicateBoard: (boardId: string) => Promise<Board>;
  setCurrentBoard: (board: Board | null) => void;
  fetchArchivedItems: (boardId: string) => Promise<{ lists: any[]; cards: any[] }>;
  
  // Lists
  createList: (boardId: string, name: string, position: number) => Promise<void>;
  updateList: (boardId: string, listId: string, name?: string, position?: number, isArchived?: boolean) => Promise<void>;
  deleteList: (boardId: string, listId: string) => Promise<void>;
  archiveList: (boardId: string, listId: string) => Promise<void>;
  
  // Cards
  createCard: (boardId: string, listId: string, title: string, position: number, priority?: string) => Promise<Card>;
  updateCard: (boardId: string, cardId: string, data: Partial<Card>) => Promise<void>;
  assignUserToCard: (boardId: string, cardId: string, userId: string) => Promise<void>;
  unassignUserFromCard: (boardId: string, cardId: string, userId: string) => Promise<void>;
  
  // Checklists
  createChecklistItem: (boardId: string, cardId: string, content: string) => Promise<void>;
  updateChecklistItem: (boardId: string, checklistId: string, data: Partial<ChecklistItem>) => Promise<void>;
  deleteChecklistItem: (boardId: string, checklistId: string) => Promise<void>;
  
  // Comments
  createComment: (boardId: string, cardId: string, content: string) => Promise<void>;
  
  // Dependencies
  createDependency: (boardId: string, cardId: string, dependsOnCardId: string) => Promise<void>;
  deleteDependency: (boardId: string, cardId: string, depId: string) => Promise<void>;
  
  // Milestones
  createMilestone: (boardId: string, data: Partial<Milestone>) => Promise<void>;
  updateMilestone: (boardId: string, milestoneId: string, data: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (boardId: string, milestoneId: string) => Promise<void>;

  // Automations
  createAutomationRule: (boardId: string, data: Partial<AutomationRule>) => Promise<void>;
  deleteAutomationRule: (boardId: string, ruleId: string) => Promise<void>;

  // Notifications
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotificationLocally: (n: Notification) => void;

  // Inbox
  fetchInboxItems: (workspaceId: string) => Promise<void>;
  createInboxItem: (workspaceId: string, item: Partial<InboxItem>) => Promise<InboxItem>;
  updateInboxItem: (workspaceId: string, itemId: string, updates: Partial<InboxItem>) => Promise<InboxItem>;
  deleteInboxItem: (workspaceId: string, itemId: string) => Promise<void>;
  convertInboxItem: (workspaceId: string, itemId: string, payload: { boardId: string; listId: string; assigneeIds?: string[]; labels?: any[]; priority?: string; dueDate?: string | null; checklist?: string[]; title?: string; description?: string }) => Promise<void>;
  undoConvertInboxItem: (workspaceId: string, itemId: string, cardId: string) => Promise<void>;
  batchConvertInboxItems: (workspaceId: string, itemIds: string[], payload: { boardId: string; listId: string; priority?: string; dueDate?: string | null; assigneeIds?: string[]; labels?: any[] }) => Promise<void>;
  batchArchiveInboxItems: (workspaceId: string, itemIds: string[]) => Promise<void>;
  batchDeleteInboxItems: (workspaceId: string, itemIds: string[]) => Promise<void>;
  batchUpdateInboxItemsStatus: (workspaceId: string, itemIds: string[], status: string) => Promise<void>;
  batchAssignLabelsToInboxItems: (workspaceId: string, itemIds: string[], labels: string) => Promise<void>;
  mockIncomingInboxItems: (workspaceId: string) => Promise<void>;
  fetchEmailLogs: (workspaceId: string, boardId: string) => Promise<any[]>;
  sendTestEmail: (workspaceId: string, boardId: string) => Promise<void>;
  parseEmailIntelligently: (title: string, text: string, html: string) => Promise<any>;
  checkDuplicates: (boardId: string, title: string, messageId?: string | null, threadId?: string | null) => Promise<any>;
  mergeCard: (data: { cardId: string; inboxItemId: string; description?: string; checklist?: string[]; labels?: string[] }) => Promise<any>;
  uploadAttachment: (boardId: string, cardId: string, file: { filename: string; mimeType: string; size: number; base64Data: string }) => Promise<any>;
  deleteAttachment: (boardId: string, cardId: string, attachmentId: string) => Promise<void>;

  // Gmail Integration Actions
  fetchGmailProfile: () => Promise<void>;
  updateGmailSettings: (settings: any) => Promise<void>;
  connectGmail: () => Promise<string>;
  disconnectGmail: () => Promise<void>;
  syncGmailInbox: (workspaceId: string) => Promise<void>;
  sendTestGmail: () => Promise<void>;
  fetchGmailLogs: () => Promise<void>;
  triggerGmailReminder: (type: string) => Promise<void>;
  gmailRules: any[];
  fetchGmailRules: () => Promise<void>;
  createGmailRule: (rule: { triggerType: string; triggerVal: string; targetBoardId: string; targetListId?: string }) => Promise<void>;
  deleteGmailRule: (ruleId: string) => Promise<void>;
  replyToGmail: (itemId: string, replyText: string) => Promise<void>;

  // Centralized Toasts & Confirm Modal
  toasts: ToastItem[];
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
  removeToast: (id: string) => void;
  confirmModal: ConfirmModalState;
  showConfirm: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
}

const getHeaders = (token: string | null) => ({
  'Content-Type': 'application/json',
  'Authorization': token ? `Bearer ${token}` : ''
});

export const useStore = create<AppState>((set, get) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token'),
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  workspaces: [],
  currentWorkspace: null,
  currentBoard: null,
  notifications: [],
  documents: [],
  integrations: [],
  inboxItems: [],
  workspaceActivity: [],
  socket: null,
  isInboxOpen: false,
  setInboxOpen: (isOpen) => set({ isInboxOpen: isOpen }),
  isSidebarOpen: false,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  isSidebarCollapsed: false,
  setSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
  gmailProfile: null,
  gmailLogs: [],
  gmailRules: [],
  workspaceInvitations: [],
  userInvitations: [],
  workspaceEmailSettings: null,
  syncStatus: 'synced',
  lastSyncedTime: new Date(),
  draggedEmail: null,
  dragCoords: { x: 0, y: 0 },
  setSyncStatus: (status) => set({ syncStatus: status }),
  setLastSyncedTime: (time) => set({ lastSyncedTime: time }),
  setDraggedEmail: (email) => set({ draggedEmail: email }),
  setDragCoords: (coords) => set({ dragCoords: coords }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setAuth: (user, token) => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ user, token });
    get().initSocketConnection();
  },

  logout: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, workspaces: [], currentWorkspace: null, currentBoard: null, socket: null });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(token)
      });
      if (res.status === 401) {
        get().logout();
        return null;
      }
      if (!res.ok) throw new Error('Failed to fetch user profile');
      const data = await res.json();
      set({ user: data });
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  updateProfile: async (data) => {
    const token = get().token;
    if (!token) return;
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    const updatedUser = await res.json();
    set({ user: updatedUser });
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  initSocketConnection: () => {
    const { token, socket, user } = get();
    if (!token || !user) return;
    if (socket) return; // Already connected

    const newSocket = io(SOCKET_URL, {
      auth: { userId: user.id },
      query: { userId: user.id }
    });
    
    newSocket.on('connect', () => {
      console.log('WS Connection established');
    });

    // Listen for board updates
    newSocket.on('board_change', async () => {
      const currentBoard = get().currentBoard;
      if (!currentBoard) return;
      
      // Re-fetch details to ensure full database consistency
      await get().fetchBoardDetails(currentBoard.id);
    });

    // Listen for user notifications
    newSocket.on(`notification:${user.id}`, (notification: Notification) => {
      get().addNotificationLocally(notification);
    });

    // Listen for real-time invitation changes
    newSocket.on('invitation_update', async (data: any) => {
      const currentWorkspace = get().currentWorkspace;
      if (currentWorkspace && currentWorkspace.id === data.workspaceId) {
        await get().fetchWorkspaceInvitations(currentWorkspace.id);
        await get().fetchWorkspaceDetails(currentWorkspace.id);
      }
    });

    set({ socket: newSocket });
  },

  // Workspaces
  fetchWorkspaces: async () => {
    try {
      const res = await fetch(`${API_URL}/workspaces`, {
        headers: getHeaders(get().token)
      });
      if (res.status === 401) {
        get().logout();
        return;
      }
      if (!res.ok) throw new Error('Error fetching workspaces');
      const data = await res.json();
      set({ workspaces: data });
    } catch (error) {
      console.error(error);
    }
  },

  fetchWorkspaceDetails: async (id) => {
    try {
      const { socket, currentWorkspace } = get();
      if (socket) {
        if (currentWorkspace && currentWorkspace.id !== id) {
          socket.emit('leave_workspace', currentWorkspace.id);
        }
        socket.emit('join_workspace', id);
      }
      
      const res = await fetch(`${API_URL}/workspaces/${id}`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Error fetching workspace details');
      const data = await res.json();
      set({ currentWorkspace: data });
    } catch (error) {
      console.error(error);
    }
  },

  createWorkspace: async (name, description) => {
    const res = await fetch(`${API_URL}/workspaces`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ name, description })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create workspace');
    }
    const workspace = await res.json();
    set((state) => ({
      workspaces: [...state.workspaces, workspace]
    }));
    return workspace;
  },

  updateWorkspace: async (id, name, description) => {
    const res = await fetch(`${API_URL}/workspaces/${id}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify({ name, description })
    });
    if (!res.ok) throw new Error('Failed to update workspace');
    await get().fetchWorkspaces();
  },

  deleteWorkspace: async (id) => {
    const res = await fetch(`${API_URL}/workspaces/${id}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to delete workspace');
    await get().fetchWorkspaces();
  },

  inviteMember: async (workspaceId, usernameOrEmail, role = 'MEMBER', customMessage = '', boardAccess = null) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ usernameOrEmail, role, customMessage, boardAccess })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send invitation');
    }
    const data = await res.json();
    await get().fetchWorkspaceInvitations(workspaceId);
    return data;
  },

  updateBoardMember: async (workspaceId, userId, boardId, role) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/board-members`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ userId, boardId, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update board member role');
    }
    const data = await res.json();
    await get().fetchWorkspaceDetails(workspaceId);
    return data;
  },

  revokeBoardMember: async (workspaceId, boardId, userId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/board-members/${boardId}/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke board member access');
    }
    await get().fetchWorkspaceDetails(workspaceId);
  },

  fetchWorkspaceInvitations: async (workspaceId) => {
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch workspace invitations');
      const data = await res.json();
      set({ workspaceInvitations: data });
    } catch (error) {
      console.error(error);
    }
  },

  revokeInvitation: async (workspaceId, invitationId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to revoke invitation');
    }
    await get().fetchWorkspaceInvitations(workspaceId);
  },

  resendInvitation: async (workspaceId, invitationId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to resend invitation');
    }
    await get().fetchWorkspaceInvitations(workspaceId);
  },
  
  // Workspace Email & Branding Customization Actions
  fetchWorkspaceEmailSettings: async (workspaceId) => {
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/email-settings`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch workspace email settings');
      const data = await res.json();
      set({ workspaceEmailSettings: data });
    } catch (error) {
      console.error(error);
    }
  },

  updateWorkspaceEmailSettings: async (workspaceId, data) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/email-settings`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update email settings');
    }
    const updated = await res.json();
    set({ workspaceEmailSettings: updated });
  },

  testSmtpConnection: async (workspaceId, data) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/email-settings/test-smtp`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'SMTP test connection failed');
    }
    return result;
  },

  fetchInvitationDashboard: async (workspaceId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitation-dashboard`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch invitation dashboard statistics');
    }
    return await res.json();
  },

  fetchInvitationLogs: async (workspaceId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitation-logs`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch audit log trail');
    }
    return await res.json();
  },

  verifyInvitationToken: async (token) => {
    const res = await fetch(`${API_URL}/workspaces/invitations/verify/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }
    return data;
  },

  fetchWorkspaceActivity: async (workspaceId) => {
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/activity`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch workspace activity');
      const data = await res.json();
      set({ workspaceActivity: data });
    } catch (error) {
      console.error('Error in fetchWorkspaceActivity:', error);
    }
  },

  fetchUserInvitations: async () => {
    try {
      const res = await fetch(`${API_URL}/workspaces/user/pending-invitations`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch pending invitations');
      const data = await res.json();
      set({ userInvitations: data });
    } catch (error) {
      console.error(error);
    }
  },

  acceptInvitation: async (token) => {
    const res = await fetch(`${API_URL}/workspaces/user/accept-invitation`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to accept invitation');
    }
    const data = await res.json();
    await get().fetchWorkspaces();
    if (data.workspaceId) {
      await get().fetchWorkspaceDetails(data.workspaceId);
    }
  },

  declineInvitation: async (token) => {
    const res = await fetch(`${API_URL}/workspaces/user/decline-invitation`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to decline invitation');
    }
    await get().fetchUserInvitations();
  },

  removeMember: async (workspaceId, memberId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove member');
    }
    await get().fetchWorkspaceDetails(workspaceId);
  },

  updateMemberRole: async (workspaceId, memberId, role) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update member role');
    }
    await get().fetchWorkspaceDetails(workspaceId);
  },

  // Workspace Goals
  createGoal: async (workspaceId, data) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/goals`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error creating goal');
    await get().fetchWorkspaceDetails(workspaceId);
  },

  updateGoal: async (workspaceId, goalId, data) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/goals/${goalId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error updating goal');
    await get().fetchWorkspaceDetails(workspaceId);
  },

  deleteGoal: async (workspaceId, goalId) => {
    const res = await fetch(`${API_URL}/workspaces/${workspaceId}/goals/${goalId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting goal');
    await get().fetchWorkspaceDetails(workspaceId);
  },

  // Workspace Documents
  fetchDocuments: async (workspaceId) => {
    const res = await fetch(`${API_URL}/documents/workspace/${workspaceId}`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error fetching documents');
    const data = await res.json();
    set({ documents: data });
  },

  createDocument: async (workspaceId, title, content, parentId, spaceId, folderId, type, status, tags, linkedResources) => {
    const res = await fetch(`${API_URL}/documents/workspace/${workspaceId}`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({
        title,
        content,
        parentId,
        spaceId,
        folderId,
        type,
        status,
        tags,
        linkedResources
      })
    });
    if (!res.ok) throw new Error('Error creating document');
    const doc = await res.json();
    await get().fetchDocuments(workspaceId);
    return doc;
  },

  updateDocument: async (docId, data) => {
    const res = await fetch(`${API_URL}/documents/${docId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error updating document');
    if (get().currentWorkspace) {
      await get().fetchDocuments(get().currentWorkspace!.id);
    }
  },

  deleteDocument: async (docId) => {
    const res = await fetch(`${API_URL}/documents/${docId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting document');
    if (get().currentWorkspace) {
      await get().fetchDocuments(get().currentWorkspace!.id);
    }
  },

  incrementDocViews: async (docId) => {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}/view`, {
        method: 'POST',
        headers: getHeaders(get().token)
      });
      if (res.ok && get().currentWorkspace) {
        await get().fetchDocuments(get().currentWorkspace!.id);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  },

  addDocComment: async (docId, content) => {
    const res = await fetch(`${API_URL}/documents/${docId}/comments`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Error adding comment');
    if (get().currentWorkspace) {
      await get().fetchDocuments(get().currentWorkspace!.id);
    }
  },

  addDocSuggestion: async (docId, originalText, suggestedText) => {
    const res = await fetch(`${API_URL}/documents/${docId}/suggestions`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ originalText, suggestedText })
    });
    if (!res.ok) throw new Error('Error adding suggestion');
    if (get().currentWorkspace) {
      await get().fetchDocuments(get().currentWorkspace!.id);
    }
  },

  respondToDocSuggestion: async (docId, suggestionId, status) => {
    const res = await fetch(`${API_URL}/documents/${docId}/suggestions/${suggestionId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Error responding to suggestion');
    if (get().currentWorkspace) {
      await get().fetchDocuments(get().currentWorkspace!.id);
    }
  },

  // Integrations
  fetchIntegrations: async (workspaceId) => {
    try {
      const res = await fetch(`${API_URL}/integrations/${workspaceId}`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Error fetching integrations');
      const data = await res.json();
      set({ integrations: data });
    } catch (error) {
      console.error(error);
    }
  },

  updateIntegration: async (workspaceId, type, config, isEnabled) => {
    const res = await fetch(`${API_URL}/integrations/${workspaceId}/${type}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify({ config, isEnabled })
    });
    if (!res.ok) throw new Error('Error updating integration');
    await get().fetchIntegrations(workspaceId);
  },

  deleteIntegration: async (workspaceId, type) => {
    const res = await fetch(`${API_URL}/integrations/${workspaceId}/${type}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting integration');
    await get().fetchIntegrations(workspaceId);
  },

  // Boards

  createBoard: async (workspaceId, name, description, background) => {
    const res = await fetch(`${API_URL}/boards/workspace/${workspaceId}`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ name, description, background })
    });
    if (!res.ok) throw new Error('Error creating board');
    const board = await res.json();
    // Update current workspace details to reflect the new board
    await get().fetchWorkspaceDetails(workspaceId);
    return board;
  },

  fetchBoardDetails: async (boardId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error fetching board details');
    const board = await res.json();
    set({ currentBoard: board });
    
    // Join WS board room
    const { socket } = get();
    if (socket) {
      socket.emit('join_board', boardId);
    }
    return board;
  },

  updateBoard: async (boardId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error updating board');
    }
    const updated = await res.json();
    if (get().currentBoard?.id === boardId) {
      set((state) => ({
        currentBoard: state.currentBoard ? { ...state.currentBoard, ...updated } : null
      }));
    }
    // Refresh workspace view
    const currentWorkspace = get().currentWorkspace;
    if (currentWorkspace) {
      await get().fetchWorkspaceDetails(currentWorkspace.id);
    }
  },

  deleteBoard: async (boardId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error deleting board');
    }
    set({ currentBoard: null });
    // Refresh workspace
    const currentWorkspace = get().currentWorkspace;
    if (currentWorkspace) {
      await get().fetchWorkspaceDetails(currentWorkspace.id);
    }
  },

  duplicateBoard: async (boardId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/duplicate`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error duplicating board');
    const newBoard = await res.json();
    const currentWorkspace = get().currentWorkspace;
    if (currentWorkspace) {
      await get().fetchWorkspaceDetails(currentWorkspace.id);
    }
    return newBoard;
  },

  setCurrentBoard: (board) => {
    const { socket, currentBoard } = get();
    if (socket && currentBoard && currentBoard.id !== board?.id) {
      socket.emit('leave_board', currentBoard.id);
    }
    set({ currentBoard });
  },

  // Lists
  createList: async (boardId, name, position) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/lists`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ name, position })
    });
    if (!res.ok) throw new Error('Error creating list');
    await get().fetchBoardDetails(boardId);
  },

  updateList: async (boardId, listId, name, position, isArchived) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/lists/${listId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify({ name, position, isArchived })
    });
    if (!res.ok) throw new Error('Error updating list');
    await get().fetchBoardDetails(boardId);
  },

  fetchArchivedItems: async (boardId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/archived-items`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server returned ${res.status}: ${errText || res.statusText}`);
    }
    return await res.json();
  },

  deleteList: async (boardId, listId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/lists/${listId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting list');
    await get().fetchBoardDetails(boardId);
  },

  archiveList: async (boardId, listId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/lists/${listId}/archive`, {
      method: 'PATCH',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error archiving list');
    }
    await get().fetchBoardDetails(boardId);
  },

  // Cards
  createCard: async (boardId, listId, title, position, priority) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/lists/${listId}/cards`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ title, position, priority })
    });
    if (!res.ok) throw new Error('Error creating card');
    const data = await res.json();
    await get().fetchBoardDetails(boardId);
    return data;
  },

  updateCard: async (boardId, cardId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error updating card');
    await get().fetchBoardDetails(boardId);
  },

  assignUserToCard: async (boardId, cardId, userId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/assign`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Error assigning user');
    await get().fetchBoardDetails(boardId);
  },

  unassignUserFromCard: async (boardId, cardId, userId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/unassign`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Error unassigning user');
    await get().fetchBoardDetails(boardId);
  },

  // Checklists
  createChecklistItem: async (boardId, cardId, content) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/checklist`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Error creating checklist item');
    await get().fetchBoardDetails(boardId);
  },

  updateChecklistItem: async (boardId, checklistId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/checklist/${checklistId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error updating checklist item');
    await get().fetchBoardDetails(boardId);
  },

  deleteChecklistItem: async (boardId, checklistId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/checklist/${checklistId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting checklist item');
    await get().fetchBoardDetails(boardId);
  },

  // Comments
  createComment: async (boardId, cardId, content) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/comments`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Error creating comment');
    await get().fetchBoardDetails(boardId);
  },

  // Dependencies
  createDependency: async (boardId, cardId, dependsOnCardId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/dependencies`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ dependsOnCardId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add dependency');
    }
    await get().fetchBoardDetails(boardId);
  },

  deleteDependency: async (boardId, cardId, depId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/dependencies/${depId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting dependency');
    await get().fetchBoardDetails(boardId);
  },

  // Milestones
  createMilestone: async (boardId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/milestones`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error creating milestone');
    await get().fetchBoardDetails(boardId);
  },

  updateMilestone: async (boardId, milestoneId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/milestones/${milestoneId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error updating milestone');
    await get().fetchBoardDetails(boardId);
  },

  deleteMilestone: async (boardId, milestoneId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/milestones/${milestoneId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting milestone');
    await get().fetchBoardDetails(boardId);
  },

  // Automations
  createAutomationRule: async (boardId, data) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/automations`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error creating automation rule');
    await get().fetchBoardDetails(boardId);
  },

  deleteAutomationRule: async (boardId, ruleId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/automations/${ruleId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error deleting automation rule');
    await get().fetchBoardDetails(boardId);
  },

  // Notifications
  fetchNotifications: async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Error fetching notifications');
      const data = await res.json();
      set({ notifications: data });
    } catch (error) {
      console.error(error);
    }
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error marking notification read');
    set((state) => ({
      notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
    }));
  },

  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Error marking all notifications read');
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true }))
    }));
  },

  addNotificationLocally: (n) => {
    set((state) => ({
      notifications: [n, ...state.notifications]
    }));
  },

  fetchInboxItems: async (workspaceId) => {
    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch inbox items');
      const data = await res.json();
      set({ inboxItems: data });
    } catch (error) {
      console.error(error);
    }
  },

  createInboxItem: async (workspaceId, item) => {
    const res = await fetch(`${API_URL}/inbox/${workspaceId}`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error('Failed to create inbox item');
    const data = await res.json();
    set((state) => ({ inboxItems: [data, ...state.inboxItems] }));
    return data;
  },

  updateInboxItem: async (workspaceId, itemId, updates) => {
    const res = await fetch(`${API_URL}/inbox/${workspaceId}/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(get().token),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update inbox item');
    const data = await res.json();
    set((state) => ({
      inboxItems: state.inboxItems.map((i) => i.id === itemId ? data : i)
    }));
    return data;
  },

  deleteInboxItem: async (workspaceId, itemId) => {
    const res = await fetch(`${API_URL}/inbox/${workspaceId}/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to delete inbox item');
    set((state) => ({
      inboxItems: state.inboxItems.filter((i) => i.id !== itemId)
    }));
  },

  convertInboxItem: async (workspaceId, itemId, payload) => {
    const item = get().inboxItems.find(i => i.id === itemId);
    if (!item) return;

    // Optimistic Update states
    const prevInboxItems = get().inboxItems;
    const prevWorkspace = get().currentWorkspace;
    const prevBoard = get().currentBoard;

    const tempCardId = `temp-${Date.now()}`;
    const tempCard: any = {
      id: tempCardId,
      title: payload.title || item.title,
      description: payload.description || item.description || '',
      position: 1000.0,
      listId: payload.listId,
      priority: payload.priority || item.priority || 'MEDIUM',
      dueDate: payload.dueDate || item.dueDate || null,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignees: [],
      checklists: [],
      dependencies: [],
      comments: [],
      customFields: JSON.stringify({ labels: payload.labels || [], emoji: '', links: [] })
    };

    // 1. Update inbox item status to CONVERTED
    const optInboxItems = get().inboxItems.map(i => i.id === itemId ? { ...i, status: 'CONVERTED' as any } : i);

    // 2. Append card to currentBoard lists if matches boardId
    let optBoard = get().currentBoard;
    if (optBoard && optBoard.id === payload.boardId) {
      optBoard = {
        ...optBoard,
        lists: optBoard.lists.map(list => {
          if (list.id === payload.listId) {
            return {
              ...list,
              cards: [...list.cards, tempCard]
            };
          }
          return list;
        })
      };
    }

    // 3. Update currentWorkspace lists
    let optWorkspace = get().currentWorkspace;
    if (optWorkspace) {
      optWorkspace = {
        ...optWorkspace,
        boards: optWorkspace.boards.map(b => {
          if (b.id === payload.boardId) {
            return {
              ...b,
              lists: (b.lists || []).map(list => {
                if (list.id === payload.listId) {
                  return { ...list, cards: [...(list.cards || []), tempCard] };
                }
                return list;
              })
            };
          }
          return b;
        })
      };
    }

    // Apply optimistic state
    set({ inboxItems: optInboxItems, currentBoard: optBoard, currentWorkspace: optWorkspace });

    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/${itemId}/convert`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to convert inbox item');
      const { card: realCard, inboxItem: realInboxItem } = await res.json();

      // Replace temp card in state
      set((state) => {
        let finalBoard = state.currentBoard;
        if (finalBoard && finalBoard.id === payload.boardId) {
          finalBoard = {
            ...finalBoard,
            lists: finalBoard.lists.map(list => {
              if (list.id === payload.listId) {
                return {
                  ...list,
                  cards: list.cards.map(c => c.id === tempCardId ? realCard : c)
                };
              }
              return list;
            })
          };
        }

        let finalWorkspace = state.currentWorkspace;
        if (finalWorkspace) {
          finalWorkspace = {
            ...finalWorkspace,
            boards: finalWorkspace.boards.map(b => {
              if (b.id === payload.boardId) {
                return {
                  ...b,
                  lists: (b.lists || []).map(list => {
                    if (list.id === payload.listId) {
                      return { ...list, cards: (list.cards || []).map(c => c.id === tempCardId ? realCard : c) };
                    }
                    return list;
                  })
                };
              }
              return b;
            })
          };
        }

        return {
          inboxItems: state.inboxItems.map(i => i.id === itemId ? realInboxItem : i),
          currentBoard: finalBoard,
          currentWorkspace: finalWorkspace
        };
      });

      // Show toast with Undo!
      get().addToast(
        'Task Created',
        `Task "${realCard.title}" created successfully.`,
        'success',
        {
          label: 'Undo',
          onClick: () => {
            get().undoConvertInboxItem(workspaceId, itemId, realCard.id);
          }
        }
      );
    } catch (err) {
      // Revert optimistic updates
      set({ inboxItems: prevInboxItems, currentWorkspace: prevWorkspace, currentBoard: prevBoard });
      get().addToast('Convert Failed', 'Failed to convert email to task.', 'error');
      throw err;
    }
  },

  undoConvertInboxItem: async (workspaceId, itemId, cardId) => {
    // Optimistic Revert
    const prevInboxItems = get().inboxItems;
    const prevWorkspace = get().currentWorkspace;
    const prevBoard = get().currentBoard;

    // Set status back to NEW
    const optInboxItems = get().inboxItems.map(i => i.id === itemId ? { ...i, status: 'NEW' as any } : i);

    // Remove card from currentBoard lists
    let optBoard = get().currentBoard;
    if (optBoard) {
      optBoard = {
        ...optBoard,
        lists: optBoard.lists.map(list => ({
          ...list,
          cards: list.cards.filter(c => c.id !== cardId)
        }))
      };
    }

    // Remove card from currentWorkspace lists
    let optWorkspace = get().currentWorkspace;
    if (optWorkspace) {
      optWorkspace = {
        ...optWorkspace,
        boards: optWorkspace.boards.map(b => ({
          ...b,
          lists: (b.lists || []).map(list => ({
            ...list,
            cards: (list.cards || []).filter(c => c.id !== cardId)
          }))
        }))
      };
    }

    set({ inboxItems: optInboxItems, currentBoard: optBoard, currentWorkspace: optWorkspace });

    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/${itemId}/undo-convert`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ cardId })
      });
      if (!res.ok) throw new Error('Failed to undo conversion');
      const { inboxItem } = await res.json();
      
      set((state) => ({
        inboxItems: state.inboxItems.map(i => i.id === itemId ? inboxItem : i)
      }));
      get().addToast('Undo Success', 'Task deleted, email restored to inbox.', 'success');
    } catch (err) {
      // Revert optimistic
      set({ inboxItems: prevInboxItems, currentWorkspace: prevWorkspace, currentBoard: prevBoard });
      get().addToast('Undo Failed', 'Could not revert task conversion.', 'error');
      throw err;
    }
  },

  batchConvertInboxItems: async (workspaceId, itemIds, payload) => {
    set({ syncStatus: 'syncing' });
    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/batch/convert`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ itemIds, ...payload })
      });
      if (!res.ok) throw new Error('Failed batch conversion');
      
      // Re-fetch everything to ensure consistent state
      await get().fetchInboxItems(workspaceId);
      const currentWorkspace = get().currentWorkspace;
      if (currentWorkspace) {
        await get().fetchWorkspaceDetails(currentWorkspace.id);
      }
      const currentBoard = get().currentBoard;
      if (currentBoard && currentBoard.id === payload.boardId) {
        await get().fetchBoardDetails(currentBoard.id);
      }
      
      set({ syncStatus: 'synced', lastSyncedTime: new Date() });
      get().addToast('Batch Convert Success', `Converted ${itemIds.length} items to tasks.`, 'success');
    } catch (err) {
      set({ syncStatus: 'offline' });
      get().addToast('Batch Convert Failed', 'Failed to convert selected items.', 'error');
      throw err;
    }
  },

  batchArchiveInboxItems: async (workspaceId, itemIds) => {
    set({ syncStatus: 'syncing' });
    // Optimistic Archive
    const prevItems = get().inboxItems;
    set((state) => ({
      inboxItems: state.inboxItems.map(i => itemIds.includes(i.id) ? { ...i, status: 'ARCHIVED' as any } : i)
    }));

    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/batch/archive`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ itemIds })
      });
      if (!res.ok) throw new Error('Failed batch archive');
      set({ syncStatus: 'synced', lastSyncedTime: new Date() });
      get().addToast('Batch Archive Success', `Archived ${itemIds.length} items.`, 'success');
    } catch (err) {
      set({ inboxItems: prevItems, syncStatus: 'offline' });
      get().addToast('Batch Archive Failed', 'Failed to archive selected items.', 'error');
      throw err;
    }
  },

  batchDeleteInboxItems: async (workspaceId, itemIds) => {
    set({ syncStatus: 'syncing' });
    // Optimistic Delete
    const prevItems = get().inboxItems;
    set((state) => ({
      inboxItems: state.inboxItems.filter(i => !itemIds.includes(i.id))
    }));

    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/batch/delete`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ itemIds })
      });
      if (!res.ok) throw new Error('Failed batch delete');
      set({ syncStatus: 'synced', lastSyncedTime: new Date() });
      get().addToast('Batch Delete Success', `Deleted ${itemIds.length} items.`, 'success');
    } catch (err) {
      set({ inboxItems: prevItems, syncStatus: 'offline' });
      get().addToast('Batch Delete Failed', 'Failed to delete selected items.', 'error');
      throw err;
    }
  },

  batchUpdateInboxItemsStatus: async (workspaceId, itemIds, status) => {
    set({ syncStatus: 'syncing' });
    // Optimistic status update
    const prevItems = get().inboxItems;
    set((state) => ({
      inboxItems: state.inboxItems.map(i => itemIds.includes(i.id) ? { ...i, status: status as any } : i)
    }));

    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/batch/status`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ itemIds, status })
      });
      if (!res.ok) throw new Error('Failed batch status update');
      set({ syncStatus: 'synced', lastSyncedTime: new Date() });
      get().addToast('Batch Status Success', `Updated status of ${itemIds.length} items.`, 'success');
    } catch (err) {
      set({ inboxItems: prevItems, syncStatus: 'offline' });
      get().addToast('Batch Status Failed', 'Failed to update selected items.', 'error');
      throw err;
    }
  },

  batchAssignLabelsToInboxItems: async (workspaceId, itemIds, labels) => {
    set({ syncStatus: 'syncing' });
    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/batch/labels`, {
        method: 'POST',
        headers: getHeaders(get().token),
        body: JSON.stringify({ itemIds, labels })
      });
      if (!res.ok) throw new Error('Failed batch labels assignment');
      await get().fetchInboxItems(workspaceId);
      set({ syncStatus: 'synced', lastSyncedTime: new Date() });
      get().addToast('Labels Assigned', 'Assigned labels to selected items.', 'success');
    } catch (err) {
      set({ syncStatus: 'offline' });
      get().addToast('Labels Assignment Failed', 'Failed to assign labels.', 'error');
      throw err;
    }
  },

  parseEmailIntelligently: async (title, text, html) => {
    const res = await fetch(`${API_URL}/inbox/parse-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, text, html })
    });
    if (!res.ok) throw new Error('Failed to parse email');
    return await res.json();
  },

  checkDuplicates: async (boardId, title, messageId = null, threadId = null) => {
    const res = await fetch(`${API_URL}/inbox/check-duplicates`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ boardId, title, messageId, threadId })
    });
    if (!res.ok) throw new Error('Failed to check duplicates');
    return await res.json();
  },

  mergeCard: async (data) => {
    const res = await fetch(`${API_URL}/inbox/merge-card`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to merge card');
    const result = await res.json();
    
    // Refresh workspace details to show card changes
    const currentWorkspace = get().currentWorkspace;
    if (currentWorkspace) {
      await get().fetchWorkspaceDetails(currentWorkspace.id);
    }
    const currentBoard = get().currentBoard;
    if (currentBoard) {
      await get().fetchBoardDetails(currentBoard.id);
    }
    return result;
  },

  uploadAttachment: async (boardId, cardId, file) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(file)
    });
    if (!res.ok) throw new Error('Failed to upload attachment');
    const attachment = await res.json();
    
    // Refresh board details
    const currentBoard = get().currentBoard;
    if (currentBoard) {
      await get().fetchBoardDetails(currentBoard.id);
    }
    return attachment;
  },

  deleteAttachment: async (boardId, cardId, attachmentId) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to delete attachment');
    
    // Refresh board details
    const currentBoard = get().currentBoard;
    if (currentBoard) {
      await get().fetchBoardDetails(currentBoard.id);
    }
  },

  fetchEmailLogs: async (workspaceId, boardId) => {
    try {
      const res = await fetch(`${API_URL}/inbox/${workspaceId}/logs/${boardId}`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch email logs');
      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  sendTestEmail: async (workspaceId, boardId) => {
    const res = await fetch(`${API_URL}/inbox/${workspaceId}/test-email/${boardId}`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to trigger test email');
    }
  },

  fetchGmailRules: async () => {
    try {
      const res = await fetch(`${API_URL}/gmail/rules`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch Gmail rules');
      const data = await res.json();
      set({ gmailRules: data });
    } catch (err) {
      console.error(err);
    }
  },

  createGmailRule: async (rule) => {
    const res = await fetch(`${API_URL}/gmail/rules`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(rule)
    });
    if (!res.ok) throw new Error('Failed to create Gmail rule');
    await get().fetchGmailRules();
  },

  deleteGmailRule: async (ruleId) => {
    const res = await fetch(`${API_URL}/gmail/rules/${ruleId}`, {
      method: 'DELETE',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to delete Gmail rule');
    await get().fetchGmailRules();
  },

  replyToGmail: async (itemId, replyText) => {
    const res = await fetch(`${API_URL}/gmail/reply`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ itemId, replyText })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to send reply');
    }
  },

  mockIncomingInboxItems: async (workspaceId) => {
    const res = await fetch(`${API_URL}/inbox/${workspaceId}/mock-incoming`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to fetch mock incoming items');
    const data = await res.json();
    set((state) => ({
      inboxItems: [...data, ...state.inboxItems]
    }));
  },

  fetchGmailProfile: async () => {
    try {
      const res = await fetch(`${API_URL}/gmail/profile`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch Gmail profile');
      const data = await res.json();
      set({ gmailProfile: data });
    } catch (err) {
      console.error(err);
    }
  },

  updateGmailSettings: async (settings) => {
    const res = await fetch(`${API_URL}/gmail/settings`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update Gmail settings');
    const data = await res.json();
    set({ gmailProfile: data });
  },

  connectGmail: async () => {
    const res = await fetch(`${API_URL}/gmail/auth-url`, {
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to fetch Gmail auth URL');
    }
    const { url } = await res.json();
    return url;
  },

  disconnectGmail: async () => {
    const res = await fetch(`${API_URL}/gmail/disconnect`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) throw new Error('Failed to disconnect Gmail');
    set({ gmailProfile: { ...get().gmailProfile, googleEmail: null } });
  },

  syncGmailInbox: async (workspaceId) => {
    const res = await fetch(`${API_URL}/gmail/sync`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ workspaceId })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to sync Gmail inbox');
    }
    // Refresh inbox items
    await get().fetchInboxItems(workspaceId);
    await get().fetchGmailLogs();
  },

  sendTestGmail: async () => {
    const res = await fetch(`${API_URL}/gmail/test-send`, {
      method: 'POST',
      headers: getHeaders(get().token)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to send test email');
    }
    await get().fetchGmailLogs();
  },

  fetchGmailLogs: async () => {
    try {
      const res = await fetch(`${API_URL}/gmail/logs`, {
        headers: getHeaders(get().token)
      });
      if (!res.ok) throw new Error('Failed to fetch Gmail logs');
      const data = await res.json();
      set({ gmailLogs: data });
    } catch (err) {
      console.error(err);
    }
  },

  triggerGmailReminder: async (type) => {
    const res = await fetch(`${API_URL}/gmail/trigger-reminder`, {
      method: 'POST',
      headers: getHeaders(get().token),
      body: JSON.stringify({ type })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to trigger reminder');
    }
    await get().fetchGmailLogs();
  },

  toasts: [],
  addToast: (title, message, type = 'info', action) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, title, message, type, action }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 6000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  confirmModal: {
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {}
  },
  showConfirm: (title, message, confirmText = 'Confirm', cancelText = 'Cancel') => {
    return new Promise<boolean>((resolve) => {
      set({
        confirmModal: {
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          onConfirm: () => {
            set((state) => ({ confirmModal: { ...state.confirmModal, isOpen: false } }));
            resolve(true);
          },
          onCancel: () => {
            set((state) => ({ confirmModal: { ...state.confirmModal, isOpen: false } }));
            resolve(false);
          }
        }
      });
    });
  }
}));

export const getAvatarUrl = (url: string | null | undefined, nameOrUsername?: string | null) => {
  if (!url) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameOrUsername || 'U')}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Remove leading slash if present
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${BACKEND_BASE_URL}/${cleanPath}`;
};
