/**
 * Header Component with logo, title, and controls
 */

function ThemeSelector({ theme, setTheme }) {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <ThemeIcon />
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow">
        <li><button onClick={() => setTheme('light')}>Light</button></li>
        <li><button onClick={() => setTheme('dark')}>Dark</button></li>
      </ul>
    </div>
  );
}

function Header({ config, theme, setTheme, onRefresh }) {
  return (
    <div className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
      <div className="flex-1 gap-3">
        {config.LOGO && (
          <img src={config.LOGO} alt="LogTap" className="h-34 w-100 rounded" />
        )}        
      </div>
      <div className="flex-none gap-2">
        <span className="badge badge-ghost">v{config.VERSION}</span>
        <ThemeSelector theme={theme} setTheme={setTheme} />
        <button className="btn btn-ghost btn-circle" onClick={onRefresh} title="Refresh">
          <RefreshIcon />
        </button>
      </div>
    </div>
  );
}

window.ThemeSelector = ThemeSelector;
window.Header = Header;
