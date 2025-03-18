import { Box, CardContent, Typography, Checkbox, Chip } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";
import { useCommentStore } from "../store/comment-store";
import type { Post } from "../types";
import { motion } from "framer-motion";
import AnimatedCard from "./animated-card";
import Grid from "@mui/material/Grid2";
interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  const { selectedPosts, togglePostSelection } = useCommentStore();

  const handleToggleSelection = (post: Post) => {
    togglePostSelection(post);
  };

  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <Grid container spacing={3}>
        {posts.map((post, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={post.id}>
            <AnimatedCard
              delay={index * 0.05}
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
              <CardContent sx={{ flexGrow: 1, marginLeft: "40px" }}>
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    {post.avatar ? (
                      <img
                        src={post.avatar}
                        alt={post.author}
                        width="30"
                        height="30"
                        style={{ borderRadius: "50%", marginRight: "5px" }}
                      ></img>
                    ) : null}
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
            </AnimatedCard>
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
}
