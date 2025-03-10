import * as React from "react";
import type { Post } from "../types";

interface PostContextType {
  currentPosts: Post[];
  setCurrentPosts: (posts: Post[]) => void;
}

const PostContext = React.createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [currentPosts, setCurrentPosts] = React.useState<Post[]>([]);

  return (
    <PostContext.Provider value={{ currentPosts, setCurrentPosts }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePostContext() {
  const context = React.useContext(PostContext);
  if (context === undefined) {
    throw new Error("usePostContext must be used within a PostProvider");
  }
  return context;
}
