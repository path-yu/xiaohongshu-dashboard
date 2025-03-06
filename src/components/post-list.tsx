import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Checkbox,
  Chip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";
import { useCommentStore } from "../store/comment-store";
import type { Post } from "../types";

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  const { selectedPosts, togglePostSelection } = useCommentStore();

  const handleToggleSelection = (post: Post) => {
    togglePostSelection(post);
  };

  return (
    <Grid container spacing={3}>
      {posts.map((post) => (
        <Grid item xs={12} sm={6} md={4} key={post.id}>
          <Card
            sx={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                boxShadow: 3,
                transform: "translateY(-2px)",
              },
              ...(selectedPosts.some((p) => p.id === post.id)
                ? {
                    border: "2px solid",
                    borderColor: "primary.main",
                  }
                : {}),
            }}
            onClick={() => handleToggleSelection(post)}
          >
            <Box sx={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}>
              <Checkbox
                checked={selectedPosts.some((p) => p.id === post.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggleSelection(post);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: "50%",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.9)" },
                }}
              />
            </Box>

            <CardMedia
              component="img"
              height="140"
              image={post.imageUrl}
              alt={post.title}
            />

            <CardContent sx={{ flexGrow: 1 }}>
              <Typography gutterBottom variant="h6" component="div" noWrap>
                {post.title}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  height: 60,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {post.content}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  @{post.author}
                </Typography>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip
                    icon={<FavoriteIcon fontSize="small" />}
                    label={post.likes}
                    size="small"
                    variant="outlined"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Chip
                    icon={<CommentIcon fontSize="small" />}
                    label={post.comments}
                    size="small"
                    variant="outlined"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
