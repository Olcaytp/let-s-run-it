import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NEED_CATEGORIES, NeedCategory } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarIcon, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';

const createNeedSchema = z.object({
  title: z.string().min(5, 'Titel måste vara minst 5 tecken').max(100, 'Titel kan vara max 100 tecken'),
  description: z.string().min(20, 'Beskrivning måste vara minst 20 tecken').max(1000, 'Beskrivning kan vara max 1000 tecken'),
  category: z.enum(['cleaning', 'moving', 'pet_care', 'childcare', 'shopping', 'repairs', 'gardening', 'cooking', 'transportation', 'tutoring', 'technology', 'other'] as const),
  budgetAmount: z.string().optional(),
  location: z.string().max(100, 'Plats kan vara max 100 tecken').optional(),
  neededBy: z.date().optional(),
});

type CreateNeedFormData = z.infer<typeof createNeedSchema>;

export default function CreateNeed() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const form = useForm<CreateNeedFormData>({
    resolver: zodResolver(createNeedSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'other',
      budgetAmount: '',
      location: '',
    },
  });

  const handleSubmit = async (data: CreateNeedFormData) => {
    if (!user) return;

    setIsLoading(true);
    const { error } = await supabase.from('needs').insert({
      user_id: user.id,
      title: data.title,
      description: data.description,
      category: data.category,
      budget_amount: data.budgetAmount ? parseFloat(data.budgetAmount) : null,
      location: data.location || null,
      needed_by: data.neededBy ? format(data.neededBy, 'yyyy-MM-dd') : null,
    });

    setIsLoading(false);

    if (error) {
      toast.error('Kunde inte skapa behov. Försök igen.');
      console.error(error);
      return;
    }

    toast.success('Behov skapat!');
    navigate('/needs');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/needs')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Skapa nytt behov</CardTitle>
            <CardDescription>
              Beskriv vad du behöver hjälp med så kan dina grannar erbjuda sin hjälp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel *</FormLabel>
                      <FormControl>
                        <Input placeholder="t.ex. Behöver hjälp med flytt" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.entries(NEED_CATEGORIES) as [NeedCategory, typeof NEED_CATEGORIES[NeedCategory]][]).map(
                            ([key, value]) => {
                              const IconComponent = (Icons as any)[value.icon] || Icons.HelpCircle;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    {value.label}
                                  </div>
                                </SelectItem>
                              );
                            }
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beskriv vad du behöver hjälp med, när, var och andra viktiga detaljer..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Minst 20 tecken. Ju mer detaljer, desto lättare är det för andra att hjälpa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budgetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (SEK)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="t.ex. 200"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Hur mycket kan du betala för hjälpen?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plats</FormLabel>
                        <FormControl>
                          <Input placeholder="t.ex. Hus B, våning 3" {...field} />
                        </FormControl>
                        <FormDescription>
                          Var behövs hjälpen?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="neededBy"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Behövs senast</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: sv })
                              ) : (
                                'Välj datum'
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            locale={sv}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        När behöver du senast hjälpen?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/needs')}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Skapar...
                      </>
                    ) : (
                      'Skapa behov'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
