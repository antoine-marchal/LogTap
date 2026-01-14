/**
 * Theme management hook
 */
function useTheme() {
  const [theme, setTheme] = React.useState(() =>
    localStorage.getItem('logtap-theme') || 'dark'
  );

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('logtap-theme', theme);
  }, [theme]);

  return [theme, setTheme];
}

window.useTheme = useTheme;
