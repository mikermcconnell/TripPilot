import { Itinerary } from '@/types';

export const DEFAULT_ITINERARY: Itinerary = {
  title: "Paris Getaway",
  days: [
    {
      id: '1',
      dayNumber: 1,
      date: new Date().toISOString().split('T')[0],
      activities: [
        {
          id: 'def-1',
          time: '09:00 AM',
          description: 'Start with coffee and croissants at Café de Flore',
          type: 'food',
          location: {
            name: 'Café de Flore',
            coordinates: { lat: 48.8540, lng: 2.3331 },
            address: 'Saint-Germain-des-Prés'
          }
        },
        {
          id: 'def-2',
          time: '11:00 AM',
          description: 'Explore the Louvre Museum',
          type: 'activity',
          location: {
            name: 'Louvre Museum',
            coordinates: { lat: 48.8606, lng: 2.3376 },
            address: 'Rue de Rivoli'
          }
        },
        {
          id: 'def-3',
          time: '07:00 PM',
          description: 'Dinner cruise on the Seine',
          type: 'activity',
          location: {
            name: 'Port de la Bourdonnais',
            coordinates: { lat: 48.8596, lng: 2.2936 },
            address: 'Eiffel Tower'
          }
        }
      ]
    },
    {
      id: '2',
      dayNumber: 2,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      activities: []
    },
  ]
};
