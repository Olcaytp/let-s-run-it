export const NEED_CATEGORIES = {
  cleaning: { label: 'Städning', icon: 'Sparkles' },
  moving: { label: 'Flytt', icon: 'Truck' },
  pet_care: { label: 'Djurpassning', icon: 'PawPrint' },
  childcare: { label: 'Barnpassning', icon: 'Baby' },
  shopping: { label: 'Handla', icon: 'ShoppingBag' },
  repairs: { label: 'Reparationer', icon: 'Wrench' },
  gardening: { label: 'Trädgård', icon: 'Flower2' },
  cooking: { label: 'Matlagning', icon: 'ChefHat' },
  transportation: { label: 'Transport', icon: 'Car' },
  tutoring: { label: 'Läxhjälp', icon: 'GraduationCap' },
  technology: { label: 'Teknik', icon: 'Laptop' },
  other: { label: 'Övrigt', icon: 'HelpCircle' },
} as const;

export const NEED_STATUS = {
  open: { label: 'Öppen', color: 'success' },
  pending_helper_contact: { label: 'Väntar på hjälpare', color: 'warning' },
  pending_requester_contact: { label: 'Väntar på dig', color: 'warning' },
  in_progress: { label: 'Pågår', color: 'primary' },
  completed: { label: 'Avslutad', color: 'muted' },
  cancelled: { label: 'Avbruten', color: 'destructive' },
} as const;

export type NeedCategory = keyof typeof NEED_CATEGORIES;
export type NeedStatus = keyof typeof NEED_STATUS;
