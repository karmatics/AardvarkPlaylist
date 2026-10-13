class AppStateManager {

  constructor(player) {
    this.player = player;
  }

  loadState() {
      let settings = {
        instrumentVolume: 50,
        transpose: 0,
        midiEnabled: false,
        keyboardStyle: '3d',
      };
      let geometry = {};
      let playlistData = null;

      try {
        const loadedSettings = JSON.parse(localStorage.getItem('yt_settings'));
        if (loadedSettings) {
          settings = { ...settings, ...loadedSettings };
        }
      } catch (e) {}

      try {
        const loadedGeo = JSON.parse(localStorage.getItem('yt_geometry'));
        if (loadedGeo && Object.keys(loadedGeo).length > 0) geometry = loadedGeo;
      } catch (e) {}

      try {
        const localPl = JSON.parse(localStorage.getItem('yt_playlist'));
        if (localPl && Array.isArray(localPl.playlist)) {
          playlistData = localPl;
        }
      } catch (e) {}

      settings.editMode = false;
      if (settings.keyboardStyle === 'both') {
        settings.keyboardStyle = '3d';
      }

      return { settings, playlistData, geometry };
    }

  saveState() {
      if (this._saveStateTimer) clearTimeout(this._saveStateTimer);
      this._saveStateTimer = setTimeout(() => {
        if (this.player.playlistManager) {
          const pData = this.player.playlistManager.getData();
          this.player.state.playlistData = pData;
          this._savePlaylistToDB(pData);
          try {
            localStorage.setItem('yt_playlist', JSON.stringify(pData));
          } catch (e) {}
        }
        localStorage.setItem(
          'yt_settings',
          JSON.stringify(this.player.state.settings || {})
        );
      }, 250);
    }
  saveGeometry() {
      if (this._saveGeoTimer) clearTimeout(this._saveGeoTimer);
      this._saveGeoTimer = setTimeout(() => {
        if (
          this.player.gt?.pianoVisuals?.geometrySettings
        ) {
          const gs = this.player.gt.pianoVisuals.geometrySettings;
          this.player.state.geometry = this.player.state.geometry || {};
          
          // Copy all direct numeric/string configuration keys to active state
          Object.keys(gs).forEach((key) => {
            if (typeof gs[key] !== 'function' && typeof gs[key] !== 'object') {
              this.player.state.geometry[key] = gs[key];
            }
          });
        }
        try {
          localStorage.setItem(
            'yt_geometry',
            JSON.stringify(this.player.state.geometry || {})
          );
        } catch (e) {}
        this.saveState();
      }, 300);
    }

  updateSongSettings(updates) {
      if (!this.player.currentPlayItem) return;
      const veqData = window.VideoEventQueueClass?.current;
      const hasNotes =
        veqData &&
        veqData.timedEvents &&
        veqData.timedEvents.some((e) => e.type === 'note');
      if (!hasNotes) return;

      const isCurator = typeof window.openCuratorDiagnostics === 'function' && localStorage.getItem('gt_curator_mode') === 'true';

      if (isCurator) {
        if (!this.player.currentPlayItem.songSettings) {
          this.player.currentPlayItem.songSettings = {};
        }
        Object.assign(this.player.currentPlayItem.songSettings, updates);

        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Scope', `Committed local curation settings directly to playlist item: ${this.player.currentPlayItem.title}`, updates);
        }

        if (this.player.playlistSelectorUI) {
          this.player.playlistSelectorUI.markModified();
        }

        this.saveState();
      } else {
        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Scope', `Session/Global Override applied (Local playlist state preserved)`, updates);
        }
      }
    }

  async _getDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AardvarkPlaylistDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async loadPlaylistAsync() {
      let localData = null;
      try {
        const localStr = localStorage.getItem('yt_playlist');
        if (localStr) localData = JSON.parse(localStr);
      } catch (e) {}

      if (localData && Array.isArray(localData.playlist) && localData.playlist.length > 0) {
        return localData;
      }

      try {
        const dbPromise = this._getDB();
        const timeoutPromise = new Promise(r => setTimeout(() => r(null), 300));
        const db = await Promise.race([dbPromise, timeoutPromise]);
        if (!db) return localData;

        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(localData), 300);
          const tx = db.transaction('store', 'readonly');
          const store = tx.objectStore('store');
          const req = store.get('current_playlist');
          req.onsuccess = () => {
            clearTimeout(timeout);
            resolve(req.result || localData);
          };
          req.onerror = () => {
            clearTimeout(timeout);
            resolve(localData);
          };
        });
      } catch (e) {
        return localData;
      }
    }
  async _savePlaylistToDB(data) {
        try {
          const db = await this._getDB();
          const tx = db.transaction('store', 'readwrite');
          const store = tx.objectStore('store');
          if (data === null) {
            store.delete('current_playlist');
          } else {
            store.put(data, 'current_playlist');
          }
        } catch (e) {
          console.error('IDB save failed', e);
        }
      }
}

