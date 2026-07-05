import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/Card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-lg mx-4">
        <CardBody className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Page non trouvée
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Désolé, la page que vous recherchez n'existe pas.
            <br />
            Elle a peut-être été déplacée ou supprimée.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
