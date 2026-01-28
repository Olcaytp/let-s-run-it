import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { HandHeart, Users, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/needs');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    {
      icon: HandHeart,
      title: 'Dela dina behov',
      description: 'Skapa en förfrågan om hjälp och låt dina grannar veta vad du behöver.',
    },
    {
      icon: Users,
      title: 'Hitta hjälpare',
      description: 'Grannar som vill hjälpa kan erbjuda sin assistans direkt.',
    },
    {
      icon: Shield,
      title: 'Säker kontakt',
      description: 'Kontaktuppgifter delas endast när båda parter godkänner.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-sm font-medium text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              För grannskap i Sverige
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Hjälp dina grannar,
              <span className="text-gradient block">stärk ditt område</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              GrannHjälp kopplar samman boende i ditt område. Dela dina behov, 
              erbjud din hjälp och bygg ett starkare grannskap tillsammans.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')} className="gap-2 text-lg px-8">
                Kom igång
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8">
                Logga in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Så fungerar det</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Enkelt, säkert och byggt för att stärka gemenskapen i ditt bostadsområde.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-8 shadow-sm border hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="gradient-primary rounded-xl p-4 w-fit mb-6">
                  <feature.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="gradient-primary rounded-3xl p-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">
              Redo att hjälpa dina grannar?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Gå med tusentals boende som redan använder GrannHjälp för att skapa 
              ett tryggare och mer sammanhållet bostadsområde.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/auth')}
              className="gap-2 text-lg px-8"
            >
              Skapa konto gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <HandHeart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">GrannHjälp</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 GrannHjälp. Hjälp dina grannar, stärk ditt område.
          </p>
        </div>
      </footer>
    </div>
  );
}
