import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomTabBar from "@/components/BottomTabBar";
import Index from "./pages/Index";
import Fixtures from "./pages/Fixtures";
import MatchDetail from "./pages/MatchDetail";
import Favorites from "./pages/Favorites";
import SearchPage from "./pages/SearchPage";
import Stats from "./pages/Stats";
import News from "./pages/News";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <div className="pb-14 md:pb-0">
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
        </div>
        <BottomTabBar />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
