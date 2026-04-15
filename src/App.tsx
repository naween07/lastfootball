import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomTabBar from "@/components/BottomTabBar";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Fixtures = lazy(() => import("./pages/Fixtures"));
const MatchDetail = lazy(() => import("./pages/MatchDetail"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Stats = lazy(() => import("./pages/Stats"));
const News = lazy(() => import("./pages/News"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <div className="pb-14 md:pb-0">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/match/:id" element={<MatchDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/news" element={<News />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
        <BottomTabBar />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
