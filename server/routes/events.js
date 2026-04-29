const router = require('express').Router();
const Event = require('../models/Event');
const User  = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/events  — list all (with optional filters)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$or = [
        { title:     { $regex: req.query.search, $options: 'i' } },
        { organizer: { $regex: req.query.search, $options: 'i' } },
        { venue:     { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const events = await Event.find(filter).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events  — create (organizer / admin only)
router.post('/', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/events/:id  — update
router.put('/:id', protect, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/events/:id  — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/:id/register  — register current user
router.post('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.registered >= event.seats)
      return res.status(400).json({ message: 'Event is full' });
    if (event.registeredUsers.includes(req.user._id))
      return res.status(400).json({ message: 'Already registered' });

    event.registered += 1;
    event.registeredUsers.push(req.user._id);
    await event.save();

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { registeredEvents: event._id } });
    res.json({ message: 'Registered successfully', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/:id/register  — cancel registration
router.delete('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!event.registeredUsers.includes(req.user._id))
      return res.status(400).json({ message: 'Not registered for this event' });

    event.registered = Math.max(0, event.registered - 1);
    event.registeredUsers = event.registeredUsers.filter(id => !id.equals(req.user._id));
    await event.save();

    await User.findByIdAndUpdate(req.user._id, { $pull: { registeredEvents: event._id } });
    res.json({ message: 'Registration cancelled', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
