import { useState, useEffect, useMemo, useCallback } from 'react';
import { events, ipc, ai } from './lib/ipc';
import { hasRecentCrash } from './lib/crash';
import { confirm } from '@tauri-apps/plugin-dialog';
import './styles/theme.css';
import './styles/global.css';
import TabBar, { type Tab } from './components/layout/TabBar';
import PanelLayout from './components/layout/PanelLayout';
import StatusBar from './components/layout/StatusBar';
import ToastContainer from './components/ui/Toast';
import CommandPalette, { type Command } from './components/ui/CommandPalette';
import ContextMenu from './components/ui/ContextMenu';
import DropOverlay from './components/ui/DropOverlay';
import WelcomeOverlay from './components/ui/WelcomeOverlay';
import SettingsPanel from './components/ui/SettingsPanel';
import AboutDialog from './components/ui/AboutDialog';
import ShortcutsPanel from './components/ui/ShortcutsPanel';
import UpdateDialog from './components/ui/UpdateDialog';
import LogViewer from './components/ui/LogViewer';
import WhatsNewDialog from './components/ui/WhatsNewDialog';
import SplashScreen from './components/ui/SplashScreen';
import { useToast } from './hooks/useToast';
import { useKeyboardShortcuts, formatShortcut, type Shortcut } from './hooks/useKeyboardShortcuts';
import { useContextMenu, type MenuItem } from './hooks/useContextMenu';
import { useDragDrop } from './hooks/useDragDrop';
import { useTranslation } from './hooks/useTranslation';
import { useFirstRun } from './hooks/useFirstRun';
import { branding } from './lib/branding';

function PlaceholderContent({ label }: { label: string }) {
  return (
    <div style={{
      padding: 16,
      color: 'var(--text-tertiary)',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    }}>
      {label}
    </div>
  );
}

// Locale selection is in Settings > General > Language.
// Removed from status bar to avoid duplication.

function AppInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('workspace-1');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [statusText, setStatusText] = useState(() => t('status.ready'));
  const [appVersion, setAppVersion] = useState('v0.0.0');
  const [appName, setAppName] = useState(branding.name || 'App');
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [splashDismissed, setSplashDismissed] = useState(false);
  const [splashStatus, setSplashStatus] = useState('Starting...');
  const { toast } = useToast();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { isFirstRun, loaded: firstRunLoaded, dismissFirstRun } = useFirstRun();

  // Workspace tabs -- customize these for your app.
  const tabs: Tab[] = useMemo(() => [
    { id: 'workspace-1', label: t('tabs.workspace', { number: 1 }) },
    { id: 'workspace-2', label: t('tabs.workspace', { number: 2 }) },
    { id: 'workspace-3', label: t('tabs.workspace', { number: 3 }) },
  ], [t]);

  // Drag and drop -- shows overlay and toasts file paths as demo behavior
  const { isDragging } = useDragDrop({
    onFilesDropped: (paths) => {
      const names = paths.map((p) => p.split('/').pop()).join(', ');
      toast(
        t('toast.droppedFiles', { count: paths.length, names }),
        'info',
        5000,
      );
    },
  });

  // Context menu items -- each panel provides its own items.
  const editMenuItems: MenuItem[] = useMemo(() => [
    { label: t('menu.cut'), action: () => toast(t('toast.cut'), 'info'), shortcut: '\u2318X' },
    { label: t('menu.copy'), action: () => toast(t('toast.copy'), 'info'), shortcut: '\u2318C' },
    { label: t('menu.paste'), action: () => toast(t('toast.paste'), 'info'), shortcut: '\u2318V' },
    { label: '', action: () => {}, separator: true },
    { label: t('menu.selectAll'), action: () => toast(t('toast.selectAll'), 'info'), shortcut: '\u2318A' },
  ], [toast, t]);

  const leftPanelMenuItems: MenuItem[] = useMemo(() => [
    { label: t('menu.open'), action: () => toast(t('toast.openItem'), 'info') },
    { label: t('menu.rename'), action: () => toast(t('toast.rename'), 'info') },
    { label: t('menu.delete'), action: () => toast(t('toast.delete'), 'info'), shortcut: '\u232B' },
    { label: '', action: () => {}, separator: true },
    { label: t('menu.showInFinder'), action: () => toast(t('toast.revealInFinder'), 'info') },
  ], [toast, t]);

  const rightPanelMenuItems: MenuItem[] = useMemo(() => [
    { label: t('menu.resetToDefault'), action: () => toast(t('toast.reset'), 'info') },
    { label: t('menu.copyValue'), action: () => toast(t('toast.copied'), 'info') },
  ], [toast, t]);

  // Load app info, settings, and signal readiness once initialization completes
  useEffect(() => {
    const init = async () => {
      setSplashStatus('Loading settings...');
      try {
        const info = await ipc.getAppInfo();
        setAppVersion(`v${info.version}`);
        setAppName(info.name || branding.name || 'App');
      } catch {
        // fall back to defaults
      }

      try {
        const val = await ipc.getSetting('view_status_bar');
        if (val === false) setShowStatusBar(false);
      } catch {
        // ignore
      }

      setSplashStatus('Checking for recovery...');
      // Recovery check happens via hasRecentCrash in a separate effect

      setSplashStatus('Checking for updates...');
      // Update check happens in a separate effect after splash

      setSplashStatus('Ready');
      // Mark the app as ready -- the splash will fade out
      setAppReady(true);
    };

    init();
  }, []);

  // Listen for View > Show Status Bar menu toggle
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    events.onMenuEvent('menu:view:status-bar', () => {
      setShowStatusBar((prev) => {
        const next = !prev;
        ipc.setSetting('view_status_bar', next).catch(() => {});
        ipc.menuSetChecked('view_status_bar', next).catch(() => {});
        return next;
      });
    }).then((u) => { unlisten = u; });
    return () => { unlisten?.(); };
  }, []);

  // Sync status bar visibility when changed from SettingsPanel
  useEffect(() => {
    const handler = (e: Event) => {
      setShowStatusBar((e as CustomEvent).detail as boolean);
    };
    window.addEventListener('settings:view_status_bar', handler);
    return () => window.removeEventListener('settings:view_status_bar', handler);
  }, []);

  // Menu event listeners from Tauri backend
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    const menuEvents = [
      { event: 'menu:file:new', handler: () => { setStatusText(t('status.newFile')); toast(t('toast.newFile'), 'info'); } },
      { event: 'menu:file:open', handler: () => { setStatusText(t('status.openFile')); toast(t('toast.openFile'), 'info'); } },
      { event: 'menu:file:save', handler: () => { setStatusText(t('status.saved')); toast(t('toast.saved'), 'success'); } },
      { event: 'menu:file:save-as', handler: () => { setStatusText(t('status.saveAs')); toast(t('toast.saveAs'), 'info'); } },
      { event: 'menu:app:preferences', handler: () => { setStatusText(t('status.settings')); setSettingsOpen(true); } },
      { event: 'menu:window:settings', handler: () => { setSettingsOpen(true); } },
      { event: 'menu:help:shortcuts', handler: () => { setShortcutsOpen(true); } },
      { event: 'menu:help:view-logs', handler: () => { setLogsOpen(true); } },
      { event: 'menu:help:check-for-updates', handler: () => { setUpdateOpen(true); } },
      { event: 'menu:help:whats-new', handler: () => { setWhatsNewOpen(true); } },
      { event: 'menu:help:docs', handler: () => { toast(t('toast.openDocs'), 'info'); } },
      { event: 'menu:help:report-issue', handler: async () => {
        try {
          const diagString = await ipc.collectDiagnosticsString();
          await navigator.clipboard.writeText(diagString);
          await ipc.openExternalUrl('https://github.com/your-org/your-repo/issues/new');
          toast(t('toast.reportIssue'), 'success');
        } catch (e) {
          toast(`Failed to collect diagnostics: ${e}`, 'error');
        }
      } },
    ];

    menuEvents.forEach(({ event, handler }) => {
      events.onMenuEvent(event, handler).then((unlisten) => unlisteners.push(unlisten));
    });

    return () => { unlisteners.forEach((u) => u()); };
  }, [toast, t]);

  // Quit confirmation -- listen for the backend's close-requested event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    events.onCloseRequested(async () => {
      const ok = await confirm(t('quit.message'), {
        title: t('quit.title'),
        kind: 'warning',
        okLabel: t('quit.ok'),
        cancelLabel: t('quit.cancel'),
      });
      if (ok) {
        await ipc.confirmClose();
      }
    }).then((u) => { unlisten = u; });

    return () => { unlisten?.(); };
  }, [t]);

  // Check for "What's New" on startup (show if version changed)
  useEffect(() => {
    ipc.getAppInfo().then(async (info) => {
      try {
        const lastSeen = await ipc.getSetting('app.lastSeenVersion') as string;
        if (lastSeen && lastSeen !== info.version) {
          setWhatsNewOpen(true);
        }
        // Always update the last seen version
        await ipc.setSetting('app.lastSeenVersion', info.version);
      } catch {
        // First run or missing setting -- set it now
        await ipc.setSetting('app.lastSeenVersion', info.version).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Check for updates on startup (if enabled)
  useEffect(() => {
    ipc.getSetting('updates.checkOnStartup').then((enabled) => {
      if (enabled !== false) {
        // Delay the check to not slow down startup
        const timer = setTimeout(() => {
          ipc.checkForUpdates().then((info) => {
            if (info) {
              // Check if user skipped this version
              ipc.getSetting('updates.skippedVersion').then((skipped) => {
                if (skipped !== info.version) {
                  setUpdateOpen(true);
                }
              }).catch(() => {
                setUpdateOpen(true);
              });
            }
          }).catch(() => {
            // Silent fail on startup check
          });
          ipc.setSetting('updates.lastCheck', Date.now()).catch(() => {});
        }, 3000);
        return () => clearTimeout(timer);
      }
    }).catch(() => {});
  }, []);

  // Check for crash from previous session on mount
  useEffect(() => {
    hasRecentCrash().then((report) => {
      if (report) {
        toast(
          t('crash.message', { name: report.name }),
          'warning',
          8000,
        );
      }
    }).catch(() => {
      // Ignore -- crash check is best-effort
    });
  }, []);

  const togglePalette = useCallback(() => setPaletteOpen((o) => !o), []);

  // Keyboard shortcuts
  const toggleSettings = useCallback(() => setSettingsOpen((o) => !o), []);
  const toggleShortcuts = useCallback(() => setShortcutsOpen((o) => !o), []);

  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: 'p',
      modifiers: ['meta', 'shift'],
      action: togglePalette,
      description: 'Open Command Palette',
    },
    {
      key: ',',
      modifiers: ['meta'],
      action: toggleSettings,
      description: 'Open Settings',
    },
    {
      key: '/',
      modifiers: ['meta'],
      action: toggleShortcuts,
      description: 'Keyboard Shortcuts',
    },
  ], [togglePalette, toggleSettings, toggleShortcuts]);

  useKeyboardShortcuts(shortcuts);

  // Commands for the palette
  const commands: Command[] = useMemo(() => [
    {
      id: 'new-file',
      label: t('command.newFile'),
      shortcut: formatShortcut({ key: 'n', modifiers: ['meta'], action: () => {}, description: '' }),
      action: () => toast(t('toast.newFile'), 'info'),
    },
    {
      id: 'open-file',
      label: t('command.openFile'),
      shortcut: formatShortcut({ key: 'o', modifiers: ['meta'], action: () => {}, description: '' }),
      action: () => toast(t('toast.openFile'), 'info'),
    },
    {
      id: 'save',
      label: t('command.save'),
      shortcut: formatShortcut({ key: 's', modifiers: ['meta'], action: () => {}, description: '' }),
      action: () => toast(t('toast.saved'), 'success'),
    },
    {
      id: 'preferences',
      label: t('command.preferences'),
      shortcut: formatShortcut({ key: ',', modifiers: ['meta'], action: () => {}, description: '' }),
      action: () => setSettingsOpen(true),
    },
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      shortcut: formatShortcut({ key: '/', modifiers: ['meta'], action: () => {}, description: '' }),
      action: () => setShortcutsOpen(true),
    },
    {
      id: 'about',
      label: 'About',
      action: () => setAboutOpen(true),
    },
    {
      id: 'toggle-left-panel',
      label: t('command.toggleLeftPanel'),
      action: () => toast(t('toast.togglePanel', { panel: 'left' }), 'info'),
    },
    {
      id: 'toggle-right-panel',
      label: t('command.toggleRightPanel'),
      action: () => toast(t('toast.togglePanel', { panel: 'right' }), 'info'),
    },
    // AI commands
    {
      id: 'ai-set-api-key',
      label: 'AI: Set API Key',
      action: () => setSettingsOpen(true),
    },
    {
      id: 'ai-list-models',
      label: 'AI: List Models',
      action: async () => {
        try {
          const models = await ai.listModels();
          if (models.length === 0) {
            toast('No models available. Set an API key first.', 'info');
          } else {
            const names = models.map((m) => `${m.provider}/${m.name}`).join(', ');
            toast(`Models: ${names}`, 'info', 6000);
          }
        } catch (err) {
          toast(`Failed to list models: ${err}`, 'error');
        }
      },
    },
    {
      id: 'ai-list-backends',
      label: 'AI: List Backends',
      action: async () => {
        try {
          const backends = await ai.listBackends();
          if (backends.length === 0) {
            toast('No inference backends registered.', 'info');
          } else {
            const info = backends.map((b) => `${b.name} (${b.loaded_models.length} models)`).join(', ');
            toast(`Backends: ${info}`, 'info', 6000);
          }
        } catch (err) {
          toast(`Failed to list backends: ${err}`, 'error');
        }
      },
    },
    {
      id: 'ai-list-providers',
      label: 'AI: List Providers',
      action: async () => {
        try {
          const providers = await ai.getProviders();
          if (providers.length === 0) {
            toast('No AI providers registered.', 'info');
          } else {
            toast(`Providers: ${providers.join(', ')}`, 'info', 5000);
          }
        } catch (err) {
          toast(`Failed to list providers: ${err}`, 'error');
        }
      },
    },
  ], [toast, t]);

  const handleSplashExit = useCallback(() => setSplashDismissed(true), []);

  return (
    <>
      {!splashDismissed && (
        <SplashScreen
          appName={appName}
          version={appVersion}
          tagline={branding.tagline}
          logoSrc={branding.logo || undefined}
          backgroundSrc={branding.splashBackground || undefined}
          statusText={splashStatus}
          ready={appReady}
          onExit={handleSplashExit}
        />
      )}
      {firstRunLoaded && isFirstRun && splashDismissed && (
        <WelcomeOverlay onDismiss={dismissFirstRun} />
      )}
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <PanelLayout
        leftLabel={t('panel.left')}
        centerLabel={t('panel.center')}
        rightLabel={t('panel.right')}
        bottomLabel={t('panel.bottom')}
        leftPanel={
          <div onContextMenu={(e) => showContextMenu(e, leftPanelMenuItems)} style={{ height: '100%' }}>
            <PlaceholderContent label="" />
          </div>
        }
        centerPanel={
          // Render different content based on activeTab:
          // activeTab === 'workspace-1' ? <WorkspaceOne /> :
          // activeTab === 'workspace-2' ? <WorkspaceTwo /> :
          // <WorkspaceThree />
          <div onContextMenu={(e) => showContextMenu(e, editMenuItems)} style={{ height: '100%' }}>
            <PlaceholderContent label="" />
          </div>
        }
        rightPanel={
          <div onContextMenu={(e) => showContextMenu(e, rightPanelMenuItems)} style={{ height: '100%' }}>
            <PlaceholderContent label="" />
          </div>
        }
        bottomPanel={
          <div onContextMenu={(e) => showContextMenu(e, editMenuItems)} style={{ height: '100%' }}>
            <PlaceholderContent label="" />
          </div>
        }
        leftWidth={240}
        rightWidth={240}
        bottomHeight={180}
      />
      {showStatusBar && (
        <StatusBar
          statusText={statusText}
          rightContent={
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{appVersion}</span>
          }
        />
      )}
      <ToastContainer />
      <CommandPalette
        commands={commands}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        placeholder={t('command.searchPlaceholder')}
        noResultsText={t('command.noResults')}
      />
      <ContextMenu menu={contextMenu} onClose={hideContextMenu} />
      <DropOverlay visible={isDragging} message={t('drop.message')} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <UpdateDialog open={updateOpen} onClose={() => setUpdateOpen(false)} />
      <LogViewer open={logsOpen} onClose={() => setLogsOpen(false)} />
      <WhatsNewDialog open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
    </>
  );
}

export default function App() {
  return <AppInner />;
}
