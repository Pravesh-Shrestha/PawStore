import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Blog from "../models/blogModel";
import { writeLog, logLevels } from "../utils/activityLogger";

const getUserId = (user: any): string => user?._id?.toString() || "anonymous";

// @desc    Fetch all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
  const category = req.query.category;
  const query = category && category !== 'all' ? { category } : {};
  
  const blogs = await Blog.find(query).sort({ date: -1 });
  res.json(blogs);
});

// @desc    Fetch featured blogs
// @route   GET /api/blogs/featured
// @access  Public
const getFeaturedBlogs = asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ featured: true }).sort({ date: -1 });
  res.json(blogs);
});

// @desc    Fetch single blog
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (blog) {
    res.json(blog);
  } else {
    res.status(404);
    throw new Error("Blog not found");
  }
});

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  const { title, excerpt, content, image, author, category, featured } = req.body;

  const blog = new Blog({
    title,
    excerpt,
    content,
    image,
    author,
    category,
    featured: featured || false,
  });

  const createdBlog = await blog.save();

  writeLog(logLevels.INFO, "BLOG_CREATED", getUserId(req.user), {
    blogId: (createdBlog._id as any).toString(),
    blogTitle: title,
    category,
  }, req);

  res.status(201).json(createdBlog);
});

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  const { title, excerpt, content, image, author, category, featured } = req.body;

  const blog = await Blog.findById(req.params.id);

  if (blog) {
    blog.title = title || blog.title;
    blog.excerpt = excerpt || blog.excerpt;
    blog.content = content || blog.content;
    blog.image = image || blog.image;
    blog.author = author || blog.author;
    blog.category = category || blog.category;
    blog.featured = featured !== undefined ? featured : blog.featured;

    const updatedBlog = await blog.save();

    writeLog(logLevels.INFO, "BLOG_UPDATED", getUserId(req.user), {
      blogId: req.params.id,
      blogTitle: updatedBlog.title,
      updatedFields: Object.keys(req.body),
    }, req);

    res.json(updatedBlog);
  } else {
    writeLog(logLevels.WARN, "BLOG_UPDATE_NOT_FOUND", getUserId(req.user), {
      blogId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Blog not found");
  }
});

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (blog) {
    await Blog.deleteOne({ _id: blog._id });

    writeLog(logLevels.SECURITY, "BLOG_DELETED", getUserId(req.user), {
      blogId: req.params.id,
      blogTitle: blog.title,
    }, req);

    res.json({ message: "Blog removed" });
  } else {
    writeLog(logLevels.WARN, "BLOG_DELETE_NOT_FOUND", getUserId(req.user), {
      blogId: req.params.id,
    }, req);
    res.status(404);
    throw new Error("Blog not found");
  }
});

export {
  getBlogs,
  getFeaturedBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
