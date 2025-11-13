const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const postController = require('../controllers/postController');

// All routes below are protected
router.use(protect);

// GET /api/posts - Get all posts
router.get('/', postController.getPosts);

// GET /api/posts/:id - Get single post
router.get('/:id', postController.getPost);

// POST /api/posts - Create new post
router.post('/', postController.createPost);

// PUT /api/posts/:id - Update post
router.put('/:id', postController.updatePost);

// DELETE /api/posts/:id - Delete post
router.delete('/:id', postController.deletePost);

// POST /api/posts/:id/publish - Publish post to social media
router.post('/:id/publish', postController.publishPost);

module.exports = router;