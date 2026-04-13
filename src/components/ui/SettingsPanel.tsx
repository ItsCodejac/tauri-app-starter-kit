import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { ipc } from '../../lib/ipc';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { localeLabels } from '../../lib/i18n';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Section = 'general' | 'appearance' | 'autosave' | 'cache' | 'tray' | 'security';

const sections: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'autosave', label: 'Autosave' },
  { id: 'cache', label: 'Cache' },
  { id: 'tray', label: 'Tray' },
  { id: 'security', label: 'Security' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20000,
};

const card: CSSProperties = {
  width: 640,
  maxHeight: '80vh',
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border-standard)',
  borderRadius: 10,
  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
  display: 'flex',
  overflow: 'hidden',
};

const sidebarStyle: CSSProperties = {
  width: 180,
  background: 'var(--surface-tertiary)',
  borderRight: '1px solid var(--border-subtle)',
  padding: '16px 0',
  flexShrink: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: '24px 28px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const sectionBtnBase: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 20px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 32,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-primary)',
};

const descStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-tertiary)',
  marginTop: 2,
};

const selectStyle: CSSProperties = {
  background: 'var(--surface-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontSize: 12,
  padding: '4px 8px',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  cursor: 'pointer',
};

const inputStyle: CSSProperties = {
  background: 'var(--surface-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontSize: 12,
  padding: '4px 8px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  width: 80,
  textAlign: 'right',
};

const buttonStyle: CSSProperties = {
  padding: '6px 16px',
  border: '1px solid var(--border-standard)',
  borderRadius: 5,
  background: 'var(--surface-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const dangerBtnStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: 'var(--accent-red)',
  color: 'var(--accent-red)',
};

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: checked ? 'var(--accent-blue)' : 'var(--surface-elevated)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Setting row helper
// ---------------------------------------------------------------------------

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={labelStyle}>{label}</div>
        {description && <div style={descStyle}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 4 }}>
      {title}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<Section>('general');
  const { getSetting, setSetting, loading } = useSettings();
  const { locale, setLocale, availableLocales: locales } = useTranslation();
  const [cacheDir, setCacheDir] = useState('');
  const [keyringKeys, setKeyringKeys] = useState<{ service: string; key: string }[]>([]);
  const [newService, setNewService] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [keyringStatus, setKeyringStatus] = useState('');

  // Load app info for cache dir display
  useEffect(() => {
    if (open) {
      ipc.getAppInfo().then((info) => {
        setCacheDir(info.app_cache_dir);
      }).catch(() => {});
    }
  }, [open]);

  // Load stored keyring key names from settings
  useEffect(() => {
    if (open) {
      const stored = getSetting<{ service: string; key: string }[]>('keyring_keys', []);
      setKeyringKeys(stored);
    }
  }, [open, getSetting]);

  const addKeyringEntry = useCallback(async () => {
    if (!newService || !newKey || !newValue) return;
    try {
      await ipc.keyringSet(newService, newKey, newValue);
      const updated = [...keyringKeys, { service: newService, key: newKey }];
      setKeyringKeys(updated);
      await setSetting('keyring_keys', updated);
      setNewService('');
      setNewKey('');
      setNewValue('');
      setKeyringStatus('Saved');
      setTimeout(() => setKeyringStatus(''), 2000);
    } catch (err) {
      setKeyringStatus(`Error: ${err}`);
    }
  }, [newService, newKey, newValue, keyringKeys, setSetting]);

  const removeKeyringEntry = useCallback(async (service: string, key: string) => {
    try {
      await ipc.keyringDelete(service, key);
    } catch {
      // May already be deleted from keychain
    }
    const updated = keyringKeys.filter(
      (e) => !(e.service === service && e.key === key)
    );
    setKeyringKeys(updated);
    await setSetting('keyring_keys', updated);
  }, [keyringKeys, setSetting]);

  const handleReset = useCallback(async () => {
    try {
      await ipc.resetSettings();
      // Reload to pick up reset values
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  }, []);

  if (!open || loading) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            <SectionHeader title="General" />
            <SettingRow label="Language" description="Application display language">
              <select
                style={selectStyle}
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value);
                  setSetting('locale', e.target.value);
                }}
              >
                {locales.map((code) => (
                  <option key={code} value={code}>
                    {localeLabels[code] ?? code}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="Autostart" description="Launch app when you log in">
              <Toggle
                checked={getSetting<boolean>('autostart', false)}
                onChange={async (v) => {
                  await setSetting('autostart', v);
                  try {
                    if (v) await ipc.autostartEnable();
                    else await ipc.autostartDisable();
                  } catch (err) {
                    console.error('Autostart toggle failed:', err);
                  }
                }}
              />
            </SettingRow>
            <SettingRow label="Check for Updates on Startup" description="Automatically check for new versions">
              <Toggle
                checked={getSetting<boolean>('updates.checkOnStartup', true)}
                onChange={(v) => setSetting('updates.checkOnStartup', v)}
              />
            </SettingRow>
            <SettingRow label="First Run" description="Reset the first-run welcome overlay">
              <button
                style={buttonStyle}
                onClick={() => setSetting('first_run', true)}
              >
                Reset
              </button>
            </SettingRow>
          </>
        );

      case 'appearance':
        return (
          <>
            <SectionHeader title="Appearance" />
            <SettingRow label="Theme" description="Color scheme for the interface">
              <select
                style={selectStyle}
                value={getSetting<string>('theme', 'dark')}
                onChange={(e) => setSetting('theme', e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light" disabled>Light (coming soon)</option>
              </select>
            </SettingRow>
            <SettingRow label="Show Status Bar" description="Toggle the bottom status bar">
              <Toggle
                checked={getSetting<boolean>('view_status_bar', true)}
                onChange={async (v) => {
                  await setSetting('view_status_bar', v);
                  try {
                    await ipc.menuSetChecked('view_status_bar', v);
                  } catch {
                    // Menu item may not exist
                  }
                }}
              />
            </SettingRow>
          </>
        );

      case 'autosave':
        return (
          <>
            <SectionHeader title="Autosave" />
            <SettingRow label="Enable Autosave" description="Periodically save your work">
              <Toggle
                checked={getSetting<boolean>('autosave_enabled', true)}
                onChange={(v) => setSetting('autosave_enabled', v)}
              />
            </SettingRow>
            <SettingRow
              label="Autosave Interval"
              description={`Save every ${getSetting<number>('autosave_interval_secs', 60)} seconds`}
            >
              <input
                type="range"
                min={30}
                max={300}
                step={10}
                value={getSetting<number>('autosave_interval_secs', 60)}
                onChange={(e) => setSetting('autosave_interval_secs', Number(e.target.value))}
                style={{ width: 120, accentColor: 'var(--accent-blue)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginLeft: 8, minWidth: 36 }}>
                {getSetting<number>('autosave_interval_secs', 60)}s
              </span>
            </SettingRow>
          </>
        );

      case 'cache':
        return (
          <>
            <SectionHeader title="Cache" />
            <SettingRow label="Cache Location" description="Where cached data is stored">
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cacheDir || '...'}
              </span>
            </SettingRow>
            <SettingRow label="Clear Cache" description="Remove all cached files">
              <button style={dangerBtnStyle} onClick={() => {
                // Placeholder -- implement actual cache clearing
                console.log('Cache cleared');
              }}>
                Clear
              </button>
            </SettingRow>
          </>
        );

      case 'tray':
        return (
          <>
            <SectionHeader title="System Tray" />
            <SettingRow label="Minimize to Tray" description="Keep app running in the system tray when closed">
              <Toggle
                checked={getSetting<boolean>('tray.minimize_to_tray', false)}
                onChange={(v) => setSetting('tray.minimize_to_tray', v)}
              />
            </SettingRow>
          </>
        );

      case 'security':
        return (
          <>
            <SectionHeader title="Security" />
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              Secrets are stored in the OS keychain (Keychain Access on macOS, Credential Manager on Windows, libsecret on Linux). Values are never displayed here.
            </div>

            {/* Stored keys list */}
            {keyringKeys.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {keyringKeys.map((entry, i) => (
                  <div key={i} style={{ ...rowStyle, background: 'var(--surface-primary)', borderRadius: 4, padding: '6px 10px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {entry.service}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 4px' }}>/</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {entry.key}
                      </span>
                    </div>
                    <button
                      style={{ ...dangerBtnStyle, padding: '2px 10px', fontSize: 11 }}
                      onClick={() => removeKeyringEntry(entry.service, entry.key)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {keyringKeys.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                No stored secrets.
              </div>
            )}

            {/* Add new secret form */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
                Add Secret
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  style={{ ...inputStyle, width: 120, textAlign: 'left' }}
                  placeholder="Service"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                />
                <input
                  style={{ ...inputStyle, width: 120, textAlign: 'left' }}
                  placeholder="Key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
                <input
                  type="password"
                  style={{ ...inputStyle, flex: 1, textAlign: 'left' }}
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  style={buttonStyle}
                  onClick={addKeyringEntry}
                  disabled={!newService || !newKey || !newValue}
                >
                  Store
                </button>
                {keyringStatus && (
                  <span style={{ fontSize: 11, color: keyringStatus.startsWith('Error') ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {keyringStatus}
                  </span>
                )}
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div style={sidebarStyle}>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                ...sectionBtnBase,
                background: activeSection === s.id ? 'var(--accent-blue-dim)' : 'transparent',
                color: activeSection === s.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: activeSection === s.id ? 600 : 400,
              }}
            >
              {s.label}
            </button>
          ))}

          {/* Reset at bottom */}
          <div style={{ marginTop: 'auto', padding: '24px 20px 0' }}>
            <button style={{ ...dangerBtnStyle, width: '100%', fontSize: 11 }} onClick={handleReset}>
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
