import { create } from "zustand"
import type { Post } from "@/types"

interface CommentStore {
  selectedPosts: Post[]
  isCommentModalOpen: boolean
  togglePostSelection: (post: Post) => void
  openCommentModal: () => void
  closeCommentModal: () => void
  clearSelectedPosts: () => void
}

export const useCommentStore = create<CommentStore>((set) => ({
  selectedPosts: [],
  isCommentModalOpen: false,

  togglePostSelection: (post) =>
    set((state) => {
      const isSelected = state.selectedPosts.some((p) => p.id === post.id)

      if (isSelected) {
        return {
          selectedPosts: state.selectedPosts.filter((p) => p.id !== post.id),
        }
      } else {
        return {
          selectedPosts: [...state.selectedPosts, post],
        }
      }
    }),

  openCommentModal: () => set({ isCommentModalOpen: true }),

  closeCommentModal: () => set({ isCommentModalOpen: false }),

  clearSelectedPosts: () => set({ selectedPosts: [] }),
}))

