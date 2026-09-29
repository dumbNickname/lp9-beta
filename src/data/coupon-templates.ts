import type { Archetype } from "~/lib/data/types";

// Starter coupon ideas (DESIGN.md §6c). Suggestions only: gentle,
// culturally broad, nothing spicy — couples add their own once they feel
// ownership. Each still needs partner approval. Keep all copy here so
// Phase 7 can move it into locale files in one place.
export interface CouponTemplate {
  key: string;
  emoji: string;
  title: string;
  price: number;
  boundaries?: string;
}

export const TEMPLATES: Record<Archetype, CouponTemplate[]> = {
  getting_to_know: [
    { key: "gtk_coffee_walk", emoji: "☕", title: "A coffee and a slow walk", price: 4 },
    { key: "gtk_playlist", emoji: "🎧", title: "A playlist made just for me", price: 3 },
    { key: "gtk_cook_together", emoji: "🍝", title: "Cook a new recipe together", price: 6 },
    { key: "gtk_your_place", emoji: "🗺️", title: "Show me a place you love", price: 5 },
    { key: "gtk_movie_pick", emoji: "🎬", title: "Movie night — my pick", price: 4 },
    { key: "gtk_questions", emoji: "💬", title: "An evening of big questions", price: 3 },
    { key: "gtk_picnic", emoji: "🧺", title: "A picnic you plan", price: 8 },
    { key: "gtk_letter", emoji: "✉️", title: "A handwritten letter", price: 5 },
  ],
  established_couple: [
    { key: "est_breakfast_bed", emoji: "🥐", title: "Breakfast in bed", price: 8 },
    { key: "est_massage", emoji: "💆", title: "A 20-minute massage", price: 10, boundaries: "Shoulders and back unless we agree otherwise." },
    { key: "est_sleep_in", emoji: "😴", title: "Sleep in — you take the morning", price: 12 },
    { key: "est_date_plan", emoji: "🌙", title: "A date night you fully plan", price: 20 },
    { key: "est_chore_swap", emoji: "🧺", title: "You take one of my chores for a week", price: 15 },
    { key: "est_phone_free", emoji: "📵", title: "A phone-free evening together", price: 6 },
    { key: "est_dinner_out", emoji: "🍷", title: "Dinner somewhere new", price: 25 },
    { key: "est_day_trip", emoji: "🚆", title: "A day trip, just us", price: 40 },
  ],
  close_friends: [
    { key: "cf_game_night", emoji: "🎲", title: "Game night at yours", price: 5 },
    { key: "cf_cook_dinner", emoji: "🍲", title: "Cook dinner together", price: 6 },
    { key: "cf_help_move", emoji: "📦", title: "Help with a big task (moving, DIY)", price: 15 },
    { key: "cf_long_call", emoji: "📞", title: "A long catch-up call, no rush", price: 3 },
    { key: "cf_hike", emoji: "🥾", title: "A hike or a long walk", price: 8 },
    { key: "cf_new_thing", emoji: "✨", title: "Try something new together", price: 10 },
    { key: "cf_video_games", emoji: "🎮", title: "Video-game night", price: 4 },
    { key: "cf_concert", emoji: "🎵", title: "Come with me to a gig or show", price: 20 },
  ],
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  getting_to_know: "Getting to know each other",
  established_couple: "Established couple",
  close_friends: "Close friends",
};
