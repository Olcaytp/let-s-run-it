import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, CreditCard, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Namn måste vara minst 2 tecken').max(100),
  phone: z.string().min(1, 'Telefonnummer krävs för att kunna hjälpa och ta emot hjälp').max(20),
  apartmentNumber: z.string().min(1, 'Lägenhetsnummer krävs').max(20),
  buildingName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  apartment_number: string | null;
  building_name: string | null;
  bio: string | null;
}

interface ConnectStatus {
  has_account: boolean;
  onboarding_complete: boolean;
  can_receive_payments: boolean;
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      apartmentNumber: '',
      buildingName: '',
      bio: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkConnectStatus();
    }
  }, [user]);

  // Check for connect return URL parameters
  useEffect(() => {
    const connectParam = searchParams.get('connect');
    if (connectParam === 'success') {
      toast.success('Banka anslutning lyckades! Kontrollerar status...');
      checkConnectStatus();
      // Clean up URL
      navigate('/profile', { replace: true });
    } else if (connectParam === 'refresh') {
      toast.info('Du måste slutföra anslutningen.');
      navigate('/profile', { replace: true });
    }
  }, [searchParams, navigate]);

  const checkConnectStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) {
        console.error('Error checking connect status:', error);
        return;
      }
      setConnectStatus(data);
    } catch (err) {
      console.error('Error checking connect status:', err);
    }
  };

  const handleConnectAccount = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) {
        toast.error('Kunde inte starta bankanslutning');
        console.error(error);
        return;
      }

      if (data.already_complete) {
        toast.success('Du har redan en kopplad bankuppgift!');
        checkConnectStatus();
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast.error('Ett fel uppstod');
      console.error(err);
    } finally {
      setConnectLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast.error('Kunde inte hämta profil');
      console.error(error);
    } else if (data) {
      setProfile(data);
      form.reset({
        fullName: data.full_name || '',
        phone: data.phone || '',
        apartmentNumber: data.apartment_number || '',
        buildingName: data.building_name || '',
        bio: data.bio || '',
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        apartment_number: data.apartmentNumber || null,
        building_name: data.buildingName || null,
        bio: data.bio || null,
      })
      .eq('user_id', user.id);

    setIsSaving(false);

    if (error) {
      toast.error('Kunde inte spara profil');
      console.error(error);
      return;
    }

    toast.success('Profil uppdaterad!');
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {form.watch('fullName')?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">Min profil</CardTitle>
            <CardDescription>
              Uppdatera din information så att grannar kan kontakta dig
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fullständigt namn *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ditt namn" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefonnummer *</FormLabel>
                        <FormControl>
                          <Input placeholder="+46 70 123 45 67" {...field} />
                        </FormControl>
                        <FormDescription>
                          Visas endast för godkända hjälpare
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apartmentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lägenhetsnummer *</FormLabel>
                        <FormControl>
                          <Input placeholder="t.ex. 1204" {...field} />
                        </FormControl>
                        <FormDescription>
                          Hjälper grannar hitta dig
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="buildingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Byggnad / Område</FormLabel>
                      <FormControl>
                        <Input placeholder="t.ex. Hus B, Björkgatan 15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Om mig</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Berätta lite om dig själv..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Max 500 tecken
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    'Spara profil'
                  )}
                </Button>
              </form>
            </Form>

            <Separator className="my-8" />

            {/* Stripe Connect Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Betalningsinställningar</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Anslut ditt bankkonto för att ta emot betalningar när du hjälper grannar.
              </p>

              {connectStatus === null ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kontrollerar status...</span>
                </div>
              ) : connectStatus.onboarding_complete ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Bankkonto anslutet
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Du kan nu ta emot betalningar för dina hjälpinsatser.
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto border-green-600 text-green-600">
                    Aktiv
                  </Badge>
                </div>
              ) : connectStatus.has_account ? (
                <div className="flex flex-col gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Anslutning ej klar
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Du måste slutföra bankanslutningen för att kunna ta emot betalningar.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectAccount} 
                    disabled={connectLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {connectLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Laddar...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Slutför anslutning
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-muted rounded-lg border">
                  <p className="text-sm">
                    Genom att ansluta ditt bankkonto kan du ta emot betalningar direkt när du hjälper grannar. 
                    Plattformen tar 10% i serviceavgift.
                  </p>
                  <Button 
                    onClick={handleConnectAccount} 
                    disabled={connectLoading}
                    className="w-full"
                  >
                    {connectLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Laddar...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Anslut bankkonto
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
