
class KeyboardEditController {
  constructor(player) {
    this.player = player;
    this._keystrokeDisplay = null;
    this._keystrokeTimer = null;
  }

  setupGlobalSyncKeys() {
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        )
          return;

        // Purely display the global keystroke HUD (Logic is handled by KeyCommandHandler now)
        const isModifierOnly = [
          'Shift',
          'Control',
          'Alt',
          'Meta',
          'CapsLock',
        ].includes(e.key);
        if (!isModifierOnly) {
          let keyName = e.key === ' ' ? 'Space' : e.key;
          if (keyName.length === 1) keyName = keyName.toUpperCase();

          const mods = [];
          if (e.ctrlKey) mods.push('Ctrl');
          if (e.metaKey) mods.push('Meta');
          if (e.altKey) mods.push('Alt');
          if (e.shiftKey && keyName.length > 1) mods.push('Shift');
          const fullKey =
            mods.length > 0 ? `${mods.join(' + ')} + ${keyName}` : keyName;
          this.showKeystroke(fullKey);
        }
      },
      true
    );
  }

  showKeystroke(keyStr) {
    if (!this.player.videoDialog || !this.player.videoDialog.header) return;

    if (!this._keystrokeDisplay) {
      this._keystrokeDisplay = makeElement('div', {
        style: {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #333',
          color: '#4f4',
          padding: '2px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          zIndex: '10',
          opacity: '0',
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        },
      });
      this.player.videoDialog.header.style.position = 'relative';
      this.player.videoDialog.header.appendChild(this._keystrokeDisplay);
    }

    this._keystrokeDisplay.textContent = keyStr;
    this._keystrokeDisplay.style.opacity = '1';

    if (this._keystrokeTimer) clearTimeout(this._keystrokeTimer);
    this._keystrokeTimer = setTimeout(() => {
      if (this._keystrokeDisplay) {
        this._keystrokeDisplay.style.opacity = '0';
      }
    }, 3000);
  }

  setupEditKeys() {
      window.addEventListener('mouseup', (e) => {
        if (
          e.target &&
          e.target.tagName !== 'SELECT' &&
          ['INPUT', 'BUTTON'].includes(e.target.tagName)
        ) {
          if (e.target.type !== 'text' && e.target.type !== 'number') {
            e.target.blur();
          }
        }
      });

      window.addEventListener('keydown', (e) => {
        const tag = e.target?.tagName;
        const type = e.target?.type;
        const isTextInput =
          tag === 'INPUT' &&
          ['text', 'number', 'password', 'email', 'search', 'url'].includes(type);
        if (isTextInput || tag === 'TEXTAREA' || e.target?.isContentEditable) {
          return;
        }

        const player = this.player.gt;
        if (!player) return;

        const key = e.key;

        // 1. Scrubbing (Arrow Left / Arrow Right)
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            const curr = player.videoPlayer?.getCurrentRawTime() || 0;
            const delta = key === 'ArrowLeft' ? -5 : 5;
            const targetTime = Math.max(0, curr + delta);
            player.seekTo(targetTime);
            this.player.setStatus(`Seek: ${Math.floor(targetTime / 60)}:${Math.floor(targetTime % 60).toString().padStart(2, '0')}`, '#4a90e2');
            return;
          }
        }

        // 2. Video Volume (Arrow Up / Arrow Down)
        if (key === 'ArrowUp' || key === 'ArrowDown') {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            let currentVol = this.player.state.settings.videoVolume ?? (player.videoPlayer?.getVolume() ?? 100);
            const delta = key === 'ArrowUp' ? 5 : -5;
            const newVol = Math.max(0, Math.min(100, Math.round(currentVol + delta)));

            this.player.state.settings.videoVolume = newVol;
            player.setVideoVolume(newVol);
            this.player._saveSettings();

            document.querySelectorAll('.gt-video-vol-slider').forEach(sl => {
              sl.value = newVol;
            });
            this.player.setStatus(`Video Vol: ${newVol}%`, '#4a90e2');
            return;
          }
        }

        const lKey = key.toLowerCase();
        if (lKey === 's') {
          e.preventDefault();
          this.player._triggerSync();
        } else if (lKey === 'z' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.player._triggerUndo();
        } else if (lKey === 'p') {
          e.preventDefault();
          if (player.videoPlayer?.isPlaying()) player.pause();
          else player.play();
        } else if (lKey === 'b') {
          e.preventDefault();
          const curr = player.videoPlayer?.getCurrentRawTime() || 0;
          player.seekTo(Math.max(0, curr - 10));
        } else if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          const dur = player.videoPlayer?.getDuration() || 0;
          if (dur > 0) player.seekTo((dur * parseInt(e.key) * 10) / 100);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          this.player._triggerDelete();
        }
      }, true); // Use capture phase so arrow keys are handled reliably
    }
}

