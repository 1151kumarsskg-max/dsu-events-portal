const router = require('express').Router();
const User  = require('../models/User');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users/profile  — own profile with registered events
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('registeredEvents', 'title category date venue icon fee');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/profile  — update name / password
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (password) user.password = password;   // pre-save hook will hash it
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users  — admin: list all users
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id  — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/stats  — admin dashboard stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalEvents, announcements] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      require('../models/Announcement').countDocuments()
    ]);
    const totalReg = await Event.aggregate([{ $group: { _id: null, total: { $sum: '$registered' } } }]);
    res.json({
      totalUsers,
      totalEvents,
      totalRegistrations: totalReg[0]?.total || 0,
      totalAnnouncements: announcements
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
