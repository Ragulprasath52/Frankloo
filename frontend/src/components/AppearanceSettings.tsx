import { useStore } from '../store/useStore';
import { Sun, Moon, Monitor, Check, Palette, Layers, Sparkles, Zap } from 'lucide-react';

export default function AppearanceSettings() {
  const { theme, setTheme } = useStore();

  const themes = [
    {
      id: 'light' as const,
      label: 'Light',
      description: 'Clean, professional light interface.',
      icon: Sun,
      preview: {
        bg: '#f6f8fa',
        surface: '#ffffff',
        sidebar: '#1b1f23',
        accent: '#0969da',
        text: '#0d1117',
        border: '#d0d7de',
      },
    },
    {
      id: 'dark' as const,
      label: 'Dark',
      description: 'High-contrast dark interface.',
      icon: Moon,
      preview: {
        bg: '#0d1117',
        surface: '#161b22',
        sidebar: '#161b22',
        accent: '#388bfd',
        text: '#e6edf3',
        border: '#30363d',
      },
    },
  ];

  const features = [
    {
      icon: Layers,
      title: 'Dynamic Board Cards',
      desc: 'Large, colorful board thumbnails with gradient covers and smooth hover animations.',
    },
    {
      icon: Sparkles,
      title: 'Vibrant Color System',
      desc: '10 curated board gradient presets. Each board feels visually distinct.',
    },
    {
      icon: Zap,
      title: 'Smooth Interactions',
      desc: 'Carefully tuned micro-animations with cubic-bezier easing throughout the UI.',
    },
    {
      icon: Monitor,
      title: 'WCAG AA Accessible',
      desc: 'All text/background combinations meet WCAG AA contrast ratio standards.',
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-1"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          <Palette className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Appearance
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Choose between Light and Dark mode. Your preference is saved and persists across sessions.
        </p>
      </div>

      {/* Theme Selector */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Color Mode
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            const p = t.preview;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="relative text-left rounded-xl p-5 transition-all group"
                style={{
                  background: 'var(--bg-surface)',
                  border: active ? `2px solid var(--accent)` : `1px solid var(--border)`,
                  boxShadow: active ? '0 0 0 3px var(--accent-muted)' : 'var(--shadow-sm)',
                }}
              >
                {/* Active checkmark */}
                {active && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}>
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}

                {/* Mini preview */}
                <div className="w-full h-28 rounded-lg mb-4 overflow-hidden flex"
                  style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                  {/* Sidebar strip */}
                  <div className="w-12 h-full flex flex-col p-1.5 gap-1.5"
                    style={{ background: p.sidebar }}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-2 rounded"
                        style={{ background: i === 0 ? p.accent : 'rgba(255,255,255,0.15)', width: i === 0 ? '80%' : '65%', opacity: i === 0 ? 1 : 0.6 }} />
                    ))}
                  </div>
                  {/* Main area */}
                  <div className="flex-1 p-2 flex flex-col gap-2">
                    {/* Header bar */}
                    <div className="h-5 rounded" style={{ background: p.surface, border: `1px solid ${p.border}` }} />
                    {/* Cards */}
                    <div className="flex gap-1.5 flex-1">
                      {[p.accent, 'hsl(320,70%,55%)', 'hsl(152,60%,40%)'].map((c, i) => (
                        <div key={i} className="flex-1 rounded"
                          style={{ background: `linear-gradient(135deg, ${c}cc, ${c}88)` }} />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-5 rounded flex-1"
                          style={{ background: p.surface, border: `1px solid ${p.border}` }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label} Mode</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Design Language Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Visual Design Language
        </h3>
        <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <Layers className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Modern Kanban Interface</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied across the entire application</p>
            </div>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
              Active
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            Frankloo uses a modern Kanban visual language — colorful board covers, rounded cards with elevation,
            clean spacing, and smooth interactions. This design layer is always active and works with both Light and Dark modes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-muted)' }}>
                    <FIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                    <p className="text-[0.6875rem] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessibility note */}
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'var(--success-subtle)', border: '1px solid var(--success)', borderColor: `${theme === 'dark' ? 'rgba(63,185,80,0.3)' : '#1a7f3730'}` }}>
          <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>WCAG AA Compliant</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              All color combinations in both Light and Dark modes meet WCAG AA contrast ratio standards (≥4.5:1 for normal text, ≥3:1 for large text).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
