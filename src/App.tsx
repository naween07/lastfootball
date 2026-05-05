import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomTabBar from "@/components/BottomTabBar";
import PageTransition from "@/components/PageTransition";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const HomePage = lazy(() => import("./pages/HomePage"));
const Index = lazy(() => import("./pages/Index"));
const Fixtures = lazy(() => import("./pages/Fixtures"));
const MatchDetail = lazy(() => import("./pages/MatchDetail"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Stats = lazy(() => import("./pages/Stats"));
const News = lazy(() => import("./pages/News"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const TeamProfile = lazy(() => import("./pages/TeamProfile"));
const PlayerCompare = lazy(() => import("./pages/PlayerCompare"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const WorldCup = lazy(() => import("./pages/WorldCup"));
const WCTeamPage = lazy(() => import("./pages/WCTeamPage"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Prefetch key pages after initial load so navigation feels instant
function usePrefetchPages() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefetch = () => {
      import("./pages/Fixtures");
      import("./pages/News");
      import("./pages/Stats");
      import("./pages/Favorites");
      import("./pages/SearchPage");
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      setTimeout(prefetch, 2000);
    }
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] bg-background">
    <Loader2 className="w-5 h-5 animate-spin text-primary" />
  </div>
);

function AppRoutes() {
  usePrefetchPages();

  return (
    <div className="pb-14 md:pb-0">
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/live" element={<Index />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/match/:id" element={<MatchDetail />} />
            <Route path="/team/:teamId" element={<TeamProfile />} />
            <Route path="/compare" element={<PlayerCompare />} />
            <Route path="/player/:playerId" element={<PlayerProfile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:slug" element={<ArticleDetail />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/worldcup" element={<WorldCup />} />
            <Route path="/worldcup/team/:code" element={<WCTeamPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </Suspense>
    </div>
  );
}

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <BottomTabBar />
      </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
