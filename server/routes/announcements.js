const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

// GET /api/announcements
router.get('/', async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/announcements  — admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, type } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body required' });
    const ann = await Announcement.create({ title, body, type, author: req.user.name, createdBy: req.user._id });
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/announcements/:id  — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
