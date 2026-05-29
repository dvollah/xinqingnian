const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, 'logo_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ===== Data Layer =====
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('Load data error:', e.message); }
  return getDefaultData();
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getDefaultData() {
  return {
    players: [],
    matches: [],
    performances: [],
    checkins: [],
    ratings: [],
    nextId: 1,
    teamInfo: {
      name: '新青年足球队',
      logo: '',
      adminCode: 'admin123'
    }
  };
}

// ===== Data Store =====
let data = loadData();

function autoSave() { saveData(data); }

function genId() { return data.nextId++; }

// ===== API Routes =====

// --- Team Info ---
app.get('/api/team', (req, res) => {
  res.json({ name: data.teamInfo.name, logo: data.teamInfo.logo });
});

app.post('/api/team/logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择图片' });
  data.teamInfo.logo = '/uploads/' + req.file.filename;
  autoSave();
  res.json({ logo: data.teamInfo.logo });
});

app.post('/api/team/name', (req, res) => {
  const { name, adminCode } = req.body;
  if (adminCode !== data.teamInfo.adminCode) return res.status(403).json({ error: '管理员密码错误' });
  if (!name || !name.trim()) return res.status(400).json({ error: '请输入队名' });
  data.teamInfo.name = name.trim();
  autoSave();
  res.json({ name: data.teamInfo.name });
});

// --- Players ---
app.get('/api/players', (req, res) => {
  res.json(data.players);
});

app.post('/api/players', (req, res) => {
  const { name, number, position } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '请输入球员姓名' });
  const player = {
    id: genId(),
    name: name.trim(),
    number: number || null,
    position: position || '',
    joinDate: new Date().toISOString().slice(0,10)
  };
  data.players.push(player);
  autoSave();
  res.json(player);
});

app.put('/api/players/:id', (req, res) => {
  const p = data.players.find(p => p.id === parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: '球员不存在' });
  const { name, number, position } = req.body;
  if (name && name.trim()) p.name = name.trim();
  if (number !== undefined) p.number = number;
  if (position !== undefined) p.position = position;
  autoSave();
  res.json(p);
});

app.delete('/api/players/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.players = data.players.filter(p => p.id !== id);
  data.checkins = data.checkins.filter(c => c.playerId !== id);
  data.performances = data.performances.filter(p => p.playerId !== id);
  data.ratings = data.ratings.filter(r => r.playerId !== id);
  autoSave();
  res.json({ success: true });
});

// --- Matches ---
app.get('/api/matches', (req, res) => {
  res.json(data.matches);
});

app.post('/api/matches', (req, res) => {
  const { date, time, opponent, matchType, teamName, location, adminCode } = req.body;
  if (adminCode !== data.teamInfo.adminCode) return res.status(403).json({ error: '管理员密码错误，只有管理员才能发起比赛接龙' });
  if (!date) return res.status(400).json({ error: '请选择日期' });
  if (!opponent || !opponent.trim()) return res.status(400).json({ error: '请输入对手' });
  const match = {
    id: genId(),
    date, time: time || '',
    opponent: opponent.trim(),
    matchType: matchType || 'friendly',
    teamName: (teamName || '我队').trim(),
    location: location || '',
    homeScore: null, awayScore: null,
    status: 'upcoming',
    notes: '',
    createdAt: new Date().toISOString()
  };
  data.matches.push(match);
  autoSave();
  res.json(match);
});

app.put('/api/matches/:id', (req, res) => {
  const m = data.matches.find(m => m.id === parseInt(req.params.id));
  if (!m) return res.status(404).json({ error: '比赛不存在' });
  const { date, time, opponent, matchType, teamName, location, homeScore, awayScore, status, notes, adminCode } = req.body;
  if (adminCode !== data.teamInfo.adminCode) return res.status(403).json({ error: '管理员密码错误' });
  if (date) m.date = date;
  if (time !== undefined) m.time = time;
  if (opponent) m.opponent = opponent.trim();
  if (matchType) m.matchType = matchType;
  if (teamName) m.teamName = teamName.trim();
  if (location !== undefined) m.location = location;
  if (homeScore !== undefined) m.homeScore = homeScore;
  if (awayScore !== undefined) m.awayScore = awayScore;
  if (status) m.status = status;
  if (notes !== undefined) m.notes = notes;
  autoSave();
  res.json(m);
});

app.delete('/api/matches/:id', (req, res) => {
  const adminCode = req.query.adminCode;
  if (!adminCode || adminCode !== data.teamInfo.adminCode) {
    return res.status(403).json({ error: '管理员密码错误' });
  }
  const id = parseInt(req.params.id);
  data.matches = data.matches.filter(m => m.id !== id);
  data.checkins = data.checkins.filter(c => c.matchId !== id);
  data.performances = data.performances.filter(p => p.matchId !== id);
  data.ratings = data.ratings.filter(r => r.matchId !== id);
  autoSave();
  res.json({ success: true });
});

// --- Checkins ---
app.get('/api/checkins', (req, res) => {
  const { matchId } = req.query;
  let result = data.checkins;
  if (matchId) result = result.filter(c => c.matchId === parseInt(matchId));
  res.json(result);
});

app.post('/api/checkins', (req, res) => {
  const { matchId, playerId, status } = req.body;
  if (!matchId || !playerId) return res.status(400).json({ error: '参数不完整' });
  const existing = data.checkins.find(c => c.matchId === matchId && c.playerId === playerId);
  if (existing) {
    existing.status = status || 'confirmed';
    existing.time = new Date().toISOString();
  } else {
    data.checkins.push({ matchId, playerId, status: status || 'confirmed', time: new Date().toISOString() });
  }
  autoSave();
  res.json({ success: true });
});

app.post('/api/checkins/batch', (req, res) => {
  const { matchId, playerIds } = req.body;
  if (!matchId || !playerIds) return res.status(400).json({ error: '参数不完整' });
  playerIds.forEach(pid => {
    if (!data.checkins.find(c => c.matchId === matchId && c.playerId === pid)) {
      data.checkins.push({ matchId, playerId: pid, status: 'confirmed', time: new Date().toISOString() });
    }
  });
  autoSave();
  res.json({ success: true });
});

// --- Performances ---
app.get('/api/performances', (req, res) => {
  const { matchId } = req.query;
  let result = data.performances;
  if (matchId) result = result.filter(p => p.matchId === parseInt(matchId));
  res.json(result);
});

app.post('/api/performances', (req, res) => {
  const { matchId, playerId, goals, assists, interceptions, mistakes, yellowCards, redCards } = req.body;
  if (!matchId || !playerId) return res.status(400).json({ error: '参数不完整' });
  const existing = data.performances.find(p => p.matchId === matchId && p.playerId === playerId);
  if (existing) {
    if (goals !== undefined) existing.goals = goals;
    if (assists !== undefined) existing.assists = assists;
    if (yellowCards !== undefined) existing.yellowCards = yellowCards;
    if (redCards !== undefined) existing.redCards = redCards;
    if (interceptions !== undefined) existing.interceptions = interceptions;
    if (mistakes !== undefined) existing.mistakes = mistakes;
  } else {
    data.performances.push({ matchId, playerId, goals: goals||0, assists: assists||0, interceptions: interceptions||0, mistakes: mistakes||0, yellowCards: yellowCards||0, redCards: redCards||0 });
  }
  autoSave();
  res.json({ success: true });
});

app.post('/api/performances/batch', (req, res) => {
  const { matchId, records } = req.body;
  if (!matchId || !records) return res.status(400).json({ error: '参数不完整' });
  data.performances = data.performances.filter(p => p.matchId !== matchId);
  records.forEach(r => {
    data.performances.push({ matchId, playerId: r.playerId, goals: r.goals||0, assists: r.assists||0, interceptions: r.interceptions||0, mistakes: r.mistakes||0, yellowCards: r.yellowCards||0, redCards: r.redCards||0 });
  });
  autoSave();
  res.json({ success: true });
});

// --- Ratings ---
app.get('/api/ratings', (req, res) => {
  const { matchId } = req.query;
  let result = data.ratings;
  if (matchId) result = result.filter(r => r.matchId === parseInt(matchId));
  res.json(result);
});

app.post('/api/ratings', (req, res) => {
  const { matchId, playerId, selfScore, adminScore } = req.body;
  if (!matchId || !playerId) return res.status(400).json({ error: '参数不完整' });
  let rating = data.ratings.find(r => r.matchId === matchId && r.playerId === playerId);
  if (rating) {
    if (selfScore !== undefined) rating.selfScore = selfScore;
    if (adminScore !== undefined) rating.adminScore = adminScore;
  } else {
    data.ratings.push({ matchId, playerId, selfScore: selfScore||null, adminScore: adminScore||null });
  }
  autoSave();
  res.json({ success: true });
});

app.post('/api/ratings/batch-admin', (req, res) => {
  const { matchId, ratings, adminCode } = req.body;
  if (adminCode !== data.teamInfo.adminCode) return res.status(403).json({ error: '管理员密码错误' });
  ratings.forEach(r => {
    let existing = data.ratings.find(rt => rt.matchId === matchId && rt.playerId === r.playerId);
    if (existing) {
      if (r.adminScore !== undefined) existing.adminScore = r.adminScore;
    } else {
      data.ratings.push({ matchId, playerId: r.playerId, selfScore: null, adminScore: r.adminScore||null });
    }
  });
  autoSave();
  res.json({ success: true });
});

// --- Full data dump for sync ---
app.get('/api/sync', (req, res) => {
  res.json(data);
});

app.post('/api/sync', (req, res) => {
  // Accept full data merge from frontend
  const newData = req.body;
  if(!newData || !newData.players) {
    return res.status(400).json({ error: '数据格式错误' });
  }
  // Merge: keep server-side data but update with incoming changes
  data.players = newData.players;
  data.matches = newData.matches;
  data.checkins = newData.checkins;
  data.performances = newData.performances;
  data.ratings = newData.ratings || [];
  data.nextId = newData.nextId || data.nextId;
  data.teamInfo = { ...data.teamInfo, ...newData.teamInfo };
  data.teamInfo.adminCode = 'admin123'; // never override admin code
  autoSave();
  res.json({ success: true, message: '数据已同步' });
});

// --- Reset (admin only) ---
app.post('/api/reset', (req, res) => {
  const { adminCode } = req.body;
  if (adminCode !== data.teamInfo.adminCode) return res.status(403).json({ error: '管理员密码错误' });
  data = getDefaultData();
  autoSave();
  res.json({ success: true });
});

// ===== Start =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 新青年足球队管理系统启动成功`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`📋 管理员密码: ${data.teamInfo.adminCode}`);
});
