import { create } from "zustand";
import type { Post } from "../types";

interface CommentStore {
  selectedPosts: Post[];
  isCommentModalOpen: boolean;
  togglePostSelection: (post: Post) => void;
  selectAllPosts: (posts: Post[]) => void;
  deselectAllPosts: () => void;
  openCommentModal: () => void;
  closeCommentModal: () => void;
  clearSelectedPosts: () => void;
}

export const useCommentStore = create<CommentStore>((set) => ({
  selectedPosts: [],
  isCommentModalOpen: false,

  togglePostSelection: (post) =>
    set((state) => {
      const isSelected = state.selectedPosts.some((p) => p.id === post.id);

      if (isSelected) {
        return {
          selectedPosts: state.selectedPosts.filter((p) => p.id !== post.id),
        };
      } else {
        return {
          selectedPosts: [...state.selectedPosts, post],
        };
      }
    }),

  selectAllPosts: (posts) =>
    set((state) => {
      // Create a map of existing selected posts for quick lookup
      const selectedMap = new Map(
        state.selectedPosts.map((post) => [post.id, post])
      );

      // Add all posts that aren't already selected
      posts.forEach((post) => {
        if (!selectedMap.has(post.id)) {
          selectedMap.set(post.id, post);
        }
      });

      return {
        selectedPosts: Array.from(selectedMap.values()),
      };
    }),

  deselectAllPosts: () => set({ selectedPosts: [] }),

  openCommentModal: () => set({ isCommentModalOpen: true }),

  closeCommentModal: () => set({ isCommentModalOpen: false }),

  clearSelectedPosts: () => set({ selectedPosts: [] }),
}));
