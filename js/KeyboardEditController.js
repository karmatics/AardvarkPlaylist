
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
            typeof KeyCommandHandler !== 'undefined' &&
            KeyCommandHandler.isEditableTarget &&
            KeyCommandHandler.isEditableTarget(e.target)
          ) {
            return;
          }
          if (
            e.target?.tagName === 'TEXTAREA' ||
            e.target?.isContentEditable ||
            (e.target?.tagName === 'INPUT' &&
              !['range', 'checkbox', 'radio', 'button'].includes(
                (e.target.type || 'text').toLowerCase()
              ))
          ) {
            return;
          }

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
      if (this._editKeysBound) return;
      this._editKeysBound = true;

      window.addEventListener('mouseup', (e) => {
        if (
          e.target &&
          e.target.tagName !== 'SELECT' &&
          ['INPUT', 'BUTTON'].includes(e.target.tagName)
        ) {
          const t = (e.target.type || 'text').toLowerCase();
          if (['range', 'checkbox', 'radio', 'button', 'submit'].includes(t) || e.target.tagName === 'BUTTON') {
            e.target.blur();
          }
        }
      });

      // Blur <select> immediately after choosing an option so global hotkeys resume working
      window.addEventListener('change', (e) => {
        if (e.target && e.target.tagName === 'SELECT') {
          e.target.blur();
        }
      });
    }
}

