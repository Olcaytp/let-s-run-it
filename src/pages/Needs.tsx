import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { NeedCard } from '@/components/needs/NeedCard';
import { CategoryFilter } from '@/components/needs/CategoryFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NeedCategory } from '@/lib/constants';
import { Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NeedWithProfile {
  id: string;
  title: string;
  description: string;
  category: NeedCategory;
  status: 'open' | 'pending_helper_contact' | 'pending_requester_contact' | 'in_progress' | 'completed' | 'cancelled';
  budget_amount: number | null;
  budget_currency: string;
  location: string | null;
  needed_by: string | null;
  created_at: string;
  user_id: string;
  userName: string;
}

export default function Needs() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [needs, setNeeds] = useState<NeedWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NeedCategory | 'all'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchNeeds();
    }
  }, [user]);

  const fetchNeeds = async () => {
    setLoading(true);
    
    // Fetch needs
    const { data: needsData, error: needsError } = await supabase
      .from('needs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (needsError) {
      toast.error('Kunde inte hämta behov');
      console.error(needsError);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(needsData.map(n => n.user_id))];
    
    // Fetch profiles for those users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

    // Combine data
    const needsWithProfiles: NeedWithProfile[] = needsData.map(need => ({
      ...need,
      userName: profilesMap.get(need.user_id) || 'Okänd',
    }));

    setNeeds(needsWithProfiles);
    setLoading(false);
  };

  const filteredNeeds = needs.filter((need) => {
    const matchesSearch =
      need.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      need.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || need.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Behov i ditt område</h1>
            <p className="text-muted-foreground mt-1">
              Hjälp dina grannar med deras behov
            </p>
          </div>
          <Button onClick={() => navigate('/needs/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Skapa behov
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök behov..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredNeeds.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <p className="text-muted-foreground text-lg">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Inga behov matchar din sökning'
                  : 'Inga behov just nu. Var först att skapa ett!'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={() => navigate('/needs/create')} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Skapa behov
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNeeds.map((need) => (
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
                  userName={need.userName}
                  isOwn={need.user_id === user.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
