// Practice tracks: which steps each shows and the suggested minutes.
export const TRACKS = {
  interview: { n: 'System design interview', t: 'About 30 minutes', lens: 'system',
    d: 'Clarify the brief, size it from first principles, sketch the blueprint, then defend it when something fails.',
    steps: [['brief', 5], ['workload', 10], ['blueprint', 10], ['drill', 5]] },
  tradeoff: { n: 'Trade-off practice', t: 'About 20 minutes',
    d: 'Pick a system, assemble it, build competing designs and name the trade-off you accept.',
    steps: [['brief', 3], ['canvas', 7], ['outcomes', 5], ['compare', 5]] },
  full: { n: 'Full journey', t: 'Several sessions',
    d: 'Every step from principles to the review board, in the order a real programme follows.', steps: null }
};
