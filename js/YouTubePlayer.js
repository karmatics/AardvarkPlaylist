class YouTubePlayer {
  static async run(env) {
    const container = (env && env.container) || document.getElementById("app-container") || document.body;
    
    // Ensure Three.js is loaded if requested
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

      // Playback Logic State
      this.activeSegments = null;
      this.currentSegmentIndex = -1;

      // Initialized synchronously so extension commands are never blocked
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

  _mkDialogSlider(labelText, getVal, setVal, min, max, step) {
    const row = makeElement('div', {
      style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;',
    });
    const labelEl = makeElement(
      'div',
      {
        style:
          'flex:0 0 75px; font-size:9px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 0.1s;',
      },
      labelText
    );

    const sl = makeElement('input', {
      type: 'range',
      min,
      max,
      step,
      value: getVal(),
      style: 'flex:1; height:4px; margin:0; cursor:pointer;',
    });

    const decimals = step < 1 ? (step < 0.01 ? 3 : 2) : 0;

    const updateDisplay = (val) => {
      labelEl.textContent = val.toFixed(decimals);
      labelEl.style.color = '#4a90e2';
      labelEl.style.fontWeight = 'bold';
    };
    const resetDisplay = () => {
      labelEl.textContent = labelText;
      labelEl.style.color = '#aaa';
      labelEl.style.fontWeight = 'normal';
    };

    let isDragging = false;

    sl.onmousedown = () => {
      isDragging = true;
      updateDisplay(parseFloat(sl.value));
    };
    sl.onmouseup = () => {
      isDragging = false;
      resetDisplay();
    };
    sl.onmouseleave = () => {
      if (!isDragging) resetDisplay();
    };

    sl.addEventListener(
      'touchstart',
      () => {
        isDragging = true;
        updateDisplay(parseFloat(sl.value));
      },
      { passive: true }
    );
    sl.addEventListener('touchend', () => {
      isDragging = false;
      resetDisplay();
    });

    sl.oninput = () => {
      const v = parseFloat(sl.value);
      setVal(v);
      if (isDragging) updateDisplay(v);
    };

    const poll = () => {
      if (!sl.isConnected) return;
      const actual = getVal();
      if (
        actual !== undefined &&
        Math.abs(actual - parseFloat(sl.value)) > 0.001
      ) {
        sl.value = actual;
      }
      setTimeout(poll, 250);
    };
    setTimeout(poll, 250);

    row.append(labelEl, sl);
    return row;
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
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
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
    // Immediate light refresh so dragging feels responsive
    this._refreshVisuals(false);

    // Debounced final rebuild — guaranteed clean state after events settle
    if (this._layoutRebuildTimer) clearTimeout(this._layoutRebuildTimer);
    this._layoutRebuildTimer = setTimeout(() => {
      this._layoutRebuildTimer = null;
      SidePanel.updateGlobalSafeArea();
      this._refreshVisuals(true);
      // Second pass after browser has had a frame to settle CSS transitions
      requestAnimationFrame(() => {
        this._refreshVisuals(true);
      });
      if (window.smartLog) {
        window.smartLog(
          'Layout',
          `[Resize Tracker] Final rebuild after: ${reason}`
        );
      }
    }, 180);
  }

  _showWelcomeDialog() {
    this.welcomeDialogUI.show();
  }

  _showMidiPrompt() {
      const container = makeElement('div', {
        style:
          'padding: 10px; color: #eee; font-family: sans-serif; line-height: 1.5;',
      });

      container.appendChild(
        makeElement(
          'h3',
          { style: 'margin: 0 0 10px 0; color: #4a90e2;' },
          '🎹 Piano Roll Detected!'
        )
      );
      container.appendChild(
        makeElement(
          'p',
          { style: 'margin: 0 0 15px 0;' },
          'It looks like this video has piano note data. Do you have a MIDI keyboard you want to connect to play along?'
        )
      );

      const btnRow = makeElement('div', {
        style: 'display: flex; gap: 10px; justify-content: flex-end;',
      });

      const noBtn = makeElement(
        'button',
        { className: 'dialog-button', style: 'padding: 8px 16px;' },
        'No, just watch'
      );
      const yesBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style: 'padding: 8px 16px; font-weight: bold;',
        },
        'Yes, Connect MIDI'
      );

      noBtn.onclick = () => {
        if (this.midiPromptDialog) this.midiPromptDialog.close();
      };

      yesBtn.onclick = () => {
        if (this.midiInputManager) {
          this.midiInputManager.setupMidi(true);
          this.setStatus('MIDI Input Enabled.', '#4f4');
          if (this.leftPanelUI) this.leftPanelUI.build();
        }
        if (this.midiPromptDialog) this.midiPromptDialog.close();
      };

      btnRow.append(noBtn, yesBtn);
      container.appendChild(btnRow);

      this.midiPromptDialog =
        typeof UITools !== 'undefined'
          ? UITools.makeDialog({
              env: this.env, // Automatically binds UI to lifecycle
              title: 'MIDI Setup',
              content: container,
              width: '380px',
              position: [
                window.innerWidth / 2 - 190,
                window.innerHeight / 2 - 100,
              ],
              appendTo: this.rootElement,
              onClose: () => {
                this.midiPromptDialog = null;
              },
            })
          : null;
    }

  async init(container) {
      this.rootElement = container || document.getElementById('app-container') || document.body;
      this.container = this.rootElement;

      // Immediately remove the boot splash loader to prevent any freeze on startup
      const loader = this.rootElement.querySelector('.aardvark-boot-loader');
      if (loader) loader.remove();

      if (!this.pianoLogic) this.pianoLogic = new PianoRollController(this);
      if (!this.headerControlsUI) this.headerControlsUI = new HeaderControlsUI(this);

      // Retrieve saved state and persistent playlist asynchronously with 0ms localStorage priority
      const savedData = await this.stateManager.loadPlaylistAsync();
      if (savedData && Array.isArray(savedData.playlist)) {
        this.state.playlistData = savedData;
      }

      // Build Left Panel UI
      this._buildLeftPanel();
      this._buildRightPanel();

      // Inject Viewport & Global Styles
      this.viewportManager.injectStyles();
      this.viewportManager.createFloatingMenuButton();

      // Setup global sync keys and shortcuts
      if (typeof GlowTunesKeys !== 'undefined') {
        GlowTunesKeys.initialize(this);
      }
      this.keyboardEditController.setupGlobalSyncKeys();
      this.keyboardEditController.setupEditKeys();

      // Setup communications
      this.coopManager.setupComms();

      // Setup Curator Diagnostics tool
      if (typeof CuratorDiagnosticsUI !== 'undefined') {
        this.curatorDiagnosticsUI = new CuratorDiagnosticsUI(this);
      }

      // Cross-tab broadcast listener for external playlist dispatchers
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

      // Load saved playlist into playlist manager if not already populated
      if (savedData && savedData.playlist && savedData.playlist.length > 0 && this.playlistManager) {
        this.playlistManager.load(savedData);
      }

      // Process query params (?v=... or ?pl=...)
      await this.fileIOManager.processUrlParameters();

      // If still empty, load starter playlist
      if (
        this.playlistManager &&
        this.playlistManager.playlist.length === 0 &&
        !this.state.settings.lastPlaylistUrl
      ) {
        await this.fileIOManager.fetchAndLoadPlaylist('./playlists/pianoSongs.txt', 'replace');
      }

      this.coopManager.flushPendingIncomingCommands();

      // Open left panel by default so library is visible on the left
      if (this.leftPanel) {
        this.leftPanel.open('playlist');
      }
      this._updateDockUI();

      if (typeof SidePanel !== 'undefined' && typeof SidePanel.updateGlobalSafeArea === 'function') {
        SidePanel.updateGlobalSafeArea();
      }
      this._refreshVisuals(true);
    }
  static async run(env) {
      const container = (env && env.container) || document.getElementById("app-container") || document.body;

      // Ensure Three.js is loaded if requested
      if (typeof ThreeJSLoader !== "undefined" && typeof THREE === "undefined") {
        try { await ThreeJSLoader.load(); } catch(e){}
      }

      const player = new YouTubePlayer();
      window.player = player;
      window.projectApp = player;

      if (typeof player.init === "function") {
        await player.init(container);
      }
      return player;
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

      if (
        this.viewportManager &&
        typeof this.viewportManager.destroyFullscreenToolbar === 'function'
      ) {
        try {
          this.viewportManager.destroyFullscreenToolbar();
        } catch (error) {}
      }

      if (this.videoDialog && typeof this.videoDialog.close === 'function') {
        try {
          this.videoDialog.close();
        } catch (e) {}
      }
      this.videoDialog = null;

      if (this.leftPanel && typeof this.leftPanel.close === 'function') {
        try {
          this.leftPanel.close();
        } catch (e) {}
      }
      this.leftPanel = null;

      if (this.rightPanel && typeof this.rightPanel.close === 'function') {
        try {
          this.rightPanel.close();
        } catch (e) {}
      }
      this.rightPanel = null;

      if (this.settingsDialogUI) {
        try {
          this.settingsDialogUI.closeQuickSettingsDropdown();
        } catch (e) {}
        if (
          this.settingsDialogUI._3dSettingsDialog &&
          typeof this.settingsDialogUI._3dSettingsDialog.close === 'function'
        ) {
          try {
            this.settingsDialogUI._3dSettingsDialog.close();
          } catch (e) {}
        }
      }

      if (
        this.advancedToolsUI &&
        this.advancedToolsUI.dialog &&
        typeof this.advancedToolsUI.dialog.close === 'function'
      ) {
        try {
          this.advancedToolsUI.dialog.close();
        } catch (e) {}
      }

      if (
        this.advancedToolsUI &&
        this.advancedToolsUI.editorDialog &&
        typeof this.advancedToolsUI.editorDialog.close === 'function'
      ) {
        try {
          this.advancedToolsUI.editorDialog.close();
        } catch (e) {}
      }

      if (
        this.welcomeDialogUI &&
        this.welcomeDialogUI.dialog &&
        typeof this.welcomeDialogUI.dialog.close === 'function'
      ) {
        try {
          this.welcomeDialogUI.dialog.close();
        } catch (e) {}
      }

      if (
        this.midiPromptDialog &&
        typeof this.midiPromptDialog.close === 'function'
      ) {
        try {
          this.midiPromptDialog.close();
        } catch (e) {}
      }

      const mdt = window.MidiDiagnosticTool
        ? window.MidiDiagnosticTool.getInstance()
        : null;
      if (mdt && mdt.dialog && typeof mdt.dialog.close === 'function') {
        try {
          mdt.dialog.close();
        } catch (e) {}
      }

      if (this.gt && typeof this.gt.destroy === 'function') {
        try {
          this.gt.destroy();
        } catch (e) {}
      }
      this.gt = null;

      if (this.piano3DApp && typeof this.piano3DApp.destroy === 'function') {
        try {
          this.piano3DApp.destroy();
        } catch (e) {}
      }
      this.piano3DApp = null;

      if (this.floatingMenuBtn && this.floatingMenuBtn.parentElement) {
        this.floatingMenuBtn.parentElement.removeChild(this.floatingMenuBtn);
      }
      this.floatingMenuBtn = null;

      if (this.rootElement && this.rootElement.parentElement) {
        this.rootElement.parentElement.removeChild(this.rootElement);
      }
      this.rootElement = null;

      if (window.player === this) window.player = null;
      if (window.projectApp === this) window.projectApp = null; // Restored
      if (window.HackerAPI && window.HackerAPI.mainApp === this) {
        window.HackerAPI.mainApp = null;
      }
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
