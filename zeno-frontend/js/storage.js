/* =============================================================================
   Zeno Local Chat History Storage (No DB, LocalStorage only)
   Tracks up to 25 recent non-pinned chats. FIFO eviction.
   ============================================================================= */

window.ZenoStorage = {
  getChats() {
    const data = localStorage.getItem('zeno_chat_history');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load chat history', e);
      return [];
    }
  },

  saveChats(chats) {
    localStorage.setItem('zeno_chat_history', JSON.stringify(chats));
  },

  createChat(title = 'New Conversation') {
    const chats = this.getChats();
    
    // Check limit of recent (non-pinned) chats
    const nonPinned = chats.filter(c => !c.pinned);
    if (nonPinned.length >= 25) {
      // Find the oldest non-pinned chat and remove it
      // Sort oldest first by updatedAt or id
      const sortedNonPinned = [...nonPinned].sort((a, b) => a.updatedAt - b.updatedAt);
      const oldest = sortedNonPinned[0];
      if (oldest) {
        this.deleteChat(oldest.id);
      }
    }

    const newId = Date.now();
    const newChat = {
      id: newId,
      title: title,
      messages: [],
      pinned: false,
      createdAt: newId,
      updatedAt: newId
    };

    const currentChats = this.getChats();
    currentChats.push(newChat);
    this.saveChats(currentChats);
    return newChat;
  },

  getChat(id) {
    const chats = this.getChats();
    return chats.find(c => c.id === Number(id));
  },

  saveMessages(chatId, messages) {
    const chats = this.getChats();
    const chat = chats.find(c => c.id === Number(chatId));
    if (chat) {
      chat.messages = messages;
      chat.updatedAt = Date.now();
      this.saveChats(chats);
    }
  },

  renameChat(id, newTitle) {
    const chats = this.getChats();
    const chat = chats.find(c => c.id === Number(id));
    if (chat) {
      chat.title = newTitle;
      chat.updatedAt = Date.now();
      this.saveChats(chats);
    }
  },

  pinChat(id) {
    const chats = this.getChats();
    const chat = chats.find(c => c.id === Number(id));
    if (chat) {
      chat.pinned = true;
      chat.updatedAt = Date.now();
      this.saveChats(chats);
    }
  },

  unpinChat(id) {
    const chats = this.getChats();
    const chat = chats.find(c => c.id === Number(id));
    if (chat) {
      chat.pinned = false;
      chat.updatedAt = Date.now();
      this.saveChats(chats);
    }
  },

  deleteChat(id) {
    const chats = this.getChats();
    const filtered = chats.filter(c => c.id !== Number(id));
    this.saveChats(filtered);
  },

  clearAll() {
    localStorage.removeItem('zeno_chat_history');
  }
};
