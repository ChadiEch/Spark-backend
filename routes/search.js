const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

// All routes below are protected
router.use(protect);

// GET /api/search - Search across all entities
router.get('/', searchController.searchAll);

// GET /api/search/posts - Search posts
router.get('/posts', searchController.searchPosts);

// GET /api/search/campaigns - Search campaigns
router.get('/campaigns', searchController.searchCampaigns);

// GET /api/search/tasks - Search tasks
router.get('/tasks', searchController.searchTasks);

module.exports = router;