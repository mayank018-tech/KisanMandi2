import { create } from 'zustand';

type AppUiState = {
  communityDraft: string;
  selectedConversationId: string | null;
  chatSearch: string;
  setCommunityDraft: (draft: string) => void;
  setSelectedConversationId: (conversationId: string | null) => void;
  setChatSearch: (search: string) => void;
  resetChatUi: () => void;
};

export const useAppUiStore = create<AppUiState>((set) => ({
  communityDraft: '',
  selectedConversationId: null,
  chatSearch: '',
  setCommunityDraft: (communityDraft) => set({ communityDraft }),
  setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
  setChatSearch: (chatSearch) => set({ chatSearch }),
  resetChatUi: () => set({ selectedConversationId: null, chatSearch: '' }),
}));
