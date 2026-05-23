export type CalendarEvent = {
  id: string;
  subject: string;
  start: string;
  end: string;
  organizer?: {
    name?: string;
    email?: string;
  };
  location?: string;
  preparation_notes?: string[];
};
