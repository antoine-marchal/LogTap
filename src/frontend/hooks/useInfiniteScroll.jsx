/**
 * Infinite scroll hook using Intersection Observer
 */
function useInfiniteScroll(callback, hasMore) {
  const observer = React.useRef(null);

  const sentinelRef = React.useCallback(node => {
    if (observer.current) observer.current.disconnect();
    if (!hasMore) return;

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) callback();
    }, { threshold: 0.1 });

    if (node) observer.current.observe(node);
  }, [callback, hasMore]);

  return sentinelRef;
}

window.useInfiniteScroll = useInfiniteScroll;
