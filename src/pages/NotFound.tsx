import { Link } from "react-router-dom";
import Header from "@/components/Header";
import BottomTabBar from "@/components/BottomTabBar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container flex flex-col items-center justify-center py-20 pb-28 text-center">
        <div className="text-8xl md:text-9xl font-black text-primary/20 tabular-nums leading-none select-none">
          4⚽4
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground mt-4">
          Offside! Page not found
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Looks like this page has been red-carded. Let's get you back in the game.
        </p>
        <div className="flex items-center gap-3 mt-8">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Live Scores
          </Link>
          <Link
            to="/fixtures"
            className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Fixtures
          </Link>
        </div>
      </main>
    </div>
  );
}
