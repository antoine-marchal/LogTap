/**
 * Scroll to Top Button Component
 */

function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const container = document.querySelector('.scroll-container');
    if (!container) return;

    const handleScroll = () => setVisible(container.scrollTop > 300);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    document.querySelector('.scroll-container')?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!visible) return null;

  return (
    <button
      className="btn btn-circle btn-primary fixed bottom-6 right-6 shadow-lg z-50"
      onClick={scrollToTop}
    >
      <ChevronUpIcon />
    </button>
  );
}

window.ScrollToTop = ScrollToTop;
