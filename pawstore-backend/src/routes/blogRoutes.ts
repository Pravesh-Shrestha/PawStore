import express from 'express';
const router = express.Router();


import { getBlogs,
  getFeaturedBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
 } from "../controllers/blogController";
import { protect, admin  } from "../middleware/authMiddleware";

router.route("/").get(getBlogs).post(protect, admin, createBlog);
router.route("/featured").get(getFeaturedBlogs);
router
  .route("/:id")
  .get(getBlogById)
  .put(protect, admin, updateBlog)
  .delete(protect, admin, deleteBlog);

export default router;



