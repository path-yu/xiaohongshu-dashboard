export interface Post {
  id: string
  title: string
  content: string
  author: string
  likes: number
  comments: number
  imageUrl: string
  category: string
}

export interface CommentTemplate {
  id: string
  name: string
  content: string
}

