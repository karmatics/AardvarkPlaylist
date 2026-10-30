class YouTubePlayer {
  static async run(env) {
    const container = (env && env.container) || document.getElementById("app-container") || document.body;
    
    if (typeof ThreeJSLoader !== "undefined" && typeof THREE === "undefined") {
      try { await ThreeJSLoader.load(); } catch(e){}
    }
    
    const player = new YouTubePlayer();
    window.player = player;
    window.projectApp = player;
    
    if (typeof player.run === "function") {
      await player.run(Object.assign({ container: container }, env || {}));
    } else if (typeof player.init === "function") {
      await player.init(container);
    }
    return player;
  }

  constructor() {
    this.gt = null;
    this.playlistManager = null;
    this.videoDialog = null;
    this.stateManager = new AppStateManager(this);
    this.fileIOManager = new FileIOManager(this);
    this.coopManager = new CoopManager(this);
    this.midiInputManager = new MidiInputManager(this);
    this.keyboardEditController = new KeyboardEditController(this);
    this.settingsDialogUI = new SettingsDialogUI(this);
    this.viewportManager = new ViewportManager(this);
    this.playbackController = new PlaybackController(this);
    this.advancedToolsUI = new AdvancedToolsUI(this);
    this.playlistSelectorUI = new PlaylistSelectorUI(this);
    this.welcomeDialogUI = new WelcomeDialogUI(this);
    this.pianoLogic = new PianoRollController(this);
    this.headerControlsUI = new HeaderControlsUI(this);
    this.state = this.stateManager.loadState();
    this.basePath = './glowtunes/';

    this.activeSegments = null;
    this.currentSegmentIndex = -1;
    this._isPlaylistLoaded = true;
  }

  _buildLeftPanel() {
    if (!this.leftPanel && typeof SidePanel !== 'undefined') {
      this.leftPanel = new SidePanel('left', { parent: document.body });
    }
    this.leftPanelUI = new LeftPanelUI(this);
    this.leftPanelUI.build();
  }

  _buildRightPanel() {
    this.rightPanel = null;
    this.DialogBoxClass = typeof UITools !== 'undefined' ? UITools : null;
  }

  _playVideo(item, index) {
    this.playbackController.playVideo(item, index);
  }

  _handlePlayerState(s) {
    this.playbackController.handlePlayerState(s);
  }

  _toggleLeftPanel(section) {
    this.viewportManager.toggleLeftPanel(section);
  }

  _toggleRightPanel(section) {
    this.viewportManager.toggleRightPanel(section);
  }

  _updateDockUI() {
    this.viewportManager.updateDockUI();
  }

  _saveState() {
    this.stateManager.saveState();
  }

  _triggerSync() {
    this.pianoLogic.syncSelected();
  }

  _triggerUndo() {
    this.pianoLogic.undo();
  }

  _triggerDelete() {
    this.pianoLogic.deleteSelected();
  }

  setStatus(msg, color = '#aaa') {
    this.viewportManager.setStatus(msg, color);
  }

  _setupEditKeys() {
    this.keyboardEditController.setupEditKeys();
  }

  _init3DApp() {
    return this.viewportManager.init3DApp();
  }

  _importVEQ() {
    this.fileIOManager.importVEQ();
  }

  _exportVEQ() {
    this.fileIOManager.exportVEQ();
  }

  _setupComms() {
    this.coopManager.setupComms();
  }

  _handleMessage(event) {
    this.coopManager.handleMessage(event);
  }

  _handleRemoteAdd(payload) {
    this.coopManager.handleRemoteAdd(payload);
  }

  _handleRemotePlay(payload) {
    this.coopManager.handleRemotePlay(payload);
  }

  _sendMessage(type, payload = {}) {
    this.coopManager.sendMessage(type, payload);
  }

  _sendSync() {
    this.coopManager.sendSync();
  }

  computePlaylistHash() {
    return this.coopManager.computePlaylistHash();
  }

  _onGlobalTimeUpdate(time, isPlaying) {
    this.playbackController.onGlobalTimeUpdate(time, isPlaying);
  }

  _ensurePlaybackStart() {
    this.playbackController.ensurePlaybackStart();
  }

  _startFadeOutAndStop() {
    this.playbackController.startFadeOutAndStop();
  }

  async _savePlaylistToCloud() {
    await this.fileIOManager.savePlaylistToCloud();
  }

  async _initWebRTCHost() {
    await this.coopManager.initWebRTCHost();
  }

  async _initWebRTCGuest() {
    await this.coopManager.initWebRTCGuest();
  }

  _setupMidi() {
    this.midiInputManager.setupMidi();
  }

  _onMidiMessage(message) {
    this.midiInputManager.onMidiMessage(message);
  }

  setKeyboardStyle(style) {
    this.viewportManager.setKeyboardStyle(style);
  }

  setDisplayMode(style) {
    this.viewportManager.setDisplayMode(style);
  }

  _syncCanvasVisibilityToVeq() {
    this.viewportManager.syncCanvasVisibilityToVeq();
  }

  open3DSettingsDialog() {
    this.settingsDialogUI.open3DSettingsDialog();
  }

  _build3DDialogContent(container) {
    this.settingsDialogUI.build3DDialogContent(container);
  }

  _applyDisplayModeAfterLoad(style) {
    this.viewportManager.applyDisplayModeAfterLoad(style);
  }

  _loadState() {
    return this.stateManager.loadState();
  }

  _closeQuickSettingsDropdown() {
    this.settingsDialogUI.closeQuickSettingsDropdown();
  }

  _toggleQuickSettingsDropdown(btnEl) {
    this.settingsDialogUI.toggleQuickSettingsDropdown(btnEl);
  }

  _saveSettings() {
    this.stateManager.saveState();
  }

  _saveGeometry() {
    this.stateManager.saveGeometry();
  }

  _midiToName(mc) {
    const names = [
      'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
    ];
    return names[mc % 12] + (Math.floor(mc / 12) - 1);
  }

  _updateSongSettings(updates) {
    this.stateManager.updateSongSettings(updates);
  }

  _setupGlobalSyncKeys() {
    this.keyboardEditController.setupGlobalSyncKeys();
  }

  showKeystroke(keyStr) {
    this.keyboardEditController.showKeystroke(keyStr);
  }

  _importPlaylist() {
    this.fileIOManager.importPlaylist();
  }

  _fetchAndLoadPlaylist(url, forcedAddType = null) {
    this.fileIOManager.fetchAndLoadPlaylist(url, forcedAddType);
  }

  toggleFullscreen() {
    this.viewportManager.toggleFullscreen();
  }

  _injectStyles() {
    this.viewportManager.injectStyles();
  }

  _createFloatingMenuButton() {
    this.viewportManager.createFloatingMenuButton();
  }

  _makeDraggable(el, persistenceKey) {
    this.viewportManager.makeDraggable(el, persistenceKey);
  }

  _processUrlParameters() {
    this.fileIOManager.processUrlParameters();
  }

  _refreshVisuals(forceFinal = false) {
    if (this.gt?.pianoVisuals) {
      this.gt.pianoVisuals.updateLayout();
    }
    if (this.piano3DApp && this.gt?.pianoVisuals?.geometrySettings) {
      if (forceFinal) {
        this.piano3DApp._lastVpW = null;
        this.piano3DApp._lastVpH = null;
      }
      this.piano3DApp.alignTo2D(
        this.gt.pianoVisuals.geometrySettings,
        forceFinal
      );
    }
  }

  _scheduleLayoutRefresh(reason) {
    this._refreshVisuals(false);

    if (this._layoutRebuildTimer) clearTimeout(this._layoutRebuildTimer);
    this._layoutRebuildTimer = setTimeout(() => {
      this._layoutRebuildTimer = null;
      SidePanel.updateGlobalSafeArea();
      this._refreshVisuals(true);
      requestAnimationFrame(() => {
        this._refreshVisuals(true);
      });
    }, 180);
  }

  _showWelcomeDialog() {
    this.welcomeDialogUI.show();
  }

  handlePastedContent(rawText) {
    if (!rawText || typeof rawText !== 'string') return false;
    const trimmed = rawText.trim();

    // 1. YouTube video ID, watch link, shorts, embed, or timestamped URL
    const vidInfo = Playlist.extractVideoInfo(trimmed);
    if (vidInfo && vidInfo.id && !trimmed.endsWith('.txt') && !trimmed.endsWith('.json') && !trimmed.includes('/playlists/')) {
      this.setStatus(`🎯 Playing YouTube Video: ${vidInfo.title || vidInfo.id}`, '#38bdf8');
      this.playlistManager?.addVideoAndPlay(vidInfo);
      return true;
    }

    // 2. Piano roll (.txt VEQ) syntax
    if (trimmed.startsWith('{') || trimmed.includes('---- timedEvents') || /^\d+m\d+d\d+/m.test(trimmed)) {
      if (this.advancedToolsUI) {
        this.advancedToolsUI.applyVEQText(trimmed);
        return true;
      }
    }

    // 3. Playlist URL (.txt / .json)
    if (trimmed.endsWith('.txt') || trimmed.endsWith('.json') || trimmed.includes('/playlists/')) {
      this.fileIOManager?.fetchAndLoadPlaylist(trimmed, 'replace');
      return true;
    }

    return false;
  }

  async init(container) {
    this.rootElement = container || document.getElementById('app-container') || document.body;
    this.container = this.rootElement;

    const loader = this.rootElement.querySelector('.aardvark-boot-loader');
    if (loader) loader.remove();

    if (!this.pianoLogic) this.pianoLogic = new PianoRollController(this);
    if (!this.headerControlsUI) this.headerControlsUI = new HeaderControlsUI(this);

    const savedData = await this.stateManager.loadPlaylistAsync();
    if (savedData && Array.isArray(savedData.playlist)) {
      this.state.playlistData = savedData;
    }

    this._buildLeftPanel();
    this._buildRightPanel();

    this.viewportManager.injectStyles();
    this.viewportManager.createFloatingMenuButton();

    if (typeof GlowTunesKeys !== 'undefined') {
      GlowTunesKeys.initialize(this);
    }
    this.keyboardEditController.setupGlobalSyncKeys();
    this.keyboardEditController.setupEditKeys();

    // Seamless Global Paste Handler
    if (!this._hasPasteListener) {
      this._hasPasteListener = true;
      window.addEventListener('paste', (e) => {
        const tag = e.target?.tagName;
        const isTextInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
        if (isTextInput) return;

        const clipText = e.clipboardData?.getData('text');
        if (clipText) {
          const handled = this.handlePastedContent(clipText);
          if (handled) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      });
    }

    this.coopManager.setupComms();

    if (typeof CuratorDiagnosticsUI !== 'undefined') {
      this.curatorDiagnosticsUI = new CuratorDiagnosticsUI(this);
    }

    if (typeof window !== 'undefined' && !this._hasBroadcastListener) {
      this._hasBroadcastListener = true;
      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('aardvark_player_channel');
          channel.onmessage = (event) => {
            if (event.data && event.data.type === 'PLAY_VIDEO' && event.data.videoId) {
              this.loadAndPlayVideoById(event.data.videoId, event.data.title || '', true);
            }
          };
        } catch (e) {}
      }

      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PLAY_VIDEO' && event.data.videoId) {
          this.loadAndPlayVideoById(event.data.videoId, event.data.title || '', true);
        }
      });
    }

    if (savedData && savedData.playlist && savedData.playlist.length > 0 && this.playlistManager) {
      this.playlistManager.load(savedData);
    }

    await this.fileIOManager.processUrlParameters();

    if (
      this.playlistManager &&
      this.playlistManager.playlist.length === 0 &&
      !this.state.settings.lastPlaylistUrl
    ) {
      await this.fileIOManager.fetchAndLoadPlaylist('./playlists/pianoSongs.txt', 'replace');
    }

    this.coopManager.flushPendingIncomingCommands();

    if (this.leftPanel) {
      this.leftPanel.open('playlist');
    }
    this._updateDockUI();

    if (typeof SidePanel !== 'undefined' && typeof SidePanel.updateGlobalSafeArea === 'function') {
      SidePanel.updateGlobalSafeArea();
    }
    this._refreshVisuals(true);
  }

  destroy() {
    if (this._layoutRebuildTimer) {
      clearTimeout(this._layoutRebuildTimer);
      this._layoutRebuildTimer = null;
    }
    if (this._volEnforcerInterval) {
      clearInterval(this._volEnforcerInterval);
      this._volEnforcerInterval = null;
    }
    if (this._volPoll) {
      clearInterval(this._volPoll);
      this._volPoll = null;
    }

    if (this.videoDialog && typeof this.videoDialog.close === 'function') {
      try { this.videoDialog.close(); } catch (e) {}
    }
    this.videoDialog = null;

    if (this.leftPanel && typeof this.leftPanel.close === 'function') {
      try { this.leftPanel.close(); } catch (e) {}
    }
    this.leftPanel = null;

    if (this.gt && typeof this.gt.destroy === 'function') {
      try { this.gt.destroy(); } catch (e) {}
    }
    this.gt = null;

    if (this.piano3DApp && typeof this.piano3DApp.destroy === 'function') {
      try { this.piano3DApp.destroy(); } catch (e) {}
    }
    this.piano3DApp = null;

    if (this.floatingMenuBtn && this.floatingMenuBtn.parentElement) {
      this.floatingMenuBtn.parentElement.removeChild(this.floatingMenuBtn);
    }
    this.floatingMenuBtn = null;

    if (window.player === this) window.player = null;
    if (window.projectApp === this) window.projectApp = null;
  }

  _applyArpVisuals() {
    if (this.gt?.pianoVisuals && window.VideoEventQueueClass?.current) {
      this.gt.pianoVisuals.loadVeq(window.VideoEventQueueClass.current);
    }
    this._refreshVisuals();
    if (this.gt?.synchronizer) {
      this.gt.synchronizer.resyncScheduler();
    }
  }

  getAppWidth() {
    if (!this.rootElement) return window.innerWidth;
    return this.rootElement === document.body
      ? window.innerWidth
      : this.rootElement.clientWidth;
  }

  getAppHeight() {
    if (!this.rootElement) return window.innerHeight;
    return this.rootElement === document.body
      ? window.innerHeight
      : this.rootElement.clientHeight;
  }

  loadAndPlayVideoById(videoId, title = '', autoPlay = true) {
    if (!videoId) return;
    const cleanId = String(videoId).trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) return;

    const item = {
      id: cleanId,
      title: title || cleanId,
      url: `https://www.youtube.com/watch?v=${cleanId}`,
      videoSource: 'youtube'
    };

    if (this.playlistManager && Array.isArray(this.playlistManager.playlist)) {
      const existingIdx = this.playlistManager.playlist.findIndex(v => v.id === cleanId);
      if (existingIdx !== -1) {
        this.playlistManager.currentIndex = existingIdx;
        this.playbackController.playVideo(this.playlistManager.playlist[existingIdx], existingIdx);
        return;
      } else {
        this.playlistManager.playlist.unshift(item);
        this.playlistManager.currentIndex = 0;
        this.playlistManager.renderItems();
        this.playbackController.playVideo(item, 0);
        return;
      }
    }

    if (this.playbackController && this.playbackController.playVideo) {
      this.playbackController.playVideo(item, 0);
    }
  }
}

globalThis.YouTubePlayer = YouTubePlayer;
if (typeof module !== "undefined" && module.exports) module.exports = YouTubePlayer;