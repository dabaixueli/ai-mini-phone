const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== 备忘录 API ====================

app.get('/api/notes', (req, res) => {
  try {
    const notes = readJSON('notes.json');
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取备忘录失败' });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const notes = readJSON('notes.json');
    const newNote = {
      id: notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1,
      title: req.body.title || '未命名备忘录',
      content: req.body.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.push(newNote);
    writeJSON('notes.json', notes);
    res.json({ success: true, data: newNote });
  } catch (err) {
    res.status(500).json({ success: false, message: '创建备忘录失败' });
  }
});

app.put('/api/notes/:id', (req, res) => {
  try {
    const notes = readJSON('notes.json');
    const index = notes.findIndex(n => n.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: '备忘录不存在' });
    }
    notes[index] = {
      ...notes[index],
      title: req.body.title !== undefined ? req.body.title : notes[index].title,
      content: req.body.content !== undefined ? req.body.content : notes[index].content,
      updatedAt: new Date().toISOString()
    };
    writeJSON('notes.json', notes);
    res.json({ success: true, data: notes[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: '更新备忘录失败' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    let notes = readJSON('notes.json');
    const index = notes.findIndex(n => n.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ success: false, message: '备忘录不存在' });
    }
    notes.splice(index, 1);
    writeJSON('notes.json', notes);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '删除备忘录失败' });
  }
});

// ==================== 应用商城 API ====================

app.get('/api/apps', (req, res) => {
  try {
    const apps = readJSON('apps.json');
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取应用列表失败' });
  }
});

app.put('/api/apps/:id/install', (req, res) => {
  try {
    const apps = readJSON('apps.json');
    const index = apps.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: '应用不存在' });
    }
    if (apps[index].installed) {
      return res.json({ success: true, data: apps[index], message: '应用已安装' });
    }
    apps[index].installed = true;
    writeJSON('apps.json', apps);
    res.json({ success: true, data: apps[index], message: '安装成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '安装应用失败' });
  }
});

app.put('/api/apps/:id/uninstall', (req, res) => {
  try {
    const apps = readJSON('apps.json');
    const index = apps.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: '应用不存在' });
    }
    if (apps[index].system) {
      return res.status(400).json({ success: false, message: '系统应用不能卸载' });
    }
    apps[index].installed = false;
    writeJSON('apps.json', apps);
    res.json({ success: true, data: apps[index], message: '卸载成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '卸载应用失败' });
  }
});

// ==================== 设置 API ====================

app.get('/api/settings', (req, res) => {
  try {
    const settings = readJSON('settings.json');
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取设置失败' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const settings = readJSON('settings.json');
    const updated = { ...settings, ...req.body };
    writeJSON('settings.json', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: '保存设置失败' });
  }
});

// ==================== 代理网页访问 ====================

app.get('/api/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ success: false, message: '请提供URL参数' });
  }
  res.json({ success: true, url: targetUrl });
});

// ==================== 主页路由 ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log(`\n  🎉 MIMO 手机系统已启动！`);
  console.log(`  📱 请在浏览器中打开: http://localhost:${PORT}\n`);
});
