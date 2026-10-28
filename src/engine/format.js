// Number formatting shared by the engine and the screens.
export const fmtW = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n >= 10 ? String(Math.round(n)) : n.toFixed(1);
export const fmtGBW = g => g >= 1000 ? fmtW(g / 1000) + ' TB' : Math.round(g) + ' GB';
