// Run: node seed.js
// Seeds the DB with an admin user + sample events + announcements

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User         = require('./models/User');
const Event        = require('./models/Event');
const Announcement = require('./models/Announcement');

const events = [
  { title:"National Hackathon 2026", category:"technical", date:"2026-05-10", time:"09:00", venue:"Main Auditorium", organizer:"CSE Department", desc:"48-hour coding marathon. Build innovative solutions for real-world problems. Prizes worth ₹1,00,000.", seats:200, registered:143, fee:"Free", icon:"💻" },
  { title:"Cultural Night — Rang De", category:"cultural", date:"2026-05-15", time:"18:00", venue:"Open Air Theatre", organizer:"Cultural Club", desc:"An evening of music, dance, drama and fashion. Performances from 20+ groups.", seats:500, registered:380, fee:"₹50", icon:"🎭" },
  { title:"Inter-College Cricket Tournament", category:"sports", date:"2026-05-18", time:"07:00", venue:"College Ground", organizer:"Sports Committee", desc:"3-day cricket tournament with 16 college teams. Knockout format.", seats:100, registered:64, fee:"₹200/team", icon:"🏏" },
  { title:"AI & ML Workshop", category:"workshop", date:"2026-05-22", time:"10:00", venue:"Lab Block 3", organizer:"AI Club", desc:"Hands-on workshop covering Python, TensorFlow, and neural networks. Laptops required.", seats:60, registered:58, fee:"₹100", icon:"🤖" },
  { title:"Entrepreneurship Summit", category:"seminar", date:"2026-05-25", time:"11:00", venue:"Seminar Hall A", organizer:"E-Cell", desc:"Industry leaders share their journey. Panel discussions and pitch competition.", seats:300, registered:210, fee:"Free", icon:"🚀" },
  { title:"Photography Exhibition", category:"cultural", date:"2026-06-01", time:"10:00", venue:"Art Gallery, Block D", organizer:"Photography Club", desc:"Annual photography exhibition. Voting for best photo.", seats:400, registered:120, fee:"Free", icon:"📸" },
  { title:"Robotics Competition", category:"technical", date:"2026-06-05", time:"09:00", venue:"Workshop Hall", organizer:"Robotics Club", desc:"Line-following, maze-solving, and battle-bot categories.", seats:80, registered:72, fee:"₹500/team", icon:"🦾" },
  { title:"Yoga & Wellness Day", category:"sports", date:"2026-06-10", time:"06:30", venue:"College Lawn", organizer:"NSS Unit", desc:"Guided yoga sessions, meditation, and wellness talks.", seats:250, registered:89, fee:"Free", icon:"🧘" },
  { title:"Web Dev Bootcamp", category:"workshop", date:"2026-06-12", time:"09:00", venue:"Computer Lab 2", organizer:"Web Dev Club", desc:"3-day bootcamp: HTML, CSS, JavaScript, React. Build a full project.", seats:50, registered:50, fee:"₹150", icon:"🌐" }
];

const announcements = [
  { title:"TechFest 2026 Registration Open!", body:"Registrations for TechFest 2026 are now open. Early bird discount till May 5th. Register now and save ₹200!", type:"success", author:"Events Committee" },
  { title:"Venue Change — Cultural Night", body:"Cultural Night has been moved to the Open Air Theatre due to high registrations. Same time, bigger stage!", type:"warning", author:"Cultural Club" },
  { title:"New Workshop: Cybersecurity Basics", body:"A new workshop on Cybersecurity Basics has been added for May 30th. Limited seats — register early!", type:"info", author:"IT Department" }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany(), Event.deleteMany(), Announcement.deleteMany()]);
  console.log('🗑  Cleared existing data');

  // Create admin
  const admin = await User.create({ name:'Admin User', email:'admin@college.edu', password:'admin123', role:'admin' });
  console.log('👤 Admin created — email: admin@college.edu  password: admin123');

  // Create organizer
  await User.create({ name:'Event Organizer', email:'organizer@college.edu', password:'org123', role:'organizer' });
  console.log('👤 Organizer created — email: organizer@college.edu  password: org123');

  // Seed events
  await Event.insertMany(events.map(e => ({ ...e, createdBy: admin._id })));
  console.log(`📅 ${events.length} events seeded`);

  // Seed announcements
  await Announcement.insertMany(announcements.map(a => ({ ...a, createdBy: admin._id })));
  console.log(`📢 ${announcements.length} announcements seeded`);

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
