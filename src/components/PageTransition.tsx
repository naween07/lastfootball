import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setIsTransitioning(true);
      requestAnimationFrame(() => {
        setDisplayChildren(children);
        setIsTransitioning(false);
      });
    } else {
      setDisplayChildren(children);
    }
  }, [children, location.pathname]);

  return (
    <div
      className={`transition-opacity duration-150 ease-out ${
        isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
      style={{ willChange: 'opacity, transform', transition: 'opacity 150ms ease-out, transform 150ms ease-out' }}
    >
      {displayChildren}
    </div>
  );
}
