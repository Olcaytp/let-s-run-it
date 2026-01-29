import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, TrendingUp, DollarSign, Shield, ShieldCheck } from 'lucide-react';
import { NEED_CATEGORIES, NEED_STATUS } from '@/lib/constants';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  building_name: string | null;
  apartment_number: string | null;
  created_at: string;
}

interface Need {
  id: string;
  title: string;
  category: string;
  status: string;
  budget_amount: number | null;
  budget_currency: string;
  user_id: string;
  created_at: string;
}

interface Commission {
  id: string;
  need_id: string | null;
  original_amount: number;
  commission_amount: number;
  commission_rate: number;
  currency: string;
  status: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [profilesRes, needsRes, commissionsRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('needs').select('*').order('created_at', { ascending: false }),
        supabase.from('commissions').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*').order('created_at', { ascending: false }),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (needsRes.data) setNeeds(needsRes.data);
      if (commissionsRes.data) setCommissions(commissionsRes.data);
      if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: 'admin' | 'user') => {
    try {
      if (currentRole === 'admin') {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
        toast.success('Admin rolü kaldırıldı');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
        toast.success('Admin rolü eklendi');
      }
      fetchAllData();
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error('Rol değiştirilemedi');
    }
  };

  const getUserRole = (userId: string): 'admin' | 'user' => {
    const adminRole = userRoles.find(r => r.user_id === userId && r.role === 'admin');
    return adminRole ? 'admin' : 'user';
  };

  // Stats calculations
  const totalUsers = profiles.length;
  const totalNeeds = needs.length;
  const openNeeds = needs.filter(n => n.status === 'open').length;
  const completedNeeds = needs.filter(n => n.status === 'completed').length;
  const totalCommissions = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const pendingCommissions = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);
  const completedCommissions = commissions.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.commission_amount, 0);

  if (adminLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İhtiyaç</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNeeds}</div>
              <p className="text-xs text-muted-foreground">
                {openNeeds} açık, {completedNeeds} tamamlandı
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Komisyon</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCommissions.toFixed(2)} SEK</div>
              <p className="text-xs text-muted-foreground">
                %10 komisyon oranı
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen Komisyon</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCommissions.toFixed(2)} SEK</div>
              <p className="text-xs text-muted-foreground">
                {completedCommissions.toFixed(2)} SEK tamamlandı
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="needs">İhtiyaçlar</TabsTrigger>
            <TabsTrigger value="commissions">Komisyonlar</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Tüm Kullanıcılar</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>İsim</TableHead>
                        <TableHead>Telefon</TableHead>
                        <TableHead>Bina</TableHead>
                        <TableHead>Daire</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map(profile => {
                        const role = getUserRole(profile.user_id);
                        const isCurrentUser = profile.user_id === user?.id;
                        return (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.full_name}</TableCell>
                            <TableCell>{profile.phone || '-'}</TableCell>
                            <TableCell>{profile.building_name || '-'}</TableCell>
                            <TableCell>{profile.apartment_number || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                                {role === 'admin' ? 'Admin' : 'Kullanıcı'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(profile.created_at), 'dd MMM yyyy', { locale: sv })}
                            </TableCell>
                            <TableCell>
                              {!isCurrentUser && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAdminRole(profile.user_id, role)}
                                >
                                  {role === 'admin' ? (
                                    <>
                                      <Shield className="h-4 w-4 mr-1" />
                                      Admin Kaldır
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="h-4 w-4 mr-1" />
                                      Admin Yap
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="needs">
            <Card>
              <CardHeader>
                <CardTitle>Tüm İhtiyaçlar</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Başlık</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Bütçe</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {needs.map(need => (
                        <TableRow key={need.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/needs/${need.id}`)}>
                          <TableCell className="font-medium">{need.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {NEED_CATEGORIES[need.category as keyof typeof NEED_CATEGORIES]?.label || need.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={need.status === 'completed' ? 'default' : 'secondary'}>
                              {NEED_STATUS[need.status as keyof typeof NEED_STATUS]?.label || need.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {need.budget_amount ? `${need.budget_amount} ${need.budget_currency}` : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(need.created_at), 'dd MMM yyyy', { locale: sv })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Komisyon Geçmişi</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64" />
                ) : commissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz komisyon kaydı bulunmuyor
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Orijinal Tutar</TableHead>
                        <TableHead>Komisyon (%10)</TableHead>
                        <TableHead>Para Birimi</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map(commission => (
                        <TableRow key={commission.id}>
                          <TableCell>{commission.original_amount.toFixed(2)}</TableCell>
                          <TableCell className="font-medium text-primary">
                            {commission.commission_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>{commission.currency}</TableCell>
                          <TableCell>
                            <Badge variant={commission.status === 'completed' ? 'default' : 'secondary'}>
                              {commission.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(commission.created_at), 'dd MMM yyyy HH:mm', { locale: sv })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
