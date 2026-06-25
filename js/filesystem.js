/* ============================================
   VibeOS Virtual File System
   localStorage + IndexedDB based file system
   ============================================ */

const FileSystem = {
  /** Storage prefix for localStorage keys */
  PREFIX: 'vibeos_fs_',

  /** Default directory structure */
  DEFAULT_DIRS: [
    '/Desktop',
    '/Documents',
    '/Downloads',
    '/Pictures',
    '/Music',
    '/Videos',
    '/System',
  ],

  init() {
    // Ensure default directories exist
    this.DEFAULT_DIRS.forEach((dir) => {
      if (!this.exists(dir)) {
        this._writeMeta(dir, {
          type: 'directory',
          created: Date.now(),
          modified: Date.now(),
        });
      }
    });
  },

  /* ---- Path Helpers ---- */

  /** Normalize a file path */
  _norm(path) {
    // Remove trailing slash (unless root)
    path = path.replace(/\/+$/, '') || '/';
    // Ensure starts with /
    if (!path.startsWith('/')) path = '/' + path;
    // Resolve .. and .
    const parts = [];
    for (const p of path.split('/')) {
      if (p === '' || p === '.') continue;
      if (p === '..') { parts.pop(); continue; }
      parts.push(p);
    }
    return '/' + parts.join('/');
  },

  /** Get parent directory path */
  _parent(path) {
    path = this._norm(path);
    if (path === '/') return '/';
    const last = path.lastIndexOf('/');
    return last === 0 ? '/' : path.substring(0, last);
  },

  /** Get file/directory name from path */
  _name(path) {
    path = this._norm(path);
    return path.substring(path.lastIndexOf('/') + 1);
  },

  /** Get localStorage key */
  _key(path) {
    return this.PREFIX + this._norm(path);
  },

  /* ---- Metadata ---- */

  _writeMeta(path, meta) {
    try {
      localStorage.setItem(this._key(path), JSON.stringify(meta));
    } catch (e) {
      console.error('FileSystem write error:', e);
      throw new Error('存储空间不足');
    }
  },

  _readMeta(path) {
    const raw = localStorage.getItem(this._key(path));
    return raw ? JSON.parse(raw) : null;
  },

  _deleteMeta(path) {
    localStorage.removeItem(this._key(path));
  },

  /* ---- File Operations ---- */

  /**
   * Write a file
   * @param {string} path
   * @param {string} content
   */
  writeFile(path, content) {
    path = this._norm(path);
    const parent = this._parent(path);

    // Ensure parent exists
    if (parent !== '/' && !this.exists(parent)) {
      this.mkdir(parent, true);
    }

    const existing = this._readMeta(path);
    try {
      this._writeMeta(path, {
        type: 'file',
        content: content,
        size: new Blob([content]).size,
        created: existing?.created || Date.now(),
        modified: Date.now(),
        extension: path.includes('.') ? path.split('.').pop() : '',
      });
    } catch (e) {
      if (typeof Notification !== 'undefined') {
        Notification.show('存储失败', '写入文件时存储空间不足，请清理部分数据后重试', 'warn');
      }
      console.error('FileSystem writeFile error:', e);
      return false;
    }

    return true;
  },

  /**
   * Read a file
   * @param {string} path
   * @returns {string|null} file content or null if not found
   */
  readFile(path) {
    const meta = this._readMeta(this._norm(path));
    if (!meta || meta.type !== 'file') return null;
    return meta.content || '';
  },

  /**
   * Delete a file
   */
  deleteFile(path) {
    path = this._norm(path);
    const meta = this._readMeta(path);
    if (!meta) return false;

    if (meta.type === 'directory') {
      // Delete all children
      const children = this.listDir(path);
      children.forEach((child) => {
        this.deleteFile(path + '/' + child.name);
      });
    }

    this._deleteMeta(path);
    return true;
  },

  /**
   * Check if path exists
   */
  exists(path) {
    return this._readMeta(this._norm(path)) !== null;
  },

  /* ---- Directory Operations ---- */

  /**
   * Create directory
   * @param {string} path
   * @param {boolean} recursive - create parent dirs
   */
  mkdir(path, recursive = false) {
    path = this._norm(path);

    if (this.exists(path)) {
      const meta = this._readMeta(path);
      if (meta.type === 'directory') return true;
      throw new Error(`${path} 已存在且不是目录`);
    }

    if (recursive) {
      const parent = this._parent(path);
      if (parent !== '/' && !this.exists(parent)) {
        this.mkdir(parent, true);
      }
    }

    this._writeMeta(path, {
      type: 'directory',
      created: Date.now(),
      modified: Date.now(),
    });

    return true;
  },

  /**
   * List directory contents
   * @param {string} path
   * @returns {Array<{name, type, size, modified, extension}>}
   */
  listDir(path) {
    path = this._norm(path);
    if (!this.exists(path)) return [];

    const prefix = this._key(path);
    const entries = [];

    // Scan all FS keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith(this.PREFIX)) continue;

      const itemPath = key.substring(this.PREFIX.length);
      const parent = this._parent(itemPath);

      if (parent === path) {
        const meta = this._readMeta(itemPath);
        if (meta) {
          entries.push({
            name: this._name(itemPath),
            type: meta.type,
            size: meta.size || 0,
            modified: meta.modified || 0,
            extension: meta.extension || '',
          });
        }
      }
    }

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  },

  /**
   * Get directory tree (recursive)
   * @param {string} path
   * @returns {Array} nested tree structure
   */
  getTree(path = '/') {
    const entries = this.listDir(path);
    return entries.map((entry) => {
      const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
      const node = { ...entry, path: fullPath };
      if (entry.type === 'directory') {
        node.children = this.getTree(fullPath);
      }
      return node;
    });
  },

  /**
   * Get file info
   */
  stat(path) {
    return this._readMeta(this._norm(path));
  },

  /**
   * Copy file/directory
   */
  copy(src, dest) {
    const meta = this._readMeta(this._norm(src));
    if (!meta) throw new Error(`源路径不存在: ${src}`);

    if (meta.type === 'file') {
      this.writeFile(dest, meta.content || '');
    } else {
      this.mkdir(dest, true);
      const children = this.listDir(src);
      children.forEach((child) => {
        const srcPath = src === '/' ? `/${child.name}` : `${src}/${child.name}`;
        const destPath = dest === '/' ? `/${child.name}` : `${dest}/${child.name}`;
        this.copy(srcPath, destPath);
      });
    }
    return true;
  },

  /**
   * Move file/directory
   */
  move(src, dest) {
    this.copy(src, dest);
    this.deleteFile(src);
    return true;
  },

  /**
   * Get total storage usage
   */
  getUsage() {
    let total = 0;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.PREFIX)) {
        total += (localStorage.getItem(key) || '').length;
        count++;
      }
    }
    return { bytes: total, files: count };
  },

  /**
   * Get absolute path for a known folder
   * @param {'desktop'|'documents'|'downloads'|'pictures'|'music'|'videos'} folder
   */
  getFolderPath(folder) {
    const map = {
      desktop: '/Desktop',
      documents: '/Documents',
      downloads: '/Downloads',
      pictures: '/Pictures',
      music: '/Music',
      videos: '/Videos',
    };
    return map[folder] || '/';
  },
};
