// Centralised colour palette for all teams.
// Providers look up by team name; unknown teams get the default.

export interface TeamColors {
  primary: string;
  secondary: string;
}

export const TEAM_COLORS: Record<string, TeamColors> = {
  // ── IPL Franchises ──────────────────────────────────────────────────────────
  'Mumbai Indians': { primary: '#004BA0', secondary: '#D4B55E' },
  'MI': { primary: '#004BA0', secondary: '#D4B55E' },

  'Chennai Super Kings': { primary: '#FDB913', secondary: '#0A1045' },
  'CSK': { primary: '#FDB913', secondary: '#0A1045' },

  'Royal Challengers Bengaluru': { primary: '#EC1C24', secondary: '#000000' },
  'Royal Challengers Bangalore': { primary: '#EC1C24', secondary: '#000000' },
  'RCB': { primary: '#EC1C24', secondary: '#000000' },

  'Kolkata Knight Riders': { primary: '#3A225D', secondary: '#C8A84B' },
  'KKR': { primary: '#3A225D', secondary: '#C8A84B' },

  'Rajasthan Royals': { primary: '#E8327C', secondary: '#2D4B8E' },
  'RR': { primary: '#E8327C', secondary: '#2D4B8E' },

  'Delhi Capitals': { primary: '#17479E', secondary: '#EF1C25' },
  'DC': { primary: '#17479E', secondary: '#EF1C25' },

  'Punjab Kings': { primary: '#DD2D3B', secondary: '#8D8E8E' },
  'PBKS': { primary: '#DD2D3B', secondary: '#8D8E8E' },

  'Sunrisers Hyderabad': { primary: '#F26522', secondary: '#1A1A1A' },
  'SRH': { primary: '#F26522', secondary: '#1A1A1A' },

  'Lucknow Super Giants': { primary: '#2BC1D7', secondary: '#003B99' },
  'LSG': { primary: '#2BC1D7', secondary: '#003B99' },

  'Gujarat Titans': { primary: '#1C1C36', secondary: '#00A0DF' },
  'GT': { primary: '#1C1C36', secondary: '#00A0DF' },

  // ── National Teams ───────────────────────────────────────────────────────────
  'India': { primary: '#003791', secondary: '#FF7722' },
  'IND': { primary: '#003791', secondary: '#FF7722' },

  'Australia': { primary: '#00843D', secondary: '#FBBF15' },
  'AUS': { primary: '#00843D', secondary: '#FBBF15' },

  'England': { primary: '#1D2B5E', secondary: '#CF4520' },
  'ENG': { primary: '#1D2B5E', secondary: '#CF4520' },

  'Pakistan': { primary: '#115740', secondary: '#FFFFFF' },
  'PAK': { primary: '#115740', secondary: '#FFFFFF' },

  'Sri Lanka': { primary: '#003087', secondary: '#FFD700' },
  'SL': { primary: '#003087', secondary: '#FFD700' },
  'Sri Lanka Cricket': { primary: '#003087', secondary: '#FFD700' },

  'South Africa': { primary: '#007A4D', secondary: '#FFB81C' },
  'SA': { primary: '#007A4D', secondary: '#FFB81C' },

  'New Zealand': { primary: '#2B2B2B', secondary: '#FFFFFF' },
  'NZ': { primary: '#2B2B2B', secondary: '#FFFFFF' },

  'West Indies': { primary: '#7B0000', secondary: '#FFC72C' },
  'WI': { primary: '#7B0000', secondary: '#FFC72C' },

  'Bangladesh': { primary: '#006A4E', secondary: '#F42A41' },
  'BAN': { primary: '#006A4E', secondary: '#F42A41' },

  'Afghanistan': { primary: '#003366', secondary: '#D32011' },
  'AFG': { primary: '#003366', secondary: '#D32011' },

  'Zimbabwe': { primary: '#006400', secondary: '#FFD700' },
  'ZIM': { primary: '#006400', secondary: '#FFD700' },

  'Ireland': { primary: '#169B62', secondary: '#FFFFFF' },
  'IRE': { primary: '#169B62', secondary: '#FFFFFF' },

  // ── Fallback ─────────────────────────────────────────────────────────────────
  'default': { primary: '#4B5563', secondary: '#9CA3AF' },
};
