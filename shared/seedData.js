/**
 * COMP229 - Web Application Development
 * Project: IncidentFlow - Incident Management System
 *
 * Team Members:
 * Ivan Seck Ali - 301501210
 * Robel Teffera - 301113578
 * Ryan Sunil - 301495962
 * Bronson Pearl - 301328703
 *
 * Description:
 * This file is part of the IncidentFlow MERN application.
 */

// ---------- DEMO USERS ----------

// key is just a short name the incidents below use to point at a user
// no passwords here, the seed script adds them from the .env file
export const SEED_USERS = [
  { key: 'alex', firstName: 'Alex', lastName: 'Morgan', email: 'alex.morgan@incidentflow.demo', role: 'admin' },
  { key: 'jordan', firstName: 'Jordan', lastName: 'Lee', email: 'jordan.lee@incidentflow.demo', role: 'technician' },
  { key: 'taylor', firstName: 'Taylor', lastName: 'Chen', email: 'taylor.chen@incidentflow.demo', role: 'user' },
  { key: 'priya', firstName: 'Priya', lastName: 'Shah', email: 'priya.shah@incidentflow.demo', role: 'technician' },
  { key: 'marcus', firstName: 'Marcus', lastName: 'Bell', email: 'marcus.bell@incidentflow.demo', role: 'technician' },
  { key: 'sofia', firstName: 'Sofia', lastName: 'Ramirez', email: 'sofia.ramirez@incidentflow.demo', role: 'user' },
  { key: 'dev', firstName: 'Dev', lastName: 'Patel', email: 'dev.patel@incidentflow.demo', role: 'user' },

  // one deactivated user so the Users page shows that state
  { key: 'nina', firstName: 'Nina', lastName: 'Okafor', email: 'nina.okafor@incidentflow.demo', role: 'user', isActive: false },
];

// ---------- DEMO INCIDENTS ----------

// by = who reported it, to = assigned technician (none = unassigned)
// ageDays = created that many days ago
// resolvedAfterHours = how long it took to resolve (only for Resolved / Closed)
export const SEED_INCIDENTS = [
  // the 5 example incidents from the blueprint (section 22.2)
  { title: 'Wi-Fi unavailable in Lab 4', category: 'IT', priority: 'High', status: 'In Progress', location: 'Building A - Lab 4', by: 'taylor', to: 'jordan', ageDays: 1,
    description: 'Students in Lab 4 cannot connect to the campus Wi-Fi. Devices see the network but fail to get an IP address. Wired connections work.',
    comments: [['jordan', 'Access point in the ceiling is rebooting every few minutes. Replacing the PoE injector now.'], ['taylor', 'Thanks, class starts at 2pm if that helps prioritize.']] },
  { title: 'Water leak near east stairwell', category: 'Facilities', priority: 'Critical', status: 'Assigned', location: 'Building B - Level 2', by: 'sofia', to: 'marcus', ageDays: 0, escalated: true,
    description: 'Water is pooling on the floor beside the east stairwell on level 2 and appears to be dripping from a ceiling tile. Area is slippery.' },
  { title: 'Projector displays no signal', category: 'Equipment', priority: 'Medium', status: 'Open', location: 'Room C210', by: 'taylor', ageDays: 2,
    description: 'The ceiling projector in C210 powers on but shows "No signal" with both HDMI and the wireless presenter. Tried two laptops.' },
  { title: 'Blocked emergency exit', category: 'Safety', priority: 'Critical', status: 'Resolved', location: 'Building C - West Exit', by: 'dev', to: 'priya', ageDays: 6, resolvedAfterHours: 3,
    description: 'Pallets of delivered furniture are stacked in front of the west emergency exit door, blocking it completely.',
    resolution: 'Facilities moved the pallets to the loading dock storage room. Exit is clear and signage was re-checked.' },
  { title: 'Door access card reader intermittent', category: 'Security', priority: 'High', status: 'On Hold', location: 'Main Entrance', by: 'sofia', to: 'jordan', ageDays: 4,
    description: 'The card reader at the main entrance only accepts badges on the second or third tap. Started after the weekend power outage.',
    comments: [['jordan', 'Replacement reader ordered from the vendor, ETA Thursday. Putting this on hold until it arrives.']] },

  // older history so the analytics charts have data to show
  { title: 'Printer jamming on every job', category: 'Equipment', priority: 'Low', status: 'Closed', location: 'Library - Level 1', by: 'dev', to: 'marcus', ageDays: 21, resolvedAfterHours: 30,
    description: 'The shared printer near the library entrance jams on nearly every print job, especially double-sided.', resolution: 'Replaced worn pickup rollers and cleaned the duplex unit.' },
  { title: 'VPN disconnects every 10 minutes', category: 'IT', priority: 'High', status: 'Resolved', location: 'Remote - Staff laptops', by: 'taylor', to: 'priya', ageDays: 12, resolvedAfterHours: 20,
    description: 'Several staff working remotely report the VPN client dropping roughly every ten minutes since the latest update.', resolution: 'Rolled back the VPN client to the previous stable version and opened a ticket with the vendor.' },
  { title: 'Broken window latch in study room', category: 'Facilities', priority: 'Medium', status: 'Resolved', location: 'Building A - Room 118', by: 'sofia', to: 'marcus', ageDays: 15, resolvedAfterHours: 52,
    description: 'The window latch in study room 118 is broken so the window cannot be closed or locked.', resolution: 'Latch assembly replaced. Window locks correctly.' },
  { title: 'Suspicious email asking for passwords', category: 'Security', priority: 'High', status: 'Closed', location: 'Email - All staff', by: 'dev', to: 'jordan', ageDays: 9, resolvedAfterHours: 4,
    description: 'Multiple staff received an email pretending to be IT asking them to "verify" their password through an external link.', resolution: 'Sender blocked, message purged from all inboxes, awareness notice sent to staff.' },
  { title: 'Lab fume hood alarm sounding', category: 'Safety', priority: 'High', status: 'Resolved', location: 'Science Wing - Lab S3', by: 'taylor', to: 'priya', ageDays: 18, resolvedAfterHours: 6,
    description: 'The low-airflow alarm on fume hood 2 in lab S3 keeps sounding even with the sash lowered.', resolution: 'Exhaust fan belt replaced; airflow certified within range.' },
  { title: 'Elevator stuck between floors', category: 'Facilities', priority: 'Critical', status: 'Closed', location: 'Building B - Elevator 1', by: 'sofia', to: 'marcus', ageDays: 26, resolvedAfterHours: 2,
    description: 'Elevator 1 stopped between floors 2 and 3. Nobody inside, but the car is not responding to calls.', resolution: 'Elevator contractor reset the controller and replaced a faulty door sensor.' },
  { title: 'Shared drive running out of space', category: 'IT', priority: 'Medium', status: 'In Progress', location: 'Server room - File server', by: 'dev', to: 'jordan', ageDays: 3,
    description: 'The department shared drive is at 96% capacity and users are getting "disk full" warnings when saving large files.' },
  { title: 'Flickering lights in hallway', category: 'Facilities', priority: 'Low', status: 'Open', location: 'Building C - Level 3 hallway', by: 'taylor', ageDays: 1,
    description: 'Three ceiling lights in the level 3 hallway flicker constantly. It is distracting and gives some people headaches.' },
  { title: 'Laptop cart missing two devices', category: 'Equipment', priority: 'Medium', status: 'Open', location: 'Room D104', by: 'sofia', ageDays: 0,
    description: 'The laptop cart in D104 should hold 30 laptops but only 28 were present at the end of the afternoon session.' },
  { title: 'Parking gate stuck open', category: 'Security', priority: 'Medium', status: 'Resolved', location: 'Staff parking lot P2', by: 'dev', to: 'jordan', ageDays: 8, resolvedAfterHours: 26,
    description: 'The barrier arm at the P2 staff lot is stuck in the raised position, so any car can enter.', resolution: 'Motor capacitor replaced; gate cycling normally.' },
  { title: 'Spill in cafeteria walkway', category: 'Other', priority: 'Low', status: 'Closed', location: 'Cafeteria', by: 'taylor', to: 'marcus', ageDays: 11, resolvedAfterHours: 1,
    description: 'Large drink spill across the main walkway in the cafeteria near the cash registers.', resolution: 'Area cleaned and dried, wet floor sign placed for 30 minutes.' },
];
