import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, Coins } from 'lucide-react';
import { NEED_CATEGORIES, NEED_STATUS, NeedCategory, NeedStatus } from '@/lib/constants';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface NeedCardProps {
  id: string;
  title: string;
  description: string;
  category: NeedCategory;
  status: NeedStatus;
  budgetAmount?: number | null;
  budgetCurrency: string;
  location?: string | null;
  neededBy?: string | null;
  createdAt: string;
  userName: string;
  isOwn?: boolean;
}

export function NeedCard({
  id,
  title,
  description,
  category,
  status,
  budgetAmount,
  budgetCurrency,
  location,
  neededBy,
  createdAt,
  userName,
  isOwn = false,
}: NeedCardProps) {
  const navigate = useNavigate();
  const categoryInfo = NEED_CATEGORIES[category] || NEED_CATEGORIES.other;
  const statusInfo = NEED_STATUS[status] || NEED_STATUS.open;
  
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">{categoryInfo.label}</p>
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(statusInfo.color)}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

        <div className="flex flex-wrap gap-3 text-sm">
          {budgetAmount && (
            <div className="flex items-center gap-1.5 text-success">
              <Coins className="h-4 w-4" />
              <span className="font-medium">{budgetAmount} {budgetCurrency}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
          {neededBy && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(neededBy), 'PPP', { locale: sv })}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-muted">
              {userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {isOwn ? 'Du' : userName}
          </span>
        </div>
        <Button
          variant={isOwn ? 'outline' : 'default'}
          size="sm"
          onClick={() => navigate(`/needs/${id}`)}
        >
          {isOwn ? 'Visa detaljer' : 'Erbjud hjälp'}
        </Button>
      </CardFooter>
    </Card>
  );
}
