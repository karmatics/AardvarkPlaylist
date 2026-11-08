class PlaybackController {
  
  constructor(player) {
    this.player = player;
    this.playEnforcer = null;
    this.isFadingOut = false;
    this.fadeInterval = null;
  }

  playVideo(item, index) {
        this.player._closeQuickSettingsDropdown();

        if (this.player.coopManager) {
          this.player.coopManager.broadcastPeerMessage({
            type: 'PLAY_VIDEO',
            item: item,
          });
        }

        const title = item.title || `Unknown Video`;
        try {
          document.title = title;
        } catch (e) {
          window.document.title = title;
        }

        this.player.currentPlayItem = item;
        this.player.activeSegments = item.segments && item.segments.length > 0 ? item.segments : null;
        this.player.currentSegmentIndex = 0;

        if (this.playEnforcer) {
          clearInterval(this.playEnforcer);
          this.playEnforcer = null;
        }

        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
          this.isFadingOut = false;
          if (this.fadeOriginalVidVol !== undefined && this.player.gt) {
            this.player.gt.setVideoVolume(this.fadeOriginalVidVol);
            this.fadeOriginalVidVol = undefined;
          }
        }

        VideoEventQueue.clear();

        const canvas = this.player.rootElement.querySelector('#canvas-container');
        if (canvas) canvas.style.display = 'none';

        // Bring up or restore dialog immediately
        if (!this.player.videoDialog) {
          const safe = (typeof UITools !== 'undefined' ? UITools.safeArea : null) || { left: 0, right: 0, top: 0, bottom: 0 };
          const parentW = this.player.rootElement === document.body ? window.innerWidth : this.player.rootElement.clientWidth;
          const parentH = this.player.rootElement === document.body ? window.innerHeight : this.player.rootElement.clientHeight;

          const availW = parentW - safe.left - safe.right;
          const availH = parentH - safe.top - safe.bottom;
          let targetW = Math.max(600, Math.min(1000, availW - 40));
          let targetH = targetW * (9 / 16) + 40;
          let targetX = safe.left + (availW - targetW) / 2;
          let targetY = safe.top + (availH - targetH) / 2;
          if (targetY < 50) targetY = 50;
          if (targetX < safe.left) targetX = safe.left + 20;

          this.player.videoContainerWrapper = makeElement('div', {
            style: 'width:100%; height:100%; flex:1; min-height:0; display:flex; flex-direction:column; background:#000; position:relative; overflow:hidden;',
          });

          this.player.videoContainer = makeElement('div', {
            style: 'flex:1; width:100%; height:100%; min-height:0; position:relative; overflow:hidden;',
          });

          const spacer = makeElement('div', { className: 'video-dock-spacer' });
          this.player.videoContainerWrapper.appendChild(this.player.videoContainer);
          this.player.videoContainerWrapper.appendChild(spacer);

          this.player.videoDialog = UITools.makeDialog({
            title: title,
            width: `${Math.round(targetW)}px`,
            height: `${Math.round(targetH)}px`,
            position: [Math.round(targetX), Math.round(targetY)],
            appendTo: this.player.rootElement,
            minWidth: 400,
            minHeight: 240,
            contentElement: this.player.videoContainerWrapper,
            noPadding: true,
            allowMaximize: true,
            allowTransparency: false,
            stateId: 'yt_main_player_dialog',
            onClose: () => {
              try { document.title = 'Aardvark Playlist'; } catch(e) { window.document.title = 'Aardvark Playlist'; }
              if (this.playEnforcer) clearInterval(this.playEnforcer);
              if (this.fadeInterval) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                this.isFadingOut = false;
              }
              if (this.player.subtleProgressBar) {
                this.player.subtleProgressBar.destroy();
                this.player.subtleProgressBar = null;
              }
              this.player.gt?.handleTransportCleanup();
              this.player.gt?.destroy();
              this.player.gt = null;
              VideoEventQueue.clear();
              this.player.videoDialog = null;
              this.player.viewportManager.destroy3DApp();
              this.player._closeQuickSettingsDropdown();
            },
          });

          this.player.headerControls = makeElement('div', {
            className: 'gt-header-controls',
            style: 'display:flex; align-items:center; gap:10px; margin-right:15px; font-family:sans-serif;',
            onmousedown: (e) => e.stopPropagation(),
          });

          const controlsTarget = this.player.videoDialog.header.querySelector('.uw-controls');
          if (controlsTarget) {
            this.player.videoDialog.header.insertBefore(this.player.headerControls, controlsTarget);
          } else {
            this.player.videoDialog.header.appendChild(this.player.headerControls);
          }

          this.player.headerControlsUI.build();
          this.player.videoDialog.setZOnTop();
        } else {
          if (this.player.videoDialog._minimized) {
            this.player.videoDialog.restore();
          }
          this.player.videoDialog.setTitle(title);
          this.player.videoDialog.setZOnTop();
          this.player.videoDialog.element.style.display = 'flex';
          this.player.headerControlsUI.build();
        }

        // Create GlowTunesPlayer once if it does not exist
        if (!this.player.gt) {
          this.player.gt = new GlowTunesPlayer(
            this.player.videoContainer,
            this.player.rootElement,
            {
              basePath: this.player.basePath,
              initialSettings: this.player.state.settings,
              startTime: item.startTime,
              endTime: item.endTime,
            }
          );

          this.player.subtleProgressBar = new SubtleProgressBar(this.player);
          this.player.subtleProgressBar.mount(this.player.videoContainerWrapper);

          if (this.player.state.geometry && this.player.gt.pianoVisuals) {
            Object.assign(
              this.player.gt.pianoVisuals.geometrySettings,
              this.player.state.geometry
            );
          }

          this.player.gt.onStateChange = (s) => this.handlePlayerState(s);
          this.player.gt.registerTimeUpdateCallback((t, isPlaying, isReset) =>
            this.onGlobalTimeUpdate(t, isPlaying)
          );
        }

        let startTime = item.startTime || 0;
        if (this.player.activeSegments) {
          this.player.activeSegments.sort((a, b) => a.start - b.start);
          startTime = this.player.activeSegments[0].start;
        }

        let savedVol = this.player.state.settings.videoVolume;
        if (savedVol === undefined || (savedVol === 0 && !this.player.state.settings.userMuted)) {
          savedVol = 100;
          this.player.state.settings.videoVolume = 100;
        }
        if (this.player.gt) {
          this.player.gt.setVideoVolume(savedVol);
        }

        const skipVeq = (item.hasPianoRoll === false) || (this.player.state.settings.fetchPianoRolls === false);

        this.ensurePlaybackStart();

        this.player.gt.load(item.id, skipVeq ? 'SKIP' : null).then(async () => {
          if (startTime > 0) this.player.gt.seekTo(startTime);

          this.player.gt.setVideoVolume(savedVol);

          const veqData = window.VideoEventQueueClass?.current;
          const hasNotes =
            veqData &&
            veqData.timedEvents &&
            veqData.timedEvents.length > 0 &&
            veqData.timedEvents.some((e) => e.type === 'note');

          if (hasNotes) {
            if (!item.hasPianoRoll) {
              item.hasPianoRoll = true;
              this.player._saveState();
              this.player.playlistManager?.renderItems();
            }

            const s = item.songSettings || {};

            // Restore Transpose
            const userTranspose = s.transpose || 0;
            if (userTranspose !== 0) {
              this.player.gt.setTranspose(userTranspose);
            } else if (this.player.state.settings.smartAutoArp !== false) {
              SmartArpController.applySmartRangeTransposition(this.player.gt, veqData);
            }
            this.player.state.settings.transpose = this.player.gt.transposeOffset;

            // Restore or Auto-detect Split & Chords
            if (s.splitMethod) {
              this.player.state.settings.splitPitch = s.splitPitch || 60;
              this.player.pianoLogic.splitTracks(
                s.splitMethod,
                this.player.state.settings.splitPitch,
                true
              );
              window.arpEnabled = s.arpEnabled !== undefined ? !!s.arpEnabled : true;
              if (s.arpSpread !== undefined) window.arpGlobalSpread = s.arpSpread;
              if (s.arpPattern !== undefined) window.arpPattern = s.arpPattern;
              if (s.arpAnchor !== undefined) window.arpAnchor = s.arpAnchor;
              if (s.arpLen !== undefined) window.arpGlobalLenFactor = s.arpLen;

              if (window.VideoEventQueueClass) {
                window.VideoEventQueueClass.findChords(false);
              }
            } else if (this.player.state.settings.smartAutoArp !== false) {
              const autoResult = SmartArpController.detectOptimalSplitAndChords(veqData);
              if (autoResult) {
                const defaults = SmartArpController.smartArpDefaults;
                window.arpEnabled = true;
                window.arpGlobalSpread = defaults.arpSpread;
                window.arpPattern = defaults.arpPattern;
                window.arpAnchor = defaults.arpAnchor;
                window.arpGlobalLenFactor = defaults.arpLenFactor;
                this.player.state.settings.splitPitch = autoResult.splitPitch;
                this.player.pianoLogic.splitTracks('smart', autoResult.splitPitch, true);

                if (this.player.gt.instruments) {
                  this.player.gt.instruments.setVolume(1.0);
                  await this.player.gt.instruments.restoreTrackState([
                    { instrument: defaults.trebleInstrument || 'Piano', volume: defaults.trebleVolume || 5.0, octaveShift: 0 },
                    { instrument: defaults.bassInstrument || 'Vibes', volume: defaults.bassVolume || 3.0, octaveShift: 0 }
                  ]);
                }
                this.player._updateSongSettings({
                  splitMethod: 'smart',
                  splitPitch: autoResult.splitPitch,
                  arpEnabled: true,
                  arpSpread: defaults.arpSpread,
                  arpPattern: defaults.arpPattern,
                  arpAnchor: defaults.arpAnchor,
                  arpLen: defaults.arpLenFactor,
                  tracks: this.player.gt.instruments.tracks
                });
                if (window.VideoEventQueueClass) {
                  window.VideoEventQueueClass.findChords(false);
                }
              } else {
                window.arpEnabled = false;
              }
            } else {
              window.arpEnabled = false;
            }

            // Restore Instruments & Volume
            if (s.tracks && this.player.gt.instruments) {
              this.player.gt.instruments.setVolume(1.0);
              await this.player.gt.instruments.restoreTrackState(s.tracks);
            }

            this.player._refreshVisuals();
            if (this.player.gt.synchronizer) this.player.gt.synchronizer.resyncScheduler();
          }

          this.player.headerControlsUI.build();
          const style = this.player.state.settings.keyboardStyle || '3d';
          this.player._applyDisplayModeAfterLoad(style);
        }).catch(err => {
          console.warn('[PlaybackController] Load error caught:', err);
        });

        this.ensurePlaybackStart();
      }
  handlePlayerState(s) {
    const vp = this.player.gt?.videoPlayer;
    const ytVol = vp && vp.isReady ? Math.round(vp.getVolume()) : 'N/A';
    const savedVol = this.player.state.settings.videoVolume;
    
    window.smartLog('Volume', `[State] ${s.type}`, { ytReports: ytVol, weSaved: savedVol });

    if (s.type === 'play' || s.type === 'playing') {
      if (this.playEnforcer) {
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }

      // Diagnostic Enforcement
      if (vp && !this.player.gt._scriptMuted && !this.isFadingOut) {
        if (savedVol !== undefined) {
          window.smartLog('Volume', `[Command] Forcing volume to ${savedVol} on ${s.type}`);
          this.player.gt.setVideoVolume(savedVol);
          
          // VERIFY COMMAND
          setTimeout(() => {
            const checkVol = this.player.gt?.videoPlayer?.getVolume();
            window.smartLog('Volume', `[Verify] 500ms after ${s.type} command`, { 
              expected: savedVol, 
              actual: checkVol, 
              success: checkVol == savedVol 
            });
          }, 500);
          
          // DOUBLE VERIFY COMMAND
          setTimeout(() => {
            const checkVol = this.player.gt?.videoPlayer?.getVolume();
            window.smartLog('Volume', `[Verify] 1500ms after ${s.type} command`, { 
              expected: savedVol, 
              actual: checkVol, 
              success: checkVol == savedVol 
            });
          }, 1500);
        }
      }
    }

    if (s.type === 'pause' || s.type === 'paused') {
      if (this.playEnforcer) {
        clearInterval(this.playEnforcer);
        this.playEnforcer = null;
      }
    }

    if (s.type === 'seeked' || s.type === 'pause') {
      if (this.player.gt && this.player.gt.videoPlayer) {
        const nowMs = this.player.gt.videoPlayer.getAccurateTime().time * 1000;
        this.player.gt.pianoVisuals?.setTime(nowMs, 0, true);
        if (this.player.gt.pianoVisuals?.forceRefreshFlyingBars) {
          this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
        }
      }
    }

    if (s.type === 'ready') {
      if (savedVol !== undefined && this.player.gt && !this.player.gt._scriptMuted) {
        window.smartLog('Volume', `[Command] Forcing volume to ${savedVol} on ready`);
        this.player.gt.setVideoVolume(savedVol);
      }

      const style = this.player.state.settings.keyboardStyle || '2d';
      this.player._applyDisplayModeAfterLoad(style);
      this.player.headerControlsUI.build();

      if (this.player.leftPanelUI && typeof this.player.leftPanelUI.refreshGeometryUI === 'function') {
        this.player.leftPanelUI.refreshGeometryUI();
      }
    }

    if (s.type === 'settings-restored') {
      const item = this.player.currentPlayItem;
      if (item && item.songSettings) {
        const songSet = item.songSettings;
        if (songSet.tracks && this.player.gt?.instruments) {
          this.player.gt.instruments.setVolume(1.0);
          this.player.gt.instruments.restoreTrackState(songSet.tracks);
        }
        if (songSet.transpose !== undefined && this.player.gt) {
          this.player.gt.setTranspose(songSet.transpose);
          this.player.state.settings.transpose = this.player.gt.transposeOffset;
        }
      }
      if (this.player.headerControlsUI) this.player.headerControlsUI.build();
    }

    if (s.type === 'end') {
      window.smartLog('Volume', `[State] Video ended. Ending YT vol: ${ytVol}`);
      
      if (this.player.gt) {
        this.player.gt.handleTransportCleanup();
      }

      const mode = this.player.state.settings.playbackMode || 'continuous';

      if (mode === 'stop_one') {
      } else if (mode === 'timer') {
        const stopTime = this.player.state.settings.playbackStopTime;
        if (stopTime && Date.now() >= stopTime) {
          this.player.state.settings.playbackStopTime = null;
          this.player._saveState();
        } else {
          this.player.playlistManager?.playNext();
        }
      } else {
        this.player.playlistManager?.playNext();
      }
    }
  }

  onGlobalTimeUpdate(time, isPlaying) {
    if (!isPlaying) return;

    const settings = this.player.state.settings;
    if (settings.playbackMode === 'timer' && settings.playbackStopTime) {
      if (Date.now() >= settings.playbackStopTime && !this.isFadingOut) {
        this.startFadeOutAndStop();
        return;
      }
    }

    if (
      this.player.currentPlayItem &&
      this.player.currentPlayItem.endTime &&
      this.player.currentPlayItem.endTime > 0
    ) {
      if (time >= this.player.currentPlayItem.endTime) {
        console.log(
          `[YouTubePlayer] Custom End Time reached: ${this.player.currentPlayItem.endTime}`
        );
        if (this.player.gt) this.player.gt.pause();
        this.handlePlayerState({ type: 'end' });
        return;
      }
    }

    if (this.player.activeSegments && this.player.gt) {
      const currentSeg =
        this.player.activeSegments[this.player.currentSegmentIndex];

      if (!currentSeg) return;

      if (time < currentSeg.start - 0.5) {
        this.player.gt.seekTo(currentSeg.start);
        return;
      }

      if (time >= currentSeg.end) {
        if (
          this.player.currentSegmentIndex <
          this.player.activeSegments.length - 1
        ) {
          this.player.currentSegmentIndex++;
          const nextSeg =
            this.player.activeSegments[this.player.currentSegmentIndex];
          console.log(
            `[YouTubePlayer] Segment complete. Jumping to next: ${nextSeg.start}`
          );
          this.player.gt.seekTo(nextSeg.start);
        } else {
          console.log('[YouTubePlayer] Final segment complete. Ending video.');
          this.handlePlayerState({ type: 'end' });
        }
      }
    }
  }

  ensurePlaybackStart() {
      if (this.playEnforcer) clearInterval(this.playEnforcer);

      let attempts = 0;
      const maxAttempts = 25;

      this.playEnforcer = setInterval(() => {
        attempts++;

        if (!this.player.gt || !this.player.gt.videoPlayer) {
          clearInterval(this.playEnforcer);
          return;
        }

        const vp = this.player.gt.videoPlayer;

        if (vp.isPlaying()) {
          clearInterval(this.playEnforcer);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(this.playEnforcer);
          return;
        }

        if (vp.isReady) {
          let isBuffering = false;
          if (
            vp.options.playerType === 'youtube' &&
            vp.player &&
            typeof vp.player.getPlayerState === 'function'
          ) {
            const state = vp.player.getPlayerState();
            if (state === (window.YT?.PlayerState?.BUFFERING ?? 3)) {
              isBuffering = true;
            }
          }

          if (!isBuffering) {
            try { vp.play(); } catch(e) {}
          }
        }
      }, 400);
    }
  startFadeOutAndStop() {
      if (this.isFadingOut) return;
      this.isFadingOut = true;

      const originalVidVol = this.player.gt && this.player.gt.videoPlayer ? this.player.gt.videoPlayer.getVolume() : 100;
      this.fadeOriginalVidVol = originalVidVol;
      
      // Normalize from 0-100 range to 0.0-1.0 range expected by the audio engine
      const originalInstVol =
        this.player.state.settings.instrumentVolume !== undefined
          ? this.player.state.settings.instrumentVolume / 100
          : 0.5;

      let steps = 100;
      let currentStep = 0;

      this.player.setStatus('Timer finished. Fading out...', '#4a90e2');

      this.player.state.settings.playbackStopTime = null;
      this.player._saveState();

      this.fadeInterval = setInterval(() => {
        currentStep++;
        const ratio = 1 - currentStep / steps;

        if (this.player.gt) {
          this.player.gt.setVideoVolume(originalVidVol * ratio);
          this.player.gt.setInstrumentVolume(originalInstVol * ratio);
        }

        if (currentStep >= steps) {
          clearInterval(this.fadeInterval);
          if (this.player.gt) {
            this.player.gt.pause();
            this.player.gt.setVideoVolume(originalVidVol);
            this.player.gt.setInstrumentVolume(originalInstVol);
          }
          this.isFadingOut = false;
          this.fadeOriginalVidVol = undefined;
        }
      }, 100);
    }

  handlePlayerState(s) {
      const vp = this.player.gt?.videoPlayer;

      if (s.type === 'play' || s.type === 'playing') {
        if (this.playEnforcer) {
          clearInterval(this.playEnforcer);
          this.playEnforcer = null;
        }

        if (vp && !this.player.gt._scriptMuted && !this.isFadingOut) {
          let savedVol = this.player.state.settings.videoVolume;
          if (savedVol === undefined || (savedVol === 0 && !this.player.state.settings.userMuted)) {
            savedVol = 100;
            this.player.state.settings.videoVolume = 100;
          }
          this.player.gt.setVideoVolume(savedVol);
        }
      }

      if (s.type === 'pause' || s.type === 'paused') {
        if (this.playEnforcer) {
          clearInterval(this.playEnforcer);
          this.playEnforcer = null;
        }
      }

      if (s.type === 'seeked' || s.type === 'pause') {
        if (this.player.gt && this.player.gt.videoPlayer) {
          const nowMs = this.player.gt.videoPlayer.getAccurateTime().time * 1000;
          this.player.gt.pianoVisuals?.setTime(nowMs, 0, true);
          if (this.player.gt.pianoVisuals?.forceRefreshFlyingBars) {
            this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
          }
        }
      }

      if (s.type === 'ready') {
        let savedVol = this.player.state.settings.videoVolume;
        if (savedVol === undefined || (savedVol === 0 && !this.player.state.settings.userMuted)) {
          savedVol = 100;
          this.player.state.settings.videoVolume = 100;
        }
        if (this.player.gt && !this.player.gt._scriptMuted) {
          this.player.gt.setVideoVolume(savedVol);
        }

        const style = this.player.state.settings.keyboardStyle || '2d';
        this.player._applyDisplayModeAfterLoad(style);
        this.player.headerControlsUI.build();

        if (this.player.leftPanelUI && typeof this.player.leftPanelUI.refreshGeometryUI === 'function') {
          this.player.leftPanelUI.refreshGeometryUI();
        }
      }

      if (s.type === 'settings-restored') {
        const item = this.player.currentPlayItem;
        if (item && item.songSettings) {
          const songSet = item.songSettings;
          if (songSet.tracks && this.player.gt?.instruments) {
            this.player.gt.instruments.setVolume(1.0);
            this.player.gt.instruments.restoreTrackState(songSet.tracks);
          }
          if (songSet.transpose !== undefined && this.player.gt) {
            this.player.gt.setTranspose(songSet.transpose);
            this.player.state.settings.transpose = this.player.gt.transposeOffset;
          }
          if (songSet.splitMethod) {
            this.player.state.settings.splitPitch = songSet.splitPitch || 60;
            this.player.pianoLogic.splitTracks(
              songSet.splitMethod,
              this.player.state.settings.splitPitch,
              true
            );
          }
          if (songSet.arpEnabled !== undefined) {
            window.arpEnabled = !!songSet.arpEnabled;
            if (songSet.arpSpread !== undefined) window.arpGlobalSpread = songSet.arpSpread;
            if (songSet.arpPattern !== undefined) window.arpPattern = songSet.arpPattern;
            if (songSet.arpAnchor !== undefined) window.arpAnchor = songSet.arpAnchor;
            if (songSet.arpLen !== undefined) window.arpGlobalLenFactor = songSet.arpLen;
          }
        }
        if (this.player.headerControlsUI) this.player.headerControlsUI.build();
      }

      if (s.type === 'end') {
        if (this.player.gt) {
          this.player.gt.handleTransportCleanup();
        }

        const mode = this.player.state.settings.playbackMode || 'continuous';

        if (mode === 'stop_one') {
        } else if (mode === 'timer') {
          const stopTime = this.player.state.settings.playbackStopTime;
          if (stopTime && Date.now() >= stopTime) {
            this.player.state.settings.playbackStopTime = null;
            this.player._saveState();
          } else {
            this.player.playlistManager?.playNext();
          }
        } else {
          this.player.playlistManager?.playNext();
        }
      }
    }
  
}