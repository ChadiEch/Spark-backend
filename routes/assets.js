const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const assetController = require('../controllers/assetController');
const upload = require('../middleware/upload');

// All routes below are protected
router.use(protect);

// GET /api/assets - Get all assets
router.get('/', assetController.getAssets);

// GET /api/assets/:id - Get single asset
router.get('/:id', assetController.getAsset);

// POST /api/assets - Create new asset
router.post('/', upload.single('file'), assetController.createAsset);

// PUT /api/assets/:id - Update asset
router.put('/:id', assetController.updateAsset);

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', assetController.deleteAsset);

module.exports = router;