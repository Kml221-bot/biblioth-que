import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SpeechProvider } from "./contexts/SpeechContext";
import { NetworkIndicator } from "./components/features/NetworkIndicator";
import { InstallPWA } from "./components/features/InstallPWA";
import { FloatingAudioPlayer } from "./components/features/FloatingAudioPlayer";
import Home from "@/pages/Home";

const NotFound = lazy(() => import("@/pages/NotFound"));
const AuthPage = lazy(() => import("@/pages/auth/AuthPage"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const Catalogue = lazy(() => import("@/pages/dashboard/Catalogue"));
const Emprunts = lazy(() => import("@/pages/dashboard/Emprunts"));
const Historique = lazy(() => import("@/pages/dashboard/Historique"));
const Profil = lazy(() => import("@/pages/dashboard/Profil"));
const Recommandations = lazy(() => import("@/pages/dashboard/Recommandations"));
const ReadingMode = lazy(() => import("@/pages/dashboard/ReadingMode"));
const AIPage = lazy(() => import("@/pages/dashboard/AIPage"));
const QuizPage = lazy(() => import("@/pages/dashboard/QuizPage"));
const About = lazy(() => import("@/pages/About"));
const Blog = lazy(() => import("@/pages/Blog"));
const Contact = lazy(() => import("@/pages/Contact"));
const Features = lazy(() => import("@/pages/Features"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Security = lazy(() => import("@/pages/Security"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Cookies = lazy(() => import("@/pages/Cookies"));
const AdminPanel = lazy(() => import("@/pages/dashboard/admin/AdminPanel"));
const Marketplace = lazy(() => import("@/pages/dashboard/Marketplace"));
const Communautes = lazy(() => import("@/pages/dashboard/Communautes"));
const Classement    = lazy(() => import("@/pages/dashboard/Classement"));
const CoinShop      = lazy(() => import("@/pages/dashboard/CoinShop"));
const Abonnements   = lazy(() => import("@/pages/dashboard/Abonnements"));
const OfflineLibrary  = lazy(() => import("@/pages/dashboard/OfflineLibrary"));
const AuthorSpace     = lazy(() => import("@/pages/dashboard/AuthorSpace"));
const AuthorDashboard = lazy(() => import("@/pages/dashboard/AuthorDashboard"));


function Router() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={AuthPage} />
        <Route path="/register" component={AuthPage} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/catalogue" component={Catalogue} />
        <Route path="/emprunts" component={Emprunts} />
        <Route path="/historique" component={Historique} />
        <Route path="/profil" component={Profil} />
        <Route path="/recommandations" component={Recommandations} />
        <Route path="/lecture" component={ReadingMode} />
        <Route path="/bibliai" component={AIPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/about" component={About} />
        <Route path="/blog" component={Blog} />
        <Route path="/contact" component={Contact} />
        <Route path="/features" component={Features} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/security" component={Security} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/cookies" component={Cookies} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/communautes" component={Communautes} />
        <Route path="/classement" component={Classement} />
        <Route path="/coins" component={CoinShop} />
        <Route path="/abonnements" component={Abonnements} />
        <Route path="/hors-ligne" component={OfflineLibrary} />
        <Route path="/auteur" component={AuthorSpace} />
        <Route path="/auteur/dashboard" component={AuthorDashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <SpeechProvider>
            <TooltipProvider>
              <Toaster />
              <NetworkIndicator />
              <InstallPWA />
              <Router />
              <FloatingAudioPlayer />
            </TooltipProvider>
          </SpeechProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
