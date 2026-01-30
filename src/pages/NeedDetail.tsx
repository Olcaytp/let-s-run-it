import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NEED_CATEGORIES, NEED_STATUS, NeedCategory, NeedStatus } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowLeft, Calendar, MapPin, Coins, Check, Loader2, Phone, MessageSquare, CreditCard } from 'lucide-react';
import * as Icons from 'lucide-react';

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
  ownerName: string;
  ownerPhone: string | null;
  ownerApartment: string | null;
}

interface HelpOfferWithProfile {
  id: string;
  need_id: string;
  helper_user_id: string;
  message: string | null;
  requester_approved: boolean;
  helper_approved: boolean;
  created_at: string;
  helperName: string;
  helperPhone: string | null;
  helperApartment: string | null;
}

export default function NeedDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [need, setNeed] = useState<NeedWithProfile | null>(null);
  const [offers, setOffers] = useState<HelpOfferWithProfile[]>([]);
  const [myOffer, setMyOffer] = useState<HelpOfferWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerMessage, setOfferMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [myProfile, setMyProfile] = useState<{ phone: string | null; apartment_number: string | null } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchNeed();
      fetchOffers();
      fetchMyProfile();
    }
  }, [user, id]);

  const fetchMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('phone, apartment_number')
      .eq('user_id', user.id)
      .maybeSingle();
    setMyProfile(data);
  };

  const fetchNeed = async () => {
    if (!id) return;
    
    const { data: needData, error: needError } = await supabase
      .from('needs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (needError || !needData) {
      toast.error('Kunde inte hämta behov');
      navigate('/needs');
      return;
    }

    // Fetch owner profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone, apartment_number')
      .eq('user_id', needData.user_id)
      .maybeSingle();

    setNeed({
      ...needData,
      ownerName: profileData?.full_name || 'Okänd',
      ownerPhone: profileData?.phone || null,
      ownerApartment: profileData?.apartment_number || null,
    });
    setLoading(false);
  };

  const fetchOffers = async () => {
    if (!id || !user) return;

    const { data: offersData, error: offersError } = await supabase
      .from('help_offers')
      .select('*')
      .eq('need_id', id);

    if (offersError || !offersData) {
      return;
    }

    // Get unique helper IDs
    const helperIds = [...new Set(offersData.map(o => o.helper_user_id))];
    
    // Fetch profiles for helpers
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone, apartment_number')
      .in('user_id', helperIds);

    const profilesMap = new Map(
      profilesData?.map(p => [p.user_id, { name: p.full_name, phone: p.phone, apartment: p.apartment_number }]) || []
    );

    const offersWithProfiles: HelpOfferWithProfile[] = offersData.map(offer => {
      const profile = profilesMap.get(offer.helper_user_id);
      return {
        ...offer,
        helperName: profile?.name || 'Okänd',
        helperPhone: profile?.phone || null,
        helperApartment: profile?.apartment || null,
      };
    });

    setOffers(offersWithProfiles);
    const mine = offersWithProfiles.find((o) => o.helper_user_id === user.id);
    setMyOffer(mine || null);
  };

  const handleOfferHelp = async () => {
    if (!user || !id) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('help_offers').insert({
      need_id: id,
      helper_user_id: user.id,
      message: offerMessage || null,
      helper_approved: true,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Kunde inte skicka erbjudande');
      console.error(error);
      return;
    }

    toast.success('Erbjudande skickat!');
    setShowOfferDialog(false);
    setOfferMessage('');
    fetchOffers();
  };

  const handleApproveOffer = async (offerId: string) => {
    const { error } = await supabase
      .from('help_offers')
      .update({ requester_approved: true })
      .eq('id', offerId);

    if (error) {
      toast.error('Kunde inte godkänna erbjudande');
      return;
    }

    toast.success('Erbjudande godkänt! Du kan nu se kontaktuppgifter.');
    fetchOffers();
  };

  const handleApproveFromHelper = async () => {
    if (!myOffer) return;

    const { error } = await supabase
      .from('help_offers')
      .update({ helper_approved: true })
      .eq('id', myOffer.id);

    if (error) {
      toast.error('Kunde inte bekräfta');
      return;
    }

    toast.success('Du har bekräftat! Du kan nu se kontaktuppgifter.');
    fetchOffers();
  };

  const handlePayment = async (offerId: string) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: { need_id: id, help_offer_id: offerId }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Kunde inte starta betalning');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!need) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Behov hittades inte</p>
        </div>
      </Layout>
    );
  }

  const isOwner = need.user_id === user.id;
  const categoryInfo = NEED_CATEGORIES[need.category] || NEED_CATEGORIES.other;
  const statusInfo = NEED_STATUS[need.status] || NEED_STATUS.open;
  const IconComponent = (Icons as any)[categoryInfo.icon] || Icons.HelpCircle;

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'success': return 'bg-success/10 text-success border-success/20';
      case 'warning': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'primary': return 'bg-primary/10 text-primary border-primary/20';
      case 'destructive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const canShowContact = (offer: HelpOfferWithProfile) => 
    offer.requester_approved && offer.helper_approved;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/needs')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{need.title}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {categoryInfo.label}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-foreground leading-relaxed">{need.description}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {need.budget_amount && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                      <Coins className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-semibold text-success">
                          {need.budget_amount} {need.budget_currency}
                        </p>
                      </div>
                    </div>
                  )}
                  {need.location && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Plats</p>
                        <p className="font-medium">{need.location}</p>
                      </div>
                    </div>
                  )}
                  {need.needed_by && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Behövs senast</p>
                        <p className="font-medium">
                          {format(new Date(need.needed_by), 'PPP', { locale: sv })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offers section for owner */}
            {isOwner && offers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Erbjudanden ({offers.length})</CardTitle>
                  <CardDescription>
                    Grannar som vill hjälpa dig
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-lg border bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {offer.helperName?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{offer.helperName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(offer.created_at), 'PPP', { locale: sv })}
                            </p>
                          </div>
                        </div>
                        {!offer.requester_approved ? (
                          <Button
                            size="sm"
                            onClick={() => handleApproveOffer(offer.id)}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Godkänn
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            Godkänd
                          </Badge>
                        )}
                      </div>

                      {offer.message && (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          <MessageSquare className="h-4 w-4 inline mr-2" />
                          {offer.message}
                        </p>
                      )}

                      {canShowContact(offer) && (
                        <div className="p-3 rounded-lg bg-success/10 border border-success/20 space-y-2">
                          <p className="text-sm font-medium text-success">Kontaktuppgifter</p>
                          {offer.helperPhone && (
                            <p className="text-sm flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {offer.helperPhone}
                            </p>
                          )}
                          {offer.helperApartment && (
                            <p className="text-sm flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Lägenhet: {offer.helperApartment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Payment button when both approved */}
                      {canShowContact(offer) && need.budget_amount && need.status !== 'completed' && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => handlePayment(offer.id)}
                        >
                          <CreditCard className="h-4 w-4" />
                          Betala {need.budget_amount} {need.budget_currency} (inkl. 10% serviceavgift)
                        </Button>
                      )}

                      {offer.requester_approved && !offer.helper_approved && (
                        <p className="text-sm text-warning">
                          Väntar på att hjälparen bekräftar...
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skapad av</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {need.ownerName?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{need.ownerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(need.created_at), 'PPP', { locale: sv })}
                    </p>
                  </div>
                </div>

                {myOffer && canShowContact(myOffer) && (
                  <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 space-y-2">
                    <p className="text-sm font-medium text-success">Kontaktuppgifter</p>
                    {need.ownerPhone && (
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {need.ownerPhone}
                      </p>
                    )}
                    {need.ownerApartment && (
                      <p className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Lägenhet: {need.ownerApartment}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isOwner && need.status === 'open' && (
              <Card>
                <CardContent className="pt-6">
                  {myOffer ? (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <Check className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="font-medium">Du har erbjudit din hjälp</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {myOffer.requester_approved
                            ? 'Ägaren har godkänt ditt erbjudande!'
                            : 'Väntar på godkännande...'}
                        </p>
                      </div>

                      {myOffer.requester_approved && !myOffer.helper_approved && (
                        <Button
                          className="w-full"
                          onClick={handleApproveFromHelper}
                        >
                          Bekräfta för att se kontaktuppgifter
                        </Button>
                      )}
                    </div>
                  ) : !myProfile?.phone || !myProfile?.apartment_number ? (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="font-medium text-warning-foreground">Profil ofullständig</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Du måste fylla i telefonnummer och lägenhetsnummer innan du kan erbjuda hjälp.
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => navigate('/profile')}
                      >
                        Gå till profil
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          Erbjud din hjälp
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Erbjud din hjälp</DialogTitle>
                          <DialogDescription>
                            Skriv ett meddelande till {need.ownerName || 'ägaren'} om hur du kan hjälpa.
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          placeholder="Hej! Jag kan hjälpa dig med..."
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowOfferDialog(false)}
                          >
                            Avbryt
                          </Button>
                          <Button
                            onClick={handleOfferHelp}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Skickar...
                              </>
                            ) : (
                              'Skicka erbjudande'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
