import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { NeedCard } from '@/components/needs/NeedCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NeedCategory, NeedStatus } from '@/lib/constants';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NeedWithProfile {
  id: string;
  title: string;
  description: string;
  category: NeedCategory;
  status: NeedStatus;
  budget_amount: number | null;
  budget_currency: string;
  location: string | null;
  needed_by: string | null;
  created_at: string;
  user_id: string;
  userName: string;
}

export default function MyNeeds() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [needs, setNeeds] = useState<NeedWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyNeeds();
    }
  }, [user]);

  const fetchMyNeeds = async () => {
    if (!user) return;

    setLoading(true);
    
    // Fetch needs
    const { data: needsData, error: needsError } = await supabase
      .from('needs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (needsError) {
      toast.error('Kunde inte hämta dina behov');
      console.error(needsError);
      setLoading(false);
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profileData?.full_name || 'Du';

    // Combine data
    const needsWithProfiles: NeedWithProfile[] = needsData.map(need => ({
      ...need,
      userName,
    }));

    setNeeds(needsWithProfiles);
    setLoading(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeNeeds = needs.filter((n) => ['open', 'pending_helper_contact', 'pending_requester_contact', 'in_progress'].includes(n.status));
  const completedNeeds = needs.filter((n) => ['completed', 'cancelled'].includes(n.status));

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mina behov</h1>
            <p className="text-muted-foreground mt-1">
              Hantera dina skapade behov
            </p>
          </div>
          <Button onClick={() => navigate('/needs/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Skapa behov
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : needs.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-2xl">
            <p className="text-muted-foreground text-lg mb-4">
              Du har inte skapat några behov än
            </p>
            <Button onClick={() => navigate('/needs/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Skapa ditt första behov
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                Aktiva ({activeNeeds.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Avslutade ({completedNeeds.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeNeeds.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">Inga aktiva behov</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeNeeds.map((need) => (
                    <NeedCard
                      key={need.id}
                      id={need.id}
                      title={need.title}
                      description={need.description}
                      category={need.category}
                      status={need.status}
                      budgetAmount={need.budget_amount}
                      budgetCurrency={need.budget_currency}
                      location={need.location}
                      neededBy={need.needed_by}
                      createdAt={need.created_at}
                      userName="Du"
                      isOwn
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedNeeds.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">Inga avslutade behov</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedNeeds.map((need) => (
                    <NeedCard
                      key={need.id}
                      id={need.id}
                      title={need.title}
                      description={need.description}
                      category={need.category}
                      status={need.status}
                      budgetAmount={need.budget_amount}
                      budgetCurrency={need.budget_currency}
                      location={need.location}
                      neededBy={need.needed_by}
                      createdAt={need.created_at}
                      userName="Du"
                      isOwn
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
